// 曆算靜態表的快照檢查 —— 任何人改到這些表就會紅燈
//
// 為什麼需要：2026-07 的資料稽核發現納音表只有 12 筆（應 30）且索引公式錯誤，
// 六十干支裡 58 個是錯的；胎神表最後 15 筆方位全被寫成同一個值。
// 這兩張表都是「靜態查表」——沒有演算法保護，寫壞了不會有任何錯誤訊息，
// 而且剛好 2026 年是丙午，納音那個 bug 今年看起來完全正常。
//
// 用法：node scripts/check-almanac.mjs（build 前跑，或加進 CI）
import { dayFor, offsetFromDate, nayinOf } from '../src/data/almanac.js'

const G = '甲乙丙丁戊己庚辛壬癸'
const Z = '子丑寅卯辰巳午未申酉戌亥'
let fail = 0
const eq = (label, got, want) => {
  if (got !== want) { fail++; console.log(`✗ ${label}: 得「${got}」應為「${want}」`) }
}

// ── 1. 六十干支納音（30 組，兩兩一組）──
const NAYIN_EXPECT = [
  '海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火',
  '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土',
  '霹靂火', '松柏木', '長流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]
for (let n = 0; n < 60; n++) {
  const gz = G[n % 10] + Z[n % 12]
  eq(`納音 ${gz}`, nayinOf(n % 10, n % 12), NAYIN_EXPECT[Math.floor(n / 2)])
}

// ── 2. 胎神方位段落長度（外東南 2、外正南 5、外西南 6 …）──
// ⚠️ 這一段是規律的：六十日的方位依序走完十二個方位，各段長度固定。
//    長度對不上就代表有人把某幾筆的方位寫成同一個值（2026-07 就是這樣壞的）。
const DIR_RUNS = [
  ['外東南', 2], ['外正南', 5], ['外西南', 6], ['外正西', 5], ['外西北', 6],
  ['外正北', 5], ['房內北', 5], ['房內南', 6], ['房內東', 5], ['外東北', 6],
  ['外正東', 5], ['外東南', 4],
]
const taishen = []
for (let i = 0; i < 60; i++) taishen.push(dayFor(offsetFromDate(new Date(2026, 6, 31)) + i))
// 直接由日柱重建六十筆（與日期無關，取 60 連續日必涵蓋全部）
const byGz = new Map()
for (let i = 0; i < 60; i++) {
  const d = taishen[i]
  byGz.set(d.ganzhi.replace('日', ''), d.taishen)
}
eq('胎神涵蓋六十干支', byGz.size, 60)
let idx = 0
for (const [dir, len] of DIR_RUNS) {
  for (let k = 0; k < len; k++, idx++) {
    const gz = G[idx % 10] + Z[idx % 12]
    const got = byGz.get(gz) || ''
    if (!got.endsWith(dir)) { fail++; console.log(`✗ 胎神 ${gz}（第 ${idx} 筆）：「${got}」方位應為「${dir}」`) }
  }
}

// ── 3. 全年一致性：宜忌與神煞零矛盾、星等與評等一致 ──
let contra = 0
for (let i = 0; i < 400; i++) {
  const d = dayFor(offsetFromDate(new Date(2026, 0, 1)) + i)
  if (d.yi.some(t => d.ji.includes(t))) contra++
  const vis = d.stars >= 4 ? '吉勝於凶' : d.stars <= 2 ? '凶勝於吉' : '吉凶參半'
  if (vis !== d.rating) contra++
}
if (contra) { fail += contra; console.log(`✗ 400 天一致性檢查有 ${contra} 筆矛盾`) }

// ── 4. 沖煞干支：A 沖 B 的六十甲子序數差恆為 6 ──
const sex = (gz) => { for (let n = 0; n < 60; n++) if (G[n % 10] === gz[0] && Z[n % 12] === gz[1]) return n; return -1 }
for (let i = 0; i < 60; i++) {
  const d = dayFor(offsetFromDate(new Date(2026, 6, 1)) + i)
  const self = d.ganzhi.replace('日', '')
  const diff = ((sex(self) - sex(d.chong.gz)) % 60 + 60) % 60
  if (diff !== 6) { fail++; console.log(`✗ 沖煞 ${self} → ${d.chong.gz}，序數差 ${diff}（應為 6）`) }
}

console.log(fail ? `\n✗ 共 ${fail} 項不通過` : '\n✓ 納音 60、胎神 60、400 天一致性、60 天沖煞 全部通過')
process.exit(fail ? 1 : 0)
