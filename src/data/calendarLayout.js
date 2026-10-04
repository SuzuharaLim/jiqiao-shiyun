// ============================================================================
// 桌曆的頁面排版資料（2026-10-04）——純函式、零 DOM，可以直接 node 測
//
// 輸入一份設計（週期＋起始），輸出每一頁「有哪些日子、每天標什麼」。
// 畫面（2D 預覽、3D 貼圖、後台）全部吃這一份，不各自算——同一本桌曆在三個地方
// 長得不一樣，客人會以為後台收到的不是他設計的那一本。
//
// ★ 農曆與節氣用 lunisolar.js 的真實天文演算，不用 dayFor()：
//   dayFor 每天要算一整套神煞，一本週曆 364 天會很慢；日期格只需要農曆與節氣。
//   宜忌（選配）才另外呼叫 dayFor，而且只算「正在看的那一頁」。
//
// ⚠️ 國定假日每年由人事行政總處公告（補班、彈性放假年年不同），所以這裡**只標節日
//   名稱、不標紅字放假**。標錯放假日、印出來整批作廢，是我們的責任。
//   畫面與後台都註明「假日以政府公告為準」。
// ============================================================================
import { lunarFromDate, termTable, TERM_NAMES } from './lunisolar.js'
import { CADENCES } from './calendarRules.js'

const SOLAR_FEST = {
  '1-1': '元旦', '2-28': '和平紀念日', '4-4': '兒童節', '5-1': '勞動節',
  '9-28': '教師節', '10-10': '國慶日', '12-25': '行憲紀念日',
}
const LUNAR_FEST = {
  '1-1': '春節', '1-15': '元宵', '5-5': '端午', '7-7': '七夕',
  '7-15': '中元', '8-15': '中秋', '9-9': '重陽',
}
export const WD_ZH = ['日', '一', '二', '三', '四', '五', '六']
export const WD_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// ── 日期工具：一律用 UTC 計算日序，避免任何時區／夏令時間的位移 ──
const DAY = 86400000
const toUTC = (y, m, d) => Date.UTC(y, m - 1, d)
const fromUTC = (t) => { const x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), wd: x.getUTCDay() } }
const addDays = (o, n) => fromUTC(toUTC(o.y, o.m, o.d) + n * DAY)
const daysBetween = (a, b) => Math.round((toUTC(b.y, b.m, b.d) - toUTC(a.y, a.m, a.d)) / DAY)

// 節氣日查表（依需要的年份懶建）
const termCache = new Map()
function termOfDay(y, m, d) {
  if (!termCache.has(y)) {
    const map = new Map()
    for (const yy of [y - 1, y]) for (const t of termTable(yy)) map.set(`${t.y}-${t.m}-${t.d}`, t.name)
    termCache.set(y, map)
  }
  return termCache.get(y).get(`${y}-${m}-${d}`) || null
}

/** 某一天要印在日期格上的資訊。 */
export function dayInfo(o) {
  const lun = lunarFromDate(o.y, o.m, o.d)
  let fest = SOLAR_FEST[`${o.m}-${o.d}`] || null
  if (lun && !lun.leap) {
    fest = LUNAR_FEST[`${lun.month}-${lun.day}`] || fest
    // 除夕＝農曆年最後一天（十二月可能是 29 或 30），看隔天是不是正月初一
    if (lun.month === 12 && lun.day >= 29) {
      const n = addDays(o, 1)
      const nl = lunarFromDate(n.y, n.m, n.d)
      if (nl && nl.month === 1 && nl.day === 1 && !nl.leap) fest = '除夕'
    }
  }
  return {
    ...o,
    wd: o.wd ?? fromUTC(toUTC(o.y, o.m, o.d)).wd,
    lunar: lun ? (lun.day === 1 ? `${lun.monthName}月` : lun.dayName) : '',
    term: termOfDay(o.y, o.m, o.d),
    fest,
  }
}

// 把一段連續日期排成「週 × 7」的格子（前後補 null）
function weeksOf(from, count, weekStart) {
  const first = fromUTC(toUTC(from.y, from.m, from.d))
  const lead = (first.wd - weekStart + 7) % 7
  const cells = Array(lead).fill(null)
  for (let i = 0; i < count; i++) cells.push(dayInfo(addDays(first, i)))
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
const monthLen = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const md = (o) => `${o.m}/${o.d}`

// 節氣序列：從 (year, index) 起第 k 個節氣的日期。index 是「立春起算」（lunisolar 的慣例）
function termAt(year, index, k) {
  const i = index + k
  const y = year + Math.floor(i / 24)
  const j = ((i % 24) + 24) % 24
  const t = termTable(y)[j]
  return { name: TERM_NAMES[j], y: t.y, m: t.m, d: t.d }
}

/**
 * 依設計產生全部頁面。
 * 每頁：{ index, kind, label, sub, from, to, weeks } —— quarter 另有 months:[{label, weeks}]
 */
export function buildPages(design) {
  const { cadence, start, style } = design
  const ws = style?.weekStart === 1 ? 1 : 0
  const n = CADENCES[cadence]?.pages || 12
  const pages = []

  if (cadence === 'month') {
    for (let i = 0; i < n; i++) {
      const mi = start.month - 1 + i
      const y = start.year + Math.floor(mi / 12), m = (mi % 12) + 1
      const from = { y, m, d: 1 }
      pages.push({ index: i, kind: 'month', label: `${m}月`, en: monthEn(m), sub: String(y), from,
        to: { y, m, d: monthLen(y, m) }, weeks: weeksOf(from, monthLen(y, m), ws) })
    }
  } else if (cadence === 'term') {
    // ⚠️ lunisolar 的年份是「立春起算」：termTable(2027) 的小寒、大寒落在 2028 年 1 月。
    //    但使用者選「2027 年、從小寒開始」指的是 2027 年 1 月的小寒（跟 2027 小寒卡同一天）。
    //    所以小寒／大寒（index 22、23）的立春年要往前退一年。
    const baseYear = start.termIndex >= 22 ? start.year - 1 : start.year
    for (let i = 0; i < n; i++) {
      const a = termAt(baseYear, start.termIndex, i)
      const b = termAt(baseYear, start.termIndex, i + 1)
      const to = addDays(b, -1)
      pages.push({ index: i, kind: 'term', label: a.name, en: '', sub: `${a.y} · ${md(a)}–${md(to)}`, term: a.name,
        from: { y: a.y, m: a.m, d: a.d }, to, weeks: weeksOf(a, daysBetween(a, b), ws) })
    }
  } else if (cadence === 'week') {
    const [Y, M, D] = start.date.split('-').map(Number)
    const s0 = fromUTC(toUTC(Y, M, D))
    const first = addDays(s0, -((s0.wd - ws + 7) % 7))       // 對齊到週的第一天
    for (let i = 0; i < n; i++) {
      const from = addDays(first, i * 7), to = addDays(from, 6)
      pages.push({ index: i, kind: 'week', label: `第 ${i + 1} 週`, en: '', sub: `${from.y} · ${md(from)}–${md(to)}`,
        from, to, weeks: weeksOf(from, 7, ws) })
    }
  } else {   // quarter
    for (let i = 0; i < n; i++) {
      const months = []
      for (let k = 0; k < 3; k++) {
        const mi = start.month - 1 + i * 3 + k
        const y = start.year + Math.floor(mi / 12), m = (mi % 12) + 1
        months.push({ label: `${m}月`, y, m, weeks: weeksOf({ y, m, d: 1 }, monthLen(y, m), ws) })
      }
      const a = months[0], c = months[2]
      pages.push({ index: i, kind: 'quarter', label: `${a.label}–${c.label}`, en: '', sub: a.y === c.y ? String(a.y) : `${a.y}–${c.y}`,
        from: { y: a.y, m: a.m, d: 1 }, to: { y: c.y, m: c.m, d: monthLen(c.y, c.m) }, months })
    }
  }
  return pages
}

const EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const monthEn = (m) => EN[m - 1]

/** 起始選項：節氣週期要讓使用者選「從哪個節氣開始」。 */
export const TERM_START_OPTIONS = TERM_NAMES.map((name, i) => ({ index: i, name }))
