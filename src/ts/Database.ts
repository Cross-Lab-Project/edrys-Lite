import { Dexie, liveQuery } from 'dexie'

export default class {
  private db: Dexie
  private observables: any = {}

  constructor() {
    this.db = new Dexie('EdrysLite')

    this.db.version(1).stores({
      data: `
            &id,
            timestamp,
            data`,
    })

    this.db
      .open()
      .then(function (db) {
        // Database opened successfully
        console.log('Database opened successfully')
      })
      .catch(function (err) {
        console.warn('Database error: ' + err.message)
      })
  }

  getAll() {
    return this.db['data'].orderBy('timestamp').desc().toArray()
  }

  async exists(id: string) {
    const item = await this.get(id)
    return item ? true : false
  }

  async get(id: string) {
    return await this.db['data'].get(id)
  }

  async put(id: string, data: any, timestamp: number) {
    console.warn('put', id, data, timestamp)
    await this.db['data'].put({
      id: id,
      timestamp: timestamp || Date.now(),
      data,
    })
  }

  update(config: any) {
    config.timestamp = Date.now()
    console.warn('UPDATE', config)
    this.db['data'].put(config)
  }

  drop(id: string) {
    this.db['data'].delete(id)
  }

  setObservable(id: string, callback: (result: any) => void) {
    if (this.observables[id]) {
      this.observables[id].unsubscribe()
      delete this.observables[id]
    }

    const db = this.db['data']
    const observable =
      id === '*'
        ? liveQuery(() => db.orderBy('timestamp').desc().toArray())
        : liveQuery(() => db.where('id').equals(id).toArray()[0])

    this.observables[id] = observable.subscribe({
      next: (result) => callback(result),
      error: (err) => console.warn(err),
    })
  }

  deleteObservable(id: string) {
    if (this.observables[id]) {
      this.observables[id].unsubscribe()
      delete this.observables[id]
    }
  }
}
