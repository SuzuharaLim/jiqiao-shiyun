// ============================================================================
// 徽章授予與王座易主（2026-09-10）
//
// 這一支是**唯一**會寫 user_badges／badge_thrones／quiz_stats 的地方。
// 與 notify() 同一個設計：單一入口，所以「拿到徽章要發通知」「王座易主要
// 通知原持有者」這些事只需要寫一次，之後任何新玩法接進來都自動有。
//
// ★★★★ 王座（唯一徽章）的正確性全靠兩件事，缺一不可：
//   ① badge_thrones 的 PRIMARY KEY 是 badge_id ——「全站只有一個人」
//      是資料層的約束，不是應用層的自律。
//   ② 易主一律用**條件式 UPDATE**（WHERE badge_id=? AND value < ?）。
//      pg 與 sqlite 的單句 UPDATE 都是原子的，changes=0 就是沒搶到。
//      絕不可寫成「SELECT 出來比大小，再 UPDATE」——兩個人同時破紀錄時
//      那中間的空隙會讓**兩個人都成功**，而畫面上不會有任何錯誤。
// ============================================================================
import db from './db.js'
import { BADGES } from '../src/data/badges.js'
// 分數上界住在純資料層（見那裡的說明：閘門要能 import 它而不牽到 db.js）
import { maxScoreFor } from '../src/data/quiz.js'
export { maxScoreFor }

const nowIso = () => new Date().toISOString()

/**
 * 授予一般徽章（可重入）。
 * @returns {Promise<string[]>} 這次真的**新**授予的 id（用來決定要不要通知）
 *
 * ⚠️ 用「先查再插」不用 upsert：pg 與 sqlite 的 upsert 語法不同，而 db.js 的
 *    可移植性原則是只寫兩邊一樣的 SQL（見 CLAUDE.md）。這裡的競態無害——
 *    重複插入會被 PK 擋下，catch 掉就等於「已經有了」。
 */
export async function grantBadges(userId, ids) {
  if (!userId || !ids?.length) return []
  const fresh = []
  for (const id of ids) {
    // 只發目錄裡有的：id 進得了資料庫就會出現在別人的名片上，
    // 目錄查不到的會顯示成一串 slug。
    // ★★★★ 唯一徽章**永遠**不走這裡（它住 badge_thrones，不是 user_badges）。
    //   寫進 user_badges 等於給了永久所有權，王座易主也拿不走 ⇒ 兩個人同時
    //   持有一枚「全站唯一」。這一層與 /api/badges 的過濾是**兩道**，
    //   因為未來任何新玩法都會呼叫 grantBadges，不該每次都要想起這件事。
    if (!BADGES[id] || BADGES[id].tier === 'unique') continue
    const has = await db.get('SELECT 1 AS x FROM user_badges WHERE user_id=? AND badge_id=?', [userId, id])
    if (has) continue
    try {
      await db.run('INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?,?,?)',
        [userId, id, nowIso()])
      fresh.push(id)
    } catch { /* 同時兩個請求都插 → PK 擋下，等於已經有了 */ }
  }
  return fresh
}

/**
 * 挑戰一個王座。
 * @returns {Promise<null | { badgeId, value, previousUserId }>}
 *   null＝沒搶到（值不夠、或同時有人用更高的值搶走）。
 *   previousUserId 是被擠下來的人（空王座時為 null），呼叫端據此通知。
 *
 * ★★ 嚴格大於才易主（value > 現任）。相同分數不換人——後到的人沒有比較強，
 *    而「換來換去」會讓兩個人一直互收通知。
 */
export async function claimThrone(userId, badgeId, value) {
  const meta = BADGES[badgeId]
  if (!userId || !meta || meta.tier !== 'unique') return null
  const v = Math.floor(Number(value) || 0)
  // 門檻：空王座也不是「打一場就登基」。
  if (!Number.isFinite(v) || v < (meta.floor ?? 1)) return null

  const cur = await db.get('SELECT user_id, value FROM badge_thrones WHERE badge_id=?', [badgeId])
  if (!cur) {
    // 空王座：直接插。⚠️ 這裡有競態（兩個人同時看到空王座），但 PK 會擋下
    //   其中一個 ⇒ 落到 catch ⇒ 改走下面的條件式 UPDATE 再試一次搶。
    try {
      await db.run('INSERT INTO badge_thrones (badge_id, user_id, value, won_at) VALUES (?,?,?,?)',
        [badgeId, userId, v, nowIso()])
      return { badgeId, value: v, previousUserId: null }
    } catch { /* 有人先插了 → 往下用條件式 UPDATE 搶 */ }
  }
  // 自己已經是持有者：只更新數字，不算「易主」（不必再通知一次）
  const holder = cur?.user_id ?? (await db.get('SELECT user_id, value FROM badge_thrones WHERE badge_id=?', [badgeId]))?.user_id
  if (holder === userId) {
    await db.run('UPDATE badge_thrones SET value=?, won_at=? WHERE badge_id=? AND user_id=? AND value<?',
      [v, nowIso(), badgeId, userId, v])
    return null
  }
  // ★ 條件式 UPDATE：這一句本身是原子的，changes=1 才代表真的搶到。
  const before = await db.get('SELECT user_id FROM badge_thrones WHERE badge_id=?', [badgeId])
  const r = await db.run('UPDATE badge_thrones SET user_id=?, value=?, won_at=? WHERE badge_id=? AND value<?',
    [userId, v, nowIso(), badgeId, v])
  if (!r.changes) return null
  return { badgeId, value: v, previousUserId: before?.user_id ?? null }
}

/** 讀某人目前坐著的王座。 */
export async function thronesOf(userId) {
  if (!userId) return []
  const rows = await db.all('SELECT badge_id, value, won_at FROM badge_thrones WHERE user_id=?', [userId])
  return rows.map(r => ({ id: r.badge_id, value: Number(r.value), earnedAt: r.won_at, unique: true }))
}

/** 每一個唯一徽章目前的持有者（收藏庫要顯示「現在在誰手上」）。 */
export async function throneBoard() {
  const rows = await db.all(
    `SELECT t.badge_id, t.value, t.won_at, u.name, u.handle
       FROM badge_thrones t JOIN users u ON u.id = t.user_id`)
  const out = {}
  for (const r of rows) {
    out[r.badge_id] = { name: r.name, handle: r.handle, value: Number(r.value), wonAt: r.won_at }
  }
  return out
}

/** 讀（並在缺列時建立）某人的知識王累積成績。 */
export async function quizStatsOf(userId) {
  const r = await db.get('SELECT * FROM quiz_stats WHERE user_id=?', [userId])
  if (r) {
    return {
      games: Number(r.games), bestScore: Number(r.best_score), bestCombo: Number(r.best_combo),
      totalRight: Number(r.total_right), duelWins: Number(r.duel_wins),
      duelStreak: Number(r.duel_streak), bestStreak: Number(r.best_streak),
    }
  }
  return { games: 0, bestScore: 0, bestCombo: 0, totalRight: 0, duelWins: 0, duelStreak: 0, bestStreak: 0 }
}

async function saveStats(userId, s) {
  const t = nowIso()
  const r = await db.run(
    `UPDATE quiz_stats SET games=?, best_score=?, best_combo=?, total_right=?,
       duel_wins=?, duel_streak=?, best_streak=?, updated_at=? WHERE user_id=?`,
    [s.games, s.bestScore, s.bestCombo, s.totalRight, s.duelWins, s.duelStreak, s.bestStreak, t, userId])
  if (!r.changes) {
    try {
      await db.run(
        `INSERT INTO quiz_stats (user_id,games,best_score,best_combo,total_right,duel_wins,duel_streak,best_streak,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [userId, s.games, s.bestScore, s.bestCombo, s.totalRight, s.duelWins, s.duelStreak, s.bestStreak, t])
    } catch {
      // 競態：另一個請求剛插了同一列 → 用 UPDATE 再寫一次
      await db.run(
        `UPDATE quiz_stats SET games=?, best_score=?, best_combo=?, total_right=?,
           duel_wins=?, duel_streak=?, best_streak=?, updated_at=? WHERE user_id=?`,
        [s.games, s.bestScore, s.bestCombo, s.totalRight, s.duelWins, s.duelStreak, s.bestStreak, t, userId])
    }
  }
}

/**
 * 登錄一場**單人**（闖關生存／練習對手）的結果。
 * 真人對戰不走這裡——那邊的勝負由伺服器自己判定（recordDuel）。
 *
 * @returns {Promise<{ badges: string[], thrones: object[], stats: object }>}
 */
export async function recordSoloGame(userId, raw) {
  const right = Math.max(0, Math.min(200, Math.floor(Number(raw?.right) || 0)))
  const wrong = Math.max(0, Math.min(200, Math.floor(Number(raw?.wrong) || 0)))
  const combo = Math.max(0, Math.min(right, Math.floor(Number(raw?.bestCombo) || 0)))
  // ★ 分數一律夾在「答對這麼多題最多可能拿到的分」以內。
  const score = Math.max(0, Math.min(maxScoreFor(right), Math.floor(Number(raw?.score) || 0)))
  const mode = raw?.mode === 'bot' ? 'bot' : 'solo'
  const survived = !!raw?.survived
  const fastest = Number(raw?.fastest)

  const s = await quizStatsOf(userId)
  s.games += 1
  s.totalRight += right
  s.bestScore = Math.max(s.bestScore, score)
  s.bestCombo = Math.max(s.bestCombo, combo)
  await saveStats(userId, s)

  const earn = ['quiz-first-game']
  // ⚠️「撐住了」只給闖關生存：練習對手那一局的結束條件不同（打倒對手也會結束），
  //    給了會變成「這枚徽章的名字跟拿到它的方式對不上」。
  if (mode === 'solo' && survived) earn.push('quiz-survivor')
  if (right >= 10 && wrong === 0) earn.push('quiz-flawless')
  if (combo >= 10) earn.push('quiz-combo-10')
  if (Number.isFinite(fastest) && fastest > 0 && fastest <= 2) earn.push('quiz-swift')
  if (s.totalRight >= 100) earn.push('quiz-scholar')

  const badges = await grantBadges(userId, earn)
  const thrones = []
  // ⚠️ 王座只認闖關生存：練習對手是模擬的，拿它的分數去爭「全站第一」不公平。
  if (mode === 'solo') {
    for (const t of [
      await claimThrone(userId, 'quiz-throne-score', s.bestScore),
      await claimThrone(userId, 'quiz-throne-combo', s.bestCombo),
    ]) if (t) thrones.push(t)
  }
  return { badges, thrones, stats: s }
}

/**
 * 登錄一場**真人對戰**的結果。由 quizFinish 這個單一入口呼叫。
 * 勝負是伺服器判定的，所以這裡的數字是這三枚王座裡最可信的。
 */
export async function recordDuel(userId, won) {
  if (!userId) return { badges: [], thrones: [] }
  const s = await quizStatsOf(userId)
  if (won) {
    s.duelWins += 1
    s.duelStreak += 1
    s.bestStreak = Math.max(s.bestStreak, s.duelStreak)
  } else {
    s.duelStreak = 0   // 連勝斷了
  }
  await saveStats(userId, s)
  const badges = won ? await grantBadges(userId, ['quiz-duel-first-win']) : []
  const thrones = []
  if (won) {
    const t = await claimThrone(userId, 'quiz-throne-streak', s.bestStreak)
    if (t) thrones.push(t)
  }
  return { badges, thrones }
}
