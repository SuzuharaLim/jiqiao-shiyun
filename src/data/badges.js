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


  // ══════════════ 節氣知識王 · 逆境徽章（2026-09-10 使用者指定）══════════════
  //
  // ★★★ 語氣一律用**通書的字**（血光／諸事不宜／時運不濟／否極泰來），
  //   不可以寫成嘲諷。徽章是給人收集的，不是拿來罵人的——一個讓人看了
  //   不舒服的徽章，使用者會希望它不要出現在自己的名片上，那就等於白做。
  //   通書那套語彙剛好天生帶著「這是天時不是你的錯」的味道，很適合這一組。
  //
  // ⚠️ 這一組刻意**沒有唯一徽章**：「全站輸最多場」被公告出來是難堪的，
  //   而王座還會發通知說你被超越了——那個通知在這個語境下是在羞辱人。
  'quiz-first-loss': {
    id: 'quiz-first-loss', name: '初嘗敗績',
    group: 'quiz', tier: TIER_NORMAL, glyph: '敗',
    how: '在兩人對戰輸掉第一場',
  },
  'quiz-lose-10': {
    id: 'quiz-lose-10', name: '屢敗屢戰',
    group: 'quiz', tier: TIER_NORMAL, glyph: '屢',
    how: '兩人對戰累計輸滿 10 場',
  },
  'quiz-lose-streak-3': {
    id: 'quiz-lose-streak-3', name: '時運不濟',
    group: 'quiz', tier: TIER_NORMAL, glyph: '運',
    how: '兩人對戰連敗 3 場',
  },
  'quiz-ko-5': {
    id: 'quiz-ko-5', name: '血光之災',
    group: 'quiz', tier: TIER_NORMAL, glyph: '血',
    how: '闖關生存血量歸零 5 次',
  },
  'quiz-all-wrong': {
    id: 'quiz-all-wrong', name: '諸事不宜',
    group: 'quiz', tier: TIER_NORMAL, glyph: '凶',
    how: '單場作答 3 題以上，一題都沒答對',
  },
  // ★ 這一枚是這組的出口：連敗之後贏一場。
  //   只有負面徽章的話，收藏庫會變成一面「你有多爛」的牆——
  //   而站上的語氣從來不是那樣。否極泰來要真的拿得到。
  'quiz-comeback': {
    id: 'quiz-comeback', name: '否極泰來',
    group: 'quiz', tier: TIER_NORMAL, glyph: '泰',
    how: '連敗 3 場以上之後，贏下一場對戰',
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

  // ══════════════ 24 節氣卡片（2026-09-10 使用者指定）══════════════
  //
  // 一個節氣一枚，集滿那張卡的**全部**小挑戰才拿得到——這讓卡面上那幾枚
  // 熱區徽章有了去處，24 枚湊起來就是這個產品天然的收藏主軸。
  //
  // ★★★★ `requires` 空陣列 ＝ **那張卡還沒發行**。
  //   目前官方卡只有一張（2027 小寒，見 arCards.js 的 OFFICIAL_CARDS），
  //   所以 24 枚裡有 23 枚是**現在不可能拿到**的。收藏庫必須把這件事
  //   明講成「卡片尚未發行」，不可以照著 `how` 寫「去掃卡答對」——
  //   那是叫使用者去做一件做不到的事，而他會以為是自己找不到。
  //
  // ⚠️ 用 `requires` 是否為空來判斷發行狀態，是**刻意**的：發行一張新卡時
  //   本來就得回來把那張卡的小挑戰徽章 id 填進去，發行狀態因此不可能忘記
  //   同步。另設一個 `released` 旗標的話，遲早會出現「卡發行了、旗標沒改」。
  'badge-term-lichun': {
    id: 'badge-term-lichun', name: '立春 · 節氣卡', term: '立春',
    group: 'term', tier: TIER_NORMAL, glyph: '立',
    how: '答對立春卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-yushui': {
    id: 'badge-term-yushui', name: '雨水 · 節氣卡', term: '雨水',
    group: 'term', tier: TIER_NORMAL, glyph: '雨',
    how: '答對雨水卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-jingzhe': {
    id: 'badge-term-jingzhe', name: '驚蟄 · 節氣卡', term: '驚蟄',
    group: 'term', tier: TIER_NORMAL, glyph: '驚',
    how: '答對驚蟄卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-chunfen': {
    id: 'badge-term-chunfen', name: '春分 · 節氣卡', term: '春分',
    group: 'term', tier: TIER_NORMAL, glyph: '春',
    how: '答對春分卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-qingming': {
    id: 'badge-term-qingming', name: '清明 · 節氣卡', term: '清明',
    group: 'term', tier: TIER_NORMAL, glyph: '清',
    how: '答對清明卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-guyu': {
    id: 'badge-term-guyu', name: '穀雨 · 節氣卡', term: '穀雨',
    group: 'term', tier: TIER_NORMAL, glyph: '穀',
    how: '答對穀雨卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-lixia': {
    id: 'badge-term-lixia', name: '立夏 · 節氣卡', term: '立夏',
    group: 'term', tier: TIER_NORMAL, glyph: '立',
    how: '答對立夏卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-xiaoman': {
    id: 'badge-term-xiaoman', name: '小滿 · 節氣卡', term: '小滿',
    group: 'term', tier: TIER_NORMAL, glyph: '小',
    how: '答對小滿卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-mangzhong': {
    id: 'badge-term-mangzhong', name: '芒種 · 節氣卡', term: '芒種',
    group: 'term', tier: TIER_NORMAL, glyph: '芒',
    how: '答對芒種卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-xiazhi': {
    id: 'badge-term-xiazhi', name: '夏至 · 節氣卡', term: '夏至',
    group: 'term', tier: TIER_NORMAL, glyph: '夏',
    how: '答對夏至卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-xiaoshu': {
    id: 'badge-term-xiaoshu', name: '小暑 · 節氣卡', term: '小暑',
    group: 'term', tier: TIER_NORMAL, glyph: '小',
    how: '答對小暑卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-dashu': {
    id: 'badge-term-dashu', name: '大暑 · 節氣卡', term: '大暑',
    group: 'term', tier: TIER_NORMAL, glyph: '大',
    how: '答對大暑卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-liqiu': {
    id: 'badge-term-liqiu', name: '立秋 · 節氣卡', term: '立秋',
    group: 'term', tier: TIER_NORMAL, glyph: '立',
    how: '答對立秋卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-chushu': {
    id: 'badge-term-chushu', name: '處暑 · 節氣卡', term: '處暑',
    group: 'term', tier: TIER_NORMAL, glyph: '處',
    how: '答對處暑卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-bailu': {
    id: 'badge-term-bailu', name: '白露 · 節氣卡', term: '白露',
    group: 'term', tier: TIER_NORMAL, glyph: '白',
    how: '答對白露卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-qiufen': {
    id: 'badge-term-qiufen', name: '秋分 · 節氣卡', term: '秋分',
    group: 'term', tier: TIER_NORMAL, glyph: '秋',
    how: '答對秋分卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-hanlu': {
    id: 'badge-term-hanlu', name: '寒露 · 節氣卡', term: '寒露',
    group: 'term', tier: TIER_NORMAL, glyph: '寒',
    how: '答對寒露卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-shuangjiang': {
    id: 'badge-term-shuangjiang', name: '霜降 · 節氣卡', term: '霜降',
    group: 'term', tier: TIER_NORMAL, glyph: '霜',
    how: '答對霜降卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-lidong': {
    id: 'badge-term-lidong', name: '立冬 · 節氣卡', term: '立冬',
    group: 'term', tier: TIER_NORMAL, glyph: '立',
    how: '答對立冬卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-xiaoxue': {
    id: 'badge-term-xiaoxue', name: '小雪 · 節氣卡', term: '小雪',
    group: 'term', tier: TIER_NORMAL, glyph: '小',
    how: '答對小雪卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-daxue': {
    id: 'badge-term-daxue', name: '大雪 · 節氣卡', term: '大雪',
    group: 'term', tier: TIER_NORMAL, glyph: '大',
    how: '答對大雪卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-dongzhi': {
    id: 'badge-term-dongzhi', name: '冬至 · 節氣卡', term: '冬至',
    group: 'term', tier: TIER_NORMAL, glyph: '冬',
    how: '答對冬至卡片上的全部小挑戰',
    requires: [],
  },
  'badge-term-xiaohan': {
    id: 'badge-term-xiaohan', name: '小寒 · 節氣卡', term: '小寒',
    group: 'term', tier: TIER_NORMAL, glyph: '小',
    how: '答對小寒卡片上的全部小挑戰',
    requires: [
      'badge-xiaohan-napa', 'badge-xiaohan-health', 'badge-xiaohan-produce',
      'badge-xiaohan-almanac', 'badge-xiaohan-laba',
    ],
  },
  'badge-term-dahan': {
    id: 'badge-term-dahan', name: '大寒 · 節氣卡', term: '大寒',
    group: 'term', tier: TIER_NORMAL, glyph: '大',
    how: '答對大寒卡片上的全部小挑戰',
    requires: [],
  },
}

/** 名片與個人資訊上最多能「裝上」幾枚。 */
export const SLOT_MAX = 3

export const badgeMeta = id => BADGES[id] ?? null
export const isUnique = id => BADGES[id]?.tier === TIER_UNIQUE

/** 目錄的顯示順序：唯一在前（那是稀有的），同階內依 group 再依定義順序。 */
const GROUP_ORDER = { quiz: 0, term: 1, ar: 2 }
export const ALL_BADGES = Object.values(BADGES).sort((a, b) => {
  if ((a.tier === TIER_UNIQUE) !== (b.tier === TIER_UNIQUE)) return a.tier === TIER_UNIQUE ? -1 : 1
  return (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9)
})

export const GROUP_LABEL = { quiz: '節氣知識王', term: '二十四節氣卡', ar: '節氣卡片 · 熱區' }

/**
 * 這枚節氣卡徽章對應的卡片**發行了沒**。
 * ⚠️ 判準是 `requires` 有沒有內容——不另設 released 旗標，見上方說明。
 */
export const isReleased = (b) => !!(b.requires && b.requires.length)

/**
 * 在剛拿到 `justEarned` 之後，檢查有沒有哪一枚節氣卡徽章因此集滿了。
 * @param owned 目前已擁有的 id（Set 或陣列）
 * @returns {string[]} 這次應該一併授予的節氣卡徽章
 *
 * ⚠️ 前後端都要呼叫它：訪客沒有 session（後端那條路走不到），
 *    登入者則不能只靠前端（那是可偽造的）。同一份純函式兩邊共用，
 *    才不會出現「本機說集滿了、後端說沒有」這種對不起來的狀態。
 */
export function termBadgesCompletedBy(justEarned, owned) {
  const have = new Set(owned)
  have.add(justEarned)
  const out = []
  for (const b of Object.values(BADGES)) {
    if (b.group !== 'term' || !isReleased(b)) continue
    if (have.has(b.id)) continue
    if (!b.requires.includes(justEarned)) continue   // 與這次無關就別算
    if (b.requires.every(r => have.has(r))) out.push(b.id)
  }
  return out
}
