// ============================================================================
// 徽章總目錄（2026-09-10）
//
// 這裡只有「徽章長什麼樣、怎麼拿」，**不含任何「誰拿到了」的狀態**——
// 那一半在 src/lib/arBadges.js（本機 + 後端合併）與伺服器的
// user_badges／badge_thrones 兩張表。
//
// ⚠️ 為什麼目錄搬出 arBadges.js：那支是「取得與同步的邏輯」，而目錄是**內容**。
//    站規早就分過這條線（termArticle.js 是內容層、almanac.js 是演算層）。
//    arBadges.js 仍 re-export `BADGES`，既有的 import 一行都不用改。
//
// ── 兩種階級 ────────────────────────────────────────────────────
//
// `normal`（一般徽章）：達成條件就拿到，人人都可以有，永久。
//
// `unique`（唯一徽章，**王座式**）：全站**同時**只有一個人持有。
//   它不存在 user_badges 裡，而是 badge_thrones 的一列（PRIMARY KEY 是
//   badge_id，那條 PK 就是「只有一個人」在資料層的唯一保證）。
//   被超越就易主，原持有者會收到通知。
//
//   ★★★★ 唯一徽章絕不可以由前端判定。 一般徽章判錯了頂多多發一枚；
//     唯一徽章判錯是**從一個真的達成過的人手上把東西拿走**。所以每一枚
//     unique 都必須有 `metric`，而那個數字只能由伺服器算出來或由伺服器
//     自己判定的比賽產生。
//
//   ⚠️ 訪客拿不到唯一徽章——他沒有帳號，就沒有「持有者」這個概念可言。
//     UI 必須明講這件事，不可以讓訪客一直挑戰一個他不可能拿到的東西。
//
// ── 新增徽章的檢查表 ──────────────────────────────────────────
//   1. 這裡加一筆（id 要符合 /^[a-z0-9-]{3,48}$/，那是後端的白名單）
//   2. unique 的話 → server/index.js 的 THRONE_METRICS 也要有對應的算法
//   3. 條件寫進 `how`，而且要寫**使用者做得到的動作**，不是內部欄位名
// ============================================================================

/** 一般徽章：達成即得，永久，人人可有。 */
export const TIER_NORMAL = 'normal'
/** 唯一徽章：王座式，全站同時只有一人，可被超越。 */
export const TIER_UNIQUE = 'unique'

export const BADGES = {
  // ══════════════ AR 卡片（2026-08-11，小挑戰答對即得）══════════════
  'badge-xiaohan-napa': {
    id: 'badge-xiaohan-napa', name: '小寒 · 結球白菜', term: '小寒',
    group: 'ar', tier: TIER_NORMAL, glyph: '菜',
    how: '在小寒卡的「結球白菜」小挑戰答對',
  },
  // 2026-08-11：五個熱區各給一枚（櫻花那一區沒有小挑戰，見 arCards.js 的說明）。
  // ⚠️ 新增小挑戰時**一定要一起補這裡**：`ArQuiz` 查不到 id 時會退而顯示原始 slug
  //    （arBadges.js 刻意「查不到就顯示 slug 而不是藏起來」——藏起來會變成
  //    「使用者明明拿過卻看不到」），但那是保底不是設計。check-ar.mjs 已上閘門。
  'badge-xiaohan-health': {
    id: 'badge-xiaohan-health', name: '小寒 · 身體保健', term: '小寒',
    group: 'ar', tier: TIER_NORMAL, glyph: '保',
    how: '在小寒卡的「身體保健」小挑戰答對',
  },
  'badge-xiaohan-produce': {
    id: 'badge-xiaohan-produce', name: '小寒 · 當令農產', term: '小寒',
    group: 'ar', tier: TIER_NORMAL, glyph: '產',
    how: '在小寒卡的「當令農產」小挑戰答對',
  },
  'badge-xiaohan-almanac': {
    id: 'badge-xiaohan-almanac', name: '小寒 · 曆頁', term: '小寒',
    group: 'ar', tier: TIER_NORMAL, glyph: '曆',
    how: '在小寒卡的「曆頁」小挑戰答對',
  },
  'badge-xiaohan-laba': {
    id: 'badge-xiaohan-laba', name: '小寒 · 臘八粥', term: '小寒',
    group: 'ar', tier: TIER_NORMAL, glyph: '臘',
    how: '在小寒卡的「臘八粥」小挑戰答對',
  },

  // ══════════════ 節氣知識王（2026-09-10，共 10 枚）══════════════
  //
  // 7 枚一般 ＋ 3 枚唯一。
  //
  // ★★★ 唯一徽章的三個 metric 是**刻意挑過**的，判準是「伺服器有多相信它」：
  //   duel-streak 最硬（勝負完全由伺服器判定，前端連自稱贏了都做不到）；
  //   score 與 combo 次之（伺服器重算上界，擋得掉亂送的數字，
  //   但擋不掉「看著 bundle 裡的答案每題都答對」）。
  //   ⇒ 所以「連勝之王」排在最前面，它是這三枚裡唯一經得起認真挑戰的。

  'quiz-first-game': {
    id: 'quiz-first-game', name: '初試啼聲',
    group: 'quiz', tier: TIER_NORMAL, glyph: '初',
    how: '完成第一場節氣知識王',
  },
  'quiz-survivor': {
    id: 'quiz-survivor', name: '撐住了',
    group: 'quiz', tier: TIER_NORMAL, glyph: '撐',
    how: '闖關生存撐滿三分鐘，血沒歸零',
  },
  'quiz-flawless': {
    id: 'quiz-flawless', name: '一題不錯',
    group: 'quiz', tier: TIER_NORMAL, glyph: '全',
    how: '單場答對 10 題以上、一題都沒錯',
  },
  'quiz-combo-10': {
    id: 'quiz-combo-10', name: '十連星',
    group: 'quiz', tier: TIER_NORMAL, glyph: '連',
    how: '單場連續答對 10 題',
  },
  'quiz-swift': {
    id: 'quiz-swift', name: '快手',
    group: 'quiz', tier: TIER_NORMAL, glyph: '快',
    how: '在 2 秒內答對一題',
  },
  'quiz-duel-first-win': {
    id: 'quiz-duel-first-win', name: '首度論戰',
    group: 'quiz', tier: TIER_NORMAL, glyph: '戰',
    how: '在兩人對戰擊敗一位真人對手',
  },
  'quiz-scholar': {
    id: 'quiz-scholar', name: '通曉節氣',
    group: 'quiz', tier: TIER_NORMAL, glyph: '通',
    how: '累積答對 100 題',
  },

  // ── 唯一徽章（王座式，被超越就易主）──
  'quiz-throne-streak': {
    id: 'quiz-throne-streak', name: '連勝之王',
    group: 'quiz', tier: TIER_UNIQUE, glyph: '霸',
    how: '兩人對戰的連勝場數全站第一',
    unit: '連勝',
    // 勝負由伺服器判定（quizFinish），前端連「我贏了」都送不出來 ⇒ 這一枚最硬。
    metric: 'duelStreak',
    // 空王座的門檻：至少要真的連贏兩場，不是打一場就登基。
    floor: 2,
  },
  'quiz-throne-score': {
    id: 'quiz-throne-score', name: '節氣之王',
    group: 'quiz', tier: TIER_UNIQUE, glyph: '王',
    how: '闖關生存的單場最高分全站第一',
    unit: '分',
    metric: 'bestScore',
    floor: 1000,
  },
  'quiz-throne-combo': {
    id: 'quiz-throne-combo', name: '連擊之王',
    group: 'quiz', tier: TIER_UNIQUE, glyph: '擊',
    how: '單場最長連對題數全站第一',
    unit: '連對',
    metric: 'bestCombo',
    floor: 5,
  },
}

/** 名片與個人資訊上最多能「裝上」幾枚。 */
export const SLOT_MAX = 3

export const badgeMeta = id => BADGES[id] ?? null
export const isUnique = id => BADGES[id]?.tier === TIER_UNIQUE

/** 目錄的顯示順序：唯一在前（那是稀有的），同階內依 group 再依定義順序。 */
const GROUP_ORDER = { quiz: 0, ar: 1 }
export const ALL_BADGES = Object.values(BADGES).sort((a, b) => {
  if ((a.tier === TIER_UNIQUE) !== (b.tier === TIER_UNIQUE)) return a.tier === TIER_UNIQUE ? -1 : 1
  return (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9)
})

export const GROUP_LABEL = { quiz: '節氣知識王', ar: '節氣卡片' }
