import { clone, deepEqual } from './Utils'

const HEARTBEAT_INTERVAL = 10 * 1000
const HEARTBEAT_TIMEOUT = 3 * 60 * 1000
const HEARTBEAT_DEATH = 15 * 60 * 10000

const LOBBY = 'Lobby'
const STATION = 'Station'

export default class State {
  private doc: any = { users: {}, rooms: {} }
  private backupDoc: any = { users: {}, rooms: {} }

  private userID: string = ''
  private heartbeatID?: number

  private isStation: boolean = false

  private userSettings: any = {
    displayName: '',
    room: LOBBY,
    role: 'student',
    dateJoined: Date.now(),
    handRaised: false,
    connections: [
      {
        id: '',
        target: {},
      },
    ],
    timestamp: Date.now(),
    tombstone: false,
  }

  private callback?: (full: boolean) => void

  constructor(userID: string) {
    this.userID = userID

    this.initUser()
    this.initRooms(0)
  }

  init(role: string, defaultRooms: number = 0) {
    this.userSettings.role = role

    if (this.userID.startsWith(STATION)) {
      this.isStation = true
    }

    this.initUser()
    this.initRooms(defaultRooms)

    if (this.heartbeatID) {
      clearInterval(this.heartbeatID)
    }

    const self = this
    this.heartbeatID = setInterval(() => {
      self.heartBeat()
    }, HEARTBEAT_INTERVAL)
  }

  initUser() {
    this.userSettings.displayName = this.userID
    this.userSettings.room = this.isStation ? this.userID : LOBBY

    this.userSettings.dateJoined = Date.now()
    this.userSettings.timestamp = Date.now()
    this.userSettings.tombstone = false

    this.doc.users[this.userID] = this.userSettings
  }

  // basic initialize rooms configuration
  initRooms(defaultRooms: number) {
    for (let i = 1; i <= defaultRooms; i++) {
      this.addRoom(false, 'Room ' + i)
    }

    this.addRoom(false, LOBBY)

    if (this.isStation) {
      this.addRoom(true, this.userID)
    }
  }

  toJSON(doc?: any) {
    const createBackup = !doc

    if (createBackup) {
      doc = this.doc
    }

    const newDoc = {
      rooms: this.filterTombstones(clone(doc.rooms)),
      users: this.filterTombstones(clone(doc.users)),
    }

    if (createBackup && deepEqual(newDoc, this.backupDoc)) {
      return this.backupDoc
    }

    if (createBackup) {
      this.backupDoc = newDoc
    }

    return newDoc
  }

  filterTombstones(obj: any) {
    const newObj: any = {}

    for (const id in obj) {
      if (!obj[id].tombstone) {
        newObj[id] = clone(obj[id])
        delete newObj[id].tombstone
        delete newObj[id].timestamp
      }
    }

    return newObj
  }

  getUsers() {
    return this.filterTombstones(this.doc.users)
  }

  getUsersInRoom(room: string) {
    const users = this.doc.getMap('users').toJSON()
    const userIDs: string[] = []
    for (const id in users) {
      if (users[id].room === room) {
        userIDs.push(id)
      }
    }
    return userIDs
  }

  addRoom(withTimestamp: boolean, name?: string) {
    if (name) {
      this.doc.rooms[name] = {
        studentPublicState: '',
        teacherPublicState: '',
        teacherPrivateState: '',
        timestamp: withTimestamp ? Date.now() : 0,
        tombstone: false,
      }

      this.update(withTimestamp)
    } else {
      const roomIDs: number[] = Object.keys(this.doc.rooms)
        .filter((e) => e.match(/Room/))
        .map((e) => e.split(' ')[1])
        .map((e) => parseInt(e))
        .sort()

      let newRoomID = 1
      for (const id of roomIDs) {
        if (id !== newRoomID) {
          break
        }
        newRoomID++
      }
      return this.addRoom(true, 'Room ' + newRoomID)
    }
  }

  gotoRoom(roomID: string) {
    if (this.isRoomAlive(roomID)) {
      this.userSettings.room = roomID
    } else {
      this.userSettings.room = LOBBY
    }

    this.userSettings.timestamp = Date.now()
    this.userSettings.tombstone = false

    this.doc.users[this.userID] = this.userSettings

    this.update(true)
  }

  isRoomAlive(roomID: string) {
    return this.doc.rooms[roomID] && !this.doc.rooms[roomID].tombstone
  }

  isUserAlive(userID: string) {
    return this.doc.users[userID] && !this.doc.users[userID].tombstone
  }

  encode() {
    return clone(this.doc)
  }

  update(full: boolean = true) {
    if (this.callback) {
      this.callback(full)
    }
  }

  merge(doc: any) {
    const rooms = this.doc.rooms
    const users = this.doc.users

    for (const id in doc.rooms) {
      if (!rooms[id]) {
        rooms[id] = doc.rooms[id]
      } else if (rooms[id].timestamp < doc.rooms[id].timestamp) {
        rooms[id] = doc.rooms[id]
      }
    }

    for (const id in doc.users) {
      if (!users[id]) {
        users[id] = doc.users[id]
      } else if (users[id].timestamp < doc.users[id].timestamp) {
        users[id] = doc.users[id]
      }
    }

    this.doc.rooms = clone(rooms)
    this.doc.users = clone(users)

    const fullUpdate = !deepEqual(this.toJSON(doc), this.toJSON(this.doc))

    this.update(fullUpdate)
  }

  removeUser(userID: string, performUpdate: boolean = false) {
    this.doc.users[userID].tombstone = true
    this.doc.users[userID].timestamp = Date.now()

    if (userID.startsWith(STATION) && this.isRoomAlive(userID)) {
      this.removeRoom(userID)
    }

    if (performUpdate) {
      this.update(true)
    }
  }

  removeRoom(roomID: string) {
    this.doc.rooms[roomID].tombstone = true
    this.doc.rooms[roomID].timestamp = Date.now()

    if (roomID.startsWith(STATION) && this.isUserAlive(roomID)) {
      this.removeUser(roomID)
    }

    for (const id in this.doc.users) {
      if (this.isUserAlive(id) && this.doc.users[id].room === roomID) {
        this.doc.users[id].room = LOBBY
        this.doc.users[id].timestamp = Date.now()
      }
    }
  }

  heartBeat() {
    const timeNow = Date.now()

    this.userSettings.timestamp = timeNow
    this.userSettings.tombstone = false

    this.doc.users[this.userID] = this.userSettings

    if (this.isStation) {
      this.doc.rooms[this.userID].timestamp = timeNow
      this.doc.rooms[this.userID].tombstone = false
    }

    let tombstones: string[] = []

    for (const id in this.doc.users) {
      if (this.isUserAlive(id)) {
        let timestamp = this.doc.users[id].timestamp || 0

        if (timestamp + HEARTBEAT_TIMEOUT < timeNow) {
          tombstones.push(id)
        }
      }
    }

    /*
    for (const id of tombstones) {
      console.warn('TOMBSTONE', id)
      this.removeUser(id)
    }

    // remove users entirely if they have been dead for a while

    for (const id in this.doc.users) {
      if (!this.isUserAlive(id)) {
        let timestamp = this.doc.users[id].timestamp || 0

        if (timestamp + HEARTBEAT_DEATH < timeNow) {
          delete this.doc.users[id]
        }
      }
    }
    */
    this.update(true)
  }

  on(event: 'update', callback: (full: boolean) => void) {
    this.callback = callback
  }
}

function throttle(
  cb: (full: boolean) => void,
  delay: number = HEARTBEAT_TIMEOUT
) {
  let timerID: number | null = null

  function execute() {
    try {
      cb(true)
      timerID = window.setTimeout(execute, delay)
    } catch (e) {
      timerID = null
    }
  }

  return (full: boolean) => {
    cb(full)

    if (timerID && full) {
      window.clearTimeout(timerID)
      timerID = null
    }

    if (!timerID) {
      timerID = window.setTimeout(execute, delay)
    }
  }
}
