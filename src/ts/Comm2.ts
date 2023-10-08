import P2PT from 'p2pt'
import { infoHash, getPeerID } from './Utils'
import * as Y from 'yjs'
import { encode, decode } from 'uint8-to-base64'

var trackersAnnounceURLs = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',

  'wss://tracker.openwebtorrent.com:443/announce',
  'wss://tracker.files.fm:7073/announce',
]

function dynamicGossip(self: Comm2) {
  let timerID: number | null = null

  function publish() {
    if (!self.p2pt) return

    try {
      self.join('update')

      timerID = window.setTimeout(publish, 10000)
    } catch (e) {
      timerID = null
    }
  }

  return () => {
    if (timerID) {
      window.clearTimeout(timerID)
    }

    timerID = window.setTimeout(publish, 10000)
  }
}

const ROOM = {
  studentPublicState: '',
  teacherPublicState: '',
  teacherPrivateState: '',
}

export default class Comm2 {
  public p2pt: P2PT

  public doc: Y.Doc = new Y.Doc()
  private timestamp: number = 0

  private peers: any = {}

  private peerID: string
  private stationID: string = ''

  private observer: any

  private update_?: (config: any) => void
  private update_message?: (message: {
    subject: string
    body: string
    module_url: string
    date: number
  }) => void

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

  constructor(id: string, defaultRooms: number = 0, stationID: string) {
    let peerID = getPeerID()

    if (stationID) {
      this.stationID = 'Station ' + stationID
      peerID = this.stationID
    }

    this.peerID = peerID

    this.userSettings.displayName = peerID

    this.initDoc(true, defaultRooms)
    this.initP2PT('classrooms' + id)

    this.timestamp = Date.now()
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
          self.onUpdate()
          self.join('join')
        } else {
          self.doc.transact(() => {
            rooms.set(self.stationID, ROOM)
            users.set(self.peerID, self.userSettings)
          })
        }
      } else {
        console.log('Room configuration has changed ... updating')
        if (users.has(self.peerID)) {
          self.onUpdate()
          self.join('update')
        } else {
          users.set(self.peerID, self.userSettings)
        }
      }
    }

    rooms.observe(this.observer)
    users.observe(this.observer)
  }

  initP2PT(id: string) {
    this.p2pt = new P2PT(trackersAnnounceURLs, id)
    // @ts-ignore
    this.p2pt._maxListeners = 1000000

    const self = this

    this.p2pt.on('trackerconnect', (tracker, stats) => {
      console.log('Connected to tracker : ' + tracker.announceUrl)
      console.log('Tracker stats : ' + JSON.stringify(stats))
    })

    this.p2pt.on('peerconnect', (peer) => {
      console.log('Peer connected : ' + peer.id, peer)
      self.peers[peer.id] = { peer, id: null }

      setTimeout(() => {
        self.join()
      }, Math.random() * 2000)
    })

    this.p2pt.on('peerclose', (peer) => {
      const peerID = this.peers[peer.id]?.id
      console.log('Peer disconnected : ', peer.id, peerID)

      if (peerID) {
        this.doc.getMap('users').delete(peerID)

        if (peerID.length < 12) {
          this.doc.getMap('rooms').delete(peerID)
        }
      }

      delete self.peers[peer.id]
    })

    this.p2pt.on('msg', (peer, msg) => {
      console.warn(`Got message from ${peer.id}`, JSON.stringify(msg, null, 2))

      switch (msg.cmd) {
        case 'join': {
          this.peers[peer.id].id = msg.id
          const data = decode(msg.data)
          if (msg.timestamp < self.timestamp) {
            self.timestamp = msg.timestamp

            self.doc.getMap('users').unobserve(this.observer)
            self.doc.getMap('rooms').unobserve(this.observer)

            self.doc = new Y.Doc()
            Y.applyUpdate(this.doc, data)
            self.initDoc(false)
            self.join('update')
            self.onUpdate()
          } else {
            Y.applyUpdate(this.doc, data)
          }

          break
        }
        case 'update':
          this.peers[peer.id].id = msg.id
          const data = decode(msg.data)
          Y.applyUpdate(this.doc, data)
          break

        default:
          this.onMessage(msg.message)
      }
    })

    this.p2pt.start()

    //const gossip = dynamicGossip(this)
    //gossip()
  }

  gotoRoom(room: string) {
    this.userSettings.room = room
    this.doc.getMap('users').set(this.peerID, this.userSettings)
  }

  getDoc() {
    return this.doc.toJSON()
  }

  getId() {
    return this.peerID
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

  on(event: 'update' | 'message', callback: any) {
    switch (event) {
      case 'update':
        this.update_ = callback
        break
      case 'message':
        this.update_message = callback
        break
    }
  }

  onUpdate() {
    if (this.update_) {
      //console.warn('onUpdate', JSON.stringify(this.doc.toJSON(), null, 2))

      this.update_({
        id: this.peerID,
        data: this.doc.toJSON(),
        timestamp: this.timestamp,
      })
    }
  }

  onMessage(message: {
    subject: string
    body: string
    module_url: string
    date: number
  }) {
    if (this.update_message) {
      this.update_message(message)
    }
  }

  broadcast(message: any, room: string = '') {
    if (!this.p2pt) {
      return
    }

    // if a room has been defined, then broadcast only to users within that room
    if (room) {
      const users = this.doc.getMap('users').toJSON()

      message.date = Date.now()

      for (const id in this.peers) {
        if (this.peers[id].id) {
          if (users[this.peers[id].id]?.room === room) {
            try {
              this.p2pt.send(this.peers[id].peer, {
                id: this.peerID,
                room,
                message,
              })
            } catch (e) {
              //console.warn(e.message)
              //delete this.peers[id]
            }
          }
        }
      }

      // as in the original Edrys ... messages are send back to the sender
      this.onMessage(message)
    }
    // otherwise, broadcast to all users
    else {
      for (const id in this.peers) {
        try {
          this.p2pt.send(this.peers[id].peer, {
            id: this.peerID,
            room,
            ...message,
          })
        } catch (e) {
          //console.warn(e.message)
          //delete this.peers[id]
        }
      }
    }
  }

  join(cmd: string = 'join') {
    this.broadcast({
      cmd,
      data: encode(Y.encodeStateAsUpdate(this.doc)),
      timestamp: this.timestamp,
    })
  }

  stop() {
    this.p2pt?.destroy()
  }
}
