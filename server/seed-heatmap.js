/**
 * Seed public.Heatmap with all unique combinations of params and add UNIQUE constraint.
 * Run: node server/seed-heatmap.js
 *
 * Ranges:
 *   macd_fast: 12..20, macd_slow: 26..35, macd_signal: 1..5
 *   bb_period: 1..10, bb_devup/bb_devdown: 0.1..1.0 step 0.1
 * Score: 40% in 0.1–0.3, 30% in 0.3–0.6, 20% in 0.6–0.8, 10% in 0.8–0.999
 */
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
})

// DB column names (quoted for PostgreSQL)
const COLS = {
  id: 'id',
  macd_fast: 'MACD.Fast ',
  macd_slow: 'MACD.Slow ',
  macd_signal: 'MACD.Signal',
  bb_period: 'BB.Period',
  bb_devup: 'BB.DevUp',
  bb_devdown: 'BB.DevDown',
  score: 'Score',
}

function range(a, b, step = 1) {
  const out = []
  for (let v = a; v <= b; v += step) out.push(Number(v.toFixed(2)))
  return out
}

function randomIn(min, max) {
  return min + Math.random() * (max - min)
}

/** Score: 3 decimal places */
function score3(value) {
  return Number(Number(value).toFixed(3))
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function main() {
  const client = await pool.connect()

  try {
    // 1) Add UNIQUE constraint (drop if exists for re-runs)
    try {
      await client.query(`
        ALTER TABLE "Heatmap"
        DROP CONSTRAINT IF EXISTS heatmap_unique_params
      `)
    } catch (_) {}
    await client.query(`
      ALTER TABLE "Heatmap"
      ADD CONSTRAINT heatmap_unique_params
      UNIQUE ("${COLS.macd_fast}", "${COLS.macd_slow}", "${COLS.macd_signal}", "${COLS.bb_period}", "${COLS.bb_devup}", "${COLS.bb_devdown}")
    `)
    console.log('UNIQUE constraint added.')

    // 2) Build all combinations
    const macd_fast = range(12, 20, 1)
    const macd_slow = range(26, 35, 1)
    const macd_signal = range(1, 5, 1)
    const bb_period = range(1, 10, 1)
    const bb_devup = range(0.1, 1, 0.1)
    const bb_devdown = range(0.1, 1, 0.1)

    const combinations = []
    for (const a of macd_fast) {
      for (const b of macd_slow) {
        for (const c of macd_signal) {
          for (const d of bb_period) {
            for (const e of bb_devup) {
              for (const f of bb_devdown) {
                combinations.push({ macd_fast: a, macd_slow: b, macd_signal: c, bb_period: d, bb_devup: e, bb_devdown: f })
              }
            }
          }
        }
      }
    }
    console.log('Combinations:', combinations.length)

    // 3) Assign scores: 40% / 30% / 20% / 10%
    shuffle(combinations)
    const n = combinations.length
    const i40 = Math.floor(n * 0.4)
    const i30 = i40 + Math.floor(n * 0.3)
    const i20 = i30 + Math.floor(n * 0.2)
    for (let i = 0; i < n; i++) {
      if (i < i40) combinations[i].score = score3(randomIn(0.1, 0.3))
      else if (i < i30) combinations[i].score = score3(randomIn(0.3, 0.6))
      else if (i < i20) combinations[i].score = score3(randomIn(0.6, 0.8))
      else combinations[i].score = score3(randomIn(0.8, 0.999))
    }

    // 4) Clear and insert in batches
    await client.query('TRUNCATE TABLE "Heatmap" RESTART IDENTITY')
    const BATCH = 5000
    const quoted = (name) => `"${name}"`
    const cols = [quoted(COLS.macd_fast), quoted(COLS.macd_slow), quoted(COLS.macd_signal), quoted(COLS.bb_period), quoted(COLS.bb_devup), quoted(COLS.bb_devdown), quoted(COLS.score)]
    let inserted = 0
    for (let i = 0; i < combinations.length; i += BATCH) {
      const chunk = combinations.slice(i, i + BATCH)
      const values = chunk.flatMap((r) => [r.macd_fast, r.macd_slow, r.macd_signal, r.bb_period, r.bb_devup, r.bb_devdown, r.score])
      const rowPlaceholders = chunk.map((_, j) => {
        const base = j * 7 + 1
        return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      }).join(', ')
      await client.query(
        `INSERT INTO "Heatmap" (${cols.join(', ')}) VALUES ${rowPlaceholders}`,
        values
      )
      inserted += chunk.length
      console.log('Inserted', inserted, '/', combinations.length)
    }
    console.log('Done. Total rows:', inserted)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
