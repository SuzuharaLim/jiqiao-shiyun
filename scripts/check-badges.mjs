// ============================================================================
// 徽章系統閘門（掛在 npm run build 上）
//
// 這一支存在的理由只有一個：**唯一徽章的「唯一」是靠三道各自獨立的過濾撐住的**，
// 而那三道平常永遠通過 ⇒ 拿掉任何一道，本機、測試、畫面全都看不出差別，
// 只有在有人真的去 POST 一個王座 id 的那一天才會炸，而那時已經有兩個人
// 同時掛著「全站唯一」了。
//
// 2026-09-10 實測過這個洞是真的：admin 一場都沒贏，
// `POST /api/badges {ids:['quiz-throne-streak']}` 就拿到了「連勝之王」。
//
// ★★★ 負向檢查（「原始碼不可出現 X」／「必須出現 X」）**一律先自我驗證**：
//   對一個「應該被抓到的樣本」跑一次，抓不到就讓建置失敗。
//   一個永遠通過的檢查比沒有檢查更糟（站規已記過一次真實事故）。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

let fail = 0
const ok = (cond, msg) => { if (!cond) { fail++; console.error('  ✗ ' + msg) } }

const { BADGES, SLOT_MAX, TIER_UNIQUE } = await import('../src/data/badges.js')
// ⚠️ **絕不可** import server/badges.js —— 它會牽到 server/db.js，而那支在
//    NODE_ENV=production 且沒設 DB 時會 throw ⇒ 這道閘門就有能力擋掉正式部署。
//    站規記過一次真實事故（check-map.mjs 讀 docs/，連續數次部署都沒上去）。
//    純函式一律從 src/data/ 拿。
const { maxScoreFor } = await import('../src/data/quiz.js')

// ── A) 目錄本身 ────────────────────────────────────────────────
// 後端的白名單是 /^[a-z0-9-]{3,48}$/。目錄裡有 id 不合這個格式的話，
// 那枚徽章**永遠發不出去**，而且不會有任何錯誤訊息。
const ID_RE = /^[a-z0-9-]{3,48}$/
const list = Object.values(BADGES)
ok(list.length >= 15, `A 目錄至少要有 15 枚，現在 ${list.length}`)
for (const b of list) {
  ok(ID_RE.test(b.id), `A 徽章 id「${b.id}」不符後端白名單 /^[a-z0-9-]{3,48}$/，永遠發不出去`)
  ok(!!b.name, `A 徽章 ${b.id} 缺 name`)
  ok(!!b.how, `A 徽章 ${b.id} 缺 how（收藏庫要顯示「怎麼拿」，缺了那一格就是空的）`)
  ok(!!b.glyph, `A 徽章 ${b.id} 缺 glyph`)
  ok(!!b.group, `A 徽章 ${b.id} 缺 group`)
  ok(b.tier === 'normal' || b.tier === TIER_UNIQUE, `A 徽章 ${b.id} 的 tier 不合法`)
}
for (const [k, v] of Object.entries(BADGES)) ok(k === v.id, `A 目錄 key「${k}」與 id「${v.id}」不一致`)

const quiz = list.filter(b => b.group === 'quiz')
const uniq = list.filter(b => b.tier === TIER_UNIQUE)
ok(quiz.length === 10, `A 節氣知識王應有 10 枚（使用者指定），現在 ${quiz.length}`)
ok(uniq.length >= 1, 'A 至少要有一枚唯一徽章')
// 唯一徽章必須有 metric —— 沒有 metric 就代表它是「前端說了算」，
// 而那正是唯一徽章絕對不能有的性質。
for (const b of uniq) {
  ok(!!b.metric, `A 唯一徽章 ${b.id} 沒有 metric：那代表它的判定沒有伺服器端的依據`)
  ok(Number.isFinite(b.floor) && b.floor >= 1,
    `A 唯一徽章 ${b.id} 沒有 floor：空王座會變成「打一場就登基」`)
  ok(!!b.unit, `A 唯一徽章 ${b.id} 沒有 unit（收藏庫要顯示「目前持有：某人（N 單位）」）`)
}
ok(SLOT_MAX === 3, `A 展示欄位數應為 3（使用者指定），現在 ${SLOT_MAX}`)

// ── B) 三道「唯一徽章不可寫進 user_badges」的過濾 ──────────────
//
// 這三道防的是**不同的路徑**，缺一不可：
//   ① server/index.js 的 POST /api/badges —— 使用者可直接呼叫的端點
//   ② server/badges.js 的 grantBadges —— 未來每個新玩法都會走的內部入口
//   ③ src/lib/arBadges.js 的 save() —— localStorage，會被 syncBadges 推上去
const srvIndex = read('server/index.js')
const srvBadges = read('server/badges.js')
const libBadges = read('src/lib/arBadges.js')

const GUARD_1 = /\.filter\(x\s*=>\s*BADGES\[x\]\?\.tier\s*!==\s*'unique'\)/
const GUARD_2 = /if\s*\(!BADGES\[id\]\s*\|\|\s*BADGES\[id\]\.tier\s*===\s*'unique'\)\s*continue/
const GUARD_3 = /\.filter\(id\s*=>\s*BADGES_TIER\[id\]\s*!==\s*'unique'\)/

ok(GUARD_1.test(srvIndex),
  'B① POST /api/badges 沒有過濾唯一徽章 ⇒ 任何人都能 POST 一個王座 id 永久擁有它，而且兩個人可以同時有')
ok(GUARD_2.test(srvBadges),
  'B② grantBadges 沒有過濾唯一徽章 ⇒ 寫進 user_badges 等於永久所有權，王座易主也拿不走')
ok(GUARD_3.test(libBadges),
  'B③ arBadges.save() 沒有過濾唯一徽章 ⇒ 王座被存進 localStorage，易主後站內仍顯示你有')

// ★ 自我驗證：把樣本改壞，這三條必須抓得到。抓不到代表 regex 寫錯了。
ok(!GUARD_1.test(srvIndex.replace(GUARD_1, '.filter(x => true)')), 'B① 的檢查抓不到「過濾被拿掉」——這條規則是假的')
ok(!GUARD_2.test(srvBadges.replace(GUARD_2, 'if (!BADGES[id]) continue')), 'B② 的檢查抓不到「過濾被拿掉」——這條規則是假的')
ok(!GUARD_3.test(libBadges.replace(GUARD_3, '')), 'B③ 的檢查抓不到「過濾被拿掉」——這條規則是假的')

// ── C) 王座的資料層約束 ────────────────────────────────────────
const schema = read('server/schema.sql')
ok(/CREATE TABLE IF NOT EXISTS badge_thrones\s*\([^)]*badge_id\s+TEXT\s+PRIMARY KEY/i.test(schema),
  'C badge_thrones 的 PRIMARY KEY 必須是 badge_id ——「全站只有一個人」是資料層的約束，'
  + '不是應用層的自律。改成 (badge_id,user_id) 之類的複合鍵，兩個人同時破紀錄就會兩個人都成功')
ok(/badge_thrones[\s\S]{0,400}ON DELETE CASCADE/i.test(schema),
  'C badge_thrones 少了 ON DELETE CASCADE：帳號刪掉後王座會指向一個不存在的人')

// 易主必須是條件式 UPDATE（原子），不可「SELECT 出來比大小再寫回去」
ok(/UPDATE badge_thrones SET user_id=\?, value=\?, won_at=\? WHERE badge_id=\? AND value<\?/.test(srvBadges),
  'C claimThrone 的易主不是條件式 UPDATE：SELECT 再 UPDATE 中間有空隙，'
  + '兩個人同時破紀錄會兩個人都成功，而畫面上不會有任何錯誤')
ok(/if\s*\(!r\.changes\)\s*return null/.test(srvBadges),
  'C claimThrone 沒有檢查 changes：那條 UPDATE 沒改到任何列時仍會宣告「搶到了」')

// ── D) 展示（名片）不可說謊 ────────────────────────────────────
ok(/app\.get\('\/api\/card\/:handle'[\s\S]{0,1600}thronesOf\(u\.id\)/.test(srvIndex),
  'D /api/card 沒有在讀取當下重驗王座持有 ⇒ 名片會掛著一枚已經易主的「全站唯一」')
ok(/app\.get\('\/api\/card\/:handle'[\s\S]{0,1800}slots\.filter\(id => owned\.has\(id\)\)/.test(srvIndex),
  'D /api/card 沒有把「裝上但已經不持有」的徽章濾掉')
ok(/app\.patch\('\/api\/me\/badges'[\s\S]{0,900}不能裝上還沒拿到的徽章/.test(srvIndex),
  'D PATCH /api/me/badges 沒有驗持有 ⇒ 任何人都能在名片掛上「全站唯一」')
ok(/app\.get\('\/api\/card\/:handle'/.test(srvIndex) && !/app\.get\('\/api\/card\/:handle', requireAuth/.test(srvIndex),
  'D /api/card 不可 requireAuth：名片的用途就是給別人看')

// 名片是公開頁 ⇒ 一個私密欄位都不能回。
const cardBlock = srvIndex.slice(srvIndex.indexOf("app.get('/api/card/:handle'"))
  .slice(0, 2000)
for (const leak of ['email', 'password', 'role', 'csrf']) {
  ok(!new RegExp(`\\b${leak}\\b`, 'i').test(cardBlock),
    `D /api/card 回應裡出現了「${leak}」——那是公開端點，不可有私密欄位`)
}

// ── E) 分數上界（純函式，直接算）────────────────────────────────
{
  ok(maxScoreFor(0) === 0, 'E maxScoreFor(0) 應為 0')
  // 3 題全對的上界：220*1 + 220*1 + 220*2 = 880
  ok(maxScoreFor(3) === 880, `E maxScoreFor(3) 應為 880，實際 ${maxScoreFor(3)}`)
  ok(maxScoreFor(10) > maxScoreFor(9), 'E maxScoreFor 必須單調遞增')
  ok(maxScoreFor(1e9) === maxScoreFor(200),
    'E maxScoreFor 沒有夾住上限：答對題數是使用者送上來的，不夾會被拿去做大數運算')
  ok(/Math\.min\(maxScoreFor\(right\)/.test(srvBadges),
    'E recordSoloGame 沒有用 maxScoreFor 夾分數 ⇒ 送 999999 就直接登上「節氣之王」')
}

// ── F) 前端不可自己判定徽章 ────────────────────────────────────
const quizScreen = read('src/screens/QuizGame.jsx')
ok(!/earnBadge\s*\(\s*['"`]quiz-/.test(quizScreen),
  'F QuizGame 不可用 earnBadge 自己發知識王徽章：那條路徑是本機的、可偽造的，'
  + '而且會繞過伺服器的分數上界。一律走 POST /api/quiz/result')
ok(/g\.mode !== 'pvp'/.test(quizScreen) && /api\.quizResult/.test(quizScreen),
  'F 真人對戰不可送 /quiz/result：對戰的勝負由伺服器的 quizFinish 判定，'
  + '前端送等於自稱贏了，而「連勝之王」是全站唯一的王座')
// 自我驗證
ok(/quiz-/.test('earnBadge("quiz-x")') && /earnBadge\s*\(\s*['"`]quiz-/.test('earnBadge("quiz-x")'),
  'F 的負向 regex 自我驗證失敗——它抓不到應該被抓到的樣本')

// ── G) 對戰結算只能有一個入口，而且必須擋重入 ────────────────
ok(/if \(!r\.changes\) return\s*$/m.test(srvIndex) || /if \(!r\.changes\) return\n/.test(srvIndex),
  'G quizFinish 沒有擋重入：四個呼叫點都可能重複收局，不擋的話同一場會被重複計進連勝，'
  + '而灌出來的連勝會把「連勝之王」從一個真的連贏的人手上拿走')
ok((srvIndex.match(/recordDuel\(/g) || []).length === 1,
  'G recordDuel 只能被呼叫一次（在 quizFinish 這個單一入口）。'
  + '多個入口遲早分岔，而分岔的那一份不會有人發現')

if (fail) {
  console.error('')
  console.error('✗ 徽章系統 ' + fail + ' 項檢查沒過。')
  console.error('  → 唯一徽章的「唯一」是靠幾道平常永遠通過的過濾撐住的，')
  console.error('    拿掉任何一道，本機、測試、畫面全都看不出差別。')
  console.error('')
  process.exit(1)
}
console.log(`  ✓ 徽章系統檢查全部通過（目錄 ${list.length} 枚／唯一 ${uniq.length} 枚／三道唯一性防線＋王座原子性）`)
