// 擇日工具：由既有的曆算引擎推導各用途的吉日
//
// ⚠️ 這一層沒有任何新的「命理判定」，全部是既有 dayFor() 結果的重新組織：
//    某個用途出現在當日的宜欄、且沒有被神煞否決，就是吉日。
//    不可為了讓每個月都有吉日而放寬標準——寧可誠實顯示「這個月沒有」。
//
// 用途 → 宜忌詞的對應。同義詞要成組，理由與 almanac.js 的 reconcile 相同：
// 「交易」「立券」「納財」都屬開市，只比對「開市」會漏掉另外三個。
import { dayFor, offsetFromDate, todayOffset } from './almanac.js'

export const PURPOSES = [
  {
    slug: 'moving', name: '搬家', title: '搬家吉日',
    yi: ['入宅', '移徙', '搬移'], alsoGood: ['安床', '祭祀'],
    intro: '搬家在傳統擇日裡對應「入宅」與「移徙」。入宅指遷入新居、移徙指搬遷住所，兩者常一起看。',
    tips: '傳統上入宅當天會先「安爐」（把爐火帶進新家）與「拜地基主」，並避開與自己生肖相沖的日子。實務上也要同時考慮搬家公司的檔期與天氣。',
  },
  {
    slug: 'wedding', name: '結婚', title: '結婚好日子',
    yi: ['嫁娶'], alsoGood: ['納采', '訂盟'],
    intro: '結婚在擇日上稱「嫁娶」。除了看日子本身的宜忌，傳統還會參考新人雙方的八字，這一頁只提供日子層面的篩選。',
    tips: '除了宜嫁娶，民俗上還要避開三娘煞（農曆初三、初七、十三、十八、廿二、廿七）與新人本命的沖日。農曆七月與正月十五前後也多半避開。',
  },
  {
    slug: 'opening', name: '開市開工', title: '開市吉日',
    yi: ['開市', '交易', '立券', '納財'], alsoGood: ['出行'],
    intro: '開店、開工、簽約、收款在擇日上都歸「開市」一類，同義的還有交易、立券、納財。',
    tips: '年後開工多半挑正月的開市吉日，並在當天拜財神、放鞭炮。簽約若涉及金錢往來，傳統上看「立券」與「納財」比看「開市」更貼切。',
  },
  {
    slug: 'bed', name: '安床', title: '安床吉日',
    yi: ['安床'], alsoGood: ['入宅'],
    intro: '安床指擺放或移動床鋪的位置，傳統認為關乎睡眠與健康，也與求子有關，因此另立一項。',
    tips: '安床通常安排在入宅前後。民俗上會避開孕婦在場，並在安好後請家中長輩或小孩先坐一下（稱「壓床」）。',
  },
  {
    slug: 'groundbreaking', name: '動土', title: '動土吉日',
    yi: ['動土', '破土', '修造'], alsoGood: ['豎柱', '上樑'],
    intro: '動土指開工興建、整地開挖。要特別注意「動土」用於陽宅興建，「破土」則多用於墓地——兩者在傳統擇日裡是不同的事。',
    tips: '動土前要避開年度的太歲方、歲破方、三煞方與年五黃（詳見年度總覽）。方位的忌諱在動土這件事上比日子本身更受重視。',
  },
  {
    slug: 'travel', name: '出行', title: '出行吉日',
    yi: ['出行'], alsoGood: ['祭祀'],
    intro: '出行指遠行、旅遊、出差。傳統上長途遠行才特別擇日，短程通勤不需要。',
    tips: '出行忌與自己生肖相沖的日子。搭船或跨海的行程，民俗上另會避開「危日」（宜安床祭祀、忌登高行船）。',
  },
  {
    slug: 'worship', name: '祭祀', title: '祭祀吉日',
    yi: ['祭祀', '祈福'], alsoGood: ['求嗣'],
    intro: '祭祀包含拜拜、祭祖、還願、安神位。這是最常見、也是限制最少的一類——即使在大凶日，祭祀與喪葬相關事項往往仍可進行。',
    tips: '神明誕辰當天祭祀不需另外擇日。安神位則講究較多，通常會另請專人看日子與方位。',
  },
  {
    slug: 'burial', name: '安葬', title: '安葬吉日',
    yi: ['安葬', '入殮'], alsoGood: ['造葬', '埋穴'],
    intro: '安葬與入殮屬喪葬事宜。這一類的特殊之處在於：許多「諸事不宜」的大凶日，傳統上反而註明喪葬可用。',
    tips: '喪葬擇日通常會配合亡者的生辰與家屬的生肖，並由禮儀公司或擇日師處理，此頁僅供初步參考。',
  },
]

export const purposeBySlug = (slug) => PURPOSES.find(p => p.slug === slug) || null

/**
 * 取某個用途在某段期間內的吉日。
 * ⚠️ 判準完全來自 dayFor() 的宜欄與神煞——不另外發明規則，
 *    也不因為「這個月剛好沒有」就放寬標準。
 */
export function goodDays(slug, fromOff, days) {
  const p = purposeBySlug(slug)
  if (!p) return []
  const out = []
  for (let i = 0; i < days; i++) {
    const off = fromOff + i
    const d = dayFor(off)
    // 大凶日一律排除（宜欄會被 reconcile 壓成「諸事不宜」或只剩喪葬）
    const hit = p.yi.filter(w => d.yi.includes(w))
    if (!hit.length) continue
    out.push({
      off, d, matched: hit,
      // 加分項：同一天也適合的相關事項，讓使用者知道可以順便做什麼
      bonus: p.alsoGood.filter(w => d.yi.includes(w)),
    })
  }
  return out
}

/** 某個國曆月份（1-12）的吉日 */
export function goodDaysInMonth(slug, year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  return goodDays(slug, offsetFromDate(first), last.getDate())
}

/** 某一整年的吉日，依月份分組 */
export function goodDaysInYear(slug, year) {
  return Array.from({ length: 12 }, (_, m) => ({
    month: m + 1,
    days: goodDaysInMonth(slug, year, m + 1),
  }))
}

/** 從今天起算最近的幾個吉日（首頁與總表用） */
export function upcoming(slug, n = 8, days = 180) {
  return goodDays(slug, todayOffset(), days).slice(0, n)
}

// 生肖沖煞過濾：使用者選了自己的生肖後，把當天沖到自己的日子標出來。
// ⚠️ 是「標出來」不是「刪掉」——沖煞的嚴重程度各家看法不同，
//    直接刪掉等於替使用者做了他不知道的決定。
export const filterByZodiac = (list, zodiac) =>
  list.map(x => ({ ...x, clash: !!zodiac && x.d.chong.zodiac === zodiac }))
