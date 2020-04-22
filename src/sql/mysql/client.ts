import mysql from 'mysql2/promise'

export default class MySQL {
  static async dial(uri: string) {
    const c = await mysql.createConnection({ uri })
    return new MySQL(c)
  }
  private constructor(private readonly c: mysql.Connection) {}

  async query(_query: string) {}

  close(): Promise<void> {
    return this.c.end()
  }
}
