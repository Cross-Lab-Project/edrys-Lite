import { Dexie } from 'dexie'

export default class {
  private db: Dexie

  constructor() {
    this.db = new Dexie('EdrysLite')

    this.db.version(1).stores({
      data: `
            &id,
            timestamp,
            data,
            owner,
            shared`,
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

  async put(
    id: string,
    data: any,
    timestamp: number,
    owner: boolean = false,
    shared: boolean = false
  ) {
    console.warn('put', id, data, owner)
    await this.db['data'].put({
      id: id,
      timestamp: timestamp || Date.now(),
      data,
      owner,
      shared,
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
}
