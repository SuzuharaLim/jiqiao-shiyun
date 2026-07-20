// 機巧時運 —— 認證後端（Express + SQLite + bcrypt + 伺服器端 Session Cookie）
// 對照《網頁登入功能完整需求指南》：認證/授權、密碼雜湊、Session、速率限制、鎖定、
// 防列舉、CSRF、安全標頭、Email 驗證、忘記/重設密碼、稽核、RBAC、GDPR 刪除帳號。
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import db from './db.js'
import { sendMail } from './mailer.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 8080
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`
const SESSION_MS = 7 * 24 * 60 * 60 * 1000   // 7 天
const LOCK_THRESHOLD = 5                       // 連續失敗 5 次
const LOCK_MINUTES = 15                        // 鎖定 15 分鐘
const BCRYPT_COST = 12
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-constant-time', BCRYPT_COST)

// ---------- 小工具 ----------
const now = () => new Date().toISOString()
const uuid = () => crypto.randomUUID()
const randToken = () => crypto.randomBytes(32).toString('hex')
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const plusMs = (ms) => new Date(Date.now() + ms).toISOString()
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const ipOf = (req) => (req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.ip
const timingEq = (a, b) => {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b))
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}
function audit(event, req, userId = null, detail = null) {
  db.prepare('INSERT INTO audit_log (event,user_id,ip,user_agent,detail,created_at) VALUES (?,?,?,?,?,?)')
    .run(event, userId, ipOf(req), req.headers['user-agent'] || '', detail, now())
}
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, emailVerified: !!u.email_verified_at })

// ---------- App ----------
const app = express()
app.set('trust proxy', 1)                       // Cloud Run 在反向代理後，才拿得到真實 IP / https
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                    // 內嵌 theme script 已外移到 /theme-init.js
      styleSrc: ["'self'", "'unsafe-inline'"],  // React 行內 style 屬性需要
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false,
  message: { error: '嘗試次數過多，請稍後再試' } })
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }))

// ---------- Session 中介層 ----------
app.use((req, res, next) => {
  req.user = null; req.session = null
  const sid = req.cookies?.sid
  if (sid) {
    const s = db.prepare('SELECT * FROM sessions WHERE id=?').get(sid)
    if (s && s.expires_at > now()) {
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(s.user_id)
      if (u) { req.session = s; req.user = u }
    } else if (s) {
      db.prepare('DELETE FROM sessions WHERE id=?').run(sid)   // 過期清除
    }
  }
  next()
})
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/', maxAge: SESSION_MS }
function startSession(res, user, req) {
  const id = randToken(), csrf = randToken()
  db.prepare('INSERT INTO sessions (id,user_id,csrf_token,ip,user_agent,expires_at,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, user.id, csrf, ipOf(req), req.headers['user-agent'] || '', plusMs(SESSION_MS), now())
  res.cookie('sid', id, cookieOpts)              // 登入即發新 session id → 防 Session Fixation
  return csrf
}
const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: '尚未登入' })
const requireCsrf = (req, res, next) =>
  timingEq(req.headers['x-csrf-token'] || '', req.session?.csrf_token || '') ? next() : res.status(403).json({ error: 'CSRF 驗證失敗' })

// ================= 認證路由 =================

// 註冊 + 寄驗證信
app.post('/api/register', authLimiter, async (req, res) => {
  const { name, email, password, website } = req.body || {}
  // Honeypot：正常表單不會填 website（隱藏欄位）；機器人自動填表會中招 → 回統一錯誤
  if (website) { audit('register_honeypot', req, null, email); return res.status(400).json({ error: '註冊失敗，請稍後再試' }) }
  if (!name?.trim() || !emailOk(email || '') || (password || '').length < 8)
    return res.status(400).json({ error: '請填寫暱稱、有效 Email，密碼至少 8 碼' })
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase())
  if (exists) return res.status(409).json({ error: '此 Email 已被註冊或無法使用' })   // 註冊 UX 取捨：明確告知
  const id = uuid()
  const hash = await bcrypt.hash(password, BCRYPT_COST)
  db.prepare(`INSERT INTO users (id,email,name,password_hash,role,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?)`).run(id, email.toLowerCase(), name.trim(), hash, 'user', now(), now())
  audit('register', req, id)
  // 寄 email 驗證信（一次性、時效 token；只存 hash）
  const token = randToken()
  db.prepare('INSERT INTO tokens (id,user_id,kind,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)')
    .run(uuid(), id, 'email_verify', sha256(token), plusMs(24 * 60 * 60 * 1000), now())
  const link = `${APP_URL}/verify-email?token=${token}`
  const { devLink } = sendMail({ to: email, subject: '請驗證你的機巧時運帳號', link })
  const csrf = startSession(res, { id }, req)     // 註冊後直接登入（未驗證狀態）
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id)), csrfToken: csrf, devVerifyLink: devLink })
})

// 登入
app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {}
  const fail = () => res.status(401).json({ error: '帳號或密碼錯誤' })     // 統一錯誤訊息（防列舉）
  const u = emailOk(email || '') ? db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) : null
  // 帳號鎖定
  if (u && u.locked_until && u.locked_until > now()) { audit('login_locked', req, u.id); return fail() }
  // 一律跑一次 bcrypt（即使查無此人也比對假 hash）→ 回應時間相近，防列舉/時間側錄
  const ok = await bcrypt.compare(password || '', u ? u.password_hash : DUMMY_HASH)
  if (!u || !ok) {
    if (u) {
      const n = u.failed_login_count + 1
      const lock = n >= LOCK_THRESHOLD ? plusMs(LOCK_MINUTES * 60 * 1000) : null
      db.prepare('UPDATE users SET failed_login_count=?, locked_until=?, updated_at=? WHERE id=?').run(n, lock, now(), u.id)
      audit(lock ? 'login_fail_lock' : 'login_fail', req, u.id)
    } else audit('login_fail_nouser', req, null, email)
    return fail()
  }
  db.prepare('UPDATE users SET failed_login_count=0, locked_until=NULL, last_login_at=?, updated_at=? WHERE id=?').run(now(), now(), u.id)
  const csrf = startSession(res, u, req)
  audit('login', req, u.id)
  res.json({ user: publicUser(u), csrfToken: csrf })
})

// 目前登入者（前端啟動時還原登入態）
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: '尚未登入' })
  res.json({ user: publicUser(req.user), csrfToken: req.session.csrf_token })
})

// 登出
app.post('/api/logout', requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id=?').run(req.session.id)
  res.clearCookie('sid', { ...cookieOpts, maxAge: undefined })
  audit('logout', req, req.user.id)
  res.json({ ok: true })
})

// 登出所有裝置
app.post('/api/logout-all', requireAuth, requireCsrf, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.user.id)
  res.clearCookie('sid', { ...cookieOpts, maxAge: undefined })
  audit('logout_all', req, req.user.id)
  res.json({ ok: true })
})

// 已登入裝置/session 列表
app.get('/api/sessions', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id,ip,user_agent,created_at,expires_at FROM sessions WHERE user_id=? ORDER BY created_at DESC').all(req.user.id)
  res.json({ sessions: rows.map(r => ({ ...r, id: r.id.slice(0, 8), current: req.session.id.startsWith(r.id.slice(0, 8)) })) })
})

// 忘記密碼（不論帳號是否存在，回應一致；防列舉）
app.post('/api/password/forgot', authLimiter, (req, res) => {
  const { email } = req.body || {}
  const generic = { message: '若此信箱存在，我們已寄出重設連結' }
  if (!emailOk(email || '')) return res.json(generic)
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase())
  let devLink
  if (u) {
    const token = randToken()
    db.prepare('INSERT INTO tokens (id,user_id,kind,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)')
      .run(uuid(), u.id, 'password_reset', sha256(token), plusMs(60 * 60 * 1000), now())   // 1 小時效期
    const link = `${APP_URL}/reset-password?token=${token}`
    devLink = sendMail({ to: email, subject: '重設你的機巧時運密碼', link }).devLink
    audit('password_forgot', req, u.id)
  } else audit('password_forgot_nouser', req, null, email)
  res.json({ ...generic, devResetLink: devLink })   // devLink 只有 user 存在且非正式環境才有
})

// 重設密碼（時效、一次性 token；成功後登出所有裝置）
app.post('/api/password/reset', authLimiter, async (req, res) => {
  const { token, password } = req.body || {}
  if (!token || (password || '').length < 8) return res.status(400).json({ error: '連結無效或密碼太短（至少 8 碼）' })
  const row = db.prepare("SELECT * FROM tokens WHERE kind='password_reset' AND token_hash=? AND used_at IS NULL").get(sha256(token))
  if (!row || row.expires_at < now()) return res.status(400).json({ error: '連結已失效，請重新申請' })
  const hash = await bcrypt.hash(password, BCRYPT_COST)
  db.prepare('UPDATE users SET password_hash=?, failed_login_count=0, locked_until=NULL, updated_at=? WHERE id=?').run(hash, now(), row.user_id)
  db.prepare('UPDATE tokens SET used_at=? WHERE id=?').run(now(), row.id)
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id)   // 改密碼→踢掉所有裝置
  audit('password_reset', req, row.user_id)
  res.json({ ok: true, message: '密碼已更新，請用新密碼登入' })
})

// 改密碼（已登入）
app.post('/api/password/change', requireAuth, requireCsrf, async (req, res) => {
  const { current, password } = req.body || {}
  if ((password || '').length < 8) return res.status(400).json({ error: '新密碼至少 8 碼' })
  if (!(await bcrypt.compare(current || '', req.user.password_hash))) return res.status(400).json({ error: '目前密碼錯誤' })
  const hash = await bcrypt.hash(password, BCRYPT_COST)
  db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(hash, now(), req.user.id)
  db.prepare('DELETE FROM sessions WHERE user_id=? AND id<>?').run(req.user.id, req.session.id)  // 保留本裝置、踢其他
  audit('password_change', req, req.user.id)
  res.json({ ok: true, message: '密碼已更新，其他裝置已登出' })
})

// Email 驗證
app.post('/api/verify-email', (req, res) => {
  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: '缺少驗證 token' })
  const row = db.prepare("SELECT * FROM tokens WHERE kind='email_verify' AND token_hash=? AND used_at IS NULL").get(sha256(token))
  if (!row || row.expires_at < now()) return res.status(400).json({ error: '驗證連結已失效' })
  db.prepare('UPDATE users SET email_verified_at=?, updated_at=? WHERE id=?').run(now(), now(), row.user_id)
  db.prepare('UPDATE tokens SET used_at=? WHERE id=?').run(now(), row.id)
  audit('email_verified', req, row.user_id)
  res.json({ ok: true, message: 'Email 已驗證 ✓' })
})

// 刪除帳號（GDPR 被遺忘權；需密碼確認）
app.delete('/api/account', requireAuth, requireCsrf, async (req, res) => {
  const { password } = req.body || {}
  if (!(await bcrypt.compare(password || '', req.user.password_hash))) return res.status(400).json({ error: '密碼錯誤' })
  audit('account_delete', req, req.user.id)
  db.prepare('DELETE FROM users WHERE id=?').run(req.user.id)   // 連帶 sessions/tokens ON DELETE CASCADE
  res.clearCookie('sid', { ...cookieOpts, maxAge: undefined })
  res.json({ ok: true })
})

// 匯出我的資料（GDPR 可攜權）
app.get('/api/account/export', requireAuth, (req, res) => {
  const u = req.user
  res.json({ profile: publicUser(u), created_at: u.created_at, last_login_at: u.last_login_at,
    audit: db.prepare('SELECT event,ip,created_at FROM audit_log WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(u.id) })
})

// 範例：需要 admin 角色的授權（RBAC）
const requireRole = (role) => (req, res, next) => req.user?.role === role ? next() : res.status(403).json({ error: '權限不足' })
app.get('/api/admin/audit', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ audit: db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all() })
})

// ================= 訂單 =================

// 建立訂單（下單）：伺服器產生單號/日期/狀態，只信任驗證過的 items/total/pay
app.post('/api/orders', requireAuth, requireCsrf, (req, res) => {
  const { items, pay } = req.body || {}
  if (!Array.isArray(items) || !items.length || items.length > 50)
    return res.status(400).json({ error: '訂單內容無效' })
  const clean = []
  for (const it of items) {
    const name = String(it?.name || '').trim().slice(0, 80)
    const price = Number(it?.price)
    if (!name || !Number.isFinite(price) || price < 0 || price > 1000000)
      return res.status(400).json({ error: '訂單品項無效' })
    clean.push({ name, price: Math.round(price) })
  }
  const total = clean.reduce((s, i) => s + i.price, 0)   // 金額由伺服器計算，不信前端
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const ymd = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const countToday = db.prepare("SELECT COUNT(*) c FROM orders WHERE user_id=? AND id LIKE ?").get(req.user.id, `JQ-${ymd}-%`).c
  const id = `JQ-${ymd}-${pad(countToday + 1)}`
  const order = {
    id, date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
    items: clean, total, status: '處理中', pay: String(pay || '').slice(0, 40),
  }
  db.prepare('INSERT INTO orders (id,user_id,items_json,total,status,pay,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, JSON.stringify(clean), total, order.status, order.pay, now())
  audit('order_create', req, req.user.id, id)
  // 訂單確認信（dev 環境記 log；正式接真 SMTP）
  sendMail({ to: req.user.email, subject: `訂單確認 ${id}（NT$${total}）`, link: `${APP_URL}/` })
  res.json({ order })
})

// 我的訂單列表
app.get('/api/orders', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.user.id)
  res.json({
    orders: rows.map(r => ({
      id: r.id, date: r.created_at.slice(0, 10).replaceAll('-', '/'),
      items: JSON.parse(r.items_json), total: r.total, status: r.status, pay: r.pay,
    })),
  })
})

// ================= 個人資料 =================

// 更新暱稱（EditProfile 持久化到後端；簡介/頭像等展示欄位仍屬前端示範）
app.patch('/api/me', requireAuth, requireCsrf, (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name || name.length > 30) return res.status(400).json({ error: '暱稱需為 1–30 字' })
  db.prepare('UPDATE users SET name=?, updated_at=? WHERE id=?').run(name, now(), req.user.id)
  audit('profile_update', req, req.user.id)
  res.json({ user: publicUser({ ...req.user, name }) })
})

// 健康檢查
app.get('/api/health', (req, res) => res.json({ ok: true }))

// ---------- 靜態前端（正式：node 同時 serve dist + SPA fallback）----------
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1y', setHeaders: (res, p) => { if (p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache') } }))
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(join(distDir, 'index.html')))
}

// ---------- 錯誤處理：不向使用者洩漏堆疊（正式環境合規） ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[err]', req.method, req.path, err.message)
  if (res.headersSent) return
  res.status(err.status || 500).json({ error: '伺服器忙碌中，請稍後再試' })
})

// 正式環境設定檢查：APP_URL 沒設會讓驗證/重設信連結指向 localhost
if (isProd && !process.env.APP_URL) {
  console.warn('[warn] NODE_ENV=production 但未設定 APP_URL —— 驗證信/重設密碼連結將指向 localhost，請設定正式網址')
}

app.listen(PORT, () => console.log(`[jiqiao-auth] listening on ${PORT} (prod=${isProd})`))
