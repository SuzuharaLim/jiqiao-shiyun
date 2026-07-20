// 為任意日期產生一張農民曆日頁（示範用，確定性、無亂數）
// 錨點 6/6 = 芒種・丙午日（offset 0），前後各日以偏移量推算，讓「跳到任意日期」都有內容
import { almanacDays, proverbs } from './mock.js'

const G = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬']
const WD = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const NAYIN = ['海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木', '天河水', '大驛土']
const HOURS = ['子時・午時', '丑時・未時', '寅時・申時', '卯時・酉時', '辰時・戌時', '巳時・亥時', '辰時・未時', '卯時・巳時', '午時・酉時']
const YI_POOL = ['祈福', '開市', '納財', '出行', '嫁娶', '祭祀', '安床', '入宅', '交易', '立券', '沐浴', '會親友', '裁衣', '栽種', '解除', '求嗣']
const JI_POOL = ['動土', '安葬', '出火', '開倉', '伐木', '作樑', '行喪', '破土', '針灸', '掘井']
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const MON = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘']

// 節氣起始（近似國曆），用來判斷任一天屬哪個節氣
const TERMS = [
  ['大寒', 1, 20], ['立春', 2, 4], ['雨水', 2, 19], ['驚蟄', 3, 6], ['春分', 3, 21], ['清明', 4, 5],
  ['穀雨', 4, 20], ['立夏', 5, 6], ['小滿', 5, 21], ['芒種', 6, 6], ['夏至', 6, 21], ['小暑', 7, 7],
  ['大暑', 7, 23], ['立秋', 8, 8], ['處暑', 8, 23], ['白露', 9, 8], ['秋分', 9, 23], ['寒露', 10, 8],
  ['霜降', 10, 24], ['立冬', 11, 8], ['小雪', 11, 22], ['大雪', 12, 7], ['冬至', 12, 22], ['小寒', 1, 6],
]

export const ANCHOR = new Date(2026, 5, 6) // 6/6

const mod = (n, m) => ((n % m) + m) % m
export function dateFromOffset(off) { const d = new Date(ANCHOR); d.setDate(d.getDate() + off); return d }
export function offsetFromDate(d) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((a - ANCHOR) / 86400000)
}

function termFor(d) {
  const key = (d.getMonth() + 1) * 100 + d.getDate()
  let best = '冬至', bestK = -1 // 1/1–1/5 尚未到小寒 → 前一年冬至
  for (const [t, m, day] of TERMS) {
    const k = m * 100 + day
    if (k <= key && k > bestK) { best = t; bestK = k }
  }
  return best
}
function lunarApprox(off) {
  let day = 11 + off, mon = 5
  while (day > 30) { day -= 30; mon++ }
  while (day < 1) { day += 30; mon-- }
  mon = mod(mon - 1, 12) + 1
  const dstr = day <= 10 ? '初' + CN[day]
    : day < 20 ? '十' + CN[day - 10]
    : day === 20 ? '二十'
    : day < 30 ? '廿' + CN[day - 20] : '三十'
  return `農曆${MON[mon]}月${dstr}`
}

export function dayFor(off) {
  // 錨點前後三天用精寫樣本，但星期一律以真實日期計算（樣本寫死的週四/五/六與實際不符）
  if (off >= -1 && off <= 1) {
    return { ...almanacDays[off + 1], weekday: WD[dateFromOffset(off).getDay()], off }
  }
  const d = dateFromOffset(off)
  const gi = mod(2 + off, 10), zi = mod(6 + off, 12) // 從 丙午 起算
  const pick = (arr, start, n) => {
    const out = []
    for (let i = 0; out.length < n && i < arr.length; i++) {
      const v = arr[mod(start + i * 3, arr.length)]
      if (!out.includes(v)) out.push(v)
    }
    return out
  }
  const yi = pick(YI_POOL, mod(off * 3, YI_POOL.length), 4)
  const ji = pick(JI_POOL, mod(off * 2 + 5, JI_POOL.length), 2).filter(x => !yi.includes(x))
  return {
    off,
    solar: `${d.getMonth() + 1} / ${d.getDate()}`,
    weekday: WD[d.getDay()],
    term: termFor(d),
    ganzhi: G[gi] + Z[zi] + '日',
    lunar: lunarApprox(off),
    zheng: `沖${ZODIAC[mod(zi + 6, 12)]}煞${['北', '南', '東', '西'][mod(off, 4)]}`,
    wuxing: NAYIN[mod(gi * 2 + zi, NAYIN.length)],
    luckyHours: HOURS[mod(off * 7, HOURS.length)],
    stars: 1 + mod(off * 3 + 2, 5),
    yi,
    ji: ji.length ? ji : ['諸事不宜'],
    proverb: proverbs[mod(off, proverbs.length)].tw,
  }
}

// 月曆格子（含每格對應 offset），供跳日期選擇器使用
export function monthCells(year, month) {
  const startWd = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWd; i++) cells.push(null)
  for (let day = 1; day <= days; day++) cells.push({ day, off: offsetFromDate(new Date(year, month, day)) })
  return cells
}
