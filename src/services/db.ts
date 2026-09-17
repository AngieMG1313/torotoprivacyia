import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | undefined

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. See .env.example for required environment variables.',
      )
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params)
}
