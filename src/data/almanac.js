// 為任意日期產生一張農民曆日頁（示範用，確定性、無亂數）
// 錨點 6/6 = 芒種・丙午日（offset 0），前後各日以偏移量推算，讓「跳到任意日期」都有內容。
//
// ★ 分層說明（依《農民曆內容總覽》整理）：
//   天文曆法層（節氣、日月）—— 有科學依據；擇日神煞層（建除、宜忌、沖煞、特殊日）—— 民俗信仰、各家歧異、
//   本專案為「確定性示範演算」非權威曆算。傳統項目求「有」與定義正確，數值以錨點推演，正式版應接可靠曆算庫。
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
const IS_JIE = new Set(['立春', '驚蟄', '清明', '立夏', '芒種', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']) // 十二節（月之始）

// 建除十二神（值日）+ 各自宜事
const JIANCHU = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉']
const JIANCHU_YI = {
  建: '宜出行、赴任、上書；忌動土、開倉', 除: '宜療病、除服、掃舍、解除', 滿: '宜嫁娶、開市、祈福；忌葬', 平: '宜修飾垣牆、平治道塗',
  定: '宜冠帶、納采、安床、修造', 執: '宜捕捉、造葬、結網；忌開市', 破: '宜求醫、破屋壞垣；諸事不宜', 危: '宜安床、祭祀；忌登高行船',
  成: '宜開市、入學、結婚、修造', 收: '宜納財、進人口、捕捉', 開: '宜開市、動土、上樑、入學', 閉: '宜築堤、埋穴、造葬；忌開市',
}
// 節氣 → 月建地支索引（十二節與其中氣同一月支）
const TERM_ZHI = {
  立春: 2, 雨水: 2, 驚蟄: 3, 春分: 3, 清明: 4, 穀雨: 4, 立夏: 5, 小滿: 5, 芒種: 6, 夏至: 6, 小暑: 7, 大暑: 7,
  立秋: 8, 處暑: 8, 白露: 9, 秋分: 9, 寒露: 10, 霜降: 10, 立冬: 11, 小雪: 11, 大雪: 0, 冬至: 0, 小寒: 1, 大寒: 1,
}

// 二十八星宿（連續值日）+ 值日禽 + 吉凶
const XIU = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虛', '危', '室', '壁', '奎', '婁', '胃', '昴', '畢', '觜', '參', '井', '鬼', '柳', '星', '張', '翼', '軫']
const XIU_ANIMAL = ['蛟', '龍', '貉', '兔', '狐', '虎', '豹', '獬', '牛', '蝠', '鼠', '燕', '豬', '貐', '狼', '狗', '雉', '雞', '烏', '猴', '猿', '犴', '羊', '獐', '馬', '鹿', '蛇', '蚓']
const XIU_LUCK = ['吉', '凶', '凶', '吉', '凶', '吉', '吉', '吉', '吉', '凶', '凶', '凶', '吉', '吉', '吉', '吉', '吉', '凶', '吉', '凶', '凶', '吉', '凶', '凶', '凶', '吉', '凶', '吉'] // 傳統七政吉凶（示範）

// 彭祖百忌（以日干支起）
const PENGZU_GAN = ['甲不開倉財物耗散', '乙不栽植千株不長', '丙不修灶必見災殃', '丁不剃頭頭必生瘡', '戊不受田田主不祥', '己不破券二比並亡', '庚不經絡織機虛張', '辛不合醬主人不嘗', '壬不決水更難提防', '癸不詞訟理弱敵強']
const PENGZU_ZHI = ['子不問卜自惹禍殃', '丑不冠帶主不還鄉', '寅不祭祀神鬼不嘗', '卯不穿井水泉不香', '辰不哭泣必主重喪', '巳不遠行財物伏藏', '午不苫蓋屋主更張', '未不服藥毒氣入腸', '申不安床鬼祟入房', '酉不會客醉坐顛狂', '戌不吃犬作怪上床', '亥不嫁娶不利新郎']

// 逐日胎神占方（六十甲子；甲子=0 … 癸亥=59）
const TAISHEN = [
  '占門碓外東南', '碓磨廁外東南', '廚灶爐外正南', '倉庫門外正南', '房床栖外正南', '占門床外正南', '占碓磨外正南', '廚灶廁外西南', '倉庫爐外西南', '房床門外西南',
  '門雞栖外西南', '碓磨床外西南', '廚灶碓外西南', '倉庫廁外正西', '房床爐外正西', '占大門外正西', '碓磨栖外正西', '廚灶床外正西', '倉庫碓外西北', '房床廁外西北',
  '占門爐外西北', '碓磨門外西北', '廚灶栖外西北', '倉庫床外西北', '房床碓外正北', '占門廁外正北', '碓磨爐外正北', '廚灶門外正北', '倉庫栖外正北', '占房床房內北',
  '占門碓房內北', '碓磨廁房內北', '廚灶爐房內北', '倉庫門房內北', '房床栖房內南', '占門床房內南', '占碓磨房內南', '廚灶廁房內南', '倉庫爐房內南', '房床門房內南',
  '門雞栖房內東', '碓磨床房內東', '廚灶碓房內東', '倉庫廁房內東', '房床爐房內東', '占大門房內東', '碓磨栖房內東', '廚灶床房內東', '倉庫碓房內東', '房床廁房內東',
  '占門爐房內東', '碓磨門房內東', '廚灶栖房內東', '倉庫床房內東', '房床碓房內正東', '占門廁房內東', '碓磨爐房內東', '廚灶門房內東', '倉庫栖房內東', '占房床房內東',
]

// 吉神方位（以日干）
const XISHEN = { 甲: '東北', 乙: '西北', 丙: '西南', 丁: '正南', 戊: '東南', 己: '東北', 庚: '西北', 辛: '西南', 壬: '正南', 癸: '東南' }   // 喜神
const CAISHEN = { 甲: '東北', 乙: '東北', 丙: '正西', 丁: '正西', 戊: '正北', 己: '正北', 庚: '正東', 辛: '正東', 壬: '正南', 癸: '正南' } // 財神
const GUIREN = { 甲: '牛、羊', 戊: '牛、羊', 庚: '牛、羊', 乙: '鼠、猴', 己: '鼠、猴', 丙: '豬、雞', 丁: '豬、雞', 壬: '兔、蛇', 癸: '兔、蛇', 辛: '馬、虎' } // 天乙貴人（生肖）

// 農曆節日／神明聖誕（示範，農曆月-日）
const LUNAR_FEST = {
  '1-1': '春節', '1-9': '天公生', '1-15': '元宵節', '2-2': '土地公聖誕', '2-19': '觀音佛祖聖誕', '3-3': '玄天上帝聖誕',
  '3-15': '保生大帝聖誕', '3-23': '媽祖聖誕', '4-8': '浴佛節', '5-5': '端午節', '5-13': '關聖帝君飛昇', '6-24': '關聖帝君聖誕',
  '7-7': '七夕', '7-15': '中元節', '8-15': '中秋節', '9-9': '重陽節', '10-15': '下元節', '12-16': '尾牙', '12-24': '送神', '12-30': '除夕',
}
// 受死日（每月忌用之日支）
const SHOUSI = { 1: 10, 2: 4, 3: 11, 4: 5, 5: 0, 6: 6, 7: 1, 8: 7, 9: 2, 10: 8, 11: 3, 12: 9 } // 正月戌…（值為地支索引）
// 楊公忌日（農曆 月→日）
const YANGGONG = { 1: 13, 2: 11, 3: 9, 4: 7, 5: 5, 6: 3, 7: 1, 8: 27, 9: 25, 10: 23, 11: 21, 12: 19 }
// 天赦日（季節 → 日干支）：春戊寅、夏甲午、秋戊申、冬甲子
const TIANSHE = { 春: '戊寅', 夏: '甲午', 秋: '戊申', 冬: '甲子' }

export const ANCHOR = new Date(2026, 5, 6) // 6/6

const mod = (n, m) => ((n % m) + m) % m
export function dateFromOffset(off) { const d = new Date(ANCHOR); d.setDate(d.getDate() + off); return d }
export function offsetFromDate(d) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((a - ANCHOR) / 86400000)
}
// 真實「今日」相對錨點的偏移（讓 App 一開就停在系統當前日期，而非錨點 6/6）
export function todayOffset() { return offsetFromDate(new Date()) }

function termFor(d) {
  const key = (d.getMonth() + 1) * 100 + d.getDate()
  let best = '冬至', bestK = -1 // 1/1–1/5 尚未到小寒 → 前一年冬至
  for (const [t, m, day] of TERMS) {
    const k = m * 100 + day
    if (k <= key && k > bestK) { best = t; bestK = k }
  }
  return best
}
// 該日是否正逢某節氣交節（回傳節氣名或 null）
function termStartOn(d) {
  const m = d.getMonth() + 1, day = d.getDate()
  for (const [t, tm, td] of TERMS) if (tm === m && td === day) return t
  return null
}
function seasonOf(term) {
  if (['立春', '雨水', '驚蟄', '春分', '清明', '穀雨'].includes(term)) return '春'
  if (['立夏', '小滿', '芒種', '夏至', '小暑', '大暑'].includes(term)) return '夏'
  if (['立秋', '處暑', '白露', '秋分', '寒露', '霜降'].includes(term)) return '秋'
  return '冬'
}
// 農曆月日（近似演算：錨點 6/6 = 農曆五月十一）
function lunarMD(off) {
  let day = 11 + off, mon = 5
  while (day > 30) { day -= 30; mon++ }
  while (day < 1) { day += 30; mon-- }
  mon = mod(mon - 1, 12) + 1
  return { mon, day }
}
function lunarStr(mon, day) {
  const dstr = day <= 10 ? '初' + CN[day]
    : day < 20 ? '十' + CN[day - 10]
    : day === 20 ? '二十'
    : day < 30 ? '廿' + CN[day - 20] : '三十'
  return `農曆${MON[mon]}月${dstr}`
}

const pick = (arr, start, n) => {
  const out = []
  for (let i = 0; out.length < n && i < arr.length; i++) {
    const v = arr[mod(start + i * 3, arr.length)]
    if (!out.includes(v)) out.push(v)
  }
  return out
}

export function dayFor(off) {
  const d = dateFromOffset(off)
  const gi = mod(2 + off, 10), zi = mod(6 + off, 12)   // 丙午 起算
  // 年柱由該日真實年份推（Y-4 起甲子）：2026→丙午。近立春邊界略有差，屬示範演算。
  const yearNum = d.getFullYear()
  const yearGan = mod(yearNum - 4, 10)
  const yearZhi = mod(yearNum - 4, 12)
  const term = termFor(off === undefined ? ANCHOR : d)
  const { mon: lmon, day: lday } = lunarMD(off)

  // ±1 用精寫樣本提供較好的宜忌/諺語，其餘演算
  const sample = (off >= -1 && off <= 1) ? almanacDays[off + 1] : null
  const yi = sample ? sample.yi : pick(YI_POOL, mod(off * 3, YI_POOL.length), 4)
  const jiRaw = sample ? sample.ji : pick(JI_POOL, mod(off * 2 + 5, JI_POOL.length), 2).filter(x => !yi.includes(x))
  const ji = jiRaw.length ? jiRaw : ['諸事不宜']
  const luckyHours = sample ? sample.luckyHours : HOURS[mod(off * 7, HOURS.length)]
  const stars = sample ? sample.stars : 1 + mod(off * 3 + 2, 5)
  // 諺語連同白話解釋一起回傳（樣本日只存諺語本身，回查 proverbs 取得 mean）
  const proverb = sample ? sample.proverb : proverbs[mod(off, proverbs.length)].tw
  const proverbMean = (proverbs.find(p => p.tw === proverb) || {}).mean || ''

  // ---- 傳統擇日項目 ----
  const jc = mod(zi - TERM_ZHI[term], 12)          // 建除十二神
  const xiuIdx = mod(off + 12, 28)                 // 二十八星宿（連續，錨點示範）
  const gz60 = mod(42 + off, 60)                   // 六十甲子序（丙午=42）
  const chongZodiac = mod(zi + 6, 12)
  const chongGZ = G[mod(gi + 6, 10)] + Z[chongZodiac]
  const dir = ['北', '南', '東', '西'][mod(off, 4)]
  // 沖煞歲數（虛歲，非實歲——出生即一歲）：所沖生肖近三個世代
  const curZodiac = mod(d.getFullYear() - 4, 12)
  const baseAge = mod(curZodiac - chongZodiac, 12) + 1
  const chongAges = [baseAge, baseAge + 12, baseAge + 24]
  // 月柱（五虎遁：丙年正月起庚寅）
  const monthZhi = TERM_ZHI[term]
  const monthGan = mod(2 * yearGan + 2 + mod(monthZhi - 2, 12), 10)   // 五虎遁：年干推正月天干
  const monthGZ = G[monthGan] + Z[monthZhi]

  // 十二時辰吉凶（時支與日支：六合/三合→吉，相沖→凶，餘平）
  const SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]]
  const LIUHE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 }
  const hours12 = Z.map((zn, t) => {
    const start = mod(t * 2 - 1, 24)
    const range = `${String(start).padStart(2, '0')}–${String((start + 2) % 24).padStart(2, '0')}`
    let luck = '平'
    if (LIUHE[t] === zi || SANHE.some(s => s.includes(t) && s.includes(zi))) luck = '吉'
    else if (mod(t + 6, 12) === zi) luck = '凶'
    return { zhi: zn, range, luck }
  })

  // 特殊日提示
  const flags = []
  if (G[gi] + Z[zi] === TIANSHE[seasonOf(term)]) flags.push({ t: '天赦日', d: '百無禁忌，最宜祈福、赦罪、解冤', good: true })
  if (SHOUSI[lmon] === zi) flags.push({ t: '受死日', d: '諸事凶，惟入殮、安葬、畋獵可用', good: false })
  const nextTerm = termStartOn(dateFromOffset(off + 1))
  if (nextTerm && ['立春', '立夏', '立秋', '立冬'].includes(nextTerm)) flags.push({ t: '四絕日', d: `${nextTerm}前一日，大事勿用`, good: false })
  if (nextTerm && ['春分', '夏至', '秋分', '冬至'].includes(nextTerm)) flags.push({ t: '四離日', d: `${nextTerm}前一日，大事勿用`, good: false })
  if (YANGGONG[lmon] === lday) flags.push({ t: '楊公忌', d: '楊公十三忌之一，諸事不宜', good: false })
  if ([3, 7, 13, 18, 22, 27].includes(lday)) flags.push({ t: '三娘煞', d: '民俗忌嫁娶', good: false })
  if ([5, 14, 23].includes(lday)) flags.push({ t: '月忌日', d: '五黃入中宮，忌大事', good: false })

  // 節日／神明聖誕
  const festival = LUNAR_FEST[`${lmon}-${lday}`] || (termStartOn(d) ? `${termStartOn(d)}（交節）` : null)

  return {
    off,
    solar: `${d.getMonth() + 1} / ${d.getDate()}`,
    weekday: WD[d.getDay()],
    term,
    ganzhi: G[gi] + Z[zi] + '日',
    yearGZ: G[yearGan] + Z[yearZhi], monthGZ,
    lunar: lunarStr(lmon, lday),
    lunarMon: lmon, lunarDay: lday,
    zheng: `沖${ZODIAC[chongZodiac]}(${chongGZ})煞${dir}`,
    chong: { zodiac: ZODIAC[chongZodiac], gz: chongGZ, dir, ages: chongAges },
    wuxing: NAYIN[mod(gi * 2 + zi, NAYIN.length)],
    luckyHours, stars, yi, ji, proverb, proverbMean,
    // 傳統項目
    jianchu: JIANCHU[jc], jianchuYi: JIANCHU_YI[JIANCHU[jc]],
    xiu: XIU[xiuIdx], xiuAnimal: XIU_ANIMAL[xiuIdx], xiuLuck: XIU_LUCK[xiuIdx],
    pengzu: [PENGZU_GAN[gi], PENGZU_ZHI[zi]],
    taishen: TAISHEN[gz60],
    xishen: XISHEN[G[gi]], caishen: CAISHEN[G[gi]], guiren: GUIREN[G[gi]],
    hours12, flags, festival,
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

// ---- 年度總論（丙午年 2026，示範） ----
export const yearOverview = {
  year: '西元 2026 年・民國 115 年',
  ganzhi: '丙午年', zodiac: '馬', nayin: '天河水',
  taisui: { name: '文哲大將軍', note: '六十甲子太歲之丙午年值年太歲，可安太歲祈平安' },
  chunniu: '春牛頭黃身青、蹄白尾紅；芒神身高三尺六寸，面如童子、赤衣紅腰帶，行於牛後——主春暖多雨、農事宜早。',
  dimu: {
    poem: '太歲丙午年，高低半憂喜。春夏雨水多，秋來缺雨水。稻麥有偏頗，蠶娘情不喜。豆麥熟不齊，人民多疾疫。',
    div: '卜曰：鼠耗一空虛，田禾五穀秕；相看饑饉來，愁悶皆狼狽。',
  },
  fanTaisui: [
    { z: '馬', k: '值太歲', d: '本命年，起伏較大，宜安太歲、行善積福' },
    { z: '鼠', k: '沖太歲', d: '正沖，變動最大，凡事忍讓、注意交通' },
    { z: '牛', k: '害太歲', d: '易犯小人、口舌，慎防人際是非' },
    { z: '兔', k: '破太歲', d: '易破財、計畫生變，理財保守' },
    { z: '雞', k: '刑太歲', d: '情緒與健康起伏，多運動調適' },
  ],
  fangwei: [
    { k: '太歲方', v: '南方（午）', d: '本年太歲所在，不宜動土、修造' },
    { k: '歲破方', v: '北方（子）', d: '太歲對沖方，最忌動土、嫁娶' },
    { k: '三煞方', v: '北方（亥子丑）', d: '寅午戌年三煞在北，忌動土、安床、開挖' },
    { k: '大將軍方', v: '東方（卯）', d: '巳午未年大將軍居東，忌興工動土' },
    { k: '五黃方', v: '逐月飛移', d: '五黃廉貞煞所到之方忌動土（詳見月盤）' },
  ],
  note: '年神方位逐年變動，絕不可沿用舊書；以上為示範，正式版依當年紫白年盤與通書為準。',
}
