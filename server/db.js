// SQLite 資料層（better-sqlite3，同步 API）
// 資料表：users / sessions / tokens / audit_log
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = process.env.DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), 'data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'auth.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                 TEXT PRIMARY KEY,          -- UUID（不可猜測）
    email              TEXT UNIQUE NOT NULL,
    name               TEXT NOT NULL,
    password_hash      TEXT NOT NULL,             -- bcrypt（含 salt），永不存明文
    role               TEXT NOT NULL DEFAULT 'user',
    email_verified_at  TEXT,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until       TEXT,
    last_login_at      TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,                 -- 隨機 256-bit，Cookie 只帶此 id
    user_id     TEXT NOT NULL,
    csrf_token  TEXT NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS tokens (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    kind        TEXT NOT NULL,                    -- 'email_verify' | 'password_reset'
    token_hash  TEXT NOT NULL,                    -- 只存 SHA-256(token)，原 token 只寄出一次
    expires_at  TEXT NOT NULL,
    used_at     TEXT,
    created_at  TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event       TEXT NOT NULL,
    user_id     TEXT,
    ip          TEXT,
    user_agent  TEXT,
    detail      TEXT,
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,                 -- JQ-YYMMDD-NN（伺服器產生）
    user_id     TEXT NOT NULL,
    items_json  TEXT NOT NULL,                    -- [{name, price}]
    total       INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT '處理中',
    pay         TEXT,
    created_at  TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tokens_user   ON tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
  CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
`)

export default db
