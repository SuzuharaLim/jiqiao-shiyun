// ============================================================================
// 官方 AR 卡包 —— 進 /AR 就能掃，不必自己登錄
//
// 原本 /AR 只能「使用者自己登錄目標」，所以拿到實體明信片的人進到這一頁
// 其實沒東西可掃——那是工程 demo 的動線，不是消費者動線。
//
// ⚠️ 使用者自訂登錄（從圖片檔／相機）**完全保留**，只是降級成進階選項。
//
// 熱區座標系：卡面正規化 0..1，原點左上，相對「拉正後的目標圖」。
// 命中判定見 src/lib/arHotspot.js（改版文件「決策 A」：不做物件偵測）。
//
// ⚠️ 下面的 rect 是從設計稿預覽圖目測的，**印刷檔定稿後必須重新量一次**。
//    熱區標錯不會拋錯，只會讓使用者點不到東西或點到卡片另一邊。
//    `/ar/card/:slug` 的 fallback 頁會把熱區畫出來，用眼睛就能校。
// ============================================================================

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
export const CARD_2027_XIAOHAN = {
  id: 'card-2027-xiaohan',
  slug: '2027-xiaohan',
  title: '2027 小寒',
  subtitle: '一月五日交節',
  term: '小寒',
  year: 2027,
  // 目標圖：拉正後的正面平整圖。放 public/ 底下，載入時算簽名（見 arCardRegistry.js）
  target: '/ar/targets/2027-xiaohan.png',
  // 實體尺寸（mm）——追蹤器不需要，貼合式 3D 換算真實比例時才用
  sizeMM: [148, 105],
  hotspots: [
    {
      // 卡面左側，綠色虛線框內，卡上白紙黑字寫著「掃描主物件：結球白菜」
      id: 'hs-napa',
      objectId: 'napa-cabbage',
      rect: { x: 0.018, y: 0.135, w: 0.155, h: 0.405 },
      label: '結球白菜',
      hint: '對準圖上的大白菜',
      primary: true,
    },
    {
      // 身體保健四格
      id: 'hs-health',
      objectId: 'xiaohan-health',
      rect: { x: 0.175, y: 0.205, w: 0.500, h: 0.290 },
      label: '身體保健',
      hint: '小寒怎麼顧身體',
    },
    {
      // 茂谷柑橘 + 文旦（含上方「食在地」產地）
      id: 'hs-produce',
      objectId: 'xiaohan-produce',
      rect: { x: 0.020, y: 0.550, w: 0.155, h: 0.200 },
      label: '當令農產',
      hint: '這個月還有什麼當令',
    },
    {
      // 月曆格（右半），導向站上的完整曆頁
      id: 'hs-almanac',
      objectId: 'xiaohan-almanac',
      rect: { x: 0.180, y: 0.500, w: 0.810, h: 0.130 },
      label: '曆頁',
      hint: '看這一天的宜忌',
    },
    {
      // 臘八粥（右下）
      id: 'hs-laba',
      objectId: 'xiaohan-laba',
      rect: { x: 0.715, y: 0.740, w: 0.160, h: 0.195 },
      label: '臘八粥',
      hint: '臘八節吃什麼',
    },
    {
      // 櫻花（右上，花期）
      id: 'hs-sakura',
      objectId: 'xiaohan-sakura',
      rect: { x: 0.800, y: 0.010, w: 0.190, h: 0.150 },
      label: '櫻花',
      hint: '這個節氣開什麼花',
    },
  ],
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
      { label: '品種', value: '早春、28號', source: '農業部開放資料（一月當令農產）' },
      {
        label: '產地',
        value: '彰化溪湖、埔心、大城、埔鹽、竹塘；雲林元長、崙背、西螺、二崙；嘉義六腳、新港',
        source: '農業部開放資料（一月當令農產）',
      },
      { label: '節氣俗語', value: '十二白（農曆十二月的白菜最好吃）', source: '站內節氣生活資料庫' },
    ],
    link: { label: '看小寒完整節氣頁', screen: 'termEntry', props: { slug: 'xiaohan' } },
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
      { label: '作息', value: '早臥晚起，等待日光', source: '站內節氣養生' },
      { label: '呼吸', value: '緩衝深呼吸' },
      { label: '重點部位', value: '雙眼與脾胃', source: '站內節氣養生（小寒養生臟腑：脾胃）' },
    ],
    // 卡面「生活小叮嚀」那段是真實的冬季安全提醒，照抄不改寫
    warn: '天冷別把門窗關得密不透風，記得保持適度通風，避免使用瓦斯熱水器或燃氣設備時發生一氧化碳中毒。',
    link: { label: '看小寒完整節氣頁', screen: 'termEntry', props: { slug: 'xiaohan' } },
  },
  'xiaohan-produce': {
    id: 'xiaohan-produce',
    name: '小寒 · 當令農產',
    line: '一月的餐桌上還有這些。',
    // 只列卡面畫出來的兩項；完整 41 項由節氣頁提供（不在卡上重複一份）
    facts: [
      { label: '茂谷柑橘', value: '一月當令', source: '農業部開放資料' },
      { label: '文旦', value: '一月當令', source: '農業部開放資料' },
    ],
    link: { label: '看一月完整當令清單', screen: 'termEntry', props: { slug: 'xiaohan' } },
  },
  'xiaohan-almanac': {
    id: 'xiaohan-almanac',
    name: '小寒 · 曆頁',
    line: '這一天的宜忌、吉時、沖煞都在站上。',
    // 不寫死宜忌內容——那是 almanac.js 逐日算出來的，寫死一定會與站上不一致
    dynamic: 'almanac',
    link: { label: '看 2027-01-05 完整曆頁', screen: 'almanacDay', props: { date: '2027-01-05' } },
  },
  'xiaohan-laba': {
    id: 'xiaohan-laba',
    name: '臘八粥',
    line: '吃一碗臘八粥，暖身又開運。',
    facts: [
      { label: '日期', value: '2027-01-15（農曆十二月初八）', source: '站內曆算' },
      { label: '應景食物', value: '臘八粥', source: '站內節氣生活資料庫' },
    ],
    link: { label: '看 2027-01-15 曆頁', screen: 'almanacDay', props: { date: '2027-01-15' } },
  },
  'xiaohan-sakura': {
    id: 'xiaohan-sakura',
    name: '櫻花',
    line: '小寒到立春，是台灣的櫻花季。',
    facts: [{ label: '花期', value: '小寒前後陸續開花', source: '站內節氣生活資料庫（花期）' }],
    link: { label: '看賞花地圖', screen: 'flowers' },
  },
}

export const OFFICIAL_CARDS = [CARD_2027_XIAOHAN]

export const cardBySlug = (slug) => OFFICIAL_CARDS.find(c => c.slug === slug) || null
export const objectForHotspot = (hs) => (hs?.objectId ? CARD_OBJECTS[hs.objectId] : null) || null
