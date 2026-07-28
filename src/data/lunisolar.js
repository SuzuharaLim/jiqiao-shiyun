// 真實農曆／節氣換算 —— 天文演算，零第三方相依。
//
// 取代原本 almanac.js 裡「錨點 + 每月固定 30 天」的近似農曆（那會愈推愈偏，
// 2026-07-28 被算成七月初三，正解是六月十五），以及固定國曆日期的節氣表。
//
// 實作依據（Jean Meeus, Astronomical Algorithms 2nd ed.）：
//   ch.49  朔（新月）時刻     —— 決定農曆每月初一
//   ch.25  太陽視黃經         —— 決定 24 節氣時刻
// 中國曆規則：
//   1. 每月初一＝該月朔所在日（以東八區 UTC+8 的日界為準）
//   2. 含冬至的那個月固定為十一月
//   3. 兩個冬至之間若有 13 個月，則第一個「沒有中氣」的月為閏月
//
// ⚠️ 時區固定 UTC+8（台灣）。日界判定必須用當地時間，
//    否則凌晨交朔／交節的日子會整天差一日。
// ⚠️ 全部函式為純運算、無亂數、可用 node 直接驗證。

const PI2 = Math.PI * 2
const rad = (deg) => (deg * Math.PI) / 180
const sin = (deg) => Math.sin(rad(deg))
const CN_DAY = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
const CN_MON = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

// ── 儒略日 ↔ 西曆（Meeus ch.7）────────────────────────────────
// 傳入的是「當地日期」，回傳當地 0h 的 JD。
export function jdFromDate(y, m, d) {
  let yy = y, mm = m
  if (mm <= 2) { yy -= 1; mm += 12 }
  const A = Math.floor(yy / 100)
  const B = 2 - A + Math.floor(A / 4)          // 格里曆修正（1582 之後）
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5
}

export function dateFromJd(jd) {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z
  let a = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const dd = Math.floor(365.25 * c)
  const e = Math.floor((b - dd) / 30.6001)
  const day = b - dd - Math.floor(30.6001 * e) + f
  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715
  return { y: year, m: month, d: Math.floor(day) }
}

// ── 力學時 ↔ 世界時（ΔT）────────────────────────────────────
// Espenak & Meeus 多項式（2005–2050 段），本專案用途（2000–2100）足夠。
// 節氣/朔的時刻算出來是 TT，要減 ΔT 才是 UT。ΔT 約 70 秒，
// 只在「剛好跨午夜」時才影響日期，但不能省略。
function deltaT(year) {
  if (year >= 2005 && year <= 2050) {
    const t = year - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t * t
  }
  if (year > 2050 && year <= 2150) {
    const u = (year - 1820) / 100
    return -20 + 32 * u * u - 0.5628 * (2150 - year)
  }
  const u = (year - 1820) / 100                 // 其餘年份用長期式
  return -20 + 32 * u * u
}
const TZ = 8 / 24            // 東八區
const secToDay = 1 / 86400

// ── 朔（新月）時刻，Meeus ch.49 ───────────────────────────────
// k=0 → 2000-01-06 的朔；回傳 TT 的 JDE。
export function newMoonJde(k) {
  const T = k / 1236.85
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T
  let jde = 2451550.09766 + 29.530588861 * k
    + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4
  const E = 1 - 0.002516 * T - 0.0000074 * T2                       // 地球離心率修正
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3   // 太陽平近點角
  const M1 = 201.5643 + 385.81693528 * k + 0.0107582 * T2                // 月亮平近點角
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 // 月亮升交點距角
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3  // 升交點黃經

  jde += -0.40720 * sin(M1)
    + 0.17241 * E * sin(M)
    + 0.01608 * sin(2 * M1)
    + 0.01039 * sin(2 * F)
    + 0.00739 * E * sin(M1 - M)
    - 0.00514 * E * sin(M1 + M)
    + 0.00208 * E * E * sin(2 * M)
    - 0.00111 * sin(M1 - 2 * F)
    - 0.00057 * sin(M1 + 2 * F)
    + 0.00056 * E * sin(2 * M1 + M)
    - 0.00042 * sin(3 * M1)
    + 0.00042 * E * sin(M + 2 * F)
    + 0.00038 * E * sin(M - 2 * F)
    - 0.00024 * E * sin(2 * M1 - M)
    - 0.00017 * sin(Om)
    - 0.00007 * sin(M1 + 2 * M)
    + 0.00004 * sin(2 * M1 - 2 * F)
    + 0.00004 * sin(3 * M)
    + 0.00003 * sin(M1 + M - 2 * F)
    + 0.00003 * sin(2 * M1 + 2 * F)
    - 0.00003 * sin(M1 + M + 2 * F)
    + 0.00003 * sin(M1 - M + 2 * F)
    - 0.00002 * sin(M1 - M - 2 * F)
    - 0.00002 * sin(3 * M1 + M)
    + 0.00002 * sin(4 * M1)

  // 行星擾動（A1…A14）
  const A1 = 299.77 + 0.107408 * k - 0.009173 * T2
  const A2 = 251.88 + 0.016321 * k
  const A3 = 251.83 + 26.651886 * k
  const A4 = 349.42 + 36.412478 * k
  const A5 = 84.66 + 18.206239 * k
  const A6 = 141.74 + 53.303771 * k
  const A7 = 207.14 + 2.453732 * k
  const A8 = 154.84 + 7.306860 * k
  const A9 = 34.52 + 27.261239 * k
  const A10 = 207.19 + 0.121824 * k
  const A11 = 291.34 + 1.844379 * k
  const A12 = 161.72 + 24.198154 * k
  const A13 = 239.56 + 25.513099 * k
  const A14 = 331.55 + 3.592518 * k
  jde += 0.000325 * sin(A1) + 0.000165 * sin(A2) + 0.000164 * sin(A3)
    + 0.000126 * sin(A4) + 0.000110 * sin(A5) + 0.000062 * sin(A6)
    + 0.000060 * sin(A7) + 0.000056 * sin(A8) + 0.000047 * sin(A9)
    + 0.000042 * sin(A10) + 0.000040 * sin(A11) + 0.000037 * sin(A12)
    + 0.000035 * sin(A13) + 0.000023 * sin(A14)
  return jde
}

// 朔的「東八區當地日」JD（取當地 0h 的整日 JD）
function newMoonLocalDay(k) {
  const jde = newMoonJde(k)
  const { y } = dateFromJd(jde)
  const ut = jde - deltaT(y) * secToDay          // TT → UT
  return Math.floor(ut + TZ + 0.5) - 0.5          // 當地日的 0h JD
}

// ── 太陽視黃經（Meeus ch.25）→ 節氣時刻 ────────────────────────
function sunApparentLongitude(jde) {
  const T = (jde - 2451545) / 36525
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M)
    + 0.000289 * sin(3 * M)
  let trueLon = L0 + C
  // 金星/木星/月亮的主要擾動（提高到約 0.001°，避免交節時刻誤差數十分鐘）
  const A = 351.52 + 22518.4428 * T          // 金星
  const B = 253.14 + 45037.1128 * T
  const Cc = 157.23 + 32964.4673 * T         // 木星
  const D = 297.85 + 445267.1117 * T         // 月亮
  const E = 252.08 + 20.190 * T
  const H = 42.43 + 65928.9345 * T
  trueLon += (0.00134 * Math.cos(rad(A)) + 0.00154 * Math.cos(rad(B))
    + 0.00200 * Math.cos(rad(Cc)) + 0.00179 * Math.sin(rad(D))
    + 0.00178 * Math.sin(rad(E)) + 0.00151 * Math.cos(rad(H)))
  const Om = 125.04 - 1934.136 * T
  return trueLon - 0.00569 - 0.00478 * sin(Om)   // 光行差＋交點修正
}

// 求太陽視黃經等於 targetDeg 的時刻（TT 的 JDE），以 jdGuess 附近開始收斂
function solarLongitudeTime(targetDeg, jdGuess) {
  let jd = jdGuess
  for (let i = 0; i < 40; i++) {
    let diff = sunApparentLongitude(jd) - targetDeg
    diff = ((diff + 180) % 360 + 360) % 360 - 180      // 收到 ±180
    if (Math.abs(diff) < 1e-7) break
    jd -= diff * 365.2422 / 360                         // 每度約 1.0146 日
  }
  return jd
}

// 24 節氣：黃經 315°=立春、330°=雨水 … 每 15° 一個
export const TERM_NAMES = ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨',
  '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
  '立秋', '處暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒']
// 中氣（每月必須含一個中氣，否則為閏月）＝雨水/春分/穀雨/…（奇數索引）
const MAJOR_TERM_LON = [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]

// 某年某節氣的「當地日期」。index 0=立春 … 23=大寒（依 TERM_NAMES）
export function termLocalDay(year, index) {
  const lon = (315 + index * 15) % 360
  // 粗估：立春約 2/4，之後每個節氣約 15.2 日
  const guessMonth = 2 + Math.floor((index * 15.22) / 30.44)
  const gy = guessMonth > 12 ? year + 1 : year
  const gm = guessMonth > 12 ? guessMonth - 12 : guessMonth
  const guess = jdFromDate(gy, gm, 5)
  const jde = solarLongitudeTime(lon, guess)
  const ut = jde - deltaT(year) * secToDay
  return Math.floor(ut + TZ + 0.5) - 0.5
}

// 冬至（黃經 270°）的當地日 JD
function winterSolsticeDay(year) {
  const jde = solarLongitudeTime(270, jdFromDate(year, 12, 21))
  const ut = jde - deltaT(year) * secToDay
  return Math.floor(ut + TZ + 0.5) - 0.5
}

// 某中氣（黃經 lon）在 year 前後的當地日 JD
function majorTermDay(year, lon) {
  const monthGuess = Math.round(((lon + 90) % 360) / 30) + 1
  const jde = solarLongitudeTime(lon, jdFromDate(year, Math.min(12, Math.max(1, monthGuess)), 20))
  const ut = jde - deltaT(year) * secToDay
  return Math.floor(ut + TZ + 0.5) - 0.5
}

// ── 農曆年結構（快取）────────────────────────────────────────
// 以「含冬至者為十一月」建出從前一年冬至月到隔年冬至月的月序，
// 判定閏月，回傳每個月的初一 JD 與月名。
const yearCache = new Map()

function buildLunarMonths(gyear) {
  if (yearCache.has(gyear)) return yearCache.get(gyear)
  // 前一年冬至 → 今年冬至（含），這段包含 12 或 13 個朔望月
  const ws0 = winterSolsticeDay(gyear - 1)
  const ws1 = winterSolsticeDay(gyear)

  // 找出「含 ws0 的那個月」的朔日
  const kApprox = Math.round((ws0 - 2451550.09766) / 29.530588861)
  let k0 = kApprox
  while (newMoonLocalDay(k0) > ws0) k0--
  while (newMoonLocalDay(k0 + 1) <= ws0) k0++

  let k1 = k0
  while (newMoonLocalDay(k1 + 1) <= ws1) k1++      // 含今年冬至的月
  const count = k1 - k0                             // 兩個冬至月之間的月數
  const leapYear = count === 13

  const months = []
  for (let i = 0; i <= 13; i++) {
    months.push({ k: k0 + i, start: newMoonLocalDay(k0 + i), end: newMoonLocalDay(k0 + i + 1) - 1 })
  }

  // 標中氣：某月若不含任何中氣 → 候選閏月（取最早的那個）
  if (leapYear) {
    for (const m of months.slice(0, 13)) {
      m.hasMajor = MAJOR_TERM_LON.some(lon => {
        for (const yy of [gyear - 1, gyear, gyear + 1]) {
          const d = majorTermDay(yy, lon)
          if (d >= m.start && d <= m.end) return true
        }
        return false
      })
    }
  }

  // 命名：months[0] = 十一月（含前一年冬至）
  // ⚠️ 閏月要沿用「前一個月」的月數（六月之後是閏六月），
  // 不是下一個待分配的月數——寫錯會變成閏七月，且之後每個月都往後錯一個月名。
  let num = 11, lastNum = 11, leapAssigned = false
  for (let i = 0; i < months.length; i++) {
    const m = months[i]
    if (leapYear && !leapAssigned && i > 0 && m.hasMajor === false) {
      m.leap = true
      m.num = lastNum
      leapAssigned = true
    } else {
      m.num = num
      m.leap = false
      lastNum = num
      num = num % 12 + 1
    }
  }
  const res = { months, leapYear }
  yearCache.set(gyear, res)
  return res
}

// 給定西曆日期 → 農曆 { month, day, leap, monthName, dayName, text }
export function lunarFromDate(y, m, d) {
  const jd = jdFromDate(y, m, d)
  // 該日可能落在「以 y 建的月序」或「以 y+1 建的月序」裡（跨冬至）
  for (const gy of [y, y + 1]) {
    const { months } = buildLunarMonths(gy)
    for (const mo of months) {
      if (jd >= mo.start && jd <= mo.end) {
        const day = Math.round(jd - mo.start) + 1
        return {
          month: mo.num, day, leap: !!mo.leap,
          monthName: (mo.leap ? '閏' : '') + CN_MON[mo.num],
          dayName: CN_DAY[day],
          text: `農曆${(mo.leap ? '閏' : '') + CN_MON[mo.num]}月${CN_DAY[day]}`,
        }
      }
    }
  }
  return null
}

// 給定西曆日期 → 當日所屬節氣（最近一個已交的節氣）與是否當天交節
export function termFromDate(y, m, d) {
  const jd = jdFromDate(y, m, d)
  let best = null
  // 掃前一年到今年的全部節氣，取「不晚於今天」且最接近的
  for (const yy of [y - 1, y]) {
    for (let i = 0; i < 24; i++) {
      const td = termLocalDay(yy, i)
      if (td <= jd && (!best || td > best.jd)) best = { name: TERM_NAMES[i], jd: td, year: yy, index: i }
    }
  }
  return { term: best?.name || null, startsToday: best ? best.jd === jd : false, termJd: best?.jd }
}

// 某西曆年的 24 節氣日期表（給年曆／節氣年表用）
export function termTable(year) {
  return TERM_NAMES.map((name, i) => {
    const jd = termLocalDay(year, i)
    const { y, m, d } = dateFromJd(jd + 0.5)
    return { name, y, m, d, jd }
  })
}

// ── 農曆 → 國曆：找「下一個」指定農曆月日的國曆日期 ─────────────
// 用於神明誕辰倒數。從 from（Date，預設今天）起往後掃，最多 400 天
// （農曆年最長 385 天，足以涵蓋閏月年）。
// ⚠️ 閏月不算（閏六月十五不是六月十五的誕辰），故跳過 leap 月。
export function nextLunarOccurrence(lmonth, lday, from = new Date()) {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let i = 0; i < 400; i++) {
    const dt = new Date(base)
    dt.setDate(dt.getDate() + i)
    const L = lunarFromDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
    if (L && !L.leap && L.month === lmonth && L.day === lday) {
      return { date: dt, daysAway: i }
    }
  }
  return null
}

// 農曆年（以正月初一為歲首，不是立春）→ 六十甲子序。稱骨算命用的是這個。
// ⚠️ 與 almanac.js 的「年柱」不同：年柱以立春換年，這裡以正月初一換年，
//    兩者在立春與春節之間的日子會差一年，不可混用。
export function lunarYearGanzhiIndex(y, m, d) {
  const L = lunarFromDate(y, m, d)
  if (!L) return null
  // 正月初一必落在國曆 1/21–2/21 之間，故國曆 1–2 月又逢農曆十一/十二月＝上一個農曆年
  const lunarYear = (m <= 2 && L.month >= 11) ? y - 1 : y
  return (((lunarYear - 4) % 60) + 60) % 60
}

// ── 日干支 ────────────────────────────────────────────────────
// 以 JD 直接推：JD 0.5（西元前 4713-01-01 當地 0h）為甲子日起算的固定偏移。
// 校正基準：2026-07-28 為癸卯日（六十甲子序 39），以此定出常數 49。
export function dayGanzhiIndex(y, m, d) {
  const jd = jdFromDate(y, m, d)
  return (((Math.floor(jd + 0.5) + 49) % 60) + 60) % 60
}
