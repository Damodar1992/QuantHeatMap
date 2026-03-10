/**
 * Backend server: connects to Neon PostgreSQL and exposes /api routes.
 * Run: npm run server (default port 3001). Vite dev proxy forwards /api to this server.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pg from 'pg'

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(cors())
app.use(express.json())

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
})

/** Health check + DB connectivity */
app.get('/api/db/health', async (_req, res) => {
  try {
    const client = await pool.connect()
    const r = await client.query('SELECT 1 as ok, current_database() as db')
    client.release()
    res.json({ ok: true, db: r.rows[0]?.db ?? null })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

/** List tables (for quick check) */
app.get('/api/db/tables', async (_req, res) => {
  try {
    const client = await pool.connect()
    const r = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `)
    client.release()
    res.json({ tables: r.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Table structure (columns) for schema.table */
app.get('/api/db/table/:schema/:table', async (req, res) => {
  const { schema, table } = req.params
  try {
    const client = await pool.connect()
    const r = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    )
    client.release()
    res.json({ schema, table, columns: r.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Records from public.Heatmap for matrix build. Returns [{ id, params: { MACD.fast, ... }, score }]. */
const HEATMAP_DB_TO_APP = {
  'MACD.Fast ': 'MACD.fast',
  'MACD.Slow ': 'MACD.slow',
  'MACD.Signal': 'MACD.signal',
  'BB.Period': 'BB.time',
  'BB.DevUp': 'BB.devUp',
  'BB.DevDown': 'BB.devDown',
}
app.get('/api/db/heatmap/records', async (_req, res) => {
  try {
    const client = await pool.connect()
    const r = await client.query(`
      SELECT id, "MACD.Fast ", "MACD.Slow ", "MACD.Signal", "BB.Period", "BB.DevUp", "BB.DevDown", "Score"
      FROM "Heatmap"
      ORDER BY id
    `)
    client.release()
    const records = r.rows.map((row) => {
      const params = {}
      for (const [dbCol, appKey] of Object.entries(HEATMAP_DB_TO_APP)) {
        if (row[dbCol] != null) params[appKey] = Number(row[dbCol])
      }
      return {
        id: row.id,
        params,
        score: row.Score != null ? Number(row.Score) : 0,
      }
    })
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('Neon DB connected via DATABASE_URL')
})
