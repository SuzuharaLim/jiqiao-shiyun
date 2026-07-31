// 姓名學：五格剖象 + 81 數理 + 三才五行
//
// ⚠️ 這支模組取代的舊實作是全站最嚴重的假資料：
//      分數 = 各字元 charCode 相加 % 40
//      總筆畫 = 5 + (字數 × 7) % 24     ← 根本沒查筆畫表
//      三才五格 = 永遠顯示「木火土 · 相生」寫死字串
//    於是「一」（1 畫）與「王」（4 畫）都算成 12 畫、「abc」26 畫、
//    連 emoji 都能拿到「大吉 94 分」。
//
// 現在每一個數字都是真的推導出來的，而且**查不到筆畫就明講查不到**，
// 不再用任何猜測值填空——這與秤骨頁「不以自撰詩句冒充原文」是同一個原則。
import { strokesOf } from './strokes.js'

// 台灣常見複姓。⚠️ 姓氏切錯會讓五格全錯，所以寧可只收確定的。
const COMPOUND_SURNAMES = [
  '張簡', '范姜', '歐陽', '司馬', '諸葛', '上官', '司徒', '皇甫', '尉遲', '東方',
  '獨孤', '南宮', '慕容', '長孫', '宇文', '呼延', '端木', '百里', '令狐', '鍾離',
  '太史', '軒轅', '夏侯', '赫連', '淳于', '公孫', '澹台',
]

// 81 數理吉凶（熊崎式通行版本）。⚠️ 各家對少數數字的判定略有出入，
// 頁面上已標明採用的版本，不可宣稱為唯一標準。
const AUSPICIOUS = new Set([1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25,
  31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 52, 57, 63, 65, 67, 68, 81])
const HALF = new Set([27, 29, 30, 38, 40, 51, 55, 58, 61, 71, 73, 75, 77, 78])
export const numberLuck = (n) => {
  const k = ((n - 1) % 81) + 1        // 81 以上循環
  return AUSPICIOUS.has(k) ? '吉' : HALF.has(k) ? '半吉' : '凶'
}

// 個位數 → 五行（1,2 木／3,4 火／5,6 土／7,8 金／9,0 水）
const WUXING = ['水', '木', '木', '火', '火', '土', '土', '金', '金', '水']
const wx = (n) => WUXING[n % 10]
// 相生：木→火→土→金→水→木
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
function sancaiRelation(a, b, c) {
  const pair = (x, y) => (SHENG[x] === y ? '生' : KE[x] === y ? '剋' : x === y ? '比和' : '洩')
  const r1 = pair(a, b), r2 = pair(b, c)
  const good = [r1, r2].filter(r => r === '生' || r === '比和').length
  return { text: `${a}${b}${c}`, detail: `${a}${r1}${b}、${b}${r2}${c}`,
    verdict: good === 2 ? '相生' : good === 1 ? '半吉' : '相剋' }
}

// 切姓／名
function splitName(chars) {
  const two = chars.slice(0, 2).join('')
  if (chars.length >= 3 && COMPOUND_SURNAMES.includes(two)) {
    return { sur: chars.slice(0, 2), given: chars.slice(2) }
  }
  return { sur: chars.slice(0, 1), given: chars.slice(1) }
}

/**
 * 人名五格剖象。
 * 回傳 { ok:false, unknown:[...] } 代表有字查不到康熙筆畫——此時**不給任何分數**。
 */
export function analyzeName(input) {
  const chars = [...(input || '').trim()].filter(c => c.trim())
  if (!chars.length) return { ok: false, reason: 'empty' }
  // ⚠️ 非中文字直接擋掉。舊版連 emoji 都照算照給分，是最沒有藉口的一種假資料。
  const unknown = chars.filter(c => strokesOf(c) === null)
  if (unknown.length) return { ok: false, reason: 'unknown', unknown: [...new Set(unknown)] }
  if (chars.length < 2) return { ok: false, reason: 'tooShort' }

  const { sur, given } = splitName(chars)
  const s = (arr) => arr.reduce((n, c) => n + strokesOf(c), 0)
  const perChar = chars.map(c => ({ c, n: strokesOf(c) }))

  // 單姓「假成」補 1；複姓取兩字和。單名的地格同理補 1。
  const tian = sur.length === 1 ? s(sur) + 1 : s(sur)
  const ren = strokesOf(sur[sur.length - 1]) + strokesOf(given[0])
  const di = given.length === 1 ? s(given) + 1 : s(given)
  const zong = s(chars)
  // 外格 = 總格 − 人格 + 1（通行公式）
  const wai = zong - ren + 1

  const grids = [
    { k: '天格', v: tian, d: '祖運，影響有限，主要看與人格的搭配' },
    { k: '人格', v: ren, d: '主運，一生的核心格局' },
    { k: '地格', v: di, d: '前運，約中年之前' },
    { k: '外格', v: wai, d: '副運，社交與外在環境' },
    { k: '總格', v: zong, d: '後運，約中年之後' },
  ].map(g => ({ ...g, luck: numberLuck(g.v), wx: wx(g.v) }))

  const sancai = sancaiRelation(wx(tian), wx(ren), wx(di))
  // 分數：人格與總格各佔重、三才與其餘格次之——全部由上面的判定推導，沒有隨機成分
  const w = { 吉: 100, 半吉: 70, 凶: 40 }
  const score = Math.round(
    w[numberLuck(ren)] * 0.3 + w[numberLuck(zong)] * 0.25 +
    w[numberLuck(di)] * 0.15 + w[numberLuck(wai)] * 0.1 + w[numberLuck(tian)] * 0.05 +
    ({ 相生: 100, 半吉: 70, 相剋: 40 })[sancai.verdict] * 0.15,
  )
  return { ok: true, kind: 'person', sur, given, perChar, grids, sancai, score, zong }
}

/**
 * 店名／品牌：沒有姓名結構，只有總格數理有意義。
 * ⚠️ 不可硬套五格——五格的天/人/地是建立在「姓」與「名」的分工上的。
 */
export function analyzeBrand(input) {
  const chars = [...(input || '').trim()].filter(c => c.trim())
  if (!chars.length) return { ok: false, reason: 'empty' }
  const unknown = chars.filter(c => strokesOf(c) === null)
  if (unknown.length) return { ok: false, reason: 'unknown', unknown: [...new Set(unknown)] }
  const perChar = chars.map(c => ({ c, n: strokesOf(c) }))
  const zong = perChar.reduce((n, x) => n + x.n, 0)
  const luck = numberLuck(zong)
  return { ok: true, kind: 'brand', perChar, zong, luck, wx: wx(zong),
    score: ({ 吉: 100, 半吉: 70, 凶: 40 })[luck] }
}
