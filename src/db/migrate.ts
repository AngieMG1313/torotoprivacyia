// Minimal migration runner: applies db/migrations/*.sql in filename order,
// tracking what ran in schema_migrations. Run with `npm run db:migrate`.
import { readFileSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getPool } from '../services/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', '..', 'db', 'migrations')

async function main() {
  const pool = getPool()
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const applied = new Set(
    (await pool.query('select filename from schema_migrations')).rows.map(
      (r) => r.filename,
    ),
  )

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip (already applied): ${file}`)
      continue
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    console.log(`applying: ${file}`)
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query('create extension if not exists pgcrypto')
      await client.query(sql)
      await client.query(
        'insert into schema_migrations (filename) values ($1)',
        [file],
      )
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    } finally {
      client.release()
    }
  }

  console.log('migrations up to date')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
