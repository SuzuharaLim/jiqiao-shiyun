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
import { BADGES, termBadgesCompletedBy } from '../src/data/badges.js'
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

    // ★★★ 集滿一張卡的全部小挑戰 ⇒ 一併發那個節氣的卡片徽章。
    //   ⚠️ 判定用的是 termBadgesCompletedBy 這支**純函式**，前後端共用同一份。
    //     兩邊各寫一份的話遲早分岔，而症狀是「本機說集滿了、重整之後又沒有」。
    const ownedNow = (await db.all('SELECT badge_id FROM user_badges WHERE user_id=?', [userId]))
      .map(r => r.badge_id)
    for (const termId of termBadgesCompletedBy(id, ownedNow)) {
      try {
        await db.run('INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?,?,?)',
          [userId, termId, nowIso()])
        fresh.push(termId)
      } catch { /* 已經有了 */ }
    }
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

  // ★★★ 最多重試三次。每一輪都是「讀現況 → 用**那個現況**當條件寫入」，
  //   條件沒中就代表中途被人動過 ⇒ 重讀再來。這樣做的是兩件事：
  //   ① 易主本身是原子的（條件式 UPDATE）；
  //   ② `previousUserId` 是**精確**的——WHERE 帶了 user_id，changes=1 就證明
  //      寫入的那一刻持有者確實是我們讀到的那個人。
  //   ⚠️ 少了 ② 的話，高度競爭時會**通知錯人**：跟一個從來沒被擠下來的人說
  //      「你的徽章被搶走了」，而他的徽章其實好好的。
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await db.get('SELECT user_id, value FROM badge_thrones WHERE badge_id=?', [badgeId])

    if (!cur) {
      // 空王座：直接插。⚠️ 這裡有競態（兩個人同時看到空王座），但 PK 會擋下
      //   其中一個 ⇒ 落到 catch ⇒ 下一輪改走條件式 UPDATE 去搶。
      try {
        await db.run('INSERT INTO badge_thrones (badge_id, user_id, value, won_at) VALUES (?,?,?,?)',
          [badgeId, userId, v, nowIso()])
        return { badgeId, value: v, previousUserId: null }
      } catch { continue }
    }

    // 自己已經是持有者：只把數字往上推，不算「易主」（不必再通知一次）
    if (cur.user_id === userId) {
      await db.run(
        'UPDATE badge_thrones SET value=?, won_at=? WHERE badge_id=? AND user_id=? AND value<?',
        [v, nowIso(), badgeId, userId, v])
      return null
    }

    // 別人坐著：值不夠就不用搶了（嚴格大於才易主——相同分數的後到者
    // 並沒有比較強，而換來換去會讓兩個人一直互收通知）
    if (Number(cur.value) >= v) return null

    const r = await db.run(
      `UPDATE badge_thrones SET user_id=?, value=?, won_at=?
         WHERE badge_id=? AND user_id=? AND value<?`,
      [userId, v, nowIso(), badgeId, cur.user_id, v])
    if (r.changes) return { badgeId, value: v, previousUserId: cur.user_id }
    // 沒搶到＝中途被動過（別人先易主、或值被推高）→ 重讀再判一次
  }
  return null
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
      duelLosses: Number(r.duel_losses || 0), loseStreak: Number(r.lose_streak || 0),
      koCount: Number(r.ko_count || 0),
    }
  }
  return { games: 0, bestScore: 0, bestCombo: 0, totalRight: 0, duelWins: 0, duelStreak: 0, bestStreak: 0,
    duelLosses: 0, loseStreak: 0, koCount: 0 }
}

/**
 * 確保這個人有一列成績。
 *
 * ★★★★ 統計**一律用原子 SQL 遞增**（`SET games = games + 1`），
 *   絕不可「讀出來 → 在 JS 加一 → 整份寫回去」。那是典型的 lost update：
 *   兩個請求同時進來（對戰收局撞上單人成績、或使用者連點兩次），
 *   後寫的那份會用一個**過期的快照**蓋掉前一份 ⇒ 少算一場。
 *   而少算的那一場如果剛好是第 10 敗，「屢敗屢戰」就再也不會發出來，
 *   使用者只會覺得「我明明輸夠了卻沒拿到」——完全查不出原因。
 *
 * ⚠️ 這裡刻意不用 upsert：pg 與 sqlite 語法不同，而 db.js 的可移植性原則是
 *   只寫兩邊一樣的 SQL。競態下重複 INSERT 會被 PK 擋掉，catch 即可。
 */
async function ensureStats(userId) {
  const has = await db.get('SELECT 1 AS x FROM quiz_stats WHERE user_id=?', [userId])
  if (has) return
  try {
    await db.run(
      `INSERT INTO quiz_stats (user_id,games,best_score,best_combo,total_right,duel_wins,
         duel_streak,best_streak,duel_losses,lose_streak,ko_count,updated_at)
       VALUES (?,0,0,0,0,0,0,0,0,0,0,?)`, [userId, nowIso()])
  } catch { /* 另一個請求剛插了同一列 */ }
}

/** 原子地把某個「越大越好」的欄位往上推。 */
async function raiseStat(userId, col, value) {
  const v = Math.floor(Number(value) || 0)
  if (v <= 0) return
  await db.run(`UPDATE quiz_stats SET ${col}=? WHERE user_id=? AND ${col}<?`, [v, userId, v])
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

  await ensureStats(userId)
  // ★ 全部走原子遞增（見 ensureStats 的說明）。
  //   逆境徽章：血歸零＝沒撐住。⚠️ 只算闖關生存——練習對手被打倒是另一回事，
  //   混在一起算的話「血光之災」的名字會跟拿到它的方式對不上。
  const ko = (mode === 'solo' && !survived) ? 1 : 0
  await db.run(
    `UPDATE quiz_stats SET games=games+1, total_right=total_right+?, ko_count=ko_count+?,
       updated_at=? WHERE user_id=?`, [right, ko, nowIso(), userId])
  await raiseStat(userId, 'best_score', score)
  await raiseStat(userId, 'best_combo', combo)
  // ★ 門檻一律用**寫入之後重讀**的值。並發時可能讀到別人那一次也加過的數字，
  //   但門檻都是 `>=` 而授予是冪等的 ⇒ 最壞情況只是早一點拿到，絕不會漏發。
  //   反過來（先讀後寫）才會真的漏。
  const s = await quizStatsOf(userId)

  const earn = ['quiz-first-game']
  // ⚠️「撐住了」只給闖關生存：練習對手那一局的結束條件不同（打倒對手也會結束），
  //    給了會變成「這枚徽章的名字跟拿到它的方式對不上」。
  if (mode === 'solo' && survived) earn.push('quiz-survivor')
  if (right >= 10 && wrong === 0) earn.push('quiz-flawless')
  if (combo >= 10) earn.push('quiz-combo-10')
  if (Number.isFinite(fastest) && fastest > 0 && fastest <= 2) earn.push('quiz-swift')
  if (s.totalRight >= 100) earn.push('quiz-scholar')
  // ── 逆境徽章 ──
  if (s.koCount >= 5) earn.push('quiz-ko-5')
  // ⚠️「諸事不宜」要求**至少作答 3 題**：一開局就按「結束這局」的人
  //    right 與 wrong 都是 0，那不是「全錯」而是「沒玩」，發了會很莫名。
  if (wrong >= 3 && right === 0) earn.push('quiz-all-wrong')

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
  await ensureStats(userId)
  const t = nowIso()
  const earn = []

  if (won) {
    // ★★★★ 「否極泰來」＝這一場**之前**連敗 ≥3。
    //   用條件式 UPDATE 讓「判斷」與「歸零」變成同一個原子動作：
    //   changes=1 就證明寫入的那一刻 lose_streak 真的 ≥3。
    //   先前是「先把 loseStreak 讀進變數、再歸零」——單執行緒下答案對，
    //   但那是 read-modify-write：判斷依據與寫入之間有空隙，並發時會用到
    //   過期的數字。條件式 UPDATE 沒有那個空隙（同一條 SQL）。
    const comeback = await db.run(
      `UPDATE quiz_stats SET duel_wins=duel_wins+1, duel_streak=duel_streak+1,
         lose_streak=0, updated_at=? WHERE user_id=? AND lose_streak>=3`, [t, userId])
    if (comeback.changes) earn.push('quiz-comeback')
    else {
      await db.run(
        `UPDATE quiz_stats SET duel_wins=duel_wins+1, duel_streak=duel_streak+1,
           lose_streak=0, updated_at=? WHERE user_id=?`, [t, userId])
    }
    // best_streak 追上 duel_streak：欄位對欄位比較，一樣是原子的
    await db.run(
      'UPDATE quiz_stats SET best_streak=duel_streak WHERE user_id=? AND best_streak<duel_streak',
      [userId])
    earn.push('quiz-duel-first-win')
  } else {
    await db.run(
      `UPDATE quiz_stats SET duel_streak=0, duel_losses=duel_losses+1,
         lose_streak=lose_streak+1, updated_at=? WHERE user_id=?`, [t, userId])
    earn.push('quiz-first-loss')
  }

  // 門檻用寫入之後重讀的值（理由同 recordSoloGame）
  const s = await quizStatsOf(userId)
  if (!won) {
    if (s.duelLosses >= 10) earn.push('quiz-lose-10')
    if (s.loseStreak >= 3) earn.push('quiz-lose-streak-3')
  }
  const badges = await grantBadges(userId, earn)
  const thrones = []
  if (won) {
    const th = await claimThrone(userId, 'quiz-throne-streak', s.bestStreak)
    if (th) thrones.push(th)
  }
  return { badges, thrones }
}
