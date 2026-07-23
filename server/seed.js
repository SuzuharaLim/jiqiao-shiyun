// 種子資料 —— 把 mock.js（唯一內容來源）灌入資料庫，讓 App「根據資料庫」而非虛假硬編。
// 可重入（ON CONFLICT）：重跑會刷新內容、不會清掉真實使用者資料。
//   本機（SQLite）：npm run seed
//   Cloud Shell（連 Cloud SQL）：DATABASE_URL=... npm run seed
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import db from './db.js'
import {
  posts, works, leaderboard, proverbs, deities, festivals, flowers, ingredients,
  zodiacs, solarTermArticles, challenges, fortuneTools, cultureTools, plans,
  exploreChips, poemPool, almanacTerms, notifications as notiSeed, storeProducts,
} from '../src/data/mock.js'

const now = () => new Date().toISOString()
const isoAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()

// 種子作者（非真人登入帳號）；handle → 頭像/底色
const AUTHORS = {
  wang_photo: { emoji: '🌾', bg: '#cfe3d3', bio: '記錄台中外埔的稻浪四季 🌾' },
  lin_ocean: { emoji: '🌊', bg: '#cfe3f7', bio: '南台灣海線・晨光獵人' },
  'flora.tw': { emoji: '🪷', bg: '#f6d6e4', bio: '植物園日常，為明年的植物月曆存檔' },
  sky_diary: { emoji: '🌅', bg: '#ffedd5', bio: '日出與節氣的日記' },
  green_life: { emoji: '🍃', bg: '#d3f0ec', bio: '蕨與青草，慢生活' },
  temple_walk: { emoji: '🏯', bg: '#fde9d0', bio: '走訪廟埕與慶典' },
  farm_note: { emoji: '🌾', bg: '#d7e9c9', bio: '田間筆記' },
  hike_tw: { emoji: '⛰️', bg: '#cfe3f7', bio: '台灣百岳與稜線' },
  sun_field: { emoji: '🌻', bg: '#f3e7c9', bio: '花田與陽光' },
}
const seedId = (handle) => 'seed-' + handle.replace(/[^a-z0-9]/gi, '_')

async function upsertUser(u) {
  await db.run(
    `INSERT INTO users (id,email,name,password_hash,role,handle,bio,avatar,avatar_bg,is_seed,email_verified_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT (id) DO UPDATE SET handle=excluded.handle, bio=excluded.bio, avatar=excluded.avatar, avatar_bg=excluded.avatar_bg`,
    [u.id, u.email, u.name, u.hash, u.role || 'user', u.handle, u.bio || null, u.avatar || null,
     u.avatar_bg || null, u.is_seed ?? 0, u.verified ? now() : null, now(), now()])
}

async function run() {
  console.log(`[seed] driver=${db.kind}`)
  // 示範內容（示範作者/貼文/作品/留言/通知）預設「不灌」——避免已上線的站每次部署都被塞回測試資料。
  // 需要示範資料時（例如第一次展示、本機開發）才明確開啟：SEED_DEMO=1 npm run seed
  // 參考清單（濾鏡/諺語/宜忌解釋等 ref_items）與登入帳號則一律更新，不受此開關影響。
  const DEMO = process.env.SEED_DEMO === '1'
  console.log(DEMO
    ? '[seed] SEED_DEMO=1 → 一併灌入示範作者/貼文/作品'
    : '[seed] 只更新參考清單（要示範資料請設 SEED_DEMO=1）')
  const lockedHash = await bcrypt.hash('seed-account-no-login-' + Math.random(), 10)

  // 1) 種子作者
  if (DEMO) for (const [handle, a] of Object.entries(AUTHORS)) {
    await upsertUser({ id: seedId(handle), email: `${handle}@seed.jiqiao.local`, name: handle,
      hash: lockedHash, handle, bio: a.bio, avatar: a.emoji, avatar_bg: a.bg, is_seed: 1, verified: true })
  }

  // 2) 測試登入帳號（README 記載：newuser@example.com / secret12345）
  const testHash = await bcrypt.hash('secret12345', 12)
  await db.run(
    `INSERT INTO users (id,email,name,password_hash,role,handle,bio,avatar,avatar_bg,is_seed,email_verified_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (email) DO NOTHING`,
    ['user-newuser', 'newuser@example.com', '節氣攝影師', testHash, 'user', 'lim_suzuhara',
     '記錄二十四節氣 🌿　台中', '🌾', '#dcfce7', 0, now(), now(), now()])

  // 2b) 管理者帳號 —— 分級示範最高權限
  // ★ 安全：本機開發用固定密碼方便測試；正式環境（NODE_ENV=production）若未指定 ADMIN_PASSWORD，
  //   則產生隨機密碼並只印出一次——避免「文件寫死的密碼」變成正式站的後門。
  const isProdSeed = process.env.NODE_ENV === 'production'
  let adminPw = process.env.ADMIN_PASSWORD
  let generated = false
  if (!adminPw) {
    if (isProdSeed) { adminPw = crypto.randomBytes(12).toString('base64url'); generated = true }
    else adminPw = 'admin12345'
  }
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jiqiao.local'
  const adminHash = await bcrypt.hash(adminPw, 12)
  await db.run(
    `INSERT INTO users (id,email,name,password_hash,role,handle,bio,avatar,avatar_bg,is_seed,email_verified_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (email) DO NOTHING`,
    ['user-admin', adminEmail, '站務管理員', adminHash, 'admin', 'jiqiao_admin',
     '機巧時運 站務', '🛡️', '#e9e3fb', 0, now(), now(), now()])
  if (generated) {
    console.log('\n' + '='.repeat(56))
    console.log('  管理者帳號已建立（此密碼只顯示這一次，請立刻抄下）')
    console.log(`    帳號：${adminEmail}`)
    console.log(`    密碼：${adminPw}`)
    console.log('  註：帳號已存在時不會覆寫密碼；要重設請用 ADMIN_PASSWORD 環境變數。')
    console.log('='.repeat(56) + '\n')
  }

  // 3) 貼文
  let i = 0
  if (DEMO) for (const p of posts) {
    await db.run(
      `INSERT INTO posts (id,user_id,emoji,bg,term,title,caption,tags_json,place,like_count,comment_count,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (id) DO UPDATE SET emoji=excluded.emoji, bg=excluded.bg, term=excluded.term,
         title=excluded.title, caption=excluded.caption, tags_json=excluded.tags_json, place=excluded.place`,
      [p.id, seedId(p.user), p.emoji, p.bg, p.term, p.title, p.caption,
       JSON.stringify(p.tags || []), p.place, p.likes || 0, p.comments || 0, isoAgo(2 + i * 5)])
    i++
  }

  // 4) 市集作品（like_count 取自排行榜）
  const likesByWork = Object.fromEntries(leaderboard.map(l => [l.workId, l.likes]))
  i = 0
  if (DEMO) for (const w of works) {
    await db.run(
      `INSERT INTO works (id,user_id,emoji,bg,term,title,price,like_count,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT (id) DO UPDATE SET emoji=excluded.emoji, bg=excluded.bg, term=excluded.term,
         title=excluded.title, price=excluded.price, like_count=excluded.like_count`,
      [w.id, seedId(w.author), w.emoji, w.bg, w.term, w.title, w.price || 0, likesByWork[w.id] || 0, isoAgo(6 + i * 3)])
    i++
  }

  // 5) 留言（示範，掛在 p1）
  const seedComments = [
    { id: 'cm1', post: 'p1', by: 'flora.tw', body: '這光線也太美了吧！', h: 1.5 },
    { id: 'cm2', post: 'p1', by: 'green_life', body: '想收進我的植物月曆 🙏', h: 1.0 },
    { id: 'cm3', post: 'p1', by: 'sky_diary', body: '芒種就是要來一張稻浪', h: 0.5 },
  ]
  if (DEMO) for (const c of seedComments) {
    await db.run(
      `INSERT INTO comments (id,post_id,user_id,body,created_at) VALUES (?,?,?,?,?)
       ON CONFLICT (id) DO UPDATE SET body=excluded.body`,
      [c.id, c.post, seedId(c.by), c.body, isoAgo(c.h)])
  }
  // p1 留言數同步
  if (DEMO) {
    const cc = await db.get('SELECT COUNT(*) AS n FROM comments WHERE post_id=?', ['p1'])
    await db.run('UPDATE posts SET comment_count=? WHERE id=?', [Number(cc.n), 'p1'])
  }

  // 6) 通知（掛在測試帳號）
  i = 0
  if (DEMO) for (const n of notiSeed) {
    await db.run(
      `INSERT INTO notifications (id,user_id,emoji,body,to_screen,props_json,created_at) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT (id) DO UPDATE SET body=excluded.body, to_screen=excluded.to_screen, props_json=excluded.props_json`,
      [n.id, 'user-newuser', n.emoji, n.text, n.to || null, n.props ? JSON.stringify(n.props) : null, isoAgo(2 + i * 6)])
    i++
  }

  // 相機／濾鏡／特效／背景／動態文字設定（存 DB → 可經 CMS 修改，「資料方便修改」）
  const feedFilters = [
    { id: 'normal', name: '原圖', css: 'none' },
    { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
    { id: 'gingham', name: 'Gingham', css: 'brightness(1.05) sepia(0.04) contrast(0.9)' },
    { id: 'juno', name: 'Juno', css: 'saturate(1.4) contrast(1.1) sepia(0.1) hue-rotate(-10deg)' },
    { id: 'lark', name: 'Lark', css: 'contrast(0.9) brightness(1.1) saturate(1.1)' },
    { id: 'ludwig', name: 'Ludwig', css: 'contrast(1.05) saturate(1.2) brightness(1.05)' },
    { id: 'aden', name: 'Aden', css: 'sepia(0.2) brightness(1.15) saturate(0.85) hue-rotate(-20deg)' },
    { id: 'perpetua', name: 'Perpetua', css: 'contrast(1.1) saturate(1.1) brightness(1.05)' },
    { id: 'reyes', name: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
    { id: 'moon', name: 'Moon', css: 'grayscale(1) brightness(1.1) contrast(1.1)' },
    { id: 'willow', name: 'Willow', css: 'grayscale(0.5) contrast(0.95) brightness(1.1)' },
    { id: 'xproii', name: 'X-Pro II', css: 'contrast(1.3) saturate(1.3) sepia(0.15) brightness(0.95)' },
  ]
  const storyFilters = [
    { id: 'original', name: 'Original', css: 'none' },
    { id: 'paris', name: 'Paris', css: 'brightness(1.08) saturate(1.05) contrast(0.98)' },
    { id: 'oslo', name: 'Oslo', css: 'sepia(0.25) saturate(1.3) contrast(1.15) brightness(1.02)' },
    { id: 'tokyo', name: 'Tokyo', css: 'grayscale(1) contrast(1.4) brightness(1.05)' },
    { id: 'lagos', name: 'Lagos', css: 'sepia(0.15) saturate(1.2) hue-rotate(-8deg)' },
    { id: 'cairo', name: 'Cairo', css: 'contrast(1.2) saturate(0.7) sepia(0.3)' },
  ]
  const effects = [
    { id: 'smooth', name: '平滑肌膚', icon: '✨', type: 'beauty', css: 'blur(0.6px) brightness(1.05) contrast(0.98)' },
    { id: 'glow', name: '柔光美顏', icon: '🌟', type: 'beauty', css: 'brightness(1.08) contrast(0.96) saturate(1.1)' },
    { id: 'makeup', name: '自動上妝', icon: '💄', type: 'beauty', css: 'saturate(1.25) contrast(1.05) brightness(1.03)' },
    { id: 'cat', name: '貓耳', icon: '🐱', type: 'overlay', emoji: '🐱', pos: 'top' },
    { id: 'freckle', name: '雀斑', icon: '🟤', type: 'overlay', emoji: '🟤', pos: 'center' },
    { id: 'crown', name: '花冠', icon: '🌸', type: 'overlay', emoji: '🌸', pos: 'top' },
    { id: 'bighead', name: '大頭', icon: '🤪', type: 'warp', warp: 'bighead' },
    { id: 'alien', name: '外星人', icon: '👽', type: 'warp', warp: 'alien', css: 'hue-rotate(80deg) saturate(1.6)' },
    { id: 'eyecolor', name: '瞳色', icon: '👁️', type: 'overlay', emoji: '🔵', pos: 'eyes' },
  ]
  const gradients = [
    { id: 'sunset', name: '日落', css: 'linear-gradient(160deg,#ff9a9e,#fad0c4)' },
    { id: 'ocean', name: '海', css: 'linear-gradient(160deg,#a1c4fd,#c2e9fb)' },
    { id: 'ink', name: '墨', css: 'linear-gradient(160deg,#232526,#414345)' },
    { id: 'cinnabar', name: '朱', css: 'linear-gradient(160deg,#c0392b,#8e2b20)' },
    { id: 'gold', name: '金', css: 'linear-gradient(160deg,#d4af37,#f9d976)' },
    { id: 'mint', name: '青', css: 'linear-gradient(160deg,#96e6a1,#d4fc79)' },
    { id: 'night', name: '夜', css: 'linear-gradient(160deg,#0f2027,#2c5364)' },
    { id: 'paper', name: '宣紙', css: '#f4ecd8' },
  ]
  const textFx = [
    { id: 'classic', name: '經典', anim: 'none', font: 'serif' },
    { id: 'typewriter', name: '打字機', anim: 'typewriter', font: 'monospace' },
    { id: 'karaoke', name: '卡拉OK', anim: 'karaoke', font: 'system-ui' },
    { id: 'neon', name: '霓虹彈跳', anim: 'neon', font: 'system-ui' },
  ]

  // 7) 參考／編輯內容 → ref_items（清單；社群/曆法/相機設定皆可經 CMS 改）
  const refKinds = {
    proverbs, deities, festivals, flowers, ingredients, zodiacs,
    solarTerms: solarTermArticles, challenges, fortuneTools, cultureTools,
    leaderboard, exploreChips: [{ chips: exploreChips }], poemPool: [{ poems: poemPool }],
    almanacTerms,   // 宜/忌 詞彙白話解釋（id 取 item.term）
    plans: [{ id: 'free', ...plans.free }, { id: 'premium', ...plans.premium }],
    feedFilters, storyFilters, effects, gradients, textFx,
    storeProducts,
  }
  for (const [kind, arr] of Object.entries(refKinds)) {
    let s = 0
    for (const item of arr) {
      const id = String(item.id ?? item.sign ?? item.term ?? item.name ?? s)
      await db.run(
        `INSERT INTO ref_items (kind,id,sort,data) VALUES (?,?,?,?)
         ON CONFLICT (kind,id) DO UPDATE SET sort=excluded.sort, data=excluded.data`,
        [kind, id, s, JSON.stringify(item)])
      s++
    }
    console.log(`[seed] ref_items ${kind}: ${arr.length}`)
  }

  const counts = {}
  for (const t of ['users', 'posts', 'works', 'comments', 'notifications', 'ref_items']) {
    counts[t] = Number((await db.get(`SELECT COUNT(*) AS n FROM ${t}`)).n)
  }
  console.log('[seed] done', counts)
  await db.close()
}

run().catch((e) => { console.error('[seed] failed', e); process.exit(1) })
