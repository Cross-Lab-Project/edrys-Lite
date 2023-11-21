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
    setup?: (config: any) => void
  ) {
    this.id = config.id
    this.data = config.data
    this.timestamp.config = config.timestamp
    this.peerID = getPeerID()

    this.on('setup', setup)

    this.p2pt = new P2PT(trackersAnnounceURLs, this.id)

    const self = this
    this.p2pt.on('trackerconnect', (tracker, stats) => {
      //console.log('Connected to tracker : ' + tracker.announceUrl)
      //console.log('Tracker stats : ' + JSON.stringify(stats))
    })

    this.p2pt.on('peerconnect', (peer) => {
      //console.warn('Peer connected : ' + peer.id, peer)
      self.peers[peer.id] = { peer, id: null }

      self.publishSetup(peer.id)
    })

    this.p2pt.on('peerclose', (peer) => {
      //console.warn('Peer disconnected : ' + peer)

      if (self.peers[peer.id]) delete self.peers[peer.id]
    })

    this.p2pt.on('msg', (peer, msg) => {
      console.log(`Got message from ${peer.id} : ${JSON.stringify(msg)}`)

      switch (msg.topic) {
        case 'setup': {
          const { data, timestamp } = msg.data

          if (timestamp < self.timestamp.config) {
            console.warn('sending update')
            self.broadcast({
              id: self.peerID,
              topic: 'setup-update',
              data: {
                data: self.data,
                timestamp: self.timestamp.config,
              },
            })
          } else if (timestamp > self.timestamp.config) {
            console.warn('receiving update', msg)
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
        case 'room-join': {
          this.peers[peer.id].id = msg.id
          const data = decode(msg.data.config)
          if (msg.data.timestamp < self.timestamp.join) {
            console.warn('room-join 1')
            self.timestamp.join = msg.data.timestamp

            self.doc.getMap('users').unobserve(this.observer)
            self.doc.getMap('rooms').unobserve(this.observer)

            self.doc = new Y.Doc()
            Y.applyUpdate(this.doc, data)
            self.initDoc(false)
            self.join('room-update')
            self.update('room')
          } else {
            console.warn('room-join 2')
            Y.applyUpdate(this.doc, data)
          }

          break
        }
        case 'room-update':
          this.peers[peer.id].id = msg.id
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

  update(event: 'setup' | 'room') {
    const callback = this.callback[event]

    switch (event) {
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
    }
  }

  on(event: 'setup' | 'room', callback: any) {
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
      id: this.peerID,
      topic: 'update-setup',
      data: {
        data,
        timestamp,
      },
    })
  }

  broadcast(msg: { id: string; topic: string; data: any }) {
    if (!this.p2pt) {
      return
    }

    for (const id in this.peers) {
      try {
        console.warn('broadcast', id, msg)
        this.p2pt.send(this.peers[id].peer, msg)
      } catch (e) {
        console.warn(e.message)
        delete this.peers[id]
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
      id: this.peerID,
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
    console.warn('gotoRoom', room)
    this.userSettings.room = room
    this.doc.getMap('users').set(this.peerID, this.userSettings)
    console.warn('gotoRoom', this.doc.toJSON())
  }

  join(stationID: string) {
    if (stationID) {
      this.stationID = 'Station ' + stationID
      this.peerID = this.stationID
    }

    this.userSettings.displayName = this.peerID

    this.timestamp.join = Date.now()

    this.initDoc(true, this.data.meta.defaultNumberOfRooms)

    setTimeout(() => {
      console.warn('setTimeout: enterClassroom', 'room-join')
      this.enterClassroom('room-join')
    }, 1000)

    return this.doc.toJSON()
  }

  initDoc(full: boolean = true, defaultRooms: number = 0) {
    const clientID = this.doc.clientID
    this.doc.clientID = 0

    const rooms = this.doc.getMap('rooms')
    const users = this.doc.getMap('users')

    if (full) {
      rooms.set('Lobby', ROOM)

      if (defaultRooms > 0) {
        for (let i = 0; i < defaultRooms; i++) {
          rooms.set('Room ' + i, ROOM)
        }
      }
    }

    if (this.stationID) {
      rooms.set(this.stationID, ROOM)

      this.userSettings.room = this.stationID
    }

    users.set(this.peerID, this.userSettings)

    this.doc.clientID = clientID

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
        console.log('Room configuration has changed ... updating')
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
    console.warn(
      'XXXXXXXXXXXXXXXXXXXXX enterClassroom',
      type,
      JSON.stringify(this.doc.toJSON(), null, 2)
    )
    this.broadcast({
      id: this.peerID,
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
