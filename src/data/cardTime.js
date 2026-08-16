import { TERM_NAMES, termFromDate, termLocalDay, dateFromJd } from './lunisolar.js'
import { taipeiToday } from './almanac.js'

// ============================================================================
// 卡片的「時間關係」—— 今天 vs 這張卡的節氣
//
// ★★★★ 為什麼需要這個檔案：**語言模型沒有時鐘**。
//   任何跟「現在」有關的東西都必須由我們算好、當成變數餵進去。
//   先前系統提示裡完全沒有日期，模型只好把卡片上的「小寒」當成此刻——
//   於是 8 月的台灣（33 度、剛過大暑）它開口就是「小寒的風有點冷」，
//   而且宣稱自己「正忙著長得圓滾滾」，可是結球白菜八月在平地根本不是產季。
//   使用者看到那句話的第一反應是「這東西壞了」。
//
// ★ 節氣是**真實天文演算**（`lunisolar.js`：Meeus 朔望月＋太陽視黃經），
//   不是寫死的日期表，所以不會有「幾年後就錯了」的問題，也不需要定期重算。
// ⚠️ 一律用**台北的日曆日**（`taipeiToday()`）。Cloud Run 預設時區是 UTC，
//   台灣時間 00:00–08:00 這八個小時直接算成前一天；交節時刻又常落在半夜。
// ============================================================================

/** 兩個日曆日相差幾天（不看時分秒）。 */
const dayDiff = (a, b) => Math.round(
  (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
    - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000,
)

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const WK = ['日', '一', '二', '三', '四', '五', '六']

/**
 * 某個節氣在某個公曆年的交節日。
 *
 * ⚠️ `termLocalDay(Y, i)` 的 `i` 是**以立春起算**的序號，所以序號大的節氣
 *    （小寒、大寒）算出來會落在 **Y+1** 年——`termLocalDay(2027, 22)` 得到的
 *    是 2028-01-06，不是 2027 小寒。（CLAUDE.md 記過這個坑。）
 * ⇒ 這裡不去推導那個偏移，直接試 Y-1 與 Y 兩個起算年，取算出來真的落在
 *    目標公曆年的那一個。這樣寫不會因為我對偏移的理解有誤而算錯。
 */
export function termDateInYear(termName, year) {
  const i = TERM_NAMES.indexOf(termName)
  if (i < 0) return null
  for (const base of [year - 1, year]) {
    const r = dateFromJd(termLocalDay(base, i))
    if (r?.y === year) return new Date(r.y, r.m - 1, r.d)
  }
  return null
}

/** 下一個節氣的交節日（用來判斷「還在這個節氣裡」）。 */
function nextTermDate(termName, year) {
  const i = TERM_NAMES.indexOf(termName)
  if (i < 0) return null
  const start = termDateInYear(termName, year)
  if (!start) return null
  for (const base of [year - 1, year, year + 1]) {
    const r = dateFromJd(termLocalDay(base, (i + 1) % 24))
    if (!r) continue
    const d = new Date(r.y, r.m - 1, r.d)
    if (d > start) return d
  }
  return null
}

/**
 * 這張卡與「今天」的關係。
 *
 * 回傳 `phase`：
 *   BEFORE —— 還沒到（用期待式講話）
 *   DURING —— 正在這個節氣裡（現在式才成立）
 *   AFTER  —— 已經過了（回顧式）
 */
export function cardTimeContext(card, today = taipeiToday()) {
  const cardTerm = card?.term || ''
  const year = card?.year || today.getFullYear()
  const start = termDateInYear(cardTerm, year)
  const end = nextTermDate(cardTerm, year)
  const cur = termFromDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const daysUntil = start ? dayDiff(today, start) : null

  let phase = 'DURING'
  if (start && end) phase = today < start ? 'BEFORE' : (today >= end ? 'AFTER' : 'DURING')

  return {
    todayISO: iso(today),
    todayLabel: `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日（週${WK[today.getDay()]}）`,
    currentTerm: cur?.term || '',
    cardTerm,
    cardYear: year,
    cardTermISO: start ? iso(start) : null,
    cardTermLabel: start ? `${start.getMonth() + 1} 月 ${start.getDate()} 日` : '',
    daysUntil,
    phase,
  }
}

/**
 * 狀態列文案：讓使用者一眼看出「我在看的是今天，還是一張未來的卡」。
 *
 * ★ 導覽列的「今日曆頁」是 highlight 狀態，而這一頁的內容是 2027 小寒——
 *   沒有這條狀態帶，使用者無從判斷兩者的關係。
 */
export function cardTimeLabel(ctx) {
  if (!ctx?.cardTerm) return ''
  if (ctx.phase === 'DURING') return `${ctx.cardTerm} · 當令中`
  if (ctx.phase === 'AFTER') {
    const n = Math.abs(ctx.daysUntil ?? 0)
    return `${ctx.cardYear} ${ctx.cardTerm} · 已過 ${n} 天`
  }
  return `${ctx.cardYear} ${ctx.cardTerm} · 還有 ${ctx.daysUntil} 天`
}

/**
 * 角色的開場白。**三種語態**，由 phase 決定。
 *
 * ⚠️ `card.line`（「小寒前後正是我最甜的時候」）是**現在式**，只有 DURING
 *    才成立。BEFORE 時照講就是那句讓人以為壞掉的話。
 * ★ BEFORE 這一版其實比原本更好：「還要等 142 天」給了具體的期待感，
 *   也順勢解釋了為什麼現在看到的是一張未來的卡——缺點變成了特色。
 */
export function greetingFor(obj, ctx) {
  const name = obj?.name || '我'
  const tail = '想知道什麼？打字問我，例如「品種」「產地」；點我一下我會動。'
  if (!ctx?.cardTerm) return `${obj?.line || `我是${name}。`}\n${tail}`
  if (ctx.phase === 'DURING') return `${obj?.line || `我是${name}。`}\n${tail}`
  if (ctx.phase === 'AFTER') {
    return `我是${name}！今年的${ctx.cardTerm}已經過去了，現在是${ctx.currentTerm}。\n${tail}`
  }
  return `我是${name}！現在是${ctx.currentTerm}，還要等 ${ctx.daysUntil} 天才輪到我的${ctx.cardTerm}。\n${tail}`
}
