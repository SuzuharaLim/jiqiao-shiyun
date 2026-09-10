// ============================================================================
// 節氣知識王題庫閘門（掛在 npm run build 上）
//
// 題庫是**靜態查表**，沒有演算法保護——寫壞了不會有任何錯誤訊息，
// 只會有一個使用者某天答到一題怎麼選都是錯的，而他不會來回報。
// （站規：`almanac.js` 的納音與胎神就是這樣躲過所有檢查的。）
//
// ★★★ 這支特別要擋的是「答得出來但不必懂」的題目：
//   正解明顯最長、選項有重複、四個選項有兩個都對——那些不是資料錯誤，
//   是**出題品質**問題，而它們一樣不會有任何錯誤訊息。
//   擴充前實測就有 3 題「正解明顯最長」，不用懂節氣也猜得到。
//
// ⚠️ 只 import `src/data/quiz.js`（純資料，零相依）。**絕不可**牽到
//   server/db.js 之類的執行期模組——閘門一碰資料層就有能力擋掉正式部署
//   （站規記過一次真實事故）。
// ============================================================================
import { QUESTIONS, KEYS, RULES, dealt, seededDeck, maxScoreFor } from '../src/data/quiz.js'

let fail = 0
const ok = (cond, msg) => { if (!cond) { fail++; console.error('  ✗ ' + msg) } }

// ── A) 每一題的形狀 ────────────────────────────────────────────
const TAGS = new Set(['節氣', '曆法', '生肖', '民俗', '擇日'])
ok(QUESTIONS.length >= 90, `A 題庫至少要 90 題，現在 ${QUESTIONS.length}`)

const seenQ = new Map()
QUESTIONS.forEach((x, i) => {
  const at = `第 ${i + 1} 題「${String(x.q).slice(0, 16)}」`
  ok(typeof x.q === 'string' && x.q.length >= 6, `A ${at} 題目太短或不是字串`)
  ok(Array.isArray(x.o) && x.o.length === KEYS.length,
    `A ${at} 選項不是 ${KEYS.length} 個 —— 發題時 KEYS 會對不上，畫面會少一個代號`)
  ok(new Set(x.o).size === x.o.length, `A ${at} 選項有重複：${x.o.join('／')}`)
  ok(x.o.every(o => typeof o === 'string' && o.trim()), `A ${at} 有空的選項`)
  ok(TAGS.has(x.tag), `A ${at} 的 tag「${x.tag}」不在白名單`)
  ok(typeof x.why === 'string' && x.why.length >= 6,
    `A ${at} 沒有解說 —— 揭曉時那一格會是空的，而解說正是這個遊戲的價值`)

  // ★ 題目不可重複：重複題在同一場裡會連出兩次，看起來像壞掉
  ok(!seenQ.has(x.q), `A ${at} 與第 ${seenQ.get(x.q) + 1} 題完全重複`)
  seenQ.set(x.q, i)

  // ★★ 正解不可明顯最長：那樣不用懂也猜得到（實測擴充前有 3 題中此病）
  const len = x.o.map(o => o.length)
  const correct = x.o[0].length
  ok(!(correct === Math.max(...len) && correct > Math.min(...len) + 4),
    `A ${at} 正解明顯最長（${len.join(',')}）—— 不用懂也猜得到，把干擾項寫紮實一點`)

  // ★ JSX 不 render markdown，星號會原樣印在畫面上（站規已記）
  ok(!/\*\*/.test(x.q + x.o.join('') + x.why), `A ${at} 出現 markdown 的 **粗體**`)
  // 全站禁用 emoji
  ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(x.q + x.o.join('') + x.why),
    `A ${at} 出現 emoji（全站禁用）`)
})

// ── B) 「正解一律寫在 o[0]」這個約定 ──────────────────────────
//
// ★★★★ 這是題庫最重要的約定：新增題目時不必想「答案要放第幾個」。
//   `dealt()` 會洗牌並回報正解洗到第幾個。如果 dealt 沒有正確追蹤，
//   **每一題都會判錯**，而畫面上完全正常（照樣有四個選項可以點）。
{
  let bad = 0
  for (const src of QUESTIONS) {
    for (let t = 0; t < 20; t++) {
      const d = dealt(src)
      if (d.opts[d.ans] !== src.o[0]) bad++
      if (d.opts.length !== src.o.length) bad++
    }
  }
  ok(bad === 0, `B dealt() 有 ${bad} 次沒有正確追蹤正解 —— 每一題都會判錯，而畫面上完全正常`)
}

// ── C) 對戰用的種子牌：兩邊必須拿到同一副 ──────────────────────
//
// ★★★ 對戰的公平性建立在「同一副牌、同樣的選項順序」上。
//   兩邊各洗各的就不是同一場比賽了，而且沒有任何錯誤訊息——
//   兩個人會看到不同的題目卻在比同一個分數。
{
  const a = seededDeck('seed-abc')
  const b = seededDeck('seed-abc')
  const c = seededDeck('seed-xyz')
  ok(a.length === b.length && a.every((q, i) => q.q === b[i].q),
    'C seededDeck 同一個種子產出的題目順序不一致 —— 對戰兩邊會拿到不同的牌')
  ok(a.every((q, i) => q.opts.join() === b[i].opts.join()),
    'C seededDeck 同一個種子產出的選項順序不一致 —— 兩邊看到的甲乙丙丁不一樣')
  ok(a.every((q, i) => q.opts[q.ans] === b[i].opts[b[i].ans]),
    'C seededDeck 兩邊的正解對不上')
  ok(a.some((q, i) => q.q !== c[i]?.q), 'C 不同種子產出了完全一樣的牌 —— 種子沒有生效')
  // 種子牌也要守「正解在 o[0]」的約定
  const wrong = a.filter(q => !q.opts.includes(q.opts[q.ans])).length
  ok(wrong === 0, 'C seededDeck 的正解索引指向不存在的選項')
}

// ── D) 規則常數的自洽 ──────────────────────────────────────────
ok(RULES.TOTAL_TIME > 0 && RULES.HP_MAX > 0, 'D 時間或血量不是正數')
ok(RULES.SOLO_DMG > 0 && RULES.SOLO_DMG <= RULES.HP_MAX, 'D 闖關生存的扣血不合理')
// ★ 一場最多答幾題，決定題庫夠不夠用：血量 ÷ 扣血 ＝ 最多能答錯幾次
ok(QUESTIONS.length >= 45, 'D 題庫太小，同一場裡會出現重複題')
// 分數上界必須單調且夾得住（與 check-badges 那邊是同一支純函式）
ok(maxScoreFor(0) === 0 && maxScoreFor(10) > maxScoreFor(9), 'D maxScoreFor 不單調')

if (fail) {
  console.error('')
  console.error('✗ 題庫 ' + fail + ' 項檢查沒過。')
  console.error('  → 題庫是靜態查表，沒有演算法保護：寫壞了不會有任何錯誤訊息，')
  console.error('    只會有使用者答到一題怎麼選都是錯的，而他不會來回報。')
  console.error('')
  process.exit(1)
}
const byTag = QUESTIONS.reduce((a, x) => (a[x.tag] = (a[x.tag] || 0) + 1, a), {})
console.log(`  ✓ 題庫檢查全部通過（${QUESTIONS.length} 題：`
  + Object.entries(byTag).map(([k, v]) => `${k} ${v}`).join('／') + '）')
