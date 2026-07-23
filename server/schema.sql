-- 機巧時運 資料庫 schema（可移植：PostgreSQL / SQLite 皆可執行）
-- 設計原則：
--   * 主鍵一律 TEXT（UUID 或語意 id），不用 SERIAL/AUTOINCREMENT（避免方言差異）
--   * 時間一律 TEXT ISO-8601（'2026-07-12T...'），字典序＝時間序，兩種 DB 比較行為一致
--   * 只用 TEXT / INTEGER，不用 boolean/timestamp 型別，最大化可移植性
--   * 全部 CREATE ... IF NOT EXISTS，可重入

-- ── 帳號與認證 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  email              TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  password_hash      TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'user',
  handle             TEXT,                       -- @帳號（展示用，可空）
  bio                TEXT,
  avatar             TEXT,                       -- emoji 頭像
  avatar_bg          TEXT,
  avatar_image_id    TEXT,                      -- 使用者上傳的頭像（images.id）；有值時優先於 emoji
  is_seed            INTEGER NOT NULL DEFAULT 0, -- 1＝種子內容作者（非真人登入）
  is_private         INTEGER NOT NULL DEFAULT 0, -- 1＝私密帳號（公開頁隱藏貼文/作品）
  email_verified_at  TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until       TEXT,
  last_login_at      TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
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
  kind        TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,                  -- UUID（原為 autoincrement，改 UUID 以可移植）
  event       TEXT NOT NULL,
  user_id     TEXT,
  ip          TEXT,
  user_agent  TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL
);

-- ── 交易 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,                  -- JQ-YYMMDD-NN
  user_id     TEXT NOT NULL,
  items_json  TEXT NOT NULL,
  total       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT '處理中',
  pay         TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── 社群內容（真實、可變）───────────────────────────────────
-- 貼文（節氣攝影社群）
CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  emoji         TEXT,
  bg            TEXT,
  term          TEXT,                            -- 節氣標籤
  title         TEXT NOT NULL,
  caption       TEXT,
  tags_json     TEXT,                            -- ["芒種","田間"]
  place         TEXT,
  image_id      TEXT,                            -- 使用者上傳的照片（images 表；NULL＝emoji 佔位）
  like_count    INTEGER NOT NULL DEFAULT 0,      -- 反正規化計數（配合 post_likes）
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 留言
CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  post_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 按讚（每人每貼文一筆）
CREATE TABLE IF NOT EXISTS post_likes (
  post_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 市集作品（授權販售）
CREATE TABLE IF NOT EXISTS works (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  emoji       TEXT,
  bg          TEXT,
  term        TEXT,
  title       TEXT NOT NULL,
  tags_json   TEXT,                              -- ["花卉","海"]；供探索頁的題材篩選
  price       INTEGER NOT NULL DEFAULT 0,        -- 0＝僅展示未販售
  image_id    TEXT,                              -- 使用者上傳的照片（images 表）
  like_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 追蹤（follower 追 followee）
CREATE TABLE IF NOT EXISTS follows (
  follower_id  TEXT NOT NULL,
  followee_id  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(followee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知（每使用者）
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  emoji       TEXT,
  body        TEXT NOT NULL,
  to_screen   TEXT,
  props_json  TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 使用者上傳的圖片（base64 存 TEXT，pg/sqlite 皆可；由 /api/images/:id 供圖）
CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  mime        TEXT NOT NULL,                     -- image/jpeg | image/png | image/webp
  data        TEXT NOT NULL,                     -- base64（前端已壓縮，上限 3MB）
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 檢舉（內容治理：貼文/留言/作品/使用者）
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,                     -- post / comment / work / user
  target_id   TEXT NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'open',      -- open / resolved / dismissed
  created_at  TEXT NOT NULL,
  FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── 參考／編輯內容（唯讀，種子灌入）────────────────────────
-- 單表存所有清單型內容：kind＝proverbs/deities/festivals/flowers/ingredients/zodiacs/
--   solarTerms/challenges/fortuneTools/cultureTools/plans...；data＝該筆 JSON。
CREATE TABLE IF NOT EXISTS ref_items (
  kind        TEXT NOT NULL,
  id          TEXT NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0,
  data        TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);

-- ── 使用者常用位置（新增地點：搜尋/地圖/常用）──────────────
CREATE TABLE IF NOT EXISTS user_places (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  lat         TEXT,
  lon         TEXT,
  fav         INTEGER NOT NULL DEFAULT 0,        -- 1＝常用（釘選）
  used_at     TEXT NOT NULL,                     -- 最近使用時間（排序用）
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── 索引 ───────────────────────────────────────────────────
-- handle 唯一（大小寫不敏感）；NULL 可重複（未設定者）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle ON users (lower(handle));
CREATE INDEX IF NOT EXISTS idx_places_user   ON user_places(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user    ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created  ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_term     ON posts(term);
CREATE INDEX IF NOT EXISTS idx_comments_post  ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_works_created  ON works(created_at);
CREATE INDEX IF NOT EXISTS idx_notis_user     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ref_kind       ON ref_items(kind);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- 客服／聯絡訊息：使用者傳給營運團隊的訊息（取代原本假的私訊列表與假的「詢價已送出」）
CREATE TABLE IF NOT EXISTS support_messages (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  topic       TEXT NOT NULL,          -- 一般問題／企業客製詢價／帳號問題／回報問題
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | closed
  created_at  TEXT NOT NULL
);
