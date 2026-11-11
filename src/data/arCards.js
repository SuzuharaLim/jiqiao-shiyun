// ============================================================================
// 官方 AR 卡包 —— 進 /AR 就能掃，不必自己登錄
//
// ★★★★ 2026-11-11 起卡面全面換成「承氣名片」那一套 24 張節氣貓卡
//   （PDF 除了前兩頁之外的單數頁＝卡面，雙數頁是月曆背面）。
//   24 張全部可以掃，共用**一個** .mind（`src/data/arTargets.js`，由
//   `npm run card:all` 產生）；比對成功時的 targetIndex 對回這裡的 `targetIndex`。
//
// ⚠️ 新卡面沒有熱區（`hotspots: []`）：整張是一幅插畫，沒有舊稿那種
//    「掃描主物件」「身體保健」框。認出來就直接跳去 `/ar/model/:slug` 看那隻節氣貓。
//    熱區機制（`src/ar/cardSpace.js` 的 hitTest、卡片頁的熱區校對）完整保留，
//    之後的卡面若再有分區，填 `hotspots` 即可。
//    熱區座標系：卡面正規化 0..1，原點左上，相對目標圖。
//
// ⚠️ 小寒卡原本的六個主題（結球白菜／身體保健／當令農產／曆頁／臘八粥／櫻花）
//    與它們的小挑戰、徽章**全部保留**，改掛在 `topics`（沒有卡面位置的主題）：
//    `badge-term-xiaohan` 要集滿那幾枚小挑戰徽章，拿掉的話那一枚就永遠拿不到。
//    舊卡面的熱區 rect 在 git 歷史裡（a32180f 之前的 arCards.js）。
// ============================================================================

import { AR_CATS } from './arCats.js'
import { AR_MIND, AR_TARGETS } from './arTargets.js'

/**
 * 2027 小寒（丁未年 · 中華民國116年）
 *
 * 卡面資料已用站上曆算逐項核對（2026-08）：
 * - 小寒交節 2027-01-05（星期二）—— `termFromDate(2027,1,5).startsToday === true`
 *   ⚠️ 不可用 `termLocalDay(2027, 22)` 反推：小寒在「立春起算」的序號裡屬於
 *      下一個公曆年，那個呼叫會得到 2028-01-06。
 * - 16 個農曆日全部正確（1/1 十一月廿四 … 1/16 十二月初九）
 * - 臘八節 1/15 ＝ 農曆十二月初八 ✓
 * - 丁未年 · 羊 ✓；2027-01-01 為星期五，週欄位對齊 ✓
 */
export const CARD_2027_XIAOHAN = cardFor(AR_TARGETS[0], {
  // ★ 舊卡面那六個主題沒有新卡面上的位置，改成「主題」：模型頁的話題、卡片頁的主題按鈕。
  topics: ['napa-cabbage', 'xiaohan-health', 'xiaohan-produce', 'xiaohan-almanac', 'xiaohan-laba', 'xiaohan-sakura'],
})

/**
 * 由 `arTargets.js`（編譯腳本產生）與 `arCats.js`（節氣貓角色）組出一張卡。
 *
 * ⚠️ `target` 與 `mindTarget` 必須來自同一次編譯：卡面圖是自我測試餵進去比對的
 *    那張，與 .mind 不同版就會「自我測試失敗」而誤判成裝置不相容。
 */
function cardFor(t, extra = {}) {
  const cat = AR_CATS.find(c => c.id === t.character)
  return {
    id: `card-${t.slug}`,
    slug: t.slug,
    title: `2027 ${t.term}`,
    subtitle: cat ? `${cat.term}節氣貓・${cat.name}` : '',
    term: t.term,
    year: 2027,
    target: t.image,
    mindTarget: AR_MIND,
    targetIndex: t.index,
    // 實體尺寸（mm）：名片 PDF 的裁切框 252×144pt。
    // ⚠️ 唯一用途是卡片頁的 aspectRatio（追蹤用的尺寸是 .mind 自己帶的）。
    sizeMM: [88.9, 50.8],
    character: t.character,
    hotspots: [],
    ...extra,
  }
}

/**
 * 卡上各熱區對應的內容。
 *
 * ⚠️ 這裡**刻意不放任何營養素數字或健康宣稱**。改版文件 §4.2 擬了一份
 *    維生素 C／膳食纖維／鉀／葉酸的草稿並自己標了「上線前須經內容審核」——
 *    那是對的，而且營養宣稱受《食品安全衛生管理法》規範，寫錯對這個站的
 *    可信度傷害最大。
 *
 *    好消息是**不碰營養宣稱也有足夠內容**：品種與產地來自農業部開放資料
 *    （`src/data/produce.js`，一月清單 41 項含結球白菜）、俗語與養生重點來自
 *    `termGuide.js`、宜忌來自 `almanac.js`。全部都是站上既有、可標來源的真材料。
 *    營養資料經食藥署核對後再加 `nutrients` 欄位即可，不必改任何程式。
 */
export const CARD_OBJECTS = {
  'napa-cabbage': {
    id: 'napa-cabbage',
    name: '結球白菜',
    aliases: ['大白菜', '包心白菜'],
    model: 'napa-cabbage',            // src/lib/char/factory.js 的 preset id
    line: '我是結球白菜！小寒前後正是我最甜的時候。',
    // 以下逐項都在站上有出處，不是自撰
    facts: [
      { label: '品種', value: '早春、28號', source: '農業部開放資料（一月當令農產）', ask: '你有哪些品種？', act: 'present' },
      {
        label: '產地',
        value: '彰化溪湖、埔心、大城、埔鹽、竹塘；雲林元長、崙背、西螺、二崙；嘉義六腳、新港',
        source: '農業部開放資料（一月當令農產）',
        ask: '你都種在哪裡？', act: 'point',
      },
      { label: '節氣俗語', value: '十二白（農曆十二月的白菜最好吃）', source: '站內節氣生活資料庫', ask: '你什麼時候最好吃？', act: 'happy' },
    ],
    // ⚠️ 畫面名是 `termDetail`。原本寫 `termEntry`——**那個畫面不存在**，
    //    buildPath 回 null、Link 退回 '/'，於是「看小寒完整節氣頁」點下去回首頁。
    //    不存在的畫面名不會拋錯也不會有警告，只會靜默地把人送到首頁。
    link: { label: '看小寒完整節氣頁', screen: 'termDetail', props: { slug: 'xiaohan' } },
    // 小挑戰只考「卡上與站上真的有寫」的東西，不考需要外部查證的數字
    quiz: {
      question: '卡片上寫結球白菜的產地有哪幾個縣市？（可複選）',
      options: [
        { key: 'changhua', label: '彰化', correct: true },
        { key: 'yunlin', label: '雲林', correct: true },
        { key: 'chiayi', label: '嘉義', correct: true },
        { key: 'yilan', label: '宜蘭', correct: false },
      ],
      note: '彰化、雲林、嘉義是農業部一月當令清單裡結球白菜的產地；宜蘭不在其中。',
      badge: 'badge-xiaohan-napa',
    },
  },
  'xiaohan-health': {
    id: 'xiaohan-health',
    name: '小寒 · 身體保健',
    line: '天冷了，這四件事記在心上。',
    facts: [
      { label: '作息', value: '早臥晚起，等待日光', source: '站內節氣養生', ask: '小寒的作息要怎麼調？', act: 'nod' },
      { label: '呼吸', value: '緩衝深呼吸', ask: '呼吸呢？', act: 'sleep' },
      { label: '重點部位', value: '雙眼與脾胃', source: '站內節氣養生（小寒養生臟腑：脾胃）', ask: '這個節氣要顧哪裡？', act: 'nod' },
    ],
    // 卡面「生活小叮嚀」那段是真實的冬季安全提醒，照抄不改寫
    warn: '天冷別把門窗關得密不透風，記得保持適度通風，避免使用瓦斯熱水器或燃氣設備時發生一氧化碳中毒。',
    // 三個正確選項逐字來自上面的 facts 與 warn；錯的那個「肝與腎」在
    // termGuide.js 的小寒條目與 termArticle.js 的小寒專文裡都查不到。
    // ⚠️ 只考「卡上寫了什麼」，**不可以問「對身體有什麼好處」**——後者必然
    //    踩到保健功效宣稱（check-ar.mjs 有黑名單閘門）。
    quiz: {
      question: '這張「身體保健」知識卡上，寫了下面哪幾件事？（可複選）',
      options: [
        { key: 'rest', label: '作息：早臥晚起，等待日光', correct: true },
        { key: 'breath', label: '呼吸：緩衝深呼吸', correct: true },
        { key: 'co', label: '天冷仍要保持適度通風，小心一氧化碳中毒', correct: true },
        { key: 'liver', label: '重點部位：肝與腎', correct: false },
      ],
      note: '作息、呼吸、重點部位三項就印在上面的知識卡上，通風與一氧化碳那句是卡上的生活小叮嚀（站內節氣生活資料庫的小寒條目也列了「注意室內空氣流通，以免造成一氧化碳中毒」）；卡上寫的重點部位是「雙眼與脾胃」，不是肝與腎。',
      badge: 'badge-xiaohan-health',
    },
    // ⚠️ 畫面名是 `termDetail`。原本寫 `termEntry`——**那個畫面不存在**，
    //    buildPath 回 null、Link 退回 '/'，於是「看小寒完整節氣頁」點下去回首頁。
    //    不存在的畫面名不會拋錯也不會有警告，只會靜默地把人送到首頁。
    link: { label: '看小寒完整節氣頁', screen: 'termDetail', props: { slug: 'xiaohan' } },
  },
  'xiaohan-produce': {
    id: 'xiaohan-produce',
    name: '小寒 · 當令農產',
    line: '一月的餐桌上還有這些。',
    // 只列卡面畫出來的兩項；完整 41 項由節氣頁提供（不在卡上重複一份）
    facts: [
      { label: '茂谷柑橘', value: '一月當令', source: '農業部開放資料（一月當令農產）', ask: '一月還有什麼當令？', act: 'happy' },
      // ⚠️ 這一筆原本寫「文旦：一月當令」並標 source 為農業部開放資料，
      //    但 `produce.js`（正是 `build-produce.mjs` 從那份資料產生的）裡
      //    「文旦柚」**只出現在八、九月**，一月完全沒有 ⇒ 那句話被它自己
      //    引用的來源否定。文旦是卡面「食在地」那一區畫的，所以保留品項，
      //    但不可再宣稱當令。（2026-08-11 訂正）
      { label: '文旦', value: '卡面「食在地」區也畫了它；站上的當令清單把它列在八、九月', source: '站內當令清單' },
    ],
    // 問的是「卡片上有什麼」不是「什麼當令」——後者的答案不在使用者眼前
    // （完整清單在 /ingredients，要離開這一頁才看得到，而作答狀態不會保留）。
    quiz: {
      question: '這張小寒卡片上出現了哪些農產？（可複選）',
      options: [
        { key: 'napa', label: '結球白菜', correct: true },
        { key: 'ponkan', label: '茂谷柑橘', correct: true },
        { key: 'pomelo', label: '文旦', correct: true },
        { key: 'grapefruit', label: '葡萄柚', correct: false },
      ],
      note: '卡面左側綠色虛線框的主角是結球白菜，左下「食在地」那一區畫的是茂谷柑橘與文旦。葡萄柚沒有出現在這張卡上，站上的一月當令清單也查不到它。',
      badge: 'badge-xiaohan-produce',
    },
    // ⚠️ 這個出口的文字是「當令清單」，就要去當令清單頁（`/ingredients`），
    //    不可指向節氣頁——文字與去處不一致，使用者會覺得按錯了。
    link: { label: '看一月完整當令清單', screen: 'ingredients' },
  },
  'xiaohan-almanac': {
    id: 'xiaohan-almanac',
    name: '小寒 · 曆頁',
    line: '這一天的宜忌、吉時、沖煞都在站上。',
    // 不寫死宜忌內容——那是 almanac.js 逐日算出來的，寫死一定會與站上不一致
    dynamic: 'almanac',
    // 四個選項全部可以在卡面月曆上逐字對照：粉紅那一格印的是「05 廿八 小寒」，
    // 06 那格只印「06 廿九」，15 那格印「15 初八 臘八節」。
    // ⚠️ 標「農曆廿八」不標「農曆十一月廿八」：整張卡唯一印出來的農曆**月份**
    //    是 8 日那格的「十二月初一」，要答出「十一月」得自己往回推，那是推理不是閱讀。
    // ⚠️ 2027 小寒是 **01-05** 不是 01-06（改版文件寫錯過，CLAUDE.md 有記）。
    quiz: {
      question: '卡片月曆上，小寒是哪一天？（可複選；答案就印在那個粉紅色的格子裡）',
      options: [
        { key: 'd5', label: '國曆 1 月 5 日', correct: true },
        { key: 'd6', label: '國曆 1 月 6 日', correct: false },
        { key: 'l28', label: '農曆廿八', correct: true },
        { key: 'l8', label: '農曆初八', correct: false },
      ],
      note: '粉紅色那一格印的是「05 廿八 小寒」——國曆 1 月 5 日、農曆廿八。1 月 6 日那一格只寫「06 廿九」，已經是小寒的第二天；「初八」則是同一張卡上 15 日那一格（15 初八 臘八節）。卡上的節氣、農曆與交節日期由站內天文演算逐日產生。',
      badge: 'badge-xiaohan-almanac',
    },
    link: { label: '看 2027-01-05 完整曆頁', screen: 'almanacDay', props: { date: '2027-01-05' } },
  },
  'xiaohan-laba': {
    id: 'xiaohan-laba',
    name: '臘八粥',
    line: '吃一碗臘八粥，暖身又開運。',
    facts: [
      { label: '日期', value: '2027-01-15（農曆十二月初八）', source: '站內曆算', ask: '臘八是哪一天？', act: 'nod' },
      { label: '應景食物', value: '臘八粥', source: '站內節氣生活資料庫', ask: '那天要吃什麼？', act: 'happy' },
    ],
    // 三個正確選項都在上面的 facts 裡；錯的那個考「節氣 ≠ 節日」——
    // 臘八 01-15 與小寒交節 01-05 差十天，兩者同在一張卡上很容易混淆。
    quiz: {
      question: '卡片上的臘八，哪幾項說法正確？（可複選）',
      options: [
        { key: 'lunar', label: '農曆十二月初八', correct: true },
        { key: 'solar', label: '2027 年落在國曆 1 月 15 日', correct: true },
        { key: 'food', label: '這一天的應景食物是臘八粥', correct: true },
        { key: 'same', label: '和小寒交節（1 月 5 日）是同一天', correct: false },
      ],
      note: '臘八是農曆十二月初八，2027 年落在國曆 1 月 15 日（站內曆算），站內節氣生活資料庫把臘八粥列為小寒的應景食物；小寒交節則是 1 月 5 日，兩者差了十天——節氣和節日不是同一件事。',
      badge: 'badge-xiaohan-laba',
    },
    link: { label: '看 2027-01-15 曆頁', screen: 'almanacDay', props: { date: '2027-01-15' } },
  },
  'xiaohan-sakura': {
    id: 'xiaohan-sakura',
    name: '櫻花',
    line: '小寒過後，台灣的櫻花季就要開始了。',
    // ⚠️ 原本寫「花期：小寒前後陸續開花」並標 source 為「站內節氣生活資料庫（花期）」，
    //    但 `termGuide.js` 小寒那筆的 `flowers` 是 **空陣列**，整份檔案一次櫻花都沒有
    //    ⇒ 那個出處查不到這件事。而站上其他資料的方向是相反的：
    //    賞花清單寫陽明山櫻花「2–3 月」、武陵農場「2 月」，`termArticle.js` 也把
    //    「山區的櫻花陸續開」放在**立春**（約 2/4）。小寒是 1/5——按這張卡自己的
    //    「看賞花地圖」點過去就會看到 2–3 月，自己打自己的臉。（2026-08-11 訂正）
    // ⚠️ 這個物件因此**沒有小挑戰**：唯一一條素材的出處查不到，湊不出可查證的題目。
    //    寧可少一題也不要編（其餘五個熱區都有題目）。
    facts: [{ label: '花期', value: '山區約二至三月盛開（陽明山、武陵農場）', source: '站內賞花清單', ask: '你什麼時候開？', act: 'happy' }],
    link: { label: '看賞花地圖', screen: 'flowers' },
  },
}

// ★★★ 二十四節氣貓（2027 年曆）：每一隻都是 CARD_OBJECTS 的一員（id `cat-<節氣代號>`），
//   有 `model.cat` 的物件在模型頁用節氣貓引擎畫（見 ArModel.jsx）。資料由 arCats.js 自動產生。
for (const c of AR_CATS) CARD_OBJECTS[c.id] = c

/** 24 張全部是實體卡，順序＝年曆順序（小寒、大寒、立春…冬至）＝ targetIndex。 */
export const OFFICIAL_CARDS = AR_TARGETS.map(t => (t.index === 0 ? CARD_2027_XIAOHAN : cardFor(t)))

/**
 * ★★★ 沒有實體卡的節氣也有 `/ar/model/2027-<節氣代號>`（2026-10-04 使用者指定「24 隻都可以看」）。
 *
 * ⚠️ 這些是**模型頁專用**的虛擬頁，刻意**不放進 OFFICIAL_CARDS**：
 *    `/AR` 會把 OFFICIAL_CARDS 全部編進辨識目標、徽章與卡片頁也逐張列出——
 *    沒有 `.mind`／卡面圖的項目放進去，掃描頁會壞、卡片頁會開出空白卡。
 *    所以 `cardBySlug`（卡片頁、掃描）維持只認實體卡，模型頁改用 `arPageBySlug`。
 * ⚠️ 已有實體卡的節氣不再產生虛擬頁：同一個節氣兩個網址會互相搶。
 *    2026-11-11 起 24 個節氣都有實體卡，所以這份清單目前是空的（保留給日後
 *    「角色有了、卡還沒印」的情況）。
 */
export const TERM_CAT_PAGES = AR_CATS
  .filter(c => !OFFICIAL_CARDS.some(card => card.term === c.term))
  .map(c => ({
    id: `cat-page-2027-${c.link.props.slug}`,
    slug: `2027-${c.link.props.slug}`,
    title: `2027 ${c.term}`,
    subtitle: `${c.term}節氣貓`,
    term: c.term,
    year: 2027,
    character: c.id,
    hotspots: [],
    virtual: true,
  }))

export const cardBySlug = (slug) => OFFICIAL_CARDS.find(c => c.slug === slug) || null
/** 模型頁用：實體卡優先，其次是節氣貓的虛擬頁。 */
export const arPageBySlug = (slug) => cardBySlug(slug) || TERM_CAT_PAGES.find(c => c.slug === slug) || null
export const objectForHotspot = (hs) => (hs?.objectId ? CARD_OBJECTS[hs.objectId] : null) || null
/**
 * 一張卡的全部主題：卡面熱區＋沒有卡面位置的 `topics`。
 * 後者包成沒有 `rect` 的熱區形狀，卡片頁與模型頁就能用同一套程式列出來
 * （⚠️ 沒有 rect 的不可拿去畫熱區框或做命中判定）。
 */
export const topicsOf = (card) => [
  ...(card?.hotspots ?? []),
  ...(card?.topics ?? []).filter(id => CARD_OBJECTS[id]).map(id => ({ id: `tp-${id}`, objectId: id, label: CARD_OBJECTS[id].name })),
]
/** 這一頁的 3D 主角：有 `character` 就用它，否則沿用 primary 熱區的物件（舊卡的寫法）。 */
export const characterOf = (card) => (card?.character ? CARD_OBJECTS[card.character] : null)
  ?? objectForHotspot(card?.hotspots?.find(h => h.primary) ?? card?.hotspots?.[0])
  ?? null
