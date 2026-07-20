// 機巧時運 —— 後端（Express + PostgreSQL/SQLite + bcrypt + 伺服器端 Session Cookie）
// 認證/授權、密碼雜湊、Session、速率限制、鎖定、防列舉、CSRF、安全標頭、Email 驗證、
// 忘記/重設密碼、稽核、RBAC、GDPR 刪除帳號 + 社群內容（貼文/留言/讚/追蹤）+ 參考內容。
// 資料層見 db.js（正式 Cloud SQL Postgres，開發 SQLite 後備），所有查詢皆 async。
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
import { sendMail, mailStatus } from './mailer.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 8080
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`
const SESSION_MS = 7 * 24 * 60 * 60 * 1000   // 7 天
const LOCK_THRESHOLD = 5
const LOCK_MINUTES = 15
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
const relTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d >= 2) return `${d} 天前`
  if (d === 1) return '昨天'
  if (h >= 1) return `${h} 小時前`
  if (m >= 1) return `${m} 分鐘前`
  return '剛剛'
}
async function audit(event, req, userId = null, detail = null) {
  await db.run('INSERT INTO audit_log (id,event,user_id,ip,user_agent,detail,created_at) VALUES (?,?,?,?,?,?,?)',
    [uuid(), event, userId, ipOf(req), req.headers['user-agent'] || '', detail, now()])
}
const publicUser = (u) => ({
  id: u.id, email: u.email, name: u.name, role: u.role, emailVerified: !!u.email_verified_at,
  handle: u.handle || null, bio: u.bio || null, avatar: u.avatar || null, avatarBg: u.avatar_bg || null,
  isPrivate: !!u.is_private,
})
// 站內通知（讚/留言/追蹤等真實互動時寫入；自己對自己的動作不通知）
async function notify(userId, emoji, body, toScreen = null, props = null) {
  await db.run('INSERT INTO notifications (id,user_id,emoji,body,to_screen,props_json,created_at) VALUES (?,?,?,?,?,?,?)',
    [uuid(), userId, emoji, body, toScreen, props ? JSON.stringify(props) : null, now()])
}
// 角色階層（低→高）：一般使用者 < 創作者 < 版主 < 管理者
const ROLES = ['user', 'creator', 'moderator', 'admin']
const roleRank = (r) => { const i = ROLES.indexOf(r); return i < 0 ? 0 : i }
const handleOk = (h) => /^[a-z0-9_.]{3,20}$/.test(h || '')

// ---------- App ----------
const app = express()
app.set('trust proxy', 1)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],       // blob:＝相機拍照/錄影預覽；data:＝縮圖
      mediaSrc: ["'self'", 'blob:', 'data:'],      // 錄影 blob 播放
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
// 圖片上傳（base64 JSON）需要較大 body；其餘 API 維持 32kb 上限
const jsonSmall = express.json({ limit: '32kb' })
const jsonImage = express.json({ limit: '4mb' })
app.use((req, res, next) => (req.path === '/api/images' && req.method === 'POST') ? next() : jsonSmall(req, res, next))
app.use(cookieParser())

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false,
  message: { error: '嘗試次數過多，請稍後再試' } })
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false,
  message: { error: 'AI 請求過於頻繁，請稍候再試' } })   // 保護金鑰與 token 花費
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }))

// ---------- Session 中介層 ----------
app.use(async (req, res, next) => {
  req.user = null; req.session = null
  try {
    const sid = req.cookies?.sid
    if (sid) {
      const s = await db.get('SELECT * FROM sessions WHERE id=?', [sid])
      if (s && s.expires_at > now()) {
        const u = await db.get('SELECT * FROM users WHERE id=?', [s.user_id])
        if (u) { req.session = s; req.user = u }
      } else if (s) {
        await db.run('DELETE FROM sessions WHERE id=?', [sid])
      }
    }
  } catch (e) { return next(e) }
  next()
})
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/', maxAge: SESSION_MS }
async function startSession(res, user, req) {
  const id = randToken(), csrf = randToken()
  await db.run('INSERT INTO sessions (id,user_id,csrf_token,ip,user_agent,expires_at,created_at) VALUES (?,?,?,?,?,?,?)',
    [id, user.id, csrf, ipOf(req), req.headers['user-agent'] || '', plusMs(SESSION_MS), now()])
  res.cookie('sid', id, cookieOpts)
  return csrf
}
const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: '尚未登入' })
const requireCsrf = (req, res, next) =>
  timingEq(req.headers['x-csrf-token'] || '', req.session?.csrf_token || '') ? next() : res.status(403).json({ error: 'CSRF 驗證失敗' })
// async handler 包裝：把 rejection 轉給錯誤中介層
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ================= 認證路由 =================

// 帳號（handle）即時可用性檢查
app.get('/api/handle-available', ah(async (req, res) => {
  const handle = String(req.query.handle || '').toLowerCase()
  if (!handleOk(handle)) return res.json({ available: false, reason: '格式：3–20 字，僅限英數・底線・句點' })
  const taken = await db.get('SELECT 1 FROM users WHERE lower(handle)=?', [handle])
  res.json({ available: !taken, reason: taken ? '此帳號已被使用' : '可以使用' })
}))

app.post('/api/register', authLimiter, ah(async (req, res) => {
  const { name, email, password, website } = req.body || {}
  const handle = String(req.body?.handle || '').toLowerCase().trim()
  if (website) { await audit('register_honeypot', req, null, email); return res.status(400).json({ error: '註冊失敗，請稍後再試' }) }
  if (!name?.trim() || !emailOk(email || '') || (password || '').length < 8)
    return res.status(400).json({ error: '請填寫暱稱、有效 Email，密碼至少 8 碼' })
  if (!handleOk(handle)) return res.status(400).json({ error: '帳號格式：3–20 字，僅限英數・底線・句點' })
  const exists = await db.get('SELECT id FROM users WHERE email=?', [email.toLowerCase()])
  if (exists) return res.status(409).json({ error: '此 Email 已被註冊或無法使用' })
  const handleTaken = await db.get('SELECT 1 FROM users WHERE lower(handle)=?', [handle])
  if (handleTaken) return res.status(409).json({ error: `帳號 @${handle} 已被使用，請換一個` })
  const id = uuid()
  const hash = await bcrypt.hash(password, BCRYPT_COST)
  try {
    await db.run(`INSERT INTO users (id,email,name,password_hash,role,handle,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      [id, email.toLowerCase(), name.trim(), hash, 'user', handle, now(), now()])
  } catch (e) {
    // 唯一索引競態：兩人同時搶同一 handle
    if (String(e.message).match(/unique|UNIQUE|duplicate/i)) return res.status(409).json({ error: `帳號 @${handle} 已被使用，請換一個` })
    throw e
  }
  await audit('register', req, id)
  const token = randToken()
  await db.run('INSERT INTO tokens (id,user_id,kind,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)',
    [uuid(), id, 'email_verify', sha256(token), plusMs(24 * 60 * 60 * 1000), now()])
  const link = `${APP_URL}/verify-email?token=${token}`
  const { devLink } = sendMail({ to: email, subject: '請驗證你的機巧時運帳號', link, kind: 'verify' })
  const csrf = await startSession(res, { id }, req)
  const u = await db.get('SELECT * FROM users WHERE id=?', [id])
  res.json({ user: publicUser(u), csrfToken: csrf, devVerifyLink: devLink })
}))

app.post('/api/login', authLimiter, ah(async (req, res) => {
  const { email, password } = req.body || {}
  const fail = () => res.status(401).json({ error: '帳號或密碼錯誤' })
  const u = emailOk(email || '') ? await db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase()]) : null
  if (u && u.locked_until && u.locked_until > now()) { await audit('login_locked', req, u.id); return fail() }
  const ok = await bcrypt.compare(password || '', u ? u.password_hash : DUMMY_HASH)
  if (!u || !ok) {
    if (u) {
      const n = u.failed_login_count + 1
      const lock = n >= LOCK_THRESHOLD ? plusMs(LOCK_MINUTES * 60 * 1000) : null
      await db.run('UPDATE users SET failed_login_count=?, locked_until=?, updated_at=? WHERE id=?', [n, lock, now(), u.id])
      await audit(lock ? 'login_fail_lock' : 'login_fail', req, u.id)
    } else await audit('login_fail_nouser', req, null, email)
    return fail()
  }
  await db.run('UPDATE users SET failed_login_count=0, locked_until=NULL, last_login_at=?, updated_at=? WHERE id=?', [now(), now(), u.id])
  const csrf = await startSession(res, u, req)
  await audit('login', req, u.id)
  res.json({ user: publicUser(u), csrfToken: csrf })
}))

app.get('/api/me', ah(async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '尚未登入' })
  res.json({ user: publicUser(req.user), csrfToken: req.session.csrf_token })
}))

app.post('/api/logout', requireAuth, requireCsrf, ah(async (req, res) => {
  await db.run('DELETE FROM sessions WHERE id=?', [req.session.id])
  res.clearCookie('sid', { ...cookieOpts, maxAge: undefined })
  await audit('logout', req, req.user.id)
  res.json({ ok: true })
}))

app.post('/api/logout-all', requireAuth, requireCsrf, ah(async (req, res) => {
  await db.run('DELETE FROM sessions WHERE user_id=?', [req.user.id])
  res.clearCookie('sid', { ...cookieOpts, maxAge: undefined })
  await audit('logout_all', req, req.user.id)
  res.json({ ok: true })
}))

app.get('/api/sessions', requireAuth, ah(async (req, res) => {
  const rows = await db.all('SELECT id,ip,user_agent,created_at,expires_at FROM sessions WHERE user_id=? ORDER BY created_at DESC', [req.user.id])
  res.json({ sessions: rows.map(r => ({ ...r, id: r.id.slice(0, 8), current: req.session.id.startsWith(r.id.slice(0, 8)) })) })
}))

app.post('/api/password/forgot', authLimiter, ah(async (req, res) => {
  const { email } = req.body || {}
  const generic = { message: '若此信箱存在，我們已寄出重設連結' }
  if (!emailOk(email || '')) return res.json(generic)
  const u = await db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase()])
  let devLink
  if (u) {
    const token = randToken()
    await db.run('INSERT INTO tokens (id,user_id,kind,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)',
      [uuid(), u.id, 'password_reset', sha256(token), plusMs(60 * 60 * 1000), now()])
    const link = `${APP_URL}/reset-password?token=${token}`
    devLink = sendMail({ to: email, subject: '重設你的機巧時運密碼', link, kind: 'reset' }).devLink
    await audit('password_forgot', req, u.id)
  } else await audit('password_forgot_nouser', req, null, email)
  res.json({ ...generic, devResetLink: devLink })
}))

app.post('/api/password/reset', authLimiter, ah(async (req, res) => {
  const { token, password } = req.body || {}
  if (!token || (password || '').length < 8) return res.status(400).json({ error: '連結無效或密碼太短（至少 8 碼）' })
  const row = await db.get("SELECT * FROM tokens WHERE kind='password_reset' AND token_hash=? AND used_at IS NULL", [sha256(token)])
  if (!row || row.expires_at < now()) return res.status(400).json({ error: '連結已失效，請重新申請' })
  const hash = await bcrypt.hash(password, BCRYPT_COST)
  await db.run('UPDATE users SET password_hash=?, failed_login_count=0, locked_until=NULL, updated_at=? WHERE id=?', [hash, now(), row.user_id])
  await db.run('UPDATE tokens SET used_at=? WHERE id=?', [now(), row.id])
  await db.run('DELETE FROM sessions WHERE user_id=?', [row.user_id])
  await audit('password_reset', req, row.user_id)
  res.json({ ok: true, message: '密碼已更新，請用新密碼登入' })
}))

app.post('/api/password/change', requireAuth, requireCsrf, ah(async (req, res) => {
  const { current, password } = req.body || {}
  if ((password || '').length < 8) return res.status(400).json({ error: '新密碼至少 8 碼' })
  if (!(await bcrypt.compare(current || '', req.user.password_hash))) return res.status(400).json({ error: '目前密碼錯誤' })
  const hash = await bcrypt.hash(password, BCRYPT_COST)
  await db.run('UPDATE users SET password_hash=?, updated_at=? WHERE id=?', [hash, now(), req.user.id])
  await db.run('DELETE FROM sessions WHERE user_id=? AND id<>?', [req.user.id, req.session.id])
  await audit('password_change', req, req.user.id)
  res.json({ ok: true, message: '密碼已更新，其他裝置已登出' })
}))

app.post('/api/verify-email', ah(async (req, res) => {
  const { token } = req.body || {}
  if (!token) return res.status(400).json({ error: '缺少驗證 token' })
  const row = await db.get("SELECT * FROM tokens WHERE kind='email_verify' AND token_hash=? AND used_at IS NULL", [sha256(token)])
  if (!row || row.expires_at < now()) return res.status(400).json({ error: '驗證連結已失效' })
  await db.run('UPDATE users SET email_verified_at=?, updated_at=? WHERE id=?', [now(), now(), row.user_id])
  await db.run('UPDATE tokens SET used_at=? WHERE id=?', [now(), row.id])
  await audit('email_verified', req, row.user_id)
  res.json({ ok: true, message: 'Email 已驗證 ✓' })
}))

app.delete('/api/account', requireAuth, requireCsrf, ah(async (req, res) => {
  const { password } = req.body || {}
  if (!(await bcrypt.compare(password || '', req.user.password_hash))) return res.status(400).json({ error: '密碼錯誤' })
  await audit('account_delete', req, req.user.id)
  await db.run('DELETE FROM users WHERE id=?', [req.user.id])
  res.clearCookie('sid', { ...cookieOpts, maxAge: undefined })
  res.json({ ok: true })
}))

app.get('/api/account/export', requireAuth, ah(async (req, res) => {
  const u = req.user
  const auditRows = await db.all('SELECT event,ip,created_at FROM audit_log WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [u.id])
  // GDPR 可攜權：涵蓋使用者產生的全部內容（貼文/留言/作品/訂單/常用位置）
  const posts = await db.all('SELECT id,title,caption,term,tags_json,place,like_count,comment_count,created_at FROM posts WHERE user_id=? ORDER BY created_at DESC', [u.id])
  const comments = await db.all('SELECT id,post_id,body,created_at FROM comments WHERE user_id=? ORDER BY created_at DESC', [u.id])
  const works = await db.all('SELECT id,title,term,price,like_count,created_at FROM works WHERE user_id=? ORDER BY created_at DESC', [u.id])
  const orders = await db.all('SELECT id,items_json,total,status,pay,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC', [u.id])
  const places = await db.all('SELECT name,lat,lon,fav,created_at FROM user_places WHERE user_id=? ORDER BY created_at DESC', [u.id])
  res.json({ profile: publicUser(u), created_at: u.created_at, last_login_at: u.last_login_at, posts, comments, works, orders, places, audit: auditRows })
}))

// RBAC：需達到某階層（含以上）。moderator 可管內容，admin 可管使用者/角色。
const requireRole = (min) => (req, res, next) =>
  (req.user && roleRank(req.user.role) >= roleRank(min)) ? next() : res.status(403).json({ error: '權限不足' })

app.get('/api/admin/audit', requireAuth, requireRole('admin'), ah(async (req, res) => {
  res.json({ audit: await db.all('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200') })
}))

// 使用者列表（管理者）
app.get('/api/admin/users', requireAuth, requireRole('admin'), ah(async (req, res) => {
  const rows = await db.all('SELECT id,email,name,handle,role,is_seed,created_at,last_login_at FROM users ORDER BY created_at DESC LIMIT 500')
  res.json({ roles: ROLES, users: rows })
}))

// 變更角色（管理者）：不可把自己降級、角色須合法
app.patch('/api/admin/users/:id/role', requireAuth, requireRole('admin'), requireCsrf, ah(async (req, res) => {
  const role = String(req.body?.role || '')
  if (!ROLES.includes(role)) return res.status(400).json({ error: '角色無效' })
  if (req.params.id === req.user.id) return res.status(400).json({ error: '不能變更自己的角色' })
  const target = await db.get('SELECT id,role FROM users WHERE id=?', [req.params.id])
  if (!target) return res.status(404).json({ error: '找不到使用者' })
  await db.run('UPDATE users SET role=?, updated_at=? WHERE id=?', [role, now(), req.params.id])
  await audit('role_change', req, req.user.id, `${req.params.id}->${role}`)
  res.json({ ok: true, id: req.params.id, role })
}))

// ── 內容 CMS（版主／管理者可改；讓「資料方便修改」）──────────
// ref_items 的增刪改查：kind＝proverbs/deities/filters/effects/gradients/... data 為 JSON
app.get('/api/admin/content/:kind', requireAuth, requireRole('moderator'), ah(async (req, res) => {
  const kind = String(req.params.kind).replace(/[^a-zA-Z]/g, '')
  const rows = await db.all('SELECT kind,id,sort,data FROM ref_items WHERE kind=? ORDER BY sort ASC', [kind])
  res.json({ items: rows.map(r => ({ ...r, data: JSON.parse(r.data) })) })
}))
app.put('/api/admin/content/:kind/:id', requireAuth, requireRole('moderator'), requireCsrf, ah(async (req, res) => {
  const kind = String(req.params.kind).replace(/[^a-zA-Z]/g, '')
  const id = String(req.params.id).slice(0, 60)
  const data = req.body?.data
  const sort = Number(req.body?.sort || 0)
  if (data == null || typeof data !== 'object') return res.status(400).json({ error: '內容需為物件' })
  await db.run(`INSERT INTO ref_items (kind,id,sort,data) VALUES (?,?,?,?)
                ON CONFLICT (kind,id) DO UPDATE SET sort=excluded.sort, data=excluded.data`,
    [kind, id, sort, JSON.stringify(data)])
  await audit('content_upsert', req, req.user.id, `${kind}/${id}`)
  res.json({ ok: true })
}))
app.delete('/api/admin/content/:kind/:id', requireAuth, requireRole('moderator'), requireCsrf, ah(async (req, res) => {
  const kind = String(req.params.kind).replace(/[^a-zA-Z]/g, '')
  await db.run('DELETE FROM ref_items WHERE kind=? AND id=?', [kind, String(req.params.id)])
  await audit('content_delete', req, req.user.id, `${kind}/${req.params.id}`)
  res.json({ ok: true })
}))

// 示範資料統計 + 一鍵清除（上線用）：刪 is_seed 作者 → 連帶清其貼文/作品/留言（FK CASCADE）。
// 只清「示範使用者上傳的內容」；真人帳號與其上傳、以及參考清單(ref_items)不受影響。
app.get('/api/admin/seed', requireAuth, requireRole('admin'), ah(async (req, res) => {
  const users = Number((await db.get('SELECT COUNT(*) AS c FROM users WHERE is_seed=1')).c)
  const posts = Number((await db.get('SELECT COUNT(*) AS c FROM posts WHERE user_id IN (SELECT id FROM users WHERE is_seed=1)')).c)
  const works = Number((await db.get('SELECT COUNT(*) AS c FROM works WHERE user_id IN (SELECT id FROM users WHERE is_seed=1)')).c)
  res.json({ seed: { users, posts, works } })
}))
app.delete('/api/admin/seed', requireAuth, requireRole('admin'), requireCsrf, ah(async (req, res) => {
  const r = await db.run('DELETE FROM users WHERE is_seed=1')
  // 示範通知（seed 灌入的 n1..n5 短 id）一併清除；真實通知為 36 碼 UUID 不受影響
  await db.run("DELETE FROM notifications WHERE length(id) < 10")
  await audit('seed_purge', req, req.user.id, `removed ${r.changes} seed users`)
  res.json({ ok: true, removedUsers: r.changes })
}))

// ── 地點：搜尋（代理 OSM Nominatim）/ 圖磚代理 / 常用位置 ──────
app.get('/api/places/search', ah(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100)
  if (q.length < 2) return res.json({ places: [] })
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=zh-TW&q=${encodeURIComponent(q)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'jiqiao-shiyun/1.0 (demo)' }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return res.json({ places: [] })
    const arr = await r.json()
    res.json({ places: arr.map(p => ({ name: p.display_name, short: (p.name || p.display_name.split(',')[0]), lat: p.lat, lon: p.lon, type: p.type })) })
  } catch { res.json({ places: [] }) }
}))
// 反向地理編碼（目前位置 → 地名）
app.get('/api/places/reverse', ah(async (req, res) => {
  const lat = String(req.query.lat || '').slice(0, 24), lon = String(req.query.lon || '').slice(0, 24)
  if (!lat || !lon) return res.json({ name: null })
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=zh-TW&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'jiqiao-shiyun/1.0 (demo)' }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return res.json({ name: null })
    const j = await r.json()
    const a = j.address || {}
    res.json({ name: j.display_name || null, short: j.name || a.suburb || a.city_district || a.town || a.city || a.county || null })
  } catch { res.json({ name: null }) }
}))
// OSM 圖磚代理（讓瀏覽器只連同源，符合 CSP img-src 'self'）
app.get('/api/map/tile/:z/:x/:y', ah(async (req, res) => {
  const z = Math.max(0, Math.min(19, parseInt(req.params.z, 10) || 0))
  const x = parseInt(req.params.x, 10) || 0
  const y = parseInt((req.params.y + '').replace(/\.png$/, ''), 10) || 0
  try {
    const r = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      { headers: { 'User-Agent': 'jiqiao-shiyun/1.0 (demo)' }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return res.status(502).end()
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(await r.arrayBuffer()))
  } catch { res.status(502).end() }
}))
// 我的常用位置
app.get('/api/places', requireAuth, ah(async (req, res) => {
  const rows = await db.all('SELECT * FROM user_places WHERE user_id=? ORDER BY fav DESC, used_at DESC LIMIT 50', [req.user.id])
  res.json({ places: rows.map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, fav: !!p.fav })) })
}))
app.post('/api/places', requireAuth, requireCsrf, ah(async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80)
  if (!name) return res.status(400).json({ error: '請提供地點名稱' })
  const lat = req.body?.lat != null ? String(req.body.lat).slice(0, 24) : null
  const lon = req.body?.lon != null ? String(req.body.lon).slice(0, 24) : null
  const fav = req.body?.fav ? 1 : 0
  // 同名則更新 used_at / fav（避免重複），否則新增
  const existing = await db.get('SELECT id FROM user_places WHERE user_id=? AND name=?', [req.user.id, name])
  if (existing) {
    await db.run('UPDATE user_places SET used_at=?, fav=? WHERE id=?', [now(), fav, existing.id])
    return res.json({ id: existing.id, name, lat, lon, fav: !!fav })
  }
  const id = uuid()
  await db.run('INSERT INTO user_places (id,user_id,name,lat,lon,fav,used_at,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, req.user.id, name, lat, lon, fav, now(), now()])
  res.json({ id, name, lat, lon, fav: !!fav })
}))
app.delete('/api/places/:id', requireAuth, requireCsrf, ah(async (req, res) => {
  await db.run('DELETE FROM user_places WHERE id=? AND user_id=?', [req.params.id, req.user.id])
  res.json({ ok: true })
}))

// 重寄驗證信（已登入且尚未驗證）
app.post('/api/email/resend', requireAuth, requireCsrf, authLimiter, ah(async (req, res) => {
  if (req.user.email_verified_at) return res.json({ ok: true, message: 'Email 已驗證' })
  const token = randToken()
  await db.run('INSERT INTO tokens (id,user_id,kind,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)',
    [uuid(), req.user.id, 'email_verify', sha256(token), plusMs(24 * 60 * 60 * 1000), now()])
  const link = `${APP_URL}/verify-email?token=${token}`
  const { devLink } = sendMail({ to: req.user.email, subject: '請驗證你的機巧時運帳號', link, kind: 'verify' })
  await audit('email_resend', req, req.user.id)
  res.json({ ok: true, devVerifyLink: devLink })
}))

// ================= 個人資料 =================
app.patch('/api/me', requireAuth, requireCsrf, ah(async (req, res) => {
  const name = String(req.body?.name || req.user.name || '').trim()
  if (!name || name.length > 30) return res.status(400).json({ error: '暱稱需為 1–30 字' })
  const bio = req.body?.bio != null ? String(req.body.bio).trim().slice(0, 80) : req.user.bio
  const avatar = req.body?.avatar != null ? String(req.body.avatar).slice(0, 8) : req.user.avatar
  const isPrivate = req.body?.priv != null ? (req.body.priv ? 1 : 0) : (req.user.is_private || 0)
  await db.run('UPDATE users SET name=?, bio=?, avatar=?, is_private=?, updated_at=? WHERE id=?', [name, bio, avatar, isPrivate, now(), req.user.id])
  await audit('profile_update', req, req.user.id)
  const u = await db.get('SELECT * FROM users WHERE id=?', [req.user.id])
  res.json({ user: publicUser(u) })
}))

// ================= 訂單 =================
app.post('/api/orders', requireAuth, requireCsrf, ah(async (req, res) => {
  const { items, pay } = req.body || {}
  if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ error: '訂單內容無效' })
  const clean = []
  for (const it of items) {
    const name = String(it?.name || '').trim().slice(0, 80)
    const price = Number(it?.price)
    if (!name || !Number.isFinite(price) || price < 0 || price > 1000000) return res.status(400).json({ error: '訂單品項無效' })
    clean.push({ name, price: Math.round(price) })
  }
  const total = clean.reduce((s, i) => s + i.price, 0)
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const ymd = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const cRow = await db.get('SELECT COUNT(*) AS c FROM orders WHERE user_id=? AND id LIKE ?', [req.user.id, `JQ-${ymd}-%`])
  const id = `JQ-${ymd}-${pad(Number(cRow.c) + 1)}`
  const order = { id, date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`, items: clean, total, status: '處理中', pay: String(pay || '').slice(0, 40) }
  await db.run('INSERT INTO orders (id,user_id,items_json,total,status,pay,created_at) VALUES (?,?,?,?,?,?,?)',
    [id, req.user.id, JSON.stringify(clean), total, order.status, order.pay, now()])
  await audit('order_create', req, req.user.id, id)
  sendMail({ to: req.user.email, subject: `訂單確認 ${id}（NT$${total}）`, link: `${APP_URL}/orders`, kind: 'order' })
  res.json({ order })
}))

app.get('/api/orders', requireAuth, ah(async (req, res) => {
  const rows = await db.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100', [req.user.id])
  res.json({ orders: rows.map(r => ({ id: r.id, date: r.created_at.slice(0, 10).replaceAll('-', '/'), items: JSON.parse(r.items_json), total: r.total, status: r.status, pay: r.pay })) })
}))

// ================= 使用者圖片（上傳 / 供圖）=================
// 前端先用 canvas 壓縮（≤1600px JPEG）再以 dataURL 上傳；存 DB TEXT（pg/sqlite 通用）。
const IMG_MIMES = { 'image/jpeg': [0xFF, 0xD8], 'image/png': [0x89, 0x50], 'image/webp': [0x52, 0x49] }
app.post('/api/images', jsonImage, requireAuth, requireCsrf, ah(async (req, res) => {
  const dataUrl = String(req.body?.data || '')
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return res.status(400).json({ error: '圖片格式無效（僅支援 JPEG/PNG/WebP）' })
  const [, mime, b64] = m
  if (b64.length > 3 * 1024 * 1024) return res.status(413).json({ error: '圖片太大，請重新選擇（上限約 2MB）' })
  const buf = Buffer.from(b64, 'base64')
  const magic = IMG_MIMES[mime]
  if (!magic || buf[0] !== magic[0] || buf[1] !== magic[1]) return res.status(400).json({ error: '圖片內容驗證失敗' })
  const id = uuid()
  await db.run('INSERT INTO images (id,user_id,mime,data,created_at) VALUES (?,?,?,?,?)', [id, req.user.id, mime, b64, now()])
  await audit('image_upload', req, req.user.id, `${id}:${Math.round(buf.length / 1024)}kb`)
  res.json({ id, url: `/api/images/${id}` })
}))
app.get('/api/images/:id', ah(async (req, res) => {
  const img = await db.get('SELECT mime,data FROM images WHERE id=?', [String(req.params.id).slice(0, 60)])
  if (!img) return res.status(404).end()
  res.set('Content-Type', img.mime).set('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(Buffer.from(img.data, 'base64'))
}))

// ================= 社群內容（貼文 / 作品 / 留言 / 讚 / 追蹤）=================
const postShape = (r) => ({
  id: r.id, user: r.handle || r.uname, avatar: r.avatar, avatarBg: r.avatar_bg, emoji: r.emoji, bg: r.bg,
  term: r.term, title: r.title, caption: r.caption, tags: r.tags_json ? JSON.parse(r.tags_json) : [],
  likes: r.like_count, comments: r.comment_count, place: r.place, time: relTime(r.created_at),
  image: r.image_id ? `/api/images/${r.image_id}` : null,
})
const workShape = (w) => ({
  id: w.id, emoji: w.emoji, bg: w.bg, term: w.term, author: w.handle || w.uname, title: w.title,
  image: w.image_id ? `/api/images/${w.image_id}` : null, ...(w.price ? { price: w.price } : {}),
})
const POST_SELECT = `SELECT p.*, u.handle, u.name AS uname, u.avatar, u.avatar_bg
  FROM posts p JOIN users u ON u.id=p.user_id`

// 貼文列表（可 ?term= 篩選節氣）
app.get('/api/posts', ah(async (req, res) => {
  const term = req.query.term ? String(req.query.term) : null
  const rows = term
    ? await db.all(`${POST_SELECT} WHERE p.term=? ORDER BY p.created_at DESC LIMIT 60`, [term])
    : await db.all(`${POST_SELECT} ORDER BY p.created_at DESC LIMIT 60`)
  res.json({ posts: rows.map(postShape) })
}))

// 單一貼文（含留言、是否已讚）
app.get('/api/posts/:id', ah(async (req, res) => {
  const r = await db.get(`${POST_SELECT} WHERE p.id=?`, [req.params.id])
  if (!r) return res.status(404).json({ error: '找不到貼文' })
  const cRows = await db.all(
    `SELECT c.*, u.handle, u.name AS uname, u.avatar, u.avatar_bg FROM comments c JOIN users u ON u.id=c.user_id
     WHERE c.post_id=? ORDER BY c.created_at ASC LIMIT 200`, [req.params.id])
  let liked = false, following = false
  if (req.user) {
    liked = !!(await db.get('SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?', [r.id, req.user.id]))
    following = !!(await db.get('SELECT 1 FROM follows WHERE follower_id=? AND followee_id=?', [req.user.id, r.user_id]))
  }
  res.json({
    post: postShape(r), liked, following, authorId: r.user_id,
    comments: cRows.map(c => ({ id: c.id, user: c.handle || c.uname, avatar: c.avatar, avatarBg: c.avatar_bg, body: c.body, time: relTime(c.created_at) })),
  })
}))

// 發佈貼文
app.post('/api/posts', requireAuth, requireCsrf, ah(async (req, res) => {
  const b = req.body || {}
  const title = String(b.title || '').trim().slice(0, 60)
  if (!title) return res.status(400).json({ error: '請輸入標題' })
  const id = uuid()
  const tags = Array.isArray(b.tags) ? b.tags.slice(0, 8).map(t => String(t).slice(0, 20)) : []
  // 圖片：必須是自己上傳的（防掛他人圖）
  let imageId = null
  if (b.imageId) {
    const img = await db.get('SELECT id FROM images WHERE id=? AND user_id=?', [String(b.imageId).slice(0, 60), req.user.id])
    if (img) imageId = img.id
  }
  await db.run(`INSERT INTO posts (id,user_id,emoji,bg,term,title,caption,tags_json,place,image_id,like_count,comment_count,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,0,0,?)`,
    [id, req.user.id, String(b.emoji || '🌾').slice(0, 8), String(b.bg || '#dcfce7').slice(0, 16),
     String(b.term || '').slice(0, 8), title, String(b.caption || '').slice(0, 400), JSON.stringify(tags),
     String(b.place || '').slice(0, 40), imageId, now()])
  await audit('post_create', req, req.user.id, id)
  const r = await db.get(`${POST_SELECT} WHERE p.id=?`, [id])
  res.json({ post: postShape(r) })
}))

// 按讚 / 取消（回傳最新狀態與計數）
app.post('/api/posts/:id/like', requireAuth, requireCsrf, ah(async (req, res) => {
  const pid = req.params.id
  const post = await db.get('SELECT id,user_id,title FROM posts WHERE id=?', [pid])
  if (!post) return res.status(404).json({ error: '找不到貼文' })
  const has = await db.get('SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?', [pid, req.user.id])
  if (has) {
    await db.run('DELETE FROM post_likes WHERE post_id=? AND user_id=?', [pid, req.user.id])
    await db.run('UPDATE posts SET like_count = like_count - 1 WHERE id=? AND like_count > 0', [pid])
  } else {
    await db.run('INSERT INTO post_likes (post_id,user_id,created_at) VALUES (?,?,?)', [pid, req.user.id, now()])
    await db.run('UPDATE posts SET like_count = like_count + 1 WHERE id=?', [pid])
    if (post.user_id !== req.user.id)
      await notify(post.user_id, '❤️', `@${req.user.handle || req.user.name} 喜歡你的貼文「${post.title}」`, 'postDetail', { id: pid })
  }
  const r = await db.get('SELECT like_count FROM posts WHERE id=?', [pid])
  res.json({ liked: !has, likeCount: r.like_count })
}))

// 留言
app.post('/api/posts/:id/comments', requireAuth, requireCsrf, ah(async (req, res) => {
  const pid = req.params.id
  const body = String(req.body?.body || '').trim().slice(0, 300)
  if (!body) return res.status(400).json({ error: '請輸入留言' })
  const post = await db.get('SELECT id,user_id,title FROM posts WHERE id=?', [pid])
  if (!post) return res.status(404).json({ error: '找不到貼文' })
  const id = uuid()
  await db.run('INSERT INTO comments (id,post_id,user_id,body,created_at) VALUES (?,?,?,?,?)', [id, pid, req.user.id, body, now()])
  await db.run('UPDATE posts SET comment_count = comment_count + 1 WHERE id=?', [pid])
  await audit('comment_create', req, req.user.id, pid)
  if (post.user_id !== req.user.id)
    await notify(post.user_id, '💬', `@${req.user.handle || req.user.name} 在「${post.title}」留言：${body.slice(0, 40)}`, 'postDetail', { id: pid })
  res.json({ comment: { id, user: req.user.handle || req.user.name, avatar: req.user.avatar, avatarBg: req.user.avatar_bg, body, time: '剛剛' } })
}))

// 市集作品列表（可 ?term=）
app.get('/api/works', ah(async (req, res) => {
  const term = req.query.term && req.query.term !== '全部' ? String(req.query.term) : null
  const base = `SELECT w.*, u.handle, u.name AS uname FROM works w JOIN users u ON u.id=w.user_id`
  const rows = term
    ? await db.all(`${base} WHERE w.term=? ORDER BY w.created_at DESC LIMIT 120`, [term])
    : await db.all(`${base} ORDER BY w.created_at DESC LIMIT 120`)
  res.json({ works: rows.map(workShape) })
}))

// 上架市集作品（發文時勾「同時上架」或單獨上架）
app.post('/api/works', requireAuth, requireCsrf, ah(async (req, res) => {
  const b = req.body || {}
  const title = String(b.title || '').trim().slice(0, 60)
  if (!title) return res.status(400).json({ error: '請輸入作品標題' })
  const price = Math.max(0, Math.min(1000000, Math.round(Number(b.price) || 0)))
  let imageId = null
  if (b.imageId) {
    const img = await db.get('SELECT id FROM images WHERE id=? AND user_id=?', [String(b.imageId).slice(0, 60), req.user.id])
    if (img) imageId = img.id
  }
  const id = uuid()
  await db.run(`INSERT INTO works (id,user_id,emoji,bg,term,title,price,image_id,like_count,created_at) VALUES (?,?,?,?,?,?,?,?,0,?)`,
    [id, req.user.id, String(b.emoji || '🌾').slice(0, 8), String(b.bg || '#dcfce7').slice(0, 16),
     String(b.term || '').slice(0, 8), title, price, imageId, now()])
  await audit('work_create', req, req.user.id, id)
  res.json({ work: { id, title, price, image: imageId ? `/api/images/${imageId}` : null } })
}))

// 排行榜：由「真實作品按讚數」即時計算（不再使用預灌示範清單）
app.get('/api/leaderboard', ah(async (req, res) => {
  const rows = await db.all(`SELECT w.*, u.handle, u.name AS uname FROM works w JOIN users u ON u.id=w.user_id
    ORDER BY w.like_count DESC, w.created_at DESC LIMIT 10`)
  res.json({ leaderboard: rows.map((w, i) => ({ rank: i + 1, workId: w.id, title: w.title, user: w.handle || w.uname,
    likes: w.like_count, emoji: w.emoji, bg: w.bg, image: w.image_id ? `/api/images/${w.image_id}` : null })) })
}))

// 單一作品（作品詳情）
app.get('/api/works/:id', ah(async (req, res) => {
  const w = await db.get(`SELECT w.*, u.handle, u.name AS uname, u.avatar, u.avatar_bg FROM works w JOIN users u ON u.id=w.user_id WHERE w.id=?`, [req.params.id])
  if (!w) return res.status(404).json({ error: '找不到作品' })
  res.json({ work: {
    id: w.id, emoji: w.emoji, bg: w.bg, term: w.term, title: w.title, price: w.price || 0,
    author: w.handle || w.uname, avatar: w.avatar, avatarBg: w.avatar_bg, authorId: w.user_id, likes: w.like_count,
    image: w.image_id ? `/api/images/${w.image_id}` : null,
  } })
}))

// 使用者公開頁（創作者頁／自己的個人頁共用）：資料＋貼文＋作品＋統計
app.get('/api/users/:handle', ah(async (req, res) => {
  const handle = String(req.params.handle).toLowerCase()
  const u = await db.get('SELECT id,name,handle,avatar,avatar_bg,bio,role,is_seed,is_private FROM users WHERE lower(handle)=?', [handle])
  if (!u) return res.status(404).json({ error: '找不到使用者' })
  // 私密帳號：非本人只給基本資料與統計，隱藏貼文/作品內容
  const hidden = !!u.is_private && (!req.user || req.user.id !== u.id)
  const posts = hidden ? [] : await db.all(`${POST_SELECT} WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 60`, [u.id])
  const worksRows = hidden ? [] : await db.all(`SELECT w.*, u.handle, u.name AS uname FROM works w JOIN users u ON u.id=w.user_id WHERE w.user_id=? ORDER BY w.created_at DESC LIMIT 60`, [u.id])
  const postCount = Number((await db.get('SELECT COUNT(*) AS c FROM posts WHERE user_id=?', [u.id])).c)
  const workCount = Number((await db.get('SELECT COUNT(*) AS c FROM works WHERE user_id=?', [u.id])).c)
  const followers = Number((await db.get('SELECT COUNT(*) AS c FROM follows WHERE followee_id=?', [u.id])).c)
  const following = Number((await db.get('SELECT COUNT(*) AS c FROM follows WHERE follower_id=?', [u.id])).c)
  let isFollowing = false
  if (req.user) isFollowing = !!(await db.get('SELECT 1 FROM follows WHERE follower_id=? AND followee_id=?', [req.user.id, u.id]))
  res.json({
    user: { id: u.id, name: u.name, handle: u.handle, avatar: u.avatar, avatarBg: u.avatar_bg, bio: u.bio, role: u.role },
    stats: { posts: postCount, works: workCount, followers, following },
    posts: posts.map(postShape),
    works: worksRows.map(workShape),
    isFollowing, authorId: u.id, isPrivate: !!u.is_private,
  })
}))

// 追蹤 / 取消（by author id 或 handle）
app.post('/api/follow', requireAuth, requireCsrf, ah(async (req, res) => {
  const { userId, handle } = req.body || {}
  const target = userId ? await db.get('SELECT id FROM users WHERE id=?', [userId])
    : handle ? await db.get('SELECT id FROM users WHERE handle=?', [handle]) : null
  if (!target) return res.status(404).json({ error: '找不到對象' })
  if (target.id === req.user.id) return res.status(400).json({ error: '不能追蹤自己' })
  const has = await db.get('SELECT 1 FROM follows WHERE follower_id=? AND followee_id=?', [req.user.id, target.id])
  if (has) await db.run('DELETE FROM follows WHERE follower_id=? AND followee_id=?', [req.user.id, target.id])
  else {
    await db.run('INSERT INTO follows (follower_id,followee_id,created_at) VALUES (?,?,?)', [req.user.id, target.id, now()])
    await notify(target.id, '➕', `@${req.user.handle || req.user.name} 開始追蹤你`, 'creatorPage',
      { user: req.user.handle || req.user.name, avatar: req.user.avatar, avatarBg: req.user.avatar_bg })
  }
  const fc = await db.get('SELECT COUNT(*) AS c FROM follows WHERE followee_id=?', [target.id])
  res.json({ following: !has, followers: Number(fc.c) })
}))

// 我的通知（unread＝未讀數，供鈴鐺徽章跨重整一致）
app.get('/api/notifications', requireAuth, ah(async (req, res) => {
  const rows = await db.all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [req.user.id])
  const unread = Number((await db.get('SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND read_at IS NULL', [req.user.id])).c)
  res.json({ unread, notifications: rows.map(n => ({ id: n.id, emoji: n.emoji, text: n.body, time: relTime(n.created_at), to: n.to_screen, props: n.props_json ? JSON.parse(n.props_json) : undefined, read: !!n.read_at })) })
}))

// 全部標為已讀（開啟通知中心時呼叫；已讀狀態存 DB 跨裝置/重整一致）
app.post('/api/notifications/read', requireAuth, requireCsrf, ah(async (req, res) => {
  await db.run('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL', [now(), req.user.id])
  res.json({ ok: true, unread: 0 })
}))

// ── 內容管理：刪除自己的貼文/留言/作品（版主以上可代刪，作內容治理用）──
const canModerate = (req, ownerId) => req.user.id === ownerId || roleRank(req.user.role) >= roleRank('moderator')

app.delete('/api/posts/:id', requireAuth, requireCsrf, ah(async (req, res) => {
  const post = await db.get('SELECT id,user_id FROM posts WHERE id=?', [req.params.id])
  if (!post) return res.status(404).json({ error: '找不到貼文' })
  if (!canModerate(req, post.user_id)) return res.status(403).json({ error: '只能刪除自己的貼文' })
  await db.run('DELETE FROM posts WHERE id=?', [req.params.id])   // 留言/按讚 FK CASCADE 連帶清除
  await audit('post_delete', req, req.user.id, req.params.id)
  res.json({ ok: true })
}))

app.delete('/api/comments/:id', requireAuth, requireCsrf, ah(async (req, res) => {
  const c = await db.get('SELECT id,post_id,user_id FROM comments WHERE id=?', [req.params.id])
  if (!c) return res.status(404).json({ error: '找不到留言' })
  if (!canModerate(req, c.user_id)) return res.status(403).json({ error: '只能刪除自己的留言' })
  await db.run('DELETE FROM comments WHERE id=?', [req.params.id])
  await db.run('UPDATE posts SET comment_count = comment_count - 1 WHERE id=? AND comment_count > 0', [c.post_id])
  await audit('comment_delete', req, req.user.id, req.params.id)
  res.json({ ok: true })
}))

app.delete('/api/works/:id', requireAuth, requireCsrf, ah(async (req, res) => {
  const w = await db.get('SELECT id,user_id FROM works WHERE id=?', [req.params.id])
  if (!w) return res.status(404).json({ error: '找不到作品' })
  if (!canModerate(req, w.user_id)) return res.status(403).json({ error: '只能刪除自己的作品' })
  await db.run('DELETE FROM works WHERE id=?', [req.params.id])
  await audit('work_delete', req, req.user.id, req.params.id)
  res.json({ ok: true })
}))

// ── 檢舉（內容治理：任何登入者可檢舉；版主以上在管理後台處理）──
app.post('/api/reports', requireAuth, requireCsrf, ah(async (req, res) => {
  const type = String(req.body?.type || '')
  if (!['post', 'comment', 'work', 'user'].includes(type)) return res.status(400).json({ error: '檢舉類型無效' })
  const targetId = String(req.body?.targetId || '').slice(0, 80)
  if (!targetId) return res.status(400).json({ error: '缺少檢舉對象' })
  const reason = String(req.body?.reason || '').trim().slice(0, 200)
  await db.run('INSERT INTO reports (id,reporter_id,target_type,target_id,reason,status,created_at) VALUES (?,?,?,?,?,?,?)',
    [uuid(), req.user.id, type, targetId, reason, 'open', now()])
  await audit('report_create', req, req.user.id, `${type}:${targetId}`)
  res.json({ ok: true, message: '已收到檢舉，將由管理團隊審核' })
}))

app.get('/api/admin/reports', requireAuth, requireRole('moderator'), ah(async (req, res) => {
  const rows = await db.all(`SELECT r.*, u.handle AS reporter FROM reports r JOIN users u ON u.id=r.reporter_id
    ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200`)
  res.json({ reports: rows.map(r => ({ id: r.id, reporter: r.reporter, type: r.target_type, targetId: r.target_id, reason: r.reason, status: r.status, time: relTime(r.created_at) })) })
}))

app.patch('/api/admin/reports/:id', requireAuth, requireRole('moderator'), requireCsrf, ah(async (req, res) => {
  const status = String(req.body?.status || '')
  if (!['resolved', 'dismissed'].includes(status)) return res.status(400).json({ error: '狀態無效' })
  await db.run('UPDATE reports SET status=? WHERE id=?', [status, req.params.id])
  await audit('report_update', req, req.user.id, `${req.params.id}:${status}`)
  res.json({ ok: true })
}))

// ================= 參考／編輯內容 =================
// GET /api/content/:kind → 該類清單（proverbs/deities/festivals/flowers/ingredients/zodiacs/
//   solarTerms/challenges/fortuneTools/cultureTools/leaderboard/plans/exploreChips/poemPool）
app.get('/api/content/:kind', ah(async (req, res) => {
  const kind = String(req.params.kind).replace(/[^a-zA-Z]/g, '')
  const rows = await db.all('SELECT data FROM ref_items WHERE kind=? ORDER BY sort ASC', [kind])
  let items = rows.map(r => JSON.parse(r.data))
  // 特例：包裹型（chips/poems）攤平回原陣列
  if (kind === 'exploreChips' && items[0]?.chips) items = items[0].chips
  if (kind === 'poemPool' && items[0]?.poems) items = items[0].poems
  res.json({ items })
}))

// ── 金流（scaffold；正式串接步驟見 docs/金流-付款串接.md）──────
// 支援 demo / stripe / tappay / newebpay / ecpay / linepay；未設金鑰時走 demo。
const PAY_PROVIDER = process.env.PAY_PROVIDER || 'demo'

// 建立付款意圖：伺服器算金額 + 建 pending 訂單，回傳交給前端下一步的資料
app.post('/api/payments/intent', requireAuth, requireCsrf, ah(async (req, res) => {
  const { items, pay } = req.body || {}
  if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ error: '訂單內容無效' })
  const clean = []; let total = 0
  for (const it of items) {
    const name = String(it?.name || '').trim().slice(0, 80); const price = Number(it?.price)
    if (!name || !Number.isFinite(price) || price < 0 || price > 1000000) return res.status(400).json({ error: '訂單品項無效' })
    clean.push({ name, price: Math.round(price) }); total += Math.round(price)
  }
  const d = new Date(); const pad = (n) => String(n).padStart(2, '0')
  const ymd = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const cRow = await db.get('SELECT COUNT(*) AS c FROM orders WHERE user_id=? AND id LIKE ?', [req.user.id, `JQ-${ymd}-%`])
  const id = `JQ-${ymd}-${pad(Number(cRow.c) + 1)}`
  await db.run('INSERT INTO orders (id,user_id,items_json,total,status,pay,created_at) VALUES (?,?,?,?,?,?,?)',
    [id, req.user.id, JSON.stringify(clean), total, '待付款', String(pay || PAY_PROVIDER).slice(0, 40), now()])
  await audit('payment_intent', req, req.user.id, id)
  // 正式串接：此處改為呼叫 provider 建立交易，回傳 clientSecret / prime 交易 / paymentUrl（見文件）
  res.json({
    provider: PAY_PROVIDER, orderId: id, amount: total, currency: 'TWD',
    next: PAY_PROVIDER === 'demo'
      ? { type: 'demo', message: '示範模式：尚未串接真金流。設定 PAY_PROVIDER 與金鑰即可啟用（見 docs/金流-付款串接.md）。' }
      : { type: 'integrate', message: `已建立待付款訂單 ${id}；請依 ${PAY_PROVIDER} 文件在此回傳 clientSecret/prime/paymentUrl。` },
  })
}))

// 金流回呼（webhook）—— provider 付款成功後打這支，把訂單標記已付款。
// 正式：務必驗證 provider 簽章（Stripe-Signature / 藍新 TradeSha…）再更新，避免偽造。
app.post('/api/payments/webhook', ah(async (req, res) => {
  const secret = process.env.PAY_WEBHOOK_SECRET
  // 未設密鑰時一律拒收（否則訂單編號可枚舉、任何人可偽造付款成功）；本機 demo 亦須設密鑰才可測 webhook
  if (!secret) return res.status(501).json({ error: '未設定 PAY_WEBHOOK_SECRET，webhook 停用' })
  if (!timingEq(req.headers['x-webhook-secret'] || '', secret)) return res.status(401).end()
  const { orderId, status } = req.body || {}
  if (!orderId) return res.status(400).json({ error: '缺少 orderId' })
  const ord = await db.get('SELECT id,user_id FROM orders WHERE id=?', [orderId])
  if (!ord) return res.status(404).json({ error: '找不到訂單' })
  await db.run('UPDATE orders SET status=? WHERE id=?', [status === 'paid' ? '已付款' : '付款失敗', orderId])
  await audit('payment_webhook', req, ord.user_id, `${orderId}:${status}`)
  res.json({ ok: true })
}))

// ── AI 時光顧問（接 OpenAI / 相容 API）──────────────────────
// ★ 金鑰只在後端讀 env（Secret Manager 注入），永不進前端 bundle。未設金鑰 → 回 {fallback:true}，前端改用內建示範腳本。
const OPENAI_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const AI_SYSTEM = '你是「機巧時運」的 AI 時光顧問，結合台灣農民曆、二十四節氣與生活建議。語氣溫暖、簡潔、正向，善用節氣意象。命理與宜忌僅供參考，不做醫療、投資、法律等專業斷言；遇此類問題請建議尋求專業人士。'

app.post('/api/ai/chat', requireAuth, requireCsrf, aiLimiter, ah(async (req, res) => {
  const { messages, context } = req.body || {}
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: '訊息無效' })
  if (!OPENAI_KEY) return res.json({ fallback: true })     // 未設金鑰 → 前端用內建示範回覆
  const hist = messages.slice(-12).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '').slice(0, 2000),
  })).filter(m => m.content)
  const sys = AI_SYSTEM + (context ? `\n【今日曆訊】${String(context).slice(0, 300)}` : '')
  try {
    const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: 'system', content: sys }, ...hist], max_tokens: 500, temperature: 0.8 }),
      signal: AbortSignal.timeout(25000),
    })
    if (!r.ok) { console.error('[ai] upstream', r.status, (await r.text().catch(() => '')).slice(0, 200)); return res.status(502).json({ error: 'AI 服務暫時無法回應' }) }
    const j = await r.json()
    const reply = j.choices?.[0]?.message?.content?.trim()
    await audit('ai_chat', req, req.user.id)
    res.json({ reply: reply || '（目前沒有想法，換個問法試試？）' })
  } catch (e) { console.error('[ai]', e.message); res.status(504).json({ error: 'AI 連線逾時，請稍後再試' }) }
}))

// 健康檢查（含 DB 驅動別、金流、AI、寄信是否已接）
app.get('/api/health', ah(async (req, res) => {
  await db.get('SELECT 1 AS ok')
  res.json({ ok: true, db: db.kind, pay: PAY_PROVIDER, ai: OPENAI_KEY ? 'on' : 'off', mail: mailStatus().provider })
}))

// 寄測試信（僅管理者）：正式站設完金鑰後，用這支確認真的收得到
app.post('/api/admin/mail-test', requireAuth, requireRole('admin'), requireCsrf, authLimiter, ah(async (req, res) => {
  const to = String(req.body?.to || req.user.email).trim()
  if (!emailOk(to)) return res.status(400).json({ error: 'Email 格式無效' })
  const st = mailStatus()
  if (!st.enabled) return res.status(501).json({ error: `尚未接寄信服務（目前：${st.provider}）。見 docs/寄信-Email設定.md`, status: st })
  const { delivery } = sendMail({ to, subject: '機巧時運 寄信測試 ✓', link: `${APP_URL}/`, kind: 'generic' })
  const r = await delivery   // 測試信才等結果，方便你立刻看到成功/失敗原因
  await audit('mail_test', req, req.user.id, `${to}:${r.sent ? 'ok' : 'fail'}`)
  res.json({ ok: !!r.sent, provider: st.provider, from: st.from, result: r })
}))

// ---------- 靜態前端 ----------
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1y', setHeaders: (res, p) => { if (p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache') } }))
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(join(distDir, 'index.html')))
}

// ---------- 錯誤處理 ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[err]', req.method, req.path, err.message)
  if (res.headersSent) return
  res.status(err.status || 500).json({ error: '伺服器忙碌中，請稍後再試' })
})

if (isProd && !process.env.APP_URL) {
  console.warn('[warn] NODE_ENV=production 但未設定 APP_URL —— 驗證信/重設密碼連結將指向 localhost，請設定正式網址')
}

app.listen(PORT, () => console.log(`[jiqiao-auth] listening on ${PORT} (prod=${isProd}, db=${db.kind})`))
