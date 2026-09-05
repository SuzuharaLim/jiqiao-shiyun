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

-- ══════════════════════════════════════════════════════════════════
-- 推播訂閱（Web Push）——使用者的推播端點與金鑰
-- 「節氣提醒／神佛誕辰／互動通知」需要真的能送出，先前只有前端開關。
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS push_subs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL,                    -- 瀏覽器給的推播端點 URL
  p256dh      TEXT NOT NULL,                    -- 加密公鑰
  auth        TEXT NOT NULL,                    -- 加密驗證密鑰
  ua          TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_endpoint ON push_subs(endpoint);

-- 推播偏好：哪些類型要收（與 push_subs 分開，因為偏好是「人」的層級）
CREATE TABLE IF NOT EXISTS push_prefs (
  user_id     TEXT PRIMARY KEY,
  solar_term  INTEGER NOT NULL DEFAULT 1,       -- 節氣提醒
  deity       INTEGER NOT NULL DEFAULT 0,       -- 神佛誕辰
  social      INTEGER NOT NULL DEFAULT 1,       -- 按讚/留言/追蹤
  updated_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════════════════════
-- 分潤結算（骨架）——⚠️ 尚未簽約金流，不會真的動錢
-- 設計為「先記帳、後付款」：ledger 記錄每一筆應付分潤，
-- payouts 記錄提領申請。兩者都不碰真實金流，等簽約後接上即可。
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ledger (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,                    -- 收款人（創作者）
  order_id    TEXT,                             -- 來源訂單
  work_id     TEXT,                             -- 來源作品
  kind        TEXT NOT NULL,                    -- license / calendar / bonus / adjust
  gross       INTEGER NOT NULL,                 -- 成交總額（分）
  rate        INTEGER NOT NULL DEFAULT 70,      -- 分潤比例（%）
  amount      INTEGER NOT NULL,                 -- 應付創作者（分）
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending / available / paid / void
  note        TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id, status);

CREATE TABLE IF NOT EXISTS payouts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  amount      INTEGER NOT NULL,                 -- 提領金額（分）
  status      TEXT NOT NULL DEFAULT 'requested',-- requested / processing / paid / rejected
  method      TEXT,                             -- 匯款方式（簽約後填）
  note        TEXT,
  created_at  TEXT NOT NULL,
  settled_at  TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id, created_at);

-- ══════════════════════════════════════════════════════════════════
-- 節氣徽章（AR 小挑戰答對取得）
-- ⚠️ 訪客也能拿徽章（存在瀏覽器的 localStorage），登入後才會合併上來。
--    所以這張表只存「已登入者」的，PRIMARY KEY 用 (user_id, badge_id)
--    讓合併時的重複插入天然無害（ON CONFLICT DO NOTHING）。
-- ⚠️ 不建 badge 的主檔表：徽章的名稱與圖示屬於前端內容（src/lib/arBadges.js
--    的 BADGES），與「有沒有拿到」是兩件事。做成表只會多一份要同步的資料。
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_badges (
  user_id    TEXT NOT NULL,
  badge_id   TEXT NOT NULL,
  earned_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, badge_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, earned_at);

-- ════════════════ 節氣知識王：真人對戰 ════════════════
--
-- ★★★★ 為什麼對戰狀態放 DB 而不是記憶體：
--   Cloud Run 會**水平擴展成多個實例**，而兩個玩家的請求不保證落在同一台。
--   把房間放在記憶體裡，在單一實例的本機測起來完全正常，一上正式站就變成
--   「兩個人各自在不同的房間裡對打」——而且沒有任何錯誤訊息。
--   （這與站上把 session 從 SQLite 改成 Cloud SQL 是同一個理由。）
--
-- ⚠️ 欄位型別守 db.js 的可移植性原則：時間一律 TEXT（ISO 字串，字典序＝時間序），
--    布林用 INTEGER，不用 SERIAL／AUTOINCREMENT／timestamp。
CREATE TABLE IF NOT EXISTS quiz_matches (
  id          TEXT PRIMARY KEY,
  status      TEXT NOT NULL,           -- waiting | playing | done
  seed        TEXT NOT NULL,           -- 兩邊用同一副牌，靠它產生
  -- ★ 每個座位一把**能力金鑰**：訪客沒有帳號也能對戰，而且只動得了自己那一格。
  p1_key      TEXT NOT NULL,
  p2_key      TEXT,
  p1_uid      TEXT,                    -- 有登入才有，用來擋同一人自己跟自己打
  p2_uid      TEXT,
  p1_name     TEXT NOT NULL,
  p2_name     TEXT,
  p1_hp       INTEGER NOT NULL,
  p2_hp       INTEGER NOT NULL,
  p1_score    INTEGER NOT NULL,
  p2_score    INTEGER NOT NULL,
  p1_done     INTEGER NOT NULL,        -- 已作答題數
  p2_done     INTEGER NOT NULL,
  p1_seen     TEXT NOT NULL,           -- 最後一次輪詢時間，用來判離線
  p2_seen     TEXT,
  winner      TEXT,                    -- p1 | p2 | null
  over_reason TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quiz_wait ON quiz_matches(status, created_at);
