import P2PT from 'p2pt'
import { Database } from './Database'

var trackersAnnounceURLs = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',

  'wss://tracker.openwebtorrent.com:443/announce',
  'wss://tracker.files.fm:7073/announce',
]

export default class Peer {
  private p2pt: P2PT
  private id: string
  private data: any
  private timestamp: number

  private peers: any = {}

  private callback: {} = {}
  private callbackUpdate: {} = {}

  constructor(
    config: { id: string; data: any; timestamp: number },
    setup?: (config: any) => void
  ) {
    this.id = config.id
    this.data = config.data
    this.timestamp = config.timestamp

    this.on('setup', setup)

    this.p2pt = new P2PT(trackersAnnounceURLs, this.id)

    const self = this
    this.p2pt.on('trackerconnect', (tracker, stats) => {
      //console.log('Connected to tracker : ' + tracker.announceUrl)
      //console.log('Tracker stats : ' + JSON.stringify(stats))
    })

    this.p2pt.on('peerconnect', (peer) => {
      //console.warn('Peer connected : ' + peer.id, peer)
      self.peers[peer.id] = peer

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

          if (timestamp < self.timestamp) {
            console.warn('sending update')
            self.broadcast({
              topic: 'setup-update',
              data: {
                data: self.data,
                timestamp: self.timestamp,
              },
            })
          } else if (timestamp > self.timestamp) {
            self.timestamp = timestamp
            self.data = data
            self.update('setup')
          }
          break
        }
        case 'setup-update': {
          const { data, timestamp } = msg.data
          if (timestamp > self.timestamp) {
            self.timestamp = timestamp
            self.data = data
            self.update('setup')
          }

          break
        }
        default:
          console.warn('unknown command', msg.topic)
      }
    })

    this.p2pt.start()
  }

  newSetup(config: { id: string; data: any; timestamp: number }) {
    this.id = config.id
    this.data = config.data
    this.timestamp = config.timestamp
  }

  update(event: 'setup') {
    const callback = this.callback[event]

    switch (event) {
      case 'setup': {
        if (callback) {
          callback({
            id: this.id,
            data: this.data,
            timestamp: this.timestamp,
          })
          this.callbackUpdate[event] = false
        } else {
          this.callbackUpdate[event] = true
        }
        break
      }
    }
  }

  on(event: 'setup', callback: any) {
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
    this.timestamp = timestamp

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

    for (const id in this.peers) {
      try {
        this.p2pt.send(this.peers[id], msg)
      } catch (e) {
        console.warn(e.message)
        delete this.peers[id]
      }
    }
  }

  setIdentification(config: { id: string; data: any; timestamp: number }) {
    this.id = config.id
    this.data = config.data
    this.timestamp = config.timestamp

    this.p2pt.setIdentifier(this.id)

    this.peers = {}
  }

  stop() {
    this.p2pt?.destroy()
    this.callback = {}
    this.callbackUpdate = {}
    this.peers = {}
  }

  publishSetup(peerID: string) {
    const message = {
      topic: 'setup',
      data: {
        data: this.data,
        timestamp: this.timestamp,
      },
    }

    if (peerID && this.peers[peerID]) {
      this.p2pt.send(this.peers[peerID], message)
    } else {
      this.broadcast(message)
    }
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
