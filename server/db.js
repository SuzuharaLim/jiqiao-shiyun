// 資料層 —— 正式環境：PostgreSQL（Cloud SQL）；開發／無雲端時：SQLite 後備。
//
// 兩種驅動共用同一套「非同步」介面與同一份 schema.sql；SQL 一律用 `?` 佔位，
// pg 驅動會把 `?` 轉成 `$1,$2...`。選擇邏輯：
//   有 DATABASE_URL / INSTANCE_CONNECTION_NAME / DB_HOST → 用 PostgreSQL；否則用 SQLite。
//
// 介面：
//   db.kind                     'pg' | 'sqlite'
//   await db.exec(sql)          執行 DDL（可多段）
//   await db.all(sql, params)   回傳 rows 陣列
//   await db.get(sql, params)   回傳第一列（或 undefined）
//   await db.run(sql, params)   回傳 { changes }
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const usePg = !!(process.env.DATABASE_URL || process.env.INSTANCE_CONNECTION_NAME || process.env.DB_HOST)

async function makePg() {
  const { default: pg } = await import('pg')
  const { Pool } = pg
  let cfg
  // 優先序：DATABASE_URL（明確覆寫，種子/本機用）> INSTANCE_CONNECTION_NAME（Cloud Run socket）> DB_HOST。
  // ★ DATABASE_URL 必須排第一：Cloud Shell 種子時兩者可能同時存在（部署 shell export 過 INSTANCE_CONNECTION_NAME），
  //   若 socket 分支先中，會去連不存在的 /cloudsql/... 而失敗。Cloud Run 執行時只設 INSTANCE_CONNECTION_NAME、不設 DATABASE_URL，故仍正確走 socket。
  if (process.env.DATABASE_URL) {
    cfg = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 5,
    }
  } else if (process.env.INSTANCE_CONNECTION_NAME) {
    // Cloud Run → Cloud SQL：透過 unix socket /cloudsql/PROJECT:REGION:INSTANCE
    cfg = {
      host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
      max: 5,
    }
  } else {
    cfg = {
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 5,
    }
  }
  const pool = new Pool(cfg)
  pool.on('error', (e) => console.error('[pg] pool error', e.message))
  // `?` → `$1,$2...`（我們的 SQL 內無字串字面量含 ?）
  const tr = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`) }
  return {
    kind: 'pg',
    async exec(sql) { await pool.query(sql) },
    async all(sql, p = []) { const r = await pool.query(tr(sql), p); return r.rows },
    async get(sql, p = []) { const r = await pool.query(tr(sql), p); return r.rows[0] },
    async run(sql, p = []) { const r = await pool.query(tr(sql), p); return { changes: r.rowCount } },
    async close() { await pool.end() },
  }
}

async function makeSqlite() {
  const { default: Database } = await import('better-sqlite3')
  const { mkdirSync } = await import('node:fs')
  const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
  mkdirSync(DATA_DIR, { recursive: true })
  const sq = new Database(join(DATA_DIR, 'auth.db'))
  sq.pragma('journal_mode = WAL')
  sq.pragma('foreign_keys = ON')
  return {
    kind: 'sqlite',
    async exec(sql) { sq.exec(sql) },
    async all(sql, p = []) { return sq.prepare(sql).all(...p) },
    async get(sql, p = []) { return sq.prepare(sql).get(...p) },
    async run(sql, p = []) { const r = sq.prepare(sql).run(...p); return { changes: r.changes } },
    async close() { sq.close() },
  }
}

// 正式環境未設定任何 DB → 明確報錯（否則會退回 SQLite，而 better-sqlite3 在正式映像被 --omit=optional 移除，
// 只會拋 ERR_MODULE_NOT_FOUND 這種難懂錯誤、容器起不來）。
if (!usePg && process.env.NODE_ENV === 'production') {
  throw new Error('未設定資料庫：正式部署請設定 INSTANCE_CONNECTION_NAME（Cloud SQL）或 DATABASE_URL。見 docs/部署-CloudRun-PostgreSQL.md')
}

const db = usePg ? await makePg() : await makeSqlite()

// 建立／更新表結構（可重入）
await db.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'))

// 輕量遷移：CREATE IF NOT EXISTS 不會補「既有表的新欄位」，在此逐條 ALTER（已存在則忽略）。
// 新增欄位時請「同步」維護 schema.sql 與這份清單（pg/sqlite 皆支援此語法）。
for (const sql of [
  "ALTER TABLE users ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE posts ADD COLUMN image_id TEXT",
  "ALTER TABLE works ADD COLUMN image_id TEXT",
  "ALTER TABLE users ADD COLUMN avatar_image_id TEXT",
  "ALTER TABLE works ADD COLUMN tags_json TEXT",
  // 編輯功能：記錄最後編輯時間，UI 顯示「已編輯」
  "ALTER TABLE posts ADD COLUMN updated_at TEXT",
  "ALTER TABLE works ADD COLUMN updated_at TEXT",
  // 訂單取消：記錄取消時間與原因
  "ALTER TABLE orders ADD COLUMN cancelled_at TEXT",
  "ALTER TABLE orders ADD COLUMN cancel_reason TEXT",
]) {
  try { await db.exec(sql) } catch { /* 欄位已存在 */ }
}
console.log(`[db] ready (${db.kind})`)

export default db
