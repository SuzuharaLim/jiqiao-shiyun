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

const { BADGES, SLOT_MAX, TIER_UNIQUE, isReleased: isReleasedFn, termBadgesCompletedBy } =
  await import('../src/data/badges.js')
// ⚠️ **絕不可** import server/badges.js —— 它會牽到 server/db.js，而那支在
//    NODE_ENV=production 且沒設 DB 時會 throw ⇒ 這道閘門就有能力擋掉正式部署。
//    站規記過一次真實事故（check-map.mjs 讀 docs/，連續數次部署都沒上去）。
//    純函式一律從 src/data/ 拿。
const { maxScoreFor } = await import('../src/data/quiz.js')

// ⚠️ 所有檔案在最前面一次讀完。原本散在各段中間，於是新增的檢查放在
//    宣告之前就踩 TDZ（`Cannot access 'srvIndex' before initialization`）。
//    這支是 build 閘門，它自己掛掉就等於整個建置掛掉。
const srvIndex = read('server/index.js')
const srvBadges = read('server/badges.js')
const libBadges = read('src/lib/arBadges.js')

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
ok(quiz.length === 16, `A 節氣知識王應有 16 枚（10 枚 ＋ 2026-09-10 追加的 6 枚逆境徽章），現在 ${quiz.length}`)
// ★ 逆境徽章刻意沒有唯一徽章：「全站輸最多場」被公告出來是難堪的，
//   而王座還會發通知說你被超越了——那個通知在這個語境下是在羞辱人。
const NEGATIVE = ['quiz-first-loss', 'quiz-lose-10', 'quiz-lose-streak-3', 'quiz-ko-5', 'quiz-all-wrong']
for (const id of NEGATIVE) {
  ok(!!BADGES[id], `A 逆境徽章 ${id} 不在目錄裡`)
  ok(BADGES[id]?.tier !== TIER_UNIQUE, `A 逆境徽章 ${id} 不可以是唯一徽章（那是在公告誰輸最多）`)
}
ok(!!BADGES['quiz-comeback'],
  'A 少了「否極泰來」：只有負面徽章的話，收藏庫會變成一面「你有多爛」的牆，這一組要有出口')

// ── A2) 24 節氣卡 ──────────────────────────────────────────────
const terms = list.filter(b => b.group === 'term')
ok(terms.length === 24, `A2 節氣卡徽章應為 24 枚（二十四節氣，使用者指定），現在 ${terms.length}`)
const TERM_SLUGS = (await import('../src/data/termArticle.js')).TERM_ARTICLES.map(t => t.slug)
ok(TERM_SLUGS.length === 24, 'A2 termArticle 的節氣不是 24 個')
for (const slug of TERM_SLUGS) {
  ok(!!BADGES[`badge-term-${slug}`], `A2 少了節氣「${slug}」的卡片徽章`)
}
for (const b of terms) {
  ok(Array.isArray(b.requires), `A2 節氣卡 ${b.id} 缺 requires（空陣列＝卡片尚未發行）`)
  // requires 裡的每一枚都必須真的存在，否則那枚節氣卡**永遠集不滿**而且完全沒有跡象
  for (const r of b.requires) ok(!!BADGES[r], `A2 ${b.id} 的 requires 指向不存在的徽章「${r}」`)
}
// ⚠️ 已發行的卡片其 requires 不可為空——空的話 termBadgesCompletedBy 會
//    在「集滿零枚」時立刻發出去（every 對空陣列恆為 true），變成一登入就送。
for (const b of terms.filter(isReleasedFn)) {
  ok(b.requires.length > 0, `A2 ${b.id} 標為已發行卻沒有 requires`)
}
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

// ── A3) 二十四節氣印 ──────────────────────────────────────────
const jieqi = list.filter(b => b.group === 'jieqi')
ok(jieqi.length === 24, `A3 節氣印應為 24 枚（使用者指定），現在 ${jieqi.length}`)
for (const slug of TERM_SLUGS) {
  ok(!!BADGES[`badge-jieqi-${slug}`], `A3 少了節氣「${slug}」的節氣印`)
}
// ★ 字形磚不可重複：只取第一個字的話立春／立夏／立秋／立冬 是四個一樣的「立」，
//   而字形磚是格子裡的主要辨識物（實測 24 枚裡有 11 枚重複）。
for (const g of ['term', 'jieqi']) {
  const seen = new Map()
  for (const b of list.filter(x => x.group === g)) {
    ok(!seen.has(b.glyph), `A3 ${g} 的字形磚「${b.glyph}」重複：${seen.get(b.glyph)} 與 ${b.term}`)
    seen.set(b.glyph, b.term)
  }
}

// ── A4) 「今天是哪個節氣」只能由伺服器算 ──────────────────────
//
// ★★★★ 交給前端的話，把系統時鐘調一調就能一次集滿 24 枚，
//   而這一組徽章的全部價值就在「你真的在那段時間來過」。
ok(/app\.post\('\/api\/badges\/checkin'[\s\S]{0,700}termFromDate\(/.test(srvIndex),
  'A4 /api/badges/checkin 沒有自己算節氣 ⇒ 這一組的判定不在伺服器手上')
ok(/app\.post\('\/api\/badges\/checkin'[\s\S]{0,700}taipeiToday\(\)/.test(srvIndex),
  'A4 checkin 沒有用 taipeiToday()：Cloud Run 是 UTC，台灣時間 00:00–08:00 會算成前一天，'
  + '交節那天就會蓋錯印')
// ★ 這支**不可接受任何輸入**：前端唯一能決定的是「要不要呼叫」。
{
  const blk = srvIndex.slice(srvIndex.indexOf("app.post('/api/badges/checkin'"))
    .slice(0, 900)
  ok(!/req\.body/.test(blk),
    'A4 checkin 讀了 req.body ⇒ 節氣可以由前端指定，這一組就形同虛設')
}
// 前端那支只負責「要不要呼叫」，不可自己決定 id 送給後端
{
  const cli = read('src/lib/arBadges.js')
  ok(/api\.stampTerm\(\)/.test(cli), 'A4 前端沒有走伺服器的 stampTerm')
  ok(!/api\.stampTerm\([^)]/.test(cli), 'A4 stampTerm 不可帶參數：節氣由伺服器算')
}

// ── B) 三道「唯一徽章不可寫進 user_badges」的過濾 ──────────────
//
// 這三道防的是**不同的路徑**，缺一不可：
//   ① server/index.js 的 POST /api/badges —— 使用者可直接呼叫的端點
//   ② server/badges.js 的 grantBadges —— 未來每個新玩法都會走的內部入口
//   ③ src/lib/arBadges.js 的 save() —— localStorage，會被 syncBadges 推上去

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

// 易主必須是條件式 UPDATE（原子），不可「SELECT 出來比大小再寫回去」。
// ⚠️ 檢查的是**性質**不是逐字：換行、參數順序都可能變，但這三個條件不能少。
const THRONE_UPDATE = srvBadges.match(/UPDATE badge_thrones SET user_id=\?[\s\S]{0,200}?`/)?.[0] || ''
ok(/AND value<\?/.test(THRONE_UPDATE),
  'C claimThrone 的易主 UPDATE 少了 `AND value<?`：SELECT 再無條件 UPDATE 中間有空隙，'
  + '兩個人同時破紀錄會兩個人都成功，而畫面上不會有任何錯誤')
// ★ 這一條鎖的是「被擠下來的是誰」的精確性：WHERE 帶 user_id ⇒ changes=1 就
//   證明寫入那一刻持有者確實是我們讀到的那個人。少了它，高度競爭時會**通知錯人**
//   ——跟一個徽章好好的人說「你被搶走了」。
ok(/AND user_id=\?/.test(THRONE_UPDATE),
  'C claimThrone 的易主 UPDATE 少了 `AND user_id=?`：previousUserId 會是過期的，通知會發給錯的人')
ok(/if \(r\.changes\) return \{ badgeId/.test(srvBadges),
  'C claimThrone 沒有用 changes 當「真的搶到」的判準：那條 UPDATE 沒改到任何列時仍會宣告搶到')

// ── C2) 統計一律原子遞增，不可 read-modify-write ────────────────
//
// ★★★★ 「讀出來 → 在 JS 加一 → 整份寫回去」是典型的 lost update：
//   兩個請求同時進來，後寫的那份會用**過期的快照**蓋掉前一份 ⇒ 少算一場。
//   而少算的那一場如果剛好是第 10 敗，「屢敗屢戰」就再也不會發出來，
//   使用者只會覺得「我明明輸夠了卻沒拿到」——完全查不出原因。
ok(!/UPDATE quiz_stats SET games=\?/.test(srvBadges),
  'C2 quiz_stats 被整份寫回（`SET games=?`）——那是 read-modify-write，並發時會掉更新。'
  + '一律用 `SET games=games+1` 這種原子遞增')
ok(/SET games=games\+1/.test(srvBadges), 'C2 recordSoloGame 的場次沒有用原子遞增')
ok(/duel_losses=duel_losses\+1/.test(srvBadges) && /lose_streak=lose_streak\+1/.test(srvBadges),
  'C2 recordDuel 的敗場／連敗沒有用原子遞增')
// ★「否極泰來」的判斷必須與歸零是同一條 SQL：先讀進變數再歸零的話，
//   判斷依據與寫入之間有空隙。
ok(/lose_streak=0[\s\S]{0,120}WHERE user_id=\? AND lose_streak>=3/.test(srvBadges),
  'C2 「否極泰來」不是用條件式 UPDATE 判定：判斷與歸零之間有空隙，並發時會用到過期的數字')
ok(/best_streak=duel_streak WHERE user_id=\? AND best_streak<duel_streak/.test(srvBadges),
  'C2 best_streak 不是欄位對欄位的原子比較')

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

// ── E2) 節氣卡集滿的判定（純函式，直接算）──────────────────────
{
  const xh = BADGES['badge-term-xiaohan']
  ok(xh && xh.requires.length === 5, 'E2 小寒卡應該要求 5 枚熱區徽章')
  const four = xh.requires.slice(0, 4)
  ok(termBadgesCompletedBy(xh.requires[4], four).includes('badge-term-xiaohan'),
    'E2 集滿五枚時沒有發出小寒節氣卡')
  ok(termBadgesCompletedBy(xh.requires[4], four.slice(0, 2)).length === 0,
    'E2 只集了三枚就發出節氣卡')
  // ★ 已經有了就不可以再發一次（否則每答一次題都會再通知一次）
  ok(termBadgesCompletedBy(xh.requires[4], [...four, 'badge-term-xiaohan']).length === 0,
    'E2 已經擁有的節氣卡又被發了一次')
  // ★ 未發行的卡（requires 為空）永遠不可被發出：every 對空陣列恆為 true，
  //   這是最容易寫錯的一格——寫錯的話一登入就白送 23 枚。
  ok(!termBadgesCompletedBy('badge-xiaohan-napa', []).includes('badge-term-lichun'),
    'E2 未發行的節氣卡被發出去了（every 對空陣列恆為 true 的經典坑）')
  ok(Object.values(BADGES).filter(b => b.group === 'term' && !isReleasedFn(b))
    .every(b => termBadgesCompletedBy('badge-xiaohan-napa', Object.keys(BADGES)).indexOf(b.id) < 0),
    'E2 即使擁有全部徽章，未發行的節氣卡仍不可被發出')
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
