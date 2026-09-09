import { termTable } from './lunisolar.js'
// 生肖運勢：由當日干支推導，不可再用資料庫裡的靜態分數
//
// ⚠️ 這支模組取代的舊實作與本站自己的曆頁直接對打：
//    2026-07-31 是丙午年丙午日，首頁與完整國民曆都寫「沖鼠（庚子）煞北」，
//    年度總覽也寫「馬：值太歲，本命年（午年自刑）」，但生肖運勢頁給的是
//      馬 95（全場最高）｜鼠 82（第 4 高）｜羊 66（全場最低）
//    ——今天沖的鼠拿高分、值太歲又自刑的馬拿最高、午未六合的羊反而最低。
//    使用者只要點兩頁就會發現我們自己講的話對不起來。
//
// ⚠️ 「本週／本月」原本是今日分數 × 0.94 / × 1.07，十二生肖的排名完全一樣，
//    等於沒有資訊。現在改成把該期間逐日實算後平均——分數會真的重新排序。
import { dayFor, todayOffset } from './almanac.js'

// 生肖序＝地支序：鼠子0、牛丑1、虎寅2、兔卯3、龍辰4、蛇巳5、
//                馬午6、羊未7、猴申8、雞酉9、狗戌10、豬亥11
export const ZODIAC_ORDER = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬']
const idxOf = (sign) => ZODIAC_ORDER.indexOf(sign)

// 出生年（國曆）→ 生肖。
// ⚠️ 很多人不知道自己的生肖（尤其只記得民國年、或不確定年初出生算哪一年），
//    「標出沖到我的日子」只給 12 顆生肖按鈕就等於把門檻丟給使用者。
// ⚠️ 生肖以**立春**換年，不是元旦也不是農曆春節：1998-01-20 出生的人屬牛不是虎。
//    這與 almanac.js 的年柱同一個判準（lunarYearGanzhiIndex 用正月初一是另一套，
//    只給秤骨用，不可混用）。沒給月日時保守以整年論並在畫面上提醒。
// 支援民國年輸入（1–200 視為民國年）。
// ⚠️ 全形數字必須先轉半形。中文輸入法沒切回半形時打出來的是「１９９０」，
//    使用者看不出它和 1990 差在哪，只會覺得「這網站壞了」。
//    （站上已經處理了「1990年」與前後空白，全形只是同一組清理邏輯漏掉的一條。）
const toHalfWidth = (s) => String(s ?? '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
const cleanNum = (v) => toHalfWidth(v).replace(/[^\d]/g, '').trim()

export function zodiacOfBirth(year, month, day) {
  const yRaw = cleanNum(year)
  if (yRaw === '') return null
  let y = Number(yRaw)
  if (!Number.isFinite(y)) return null
  if (y >= 1 && y <= 200) y += 1911            // 民國年
  if (y < 1900 || y > 2100) return null
  let effY = y
  // 一定要先擋空字串。畫面上的月／日是選填的 <input>，沒填時是 ''，
  //    而 `Number('')` 是 **0**（不是 NaN），`Number.isFinite(0)` 為真——
  //    於是「月 0 日 0」永遠小於立春，每個人都被算成前一年的生肖
  //    （實測民國 87 年沒填月日時顯示「牛」，正解是虎）。
  const mRaw = cleanNum(month), dRaw = cleanNum(day)
  const hasMD = mRaw !== '' && dRaw !== ''
  // ⚠️ 月／日超出範圍不可**靜默忽略**。原本填「月 99 日 99」照樣顯示「生肖馬」，
  //    兩個 99 還留在欄位裡卻完全沒說「這兩格我沒採用」——而這個欄位存在的意義
  //    就是處理立春換年，填錯 = 拿到錯的生肖 = 挑到錯的日子，使用者不會發現。
  //    回報 mdInvalid 讓畫面講出來。
  let mdInvalid = false
  if (hasMD) {
    const mm = Number(mRaw), dd = Number(dRaw)
    const dim = new Date(y, mm, 0).getDate()       // 該年該月的實際天數
    if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= dim)) mdInvalid = true
  }
  if (hasMD && !mdInvalid) {
    // ⚠️ termLocalDay 回的是**儒略日**不是 {m,d}——直接讀 .m/.d 會拿到 undefined，
    //    比較永遠成立不了，立春分界整個失效（實測 1998-01-20 被算成虎，正解是牛）。
    //    用 termTable 取當年立春的月日。
    const li = termTable(y).find(t => t.name === '立春')
    const m = Number(mRaw), d = Number(dRaw)
    if (li && (m < li.m || (m === li.m && d < li.d))) effY = y - 1   // 立春前算前一年
  }
  // 1900 是鼠年（庚子）；ZODIAC_ORDER 以鼠為首
  return { zodiac: ZODIAC_ORDER[((effY - 1900) % 12 + 12) % 12], year: y, effYear: effY, mdInvalid, usedMD: hasMD && !mdInvalid }
}

const LIUHE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 }
const SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]]
const LIUHAI = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 }
// 三刑：子卯（無禮）、寅巳申（無恩）、丑戌未（恃勢）；辰午酉亥為自刑
const XING_PAIRS = [[0, 3]]
const XING_TRIOS = [[2, 5, 8], [1, 10, 7]]
const SELF_XING = [4, 6, 9, 11]
// 六破：子↔酉、午↔卯、寅↔亥、申↔巳、辰↔丑、戌↔未
const LIUPO = { 0: 9, 9: 0, 6: 3, 3: 6, 2: 11, 11: 2, 8: 5, 5: 8, 4: 1, 1: 4, 10: 7, 7: 10 }
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const mod = (n, m) => ((n % m) + m) % m

/** 某個生肖在某一天的關係與分數 */
export function relationOn(sign, off) {
  const d = dayFor(off)
  const dz = ZODIAC_ORDER.indexOf(d.chong.zodiac)      // 日支所沖的生肖
  const dayZhi = mod(dz + 6, 12)                        // 反推當日日支
  // ⚠️ 年支要從曆算取，不可寫死 6（午）。寫死的話 2027 一到就整頁錯，
  //    而且那正是這支模組要修掉的那一類「靜態值與曆算對不起來」的錯。
  const yearZhi = ZHI.indexOf(d.yearGZ[1])
  const z = idxOf(sign)
  if (z < 0) return null

  const notes = []
  let score = 70
  if (LIUHE[dayZhi] === z) { score += 18; notes.push('與今日日支六合') }
  else if (SANHE.some(g => g.includes(dayZhi) && g.includes(z))) { score += 14; notes.push('與今日日支三合') }
  if (mod(dayZhi + 6, 12) === z) { score -= 25; notes.push('正沖今日日支（今日沖你的生肖）') }
  if (LIUHAI[dayZhi] === z) { score -= 12; notes.push('與今日日支相害') }
  if (XING_PAIRS.some(p => p.includes(dayZhi) && p.includes(z) && dayZhi !== z)) { score -= 10; notes.push('與今日日支相刑') }
  if (XING_TRIOS.some(g => g.includes(dayZhi) && g.includes(z) && dayZhi !== z)) { score -= 10; notes.push('與今日日支相刑') }
  if (dayZhi === z) {
    if (SELF_XING.includes(z)) { score -= 8; notes.push('與今日日支自刑') }
    else notes.push('值日生肖')
  }
  // 犯太歲（整年固定，非逐日）
  if (z === yearZhi) { score -= 10; notes.push('值太歲') }
  else if (mod(yearZhi + 6, 12) === z) { score -= 12; notes.push('沖太歲') }
  else if (LIUHAI[yearZhi] === z) { score -= 6; notes.push('害太歲') }
  else if (LIUPO[yearZhi] === z) { score -= 6; notes.push('破太歲') }

  return { score: Math.max(40, Math.min(98, score)), notes, day: d }
}

/** 期間平均（今日＝1 天、本週＝7 天、本月＝30 天）。逐日實算後平均，不用倍數。 */
export function scoreOver(sign, days, from = todayOffset()) {
  let sum = 0
  for (let i = 0; i < days; i++) sum += relationOn(sign, from + i).score
  return Math.round(sum / days)
}

export const RANGE_DAYS = { 今日: 1, 本週: 7, 本月: 30 }
