// 生肖與星座配對 —— 依傳統地支關係與星座元素關係推算，非隨機、非分數相減。
//
// ⚠️ 原本的配對分數是「兩個生肖的今日運勢分數相減」（100 - |a.score - b.score|），
//    那是拿當日運勢當婚配依據，換一天答案就變，而且與任何傳統說法都無關。
//    改為以地支六大關係（三合/六合/六沖/六害/相刑）與星座四元素關係判定，
//    每一項都說明理由，使用者可自行檢核。

const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
export const ZODIAC_SIGNS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬']
const zIdx = (sign) => ZODIAC_SIGNS.indexOf(sign)

// 三合（四組）：申子辰、亥卯未、寅午戌、巳酉丑
const SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]]
// 六合：子丑、寅亥、卯戌、辰酉、巳申、午未
const LIUHE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 }
// 六害：子未、丑午、寅巳、卯辰、申亥、酉戌
const LIUHAI = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 }
// 相刑：寅巳申（無恩）、丑戌未（恃勢）三刑；子卯（無禮）相刑；辰午酉亥 自刑
// ⚠️ 這行註解一直是完整的，但下面的常數只寫了兩組三刑——子卯與四自刑從來沒被判到。
//    於是「鼠×兔」被判成「無特別的合或沖，屬平和之配」、「雞×雞」被判成「同生肖」，
//    而本站自己的「干支・三合六合」頁白紙黑字寫著「子卯（無禮之刑）　辰午酉亥（自刑）」
//    ——同一個 App 兩頁互相打臉。註解與常數不同步就是這樣發生的。
const SANXING = [[2, 5, 8], [1, 10, 7]]
const XING_PAIRS = [[0, 3]]          // 子卯 無禮之刑
const SELF_XING = [4, 6, 9, 11]      // 辰午酉亥 自刑

// 生肖配對：回傳 { score, level, reason }
export function zodiacMatch(signA, signB) {
  const a = zIdx(signA), b = zIdx(signB)
  if (a < 0 || b < 0) return null
  const gz = `${Z[a]}${Z[b]}`

  if (a !== b && SANHE.some(g => g.includes(a) && g.includes(b)))
    return { score: 95, level: '三合', reason: `${Z[a]}與${Z[b]}同屬三合（${SANHE.find(g => g.includes(a)).map(i => Z[i]).join('')}），傳統視為最相合的組合，性情相投、互相成就。` }
  if (LIUHE[a] === b)
    return { score: 88, level: '六合', reason: `${gz}相合（六合），彼此吸引、遇事容易同心，是安穩長久的配。` }
  if (mod12(a + 6) === b)
    // ⚠️ 原本寫「六合之對沖」——六沖就是六沖，這個說法在術語上講不通
    return { score: 45, level: '六沖', reason: `${gz}相沖（六沖／對沖），主張常相左右，需要刻意留溝通空間；沖也代表變動與刺激，不是不能在一起。` }
  if (LIUHAI[a] === b)
    return { score: 55, level: '六害', reason: `${gz}相害，容易在小事上互相消耗，宜把話講開、少猜心。` }
  if (a !== b && SANXING.some(g => g.includes(a) && g.includes(b)))
    return { score: 58, level: '相刑', reason: `${gz}相刑（${SANXING.find(g => g.includes(a) && g.includes(b)).map(i => Z[i]).join('')}三刑），相處易有摩擦與拉扯，需要各自留餘地。` }
  if (a !== b && XING_PAIRS.some(p => p.includes(a) && p.includes(b)))
    return { score: 58, level: '相刑', reason: `${gz}相刑（子卯無禮之刑），容易在分寸與界線上互相踩線，需要把規矩講清楚。` }
  // ⚠️ 自刑必須放在「同生肖」之前判。辰午酉亥同屬自刑，
  //    先判同生肖的話，酉酉就會被歸成一般的「同生肖 72 分」而漏掉刑。
  if (a === b && SELF_XING.includes(a))
    return { score: 60, level: '自刑', reason: `同屬${signA}，${Z[a]}${Z[a]}為自刑，兩人的執著與盲點一模一樣，容易在同一件事上反覆內耗。` }
  if (a === b)
    return { score: 72, level: '同生肖', reason: `同屬${signA}，理解對方的直覺很強，但缺點也相同，容易一起卡在同一個地方。` }
  return { score: 70, level: '平和', reason: `${gz}無特別的合或沖，屬平和之配，關係走向多取決於相處與經營。` }
}
const mod12 = (n) => ((n % 12) + 12) % 12

// ── 星座 ──────────────────────────────────────────────────────
// 元素：火（牡羊/獅子/射手）土（金牛/處女/摩羯）風（雙子/天秤/水瓶）水（巨蟹/天蠍/雙魚）
export const STARS = [
  { name: '牡羊', range: '3/21–4/19', el: '火' },
  { name: '金牛', range: '4/20–5/20', el: '土' },
  { name: '雙子', range: '5/21–6/21', el: '風' },
  { name: '巨蟹', range: '6/22–7/22', el: '水' },
  { name: '獅子', range: '7/23–8/22', el: '火' },
  { name: '處女', range: '8/23–9/22', el: '土' },
  { name: '天秤', range: '9/23–10/23', el: '風' },
  { name: '天蠍', range: '10/24–11/22', el: '水' },
  { name: '射手', range: '11/23–12/21', el: '火' },
  { name: '摩羯', range: '12/22–1/19', el: '土' },
  { name: '水瓶', range: '1/20–2/18', el: '風' },
  { name: '雙魚', range: '2/19–3/20', el: '水' },
]

// 元素關係：同元素最順；火風、土水相生；火土、火水、風土、風水需磨合
const EL_PAIR = {
  '火風': 88, '風火': 88, '土水': 88, '水土': 88,
  '火土': 62, '土火': 62, '火水': 55, '水火': 55,
  '風土': 60, '土風': 60, '風水': 58, '水風': 58,
}
export function starMatch(nameA, nameB) {
  const A = STARS.find(s => s.name === nameA), B = STARS.find(s => s.name === nameB)
  if (!A || !B) return null
  if (A.el === B.el) {
    return {
      score: A.name === B.name ? 78 : 90, level: `同為${A.el}象`,
      reason: A.name === B.name
        ? `兩人都是${A.name}，節奏一致、一點就通，但也容易同時鑽進同一個死角。`
        : `${A.name}與${B.name}同屬${A.el}象星座，價值觀與步調接近，相處省力。`,
    }
  }
  const key = A.el + B.el
  const score = EL_PAIR[key] ?? 65
  const good = score >= 80
  return {
    score, level: `${A.el}象 × ${B.el}象`,
    reason: good
      ? `${A.el}象與${B.el}象互相帶動（${A.el}風相揚／土水相潤之理），一方給動能、一方給節奏。`
      : `${A.el}象與${B.el}象的關注點不同，${A.name}重視的與${B.name}在意的常不是同一件事，需要多解釋、少假設。`,
  }
}

// 生日 → 星座（國曆）
export function starFromDate(month, day) {
  const cuts = [[1, 20, '水瓶'], [2, 19, '雙魚'], [3, 21, '牡羊'], [4, 20, '金牛'], [5, 21, '雙子'],
    [6, 22, '巨蟹'], [7, 23, '獅子'], [8, 23, '處女'], [9, 23, '天秤'], [10, 24, '天蠍'],
    [11, 23, '射手'], [12, 22, '摩羯']]
  let name = '摩羯'                                  // 1/1–1/19 屬摩羯
  for (const [m, d, n] of cuts) if (month > m || (month === m && day >= d)) name = n
  return name
}

// 合併：生肖與星座各半
export function combinedMatch({ zodiacA, zodiacB, starA, starB }) {
  const z = zodiacA && zodiacB ? zodiacMatch(zodiacA, zodiacB) : null
  const s = starA && starB ? starMatch(starA, starB) : null
  if (!z && !s) return null
  const score = z && s ? Math.round(z.score * 0.5 + s.score * 0.5) : (z || s).score
  return { score, zodiac: z, star: s }
}
