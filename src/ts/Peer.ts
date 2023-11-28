import P2PT from 'p2pt'
import { getPeerID } from './Utils'
import * as Y from 'yjs'
import { encode, decode } from 'uint8-to-base64'

var trackersAnnounceURLs = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',

  'wss://tracker.openwebtorrent.com:443/announce',
  'wss://tracker.files.fm:7073/announce',
]

const ROOM = {
  studentPublicState: '',
  teacherPublicState: '',
  teacherPrivateState: '',
}

export default class Peer {
  private p2pt: P2PT
  public doc: Y.Doc = new Y.Doc()
  private observer: any

  private id: string
  private data: any
  private connected: boolean = false

  private roomBubbling?: number

  private timestamp: {
    config: number
    join: number
  } = { config: 0, join: 0 }

  private peers: any = {}

  private callback: {} = {}
  private callbackUpdate: {} = {}

  private peerID: string
  private stationID: string = ''

  private userSettings: any = {
    displayName: '',
    room: 'Lobby',
    role: 'student',
    dateJoined: Date.now(),
    handRaised: false,
    connections: [
      {
        id: '',
        target: {},
      },
    ],
  }

  constructor(
    config: { id: string; data: any; timestamp: number },
    stationID?: string
  ) {
    this.id = config.id
    this.data = config.data
    this.timestamp.config = config.timestamp

    this.peerID = getPeerID()
    if (stationID) {
      this.stationID = 'Station ' + stationID
      this.peerID = this.stationID
    }

    this.p2pt = new P2PT(trackersAnnounceURLs, this.id)

    const self = this
    this.p2pt.on('trackerconnect', (tracker, stats) => {
      //console.log('Connected to tracker : ' + tracker.announceUrl)
      //console.log('Tracker stats : ' + JSON.stringify(stats))
      self.connected = true
      self.update('connected')
    })

    this.p2pt.on('peerconnect', (peer) => {
      //console.warn('Peer connected : ' + peer.id, peer)
      self.peers[peer.id] = { peer, id: null }

      self.publishSetup(peer.id)
    })

    this.p2pt.on('peerclose', (peer) => {
      //console.warn('Peer disconnected : ' + peer)
      const peerID = this.peers[peer.id]?.id

      delete self.peers[peer.id]
      if (peerID) {
        if (peerID.startsWith('Station')) {
          this.doc.transact(() => {
            const users = this.doc.getMap('users')
            users.delete(peerID)

            users.forEach((user: any, id: string) => {
              if (user.room === peerID) {
                user.room = 'Lobby'
                users.set(id, user)
              }
            })

            this.doc.getMap('rooms').delete(peerID)
          })
        } else {
          this.doc.getMap('users').delete(peerID)
        }
      }
    })

    this.p2pt.on('msg', (peer, msg) => {
      // console.log(`Got message from ${peer.id} : ${JSON.stringify(msg)}`)

      switch (msg.topic) {
        case 'setup': {
          const { data, timestamp } = msg.data

          if (timestamp < self.timestamp.config) {
            self.broadcast({
              topic: 'setup-update',
              data: {
                data: self.data,
                timestamp: self.timestamp.config,
              },
            })
          } else if (timestamp > self.timestamp.config) {
            self.timestamp.config = timestamp
            self.data = data
            self.update('setup')
          }
          break
        }
        case 'setup-update': {
          const { data, timestamp } = msg.data
          if (timestamp > self.timestamp.config) {
            self.timestamp.config = timestamp
            self.data = data
            self.update('setup')
          }

          break
        }

        case 'room': {
          self.update('message', msg.data.msg)
          break
        }

        case 'room-join': {
          if (msg.id === this.peerID) {
            break
          }

          if (!this.peers[peer.id]) {
            self.peers[peer.id] = { peer, id: msg.id }
          } else {
            self.peers[peer.id].id = msg.id
          }

          const data = decode(msg.data.config)
          if (msg.data.timestamp < self.timestamp.join) {
            self.timestamp.join = msg.data.timestamp

            self.doc.getMap('users').unobserve(this.observer)
            self.doc.getMap('rooms').unobserve(this.observer)

            self.doc = new Y.Doc()
            Y.applyUpdate(this.doc, data)
            self.initDoc(false)
            self.enterClassroom('room-join')
            self.update('room')
          } else {
            Y.applyUpdate(this.doc, data)
          }

          break
        }
        case 'room-update':
          if (msg.id === this.peerID) {
            break
          }
          if (!this.peers[peer.id]) {
            this.peers[peer.id] = { peer, id: msg.id }
          } else {
            this.peers[peer.id].id = msg.id
          }

          const data = decode(msg.data.config)
          Y.applyUpdate(this.doc, data)
          break
        default:
          console.warn('unknown command', msg.topic)
      }
    })

    this.p2pt.start()
  }

  newSetup(config: { id: string; data: any; timestamp: number }) {
    this.id = config.id
    this.data = config.data
    this.timestamp.config = config.timestamp

    this.publishSetup()
  }

  getPeerID() {
    return this.peerID
  }

  update(event: 'setup' | 'room' | 'message' | 'connected', message?: any) {
    const callback = this.callback[event]

    switch (event) {
      case 'message': {
        if (callback) {
          callback(message)
        }
        break
      }
      case 'setup': {
        if (callback) {
          callback({
            id: this.id,
            data: this.data,
            timestamp: this.timestamp.config,
          })
          this.callbackUpdate[event] = false
        } else {
          this.callbackUpdate[event] = true
        }
        break
      }
      case 'room': {
        if (callback) {
          callback(this.doc.toJSON())
          this.callbackUpdate[event] = false
        } else {
          this.callbackUpdate[event] = true
        }
        break
      }

      case 'connected': {
        if (callback) {
          callback(this.connected)
          this.callbackUpdate[event] = false
        } else {
          this.callbackUpdate[event] = true
        }
        break
      }
    }
  }

  on(event: 'setup' | 'room' | 'connected', callback: any) {
    if (callback) {
      this.callback[event] = callback

      if (this.callbackUpdate[event]) {
        this.update(event)
      }
    } else if (this.callback[event]) {
      delete this.callback[event]
    }
  }

  updateSetup(data: any, timestamp: number) {
    this.data = data
    this.timestamp.config = timestamp

    this.broadcast({
      topic: 'update-setup',
      data: {
        data,
        timestamp,
      },
    })
  }

  broadcast(msg: { topic: string; data: any }) {
    if (!this.p2pt) {
      return
    }

    msg.id = this.peerID

    if (msg.topic === 'room') {
      const users = this.doc.getMap('users').toJSON()

      msg.data.msg.date = Date.now()

      for (const id in this.peers) {
        if (this.peers[id].id) {
          if (users[this.peers[id].id]?.room === msg.data.room) {
            try {
              this.p2pt.send(this.peers[id].peer, msg)
            } catch (e) {
              //console.warn(e.message)
              //delete this.peers[id]
            }
          }
        }
      }

      // as in the original Edrys ... messages are send back to the sender
      this.update('message', msg.data.msg)
    } else {
      for (const id in this.peers) {
        try {
          this.p2pt.send(this.peers[id].peer, msg)
        } catch (e) {
          console.warn(e.message)
          delete this.peers[id]
        }
      }
    }
  }

  setIdentification(config: { id: string; data: any; timestamp: number }) {
    this.id = config.id
    this.data = config.data
    this.timestamp.config = config.timestamp

    this.p2pt.setIdentifier(this.id)

    this.peers = {}
  }

  stop() {
    this.p2pt?.destroy()
    this.callback = {}
    this.callbackUpdate = {}
    this.peers = {}
  }

  publishSetup(peerID?: string) {
    const message = {
      topic: 'setup',
      data: {
        data: this.data,
        timestamp: this.timestamp.config,
      },
    }

    if (peerID && this.peers[peerID]) {
      this.p2pt.send(this.peers[peerID].peer, message)
    } else {
      this.broadcast(message)
    }
  }

  addRoom() {
    const rooms = this.doc.getMap('rooms')
    const room = 'Room ' + rooms.size
    rooms.set(room, {
      studentPublicState: '',
      teacherPublicState: '',
      teacherPrivateState: '',
    })
  }

  gotoRoom(room: string) {
    this.userSettings.room = room
    this.doc.getMap('users').set(this.peerID, this.userSettings)
  }

  join() {
    this.userSettings.displayName = this.peerID

    this.timestamp.join = Date.now()

    this.initDoc(true, this.data.meta.defaultNumberOfRooms)

    const self = this
    setTimeout(() => {
      self.enterClassroom('room-join')
    }, 1000)

    if (this.roomBubbling) {
      clearInterval(this.roomBubbling)
    }

    this.roomBubbling = setInterval(() => {
      self.enterClassroom('room-update')
    }, 5000)

    return this.doc.toJSON()
  }

  initDoc(full: boolean = true, defaultRooms: number = 0) {
    const rooms = this.doc.getMap('rooms')
    const users = this.doc.getMap('users')

    if (full) {
      rooms.set('Lobby', ROOM)

      if (defaultRooms > 0) {
        for (let i = 1; i <= defaultRooms; i++) {
          rooms.set('Room ' + i, ROOM)
        }
      }
    }

    if (this.stationID) {
      rooms.set(this.stationID, ROOM)

      this.userSettings.room = this.stationID
    }

    users.set(this.peerID, this.userSettings)

    const self = this

    this.observer = (event: any) => {
      if (self.stationID) {
        if (users.has(self.peerID) && rooms.has(self.stationID)) {
          self.update('room')
          self.enterClassroom('room-update')
        } else {
          self.doc.transact(() => {
            rooms.set(self.stationID, ROOM)
            users.set(self.peerID, self.userSettings)
          })
        }
      } else {
        if (users.has(self.peerID)) {
          self.update('room')
          self.enterClassroom('room-update')
        } else {
          users.set(self.peerID, self.userSettings)
        }
      }
    }

    rooms.observe(this.observer)
    users.observe(this.observer)
  }

  enterClassroom(type: 'room-join' | 'room-update') {
    this.broadcast({
      topic: type,
      data: {
        config: encode(Y.encodeStateAsUpdate(this.doc)),
        timestamp: this.timestamp.join,
      },
    })
  }
}

/*

var trackersAnnounceURLs = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',

  'wss://tracker.openwebtorrent.com:443/announce',
  'wss://tracker.files.fm:7073/announce',
]

window['P2PT'] = P2PT

window.p2pt = new P2PT(trackersAnnounceURLs, 'hasdfhasudasdiufqwewrasf')

window.p2pt.on('trackerconnect', (tracker, stats) => {
  console.log('Connected to tracker : ' + tracker.announceUrl)
  console.log('Tracker stats : ' + JSON.stringify(stats))
})

window.p2pt.on('peerconnect', (peer) => {
  console.warn('Peer connected : ' + peer.id, peer)
})

window.p2pt.on('peerclose', (peer) => {
  console.warn('Peer disconnected : ' + peer)
})

window.p2pt.on('msg', (peer, msg) => {
  console.warn('Received : ', peer, msg)
})

window.p2pt.on('warning', (msg) => {
  console.warn('Warning : ', msg)
})

window.p2pt.on('update', (msg) => {
  console.warn('Update : ', msg)
})

window.p2pt.on('peer', (msg) => {
  console.warn('Peer : ', msg)
})

window.p2pt.start()

//window.p2pt.send('asdfsaf', 'hallo welt')
*/
