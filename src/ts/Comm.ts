import P2PT from 'p2pt'

var trackersAnnounceURLs = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',

  'wss://tracker.openwebtorrent.com:443/announce',
  'wss://tracker.files.fm:7073/announce',
]

export default class Comm {
  private p2pt: P2PT
  private id: string
  private data: any
  private timestamp: number
  private peers: any = {}

  private doUpdate: boolean = false
  private update_?: (config: any) => void

  constructor(
    config: { id: string; data: any; timestamp: number },
    update?: (config: any) => void
  ) {
    this.id = config.id
    this.data = config.data
    this.timestamp = config.timestamp

    this.update_ = update

    this.p2pt = new P2PT(trackersAnnounceURLs, this.id)
    this.p2pt._maxListeners = 1000000

    const self = this
    this.p2pt.on('trackerconnect', (tracker, stats) => {
      //console.log('Connected to tracker : ' + tracker.announceUrl)
      //console.log('Tracker stats : ' + JSON.stringify(stats))
    })

    this.p2pt.on('peerconnect', (peer) => {
      //console.warn('Peer connected : ' + peer.id, peer)
      self.peers[peer.id] = peer

      self.join()
    })

    this.p2pt.on('peerclose', (peer) => {
      //console.warn('Peer disconnected : ' + peer)

      if (self.peers[peer.id]) delete self.peers[peer.id]
    })

    this.p2pt.on('msg', (peer, msg) => {
      console.log(`Got message from ${peer.id} : ${JSON.stringify(msg)}`)

      switch (msg.cmd) {
        case 'join':
          if (msg.timestamp < self.timestamp) {
            self.broadcast({
              cmd: 'update',
              data: self.data,
              timestamp: self.timestamp,
            })
          } else {
            self.timestamp = msg.timestamp
            self.data = msg.data

            self.update()
          }
          break
        case 'update':
          if (msg.timestamp > self.timestamp) {
            self.timestamp = msg.timestamp
            self.data = msg.data

            self.update()
          }

          break
        default:
          console.warn('unknown command', msg.cmd)
      }
    })

    this.p2pt.start()
  }

  update() {
    if (this.update_) {
      this.doUpdate = false

      this.update_({
        id: this.id,
        data: this.data,
        timestamp: this.timestamp,
      })
    } else {
      this.doUpdate = true
    }
  }

  updateConfig(data: any) {
    this.data = data
    this.timestamp = Date.now()

    this.broadcast({
      cmd: 'update',
      data: this.data,
      timestamp: this.timestamp,
    })
  }

  on(event: 'update', callback: any) {
    switch (event) {
      case 'update': {
        this.update_ = callback
        if (this.doUpdate) this.update()
        break
      }
    }
  }

  broadcast(msg: any) {
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

  stop() {
    this.p2pt?.destroy()
  }

  join() {
    const message = {
      cmd: 'join',
      data: this.data,
      timestamp: this.timestamp,
    }

    this.broadcast(message)
  }
}
