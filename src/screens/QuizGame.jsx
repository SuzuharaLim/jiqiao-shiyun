// ============================================================================
// 節氣知識王 —— 節氣／曆法／民俗的計時問答
//
// 兩種玩法：闖關生存（三分鐘總時限＋血量）與兩人對戰（各答各的，答對出手扣血）。
//
// ★ 樣式一律沿用站內既有詞彙，不另造一套：
//   曆頁卡 `.calpage/.hd/.gz/.meta`、宜忌雙欄 `.yiji/.yj/.yl`、工具列 `.tool/.ti/.tn2`、
//   分頁 `.chips/.chip`、按鈕 `.b/.b.dark/.btn-primary`、`.note`、`.sech`。
//   對錯用通勝的宜綠 `--yi` / 忌朱 `--ji`，主操作用朱紅 `--cinnabar`。
//   只有「血條」與「選項按鈕」是站上沒有的，才在 styles.css 新增 `.qz-*`。
//
// ⚠️ 計時器與模擬對手都要在 unmount 時清掉——這個畫面是 push 進堆疊的，
//    使用者按返回就會被卸載，沒清的 setInterval 會繼續跑並對已卸載的元件 setState。
// ============================================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead, CountUp, Disclaimer } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import {
  QUESTIONS, KEYS, RULES, shuffle, dealt, makeFoe, seededDeck, loadBoards, pushScore,
} from '../data/quiz.js'
import { api } from '../api.js'

/** 收局原因 → 依勝負各自的說法。伺服器只給中性代碼。 */
const QZ_REASON = {
  ko: { win: '你擊倒了對手', lose: '你倒下了' },
  offline: { win: '對手離線，你獲勝', lose: '你離線了' },
  left: { win: '對手離開，你獲勝', lose: '你離開了這一局' },
}

const fmtClock = (s) => {
  const v = Math.max(0, s)
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
}

/** 血條。ghost 慢半拍才退，看得出剛剛掉了多少。 */
function HpBar({ pct, ghost, foe, hit }) {
  return (
    <div className={`qz-hp${foe ? ' foe' : ''}${hit ? ' hit' : ''}`}>
      <div className="qz-hp-ghost" style={{ width: `${Math.max(0, ghost)}%` }} />
      <div className={`qz-hp-fill${pct <= 40 ? ' low' : ''}`} style={{ width: `${Math.max(0, pct)}%` }} />
    </div>
  )
}

function Board({ mode, highlight }) {
  const list = (loadBoards()[mode] || []).slice(0, 6)
  if (!list.length) return <div className="note">還沒有紀錄，來開第一局。</div>
  return (
    <div className="qz-board">
      {list.map((r, i) => {
        const me = highlight && r.at && r.at === highlight.at
        return (
          <div key={`${r.at || r.name}-${i}`} className={`qz-row${me ? ' me' : ''}`}>
            <span className="rk">{i + 1}</span>
            <span className="nm">{r.name}</span>
            <span className="sc">{r.score}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function QuizGame() {
  const { user, setToast, setStamp } = useNav()
  const [phase, setPhase] = useState('start')       // start | play | end
  const [name, setName] = useState(user?.name || '')
  const [boardTab, setBoardTab] = useState('solo')
  const [, force] = useState(0)
  const rerender = useCallback(() => force(n => n + 1), [])

  const G = useRef(null)                            // 遊戲狀態（可變，不進 render 迴圈）
  const timers = useRef({ tick: null, foe: null, next: null, log: null, poll: null, ghost: [] })
  const [ghost, setGhost] = useState({ me: 100, foe: 100 })
  const [hit, setHit] = useState({ me: false, foe: false })
  const [log, setLog] = useState(null)              // 對手動態
  const [result, setResult] = useState(null)
  const [lastEntry, setLastEntry] = useState(null)
  const [lastMode, setLastMode] = useState('solo')
  const [float, setFloat] = useState(null)          // 飄字
  // ★ 真人對戰的狀態。ref 給計時器讀（不受閉包影響），state 給畫面用。
  const pvp = useRef(null)
  const [pvpState, setPvp] = useState(null)
  const [queuedAt, setQueuedAt] = useState(0)
  const [queueErr, setQueueErr] = useState(null)
  const [waited, setWaited] = useState(0)

  // ⚠️ 卸載時把所有計時器清掉（返回鍵會卸載這個畫面）
  const clearAll = useCallback(() => {
    const t = timers.current
    clearInterval(t.tick); clearTimeout(t.foe); clearTimeout(t.next); clearTimeout(t.log); clearTimeout(t.poll)
    t.ghost.forEach(clearTimeout); t.ghost = []
    t.tick = t.foe = t.next = t.log = t.poll = null
  }, [])
  useEffect(() => clearAll, [clearAll])

  // ★★ 使用者按返回離開這個畫面時，順手告訴伺服器一聲，對手才不用空等 25 秒
  //    才被判離線。⚠️ 卸載時 fetch 會被取消，所以用 sendBeacon（它是為這件事設計的）。
  //    ⚠️ 這只是**加速**：真正的保底是伺服器端的離線判定，beacon 送不到也不會壞。
  useEffect(() => () => {
    const st = pvp.current
    if (!st) return
    try {
      const body = new Blob([JSON.stringify({ id: st.id, key: st.key })], { type: 'application/json' })
      navigator.sendBeacon?.('/api/quiz/leave', body)
    } catch { /* 送不出去就交給伺服器的離線判定 */ }
  }, [])

  /* 血條殘影：本體立刻退，殘影 0.3s 後才跟上 */
  const bleed = (who, to) => {
    setHit(h => ({ ...h, [who]: true }))
    timers.current.ghost.push(setTimeout(() => setHit(h => ({ ...h, [who]: false })), 400))
    timers.current.ghost.push(setTimeout(() => setGhost(g => ({ ...g, [who]: to })), 300))
  }
  const heal = (who, to) => setGhost(g => ({ ...g, [who]: to }))

  const flash = (text, tone) => {
    setFloat({ text, tone, id: Date.now() })
    timers.current.ghost.push(setTimeout(() => setFloat(null), 950))
  }

  const showLog = (text, kind) => {
    setLog({ text, kind })
    clearTimeout(timers.current.log)
    timers.current.log = setTimeout(() => setLog(null), 2400)
  }

  /* ---------------- 開局 ---------------- */
  //
  // ★★★ mode 有三種：
  //   solo —— 闖關生存（單人計時）
  //   pvp  —— **真人對戰**：先排隊配對，狀態由伺服器判定
  //   bot  —— 練習對手（模擬）。⚠️ 它必須**明確標示成模擬**，
  //           絕不可以在配不到真人時偷偷拿它冒充人類。
  const start = (mode, pvpState) => {
    const who = (name || '').trim().slice(0, 8) || user?.name || '訪客'
    // ★ 對戰用**種子牌**：兩邊必須拿到同一副牌、同樣的選項順序，
    //   各洗各的就不是同一場比賽了。
    const deck = mode === 'pvp' ? seededDeck(pvpState.seed) : shuffle(QUESTIONS)
    G.current = {
      // ⚠️ 對戰的名字以**伺服器**為準：本地 state 可能還沒更新，
      //    那會變成「我看到自己叫訪客、對手看到我叫阿明」，兩邊對不起來。
      mode, name: mode === 'pvp' ? (pvpState.me?.name || who) : who,
      deck, i: mode === 'pvp' ? (pvpState.me?.done || 0) : 0,
      score: mode === 'pvp' ? (pvpState.me?.score || 0) : 0,
      combo: 0, right: 0, wrong: 0,
      hp: mode === 'pvp' ? pvpState.me.hp : RULES.HP_MAX,
      timeLeft: RULES.TOTAL_TIME,
      foe: mode === 'bot' ? makeFoe() : (mode === 'pvp' ? { name: pvpState.foe.name, hp: pvpState.foe.hp } : null),
      foeAnswered: 0, foeRight: 0,
      locked: false, qStart: Date.now(), current: null, picked: -1,
    }
    G.current.current = mode === 'pvp' ? deck[G.current.i] : dealt(deck[0])
    setGhost({ me: G.current.hp, foe: G.current.foe ? G.current.foe.hp : 100 })
    setLog(null); setResult(null); setFloat(null)
    setLastMode(mode)
    setPhase('play')

    if (mode === 'solo') {
      timers.current.tick = setInterval(() => {
        const g = G.current
        if (!g) return
        g.timeLeft--
        if (g.timeLeft <= 0) finish('時間到')
        else rerender()
      }, 1000)
    } else if (mode === 'bot') {
      foeLoop()
    }
    // pvp 的節奏由 pollLoop() 帶（在 queue 階段就已經開始輪詢）
  }

  /* ---------------- 真人對戰：排隊、輪詢 ---------------- */
  //
  // ★★★ 為什麼是輪詢不是 WebSocket：Cloud Run 會水平擴展，WebSocket 連線綁在
  //   單一實例上，跨實例還是得靠 DB；而這個遊戲每人每分鐘只有幾個動作，
  //   1.2 秒一次的輪詢完全夠用，也不必多一個相依。
  // ⚠️ 輪詢一定要能停：這個畫面 push 進堆疊，使用者按返回就卸載。
  const pollLoop = useCallback(() => {
    const st = pvp.current
    if (!st) return
    timers.current.poll = setTimeout(async () => {
      const cur = pvp.current
      if (!cur) return
      try {
        const r = await api.quizPoll(cur.id, cur.key)
        pvp.current = { ...cur, ...r }
        setPvp(pvp.current)

        // 配到人了 → 開局（只做一次）
        if (r.status === 'playing' && !G.current) start('pvp', pvp.current)

        // ★ 血量以**伺服器**為準：本地只負責顯示。
        const g = G.current
        if (g && g.mode === 'pvp' && r.foe) {
          if (g.foe.hp !== r.foe.hp) { g.foe.hp = r.foe.hp; bleed('foe', Math.max(0, r.foe.hp)) }
          if (g.hp !== r.me.hp) {
            const drop = r.me.hp < g.hp
            g.hp = r.me.hp
            if (drop) { bleed('me', Math.max(0, r.me.hp)); showLog(`${r.foe.name} 出手了`, 'bad') }
          }
          g.foe.name = r.foe.name
          rerender()
        }

        if (r.status === 'done') { finishPvp(r); return }
      } catch { /* 一次失敗不中斷，下一輪再試 */ }
      pollLoop()
    }, 1200)
  }, [])

  /** 排隊配對。⚠️ 配不到人時**不可以**偷偷換成模擬對手——那是騙人。 */
  const queueUp = async () => {
    const who = (name || '').trim().slice(0, 8) || user?.name || '訪客'
    setQueueErr(null)
    setPhase('queue')
    setQueuedAt(Date.now())
    try {
      const r = await api.quizQueue(who)
      pvp.current = r
      setPvp(r)
      if (r.status === 'playing') start('pvp', r)
      pollLoop()
    } catch (e) {
      setQueueErr(e?.message || '連不上配對伺服器')
      setPhase('start')
    }
  }

  /** 離開排隊或認輸。 */
  const leavePvp = async (backToStart) => {
    const st = pvp.current
    pvp.current = null
    setPvp(null)
    clearTimeout(timers.current.poll)
    if (st) { try { await api.quizLeave({ id: st.id, key: st.key }) } catch { /* best effort */ } }
    if (backToStart) { G.current = null; setPhase('start') }
  }

  /** 對戰收局：勝負由伺服器判定，前端不自己算。 */
  const finishPvp = (r) => {
    const g = G.current
    clearAll()
    pvp.current = null
    setPvp(null)
    G.current = null
    const right = g ? g.right : 0
    const wrong = g ? g.wrong : 0
    const total = right + wrong
    const score = r.me?.score || 0
    setLastEntry(pushScore(g ? g.name : '訪客', score, 'pvp'))
    setBoardTab('pvp')
    setResult({
      mode: 'pvp',
      title: r.won ? '勝' : '敗',
      // ★★★ 收局原因是**中性代碼**，句子由自己的勝負轉——同一個字串給兩個立場看，
      //   帶立場就一定有一邊是錯的（實測踩過：贏的那一方看到「戰報：你倒下了」）。
      note: `${QZ_REASON[r.overReason]?.[r.won ? 'win' : 'lose'] || '對戰結束'}。`
        + (r.foe ? `對手 ${r.foe.name} 剩 ${Math.max(0, r.foe.hp)} 點血，你剩 ${Math.max(0, r.me.hp)} 點。` : ''),
      score, right, wrong,
      acc: total ? Math.round((right / total) * 100) : 0,
      ok: !!r.won,
    })
    setPhase('end')
    // ★ 站上的招牌動作：成功＝蓋一枚印（註冊／發佈／下單／掃描辨識都用它）。
    //   贏一場真人對戰是這條動線的「成了！」時刻，沒有理由不用同一個語彙。
    if (r.won) setStamp('勝')
  }

  /* 對手跑自己的節奏，不中斷你手上這一題 */
  const foeLoop = () => {
    const g = G.current
    if (!g || g.mode !== 'bot') return
    timers.current.foe = setTimeout(() => {
      const gg = G.current
      if (!gg || gg.mode !== 'bot') return
      gg.foeAnswered++
      if (Math.random() < gg.foe.accuracy) {
        const dmg = 9 + Math.floor(Math.random() * 9)
        gg.hp -= dmg; gg.foeRight++
        bleed('me', Math.max(0, gg.hp))
        showLog(`對手答對第 ${gg.foeAnswered} 題，你 −${dmg}`, 'bad')
        flash(`−${dmg}`, 'ji')
      } else {
        gg.foe.hp -= RULES.FOE_MISS_DMG
        bleed('foe', Math.max(0, gg.foe.hp))
        showLog(`對手答錯第 ${gg.foeAnswered} 題，自傷 −${RULES.FOE_MISS_DMG}`, 'good')
      }
      rerender()
      if (gg.hp <= 0) return finish('你倒下了')
      if (gg.foe.hp <= 0) return finish('擊倒對手')
      foeLoop()
    }, g.foe.speed() * 1000)
  }

  /* ---------------- 作答 ---------------- */
  /** 真人對戰的作答：送給伺服器判定，回來的狀態就是唯一真相。 */
  const answerPvp = async (idx) => {
    const g = G.current
    const st = pvp.current
    if (!g || !st) return
    const used = (Date.now() - g.qStart) / 1000
    g.locked = true
    g.picked = idx
    rerender()
    try {
      const r = await api.quizAnswer({ id: st.id, key: st.key, qi: g.i, pick: idx, used })
      pvp.current = { ...st, ...r }
      setPvp(pvp.current)

      const correct = !!r.correct
      if (correct) { g.right++; g.combo++ } else { g.wrong++; g.combo = 0 }
      g.score = r.me?.score ?? g.score
      // 血量以伺服器為準
      if (r.me) { const drop = r.me.hp < g.hp; g.hp = r.me.hp; if (drop) bleed('me', Math.max(0, r.me.hp)) }
      if (r.foe) { const drop = r.foe.hp < g.foe.hp; g.foe.hp = r.foe.hp; if (drop) bleed('foe', Math.max(0, r.foe.hp)) }
      flash(correct ? `−${r.dmg}` : `−${RULES.DUEL_SELF_DMG}`, correct ? 'yi' : 'ji')
      g.verdict = correct
        ? { ok: true, head: '答對，出手', detail: `對手受到 ${r.dmg} 點傷害，你回復 ${RULES.HEAL_ON_HIT} 點血。` }
        : { ok: false, head: '答錯', detail: `你受到 ${RULES.DUEL_SELF_DMG} 點傷害。` }
      g.i++
      rerender()

      if (r.status === 'done') { finishPvp(r); return }

      timers.current.next = setTimeout(() => {
        const gg = G.current
        if (!gg) return
        gg.current = gg.deck[gg.i % gg.deck.length]
        gg.locked = false; gg.picked = -1; gg.verdict = null; gg.qStart = Date.now()
        rerender()
      }, 1100)
    } catch (e) {
      // ⚠️ 送不出去就解鎖讓他重按，不可以卡在「已作答」——那會變成整局動不了
      g.locked = false; g.picked = -1
      showLog(e?.message || '連線不穩，再按一次', 'bad')
      rerender()
    }
  }

  const answer = (idx) => {
    const g = G.current
    if (!g || g.locked) return
    // ★★★ 真人對戰：對錯與傷害一律由**伺服器**判定，前端只送「第幾題、選了哪個」。
    //   ⚠️ 血量不可以在本地算完就顯示——兩邊各算各的會對不起來，
    //      而且等於把勝負交給客戶端說了算。
    if (g.mode === 'pvp') { answerPvp(idx); return }
    const used = (Date.now() - g.qStart) / 1000
    const correct = idx === g.current.ans
    const speed = Math.max(0, 1 - used / RULES.SPEED_REF)
    g.locked = true
    g.picked = idx

    if (correct) {
      g.right++; g.combo++
      const mult = 1 + Math.floor(g.combo / 3)
      const gain = Math.round((100 + speed * 120) * mult)
      g.score += gain
      if (g.mode !== 'solo') {
        const dmg = 10 + Math.round(speed * 14)
        g.foe.hp -= dmg
        g.hp = Math.min(RULES.HP_MAX, g.hp + RULES.HEAL_ON_HIT)
        bleed('foe', Math.max(0, g.foe.hp)); heal('me', g.hp)
        flash(`−${dmg}`, 'yi')
        g.verdict = { ok: true, head: '答對，出手', detail: `對手受到 ${dmg} 點傷害，你回復 ${RULES.HEAL_ON_HIT} 點血。` }
      } else {
        flash(`+${gain}`, 'yi')
        g.verdict = { ok: true, head: '答對', detail: `用時 ${used.toFixed(1)} 秒 · 連擊 ×${mult} · 得 ${gain} 分。` }
      }
    } else {
      g.wrong++; g.combo = 0
      const dmg = g.mode !== 'solo' ? RULES.DUEL_SELF_DMG : RULES.SOLO_DMG
      g.hp -= dmg
      bleed('me', Math.max(0, g.hp))
      flash(`−${dmg}`, 'ji')
      g.verdict = { ok: false, head: '答錯', detail: g.mode !== 'solo' ? `你受到 ${dmg} 點傷害。` : `扣 ${dmg} 點血，連擊歸零。` }
    }

    g.i++
    rerender()

    if (g.hp <= 0) return finish(g.mode !== 'solo' ? '你倒下了' : '血量歸零')
    if (g.foe && g.foe.hp <= 0) return finish('擊倒對手')

    // 對戰講節奏，生存給多一點閱讀時間
    timers.current.next = setTimeout(() => {
      const gg = G.current
      if (!gg) return
      if (gg.mode === 'solo' && gg.timeLeft <= 0) return finish('時間到')
      if (gg.i >= gg.deck.length) { gg.deck = gg.deck.concat(shuffle(QUESTIONS)) }
      gg.current = dealt(gg.deck[gg.i])
      gg.locked = false; gg.picked = -1; gg.verdict = null; gg.qStart = Date.now()
      rerender()
    }, g.mode !== 'solo' ? 1100 : 1600)
  }

  /* ---------------- 結算 ---------------- */
  const finish = (reason) => {
    const g = G.current
    if (!g) return
    clearAll()
    G.current = null

    const total = g.right + g.wrong
    const acc = total ? Math.round((g.right / total) * 100) : 0
    let score = g.score
    let title = reason
    let note

    if (g.mode !== 'solo') {
      const won = g.foe.hp <= 0 && g.hp > 0
      title = won ? '勝' : '敗'
      note = (won
        ? `你擊倒了 ${g.foe.name}，剩餘血量 ${Math.max(0, g.hp)} 點。`
        : `${g.foe.name} 撐到了最後，你剩 ${Math.max(0, g.hp)} 點血。`)
        + ` 同一時間對手作答 ${g.foeAnswered} 題、答對 ${g.foeRight} 題。`
      score = Math.round(score * (won ? 1.5 : 0.6))
    } else {
      note = reason === '時間到'
        ? `三分鐘跑完，共作答 ${total} 題，剩餘血量 ${Math.max(0, g.hp)} 點。`
        : `撐了 ${total} 題後血量歸零。答錯一題就是 ${RULES.SOLO_DMG} 點，穩比快重要。`
    }

    const entry = pushScore(g.name, score, g.mode)
    setLastEntry(entry)
    setBoardTab(g.mode)
    const survived = g.mode !== 'solo' ? title === '勝' : g.hp > 0
    setResult({ mode: g.mode, title, note, score, right: g.right, wrong: g.wrong, acc, ok: survived })
    // ★ 撐過三分鐘／擊倒對手都是「成功」，用站上的蓋印語彙。
    if (survived) setStamp(g.mode === 'solo' ? '撐住了' : '勝')
    setPhase('end')
  }

  /* 配對等待秒數。⚠️ 用 effect 綁 phase，離開配對就停。 */
  useEffect(() => {
    if (phase !== 'queue') return
    setWaited(0)
    const t = setInterval(() => setWaited(w => w + 1), 1000)   // waited 秒數計時
    return () => clearInterval(t)
  }, [phase])

  /* 鍵盤 1–4 作答 */
  useEffect(() => {
    if (phase !== 'play') return
    const h = (e) => {
      const n = '1234'.indexOf(e.key)
      if (n > -1) answer(n)
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [phase])

  const g = G.current

  return (
    <>
      <TopBar title="節氣知識王" onBack />
      <div className="body">

        {/* ================= 首頁 ================= */}
        {phase === 'start' && (
          <>
            <div className="calpage">
              <div className="hd">節氣知識王</div>
              <div className="gz"><div className="zi">見<small>真章</small></div></div>
              <div className="meta">
                <span className="term">三分鐘</span><br />
                答得快、答得準，積分才高。答錯要扣血，血歸零就收攤。<br />
                題目取自<b>二十四節氣</b>、干支曆法、擇日宜忌與歲時民俗。
              </div>
            </div>

            <div className="pad">
              <label htmlFor="qz-nick" className="qz-label">你的稱號</label>
              <input id="qz-nick" className="qz-input" type="text" maxLength={8} autoComplete="off"
                value={name} onChange={e => setName(e.target.value)}
                placeholder={user?.name || '訪客'} aria-label="你的稱號" />
            </div>

            <SectionHead title="選一個玩法" extra="兩種" />
            <button className="tool tap" onClick={() => start('solo')}>
              <div className="ti" style={{ background: 'var(--yi)', color: 'var(--on-yi)', fontFamily: 'var(--serif)', fontWeight: 800 }}>獨</div>
              <div className="tn2">
                <b>闖關生存</b>
                <span>三分鐘總時限，一百點血。單題不倒數，答錯扣血，連對有倍率加成。</span>
              </div>
              <Icon name="chev" />
            </button>
            <button className="tool tap" onClick={queueUp}>
              <div className="ti" style={{ background: 'var(--ji)', color: 'var(--on-ji)', fontFamily: 'var(--serif)', fontWeight: 800 }}>鬥</div>
              <div className="tn2">
                <b>兩人對戰</b>
                <span>跟線上的真人配對。各答各的，答對出手扣血，先倒下的人輸。</span>
              </div>
              <Icon name="chev" />
            </button>
            {/* ★★★ 練習對手是**模擬**的，必須講明白。
                配不到真人時偷偷換成機器人、還讓人以為在跟人打，是騙人——
                寧可讓他自己選。 */}
            <button className="tool tap" onClick={() => start('bot')}>
              <div className="ti" style={{ background: 'var(--field)', color: 'var(--muted)', fontFamily: 'var(--serif)', fontWeight: 800 }}>練</div>
              <div className="tn2">
                <b>練習對手</b>
                <span>電腦模擬的對手，不用等人。想先熟悉節奏再去對戰就選這個。</span>
              </div>
              <Icon name="chev" />
            </button>

            <SectionHead title="積分榜" extra="前六名" />
            <div className="chips">
              <button className={`chip${boardTab === 'solo' ? ' on' : ''}`} onClick={() => setBoardTab('solo')}>闖關生存</button>
              <button className={`chip${boardTab === 'pvp' ? ' on' : ''}`} onClick={() => setBoardTab('pvp')}>兩人對戰</button>
            </div>
            <Board mode={boardTab} />

            <Disclaimer text={`對手為模擬對戰者，尚未連線真人。題庫共 ${QUESTIONS.length} 題，選項每局重新洗牌。`} />
            <div style={{ height: 16 }} />
          </>
        )}

        {/* ================= 配對中 ================= */}
        {/* ★★★ 等待狀態必須**看得出還在等**，而且要有出口。
            只寫一句「配對中」而沒有經過幾秒、也不能取消，使用者會分不出
            「還在排隊」與「壞掉了」——那是最讓人不信任的一種畫面。 */}
        {phase === 'queue' && (
          <>
            <div className="calpage">
              <div className="hd">配對中</div>
              <div className="gz"><div className="zi">等<small>對手</small></div></div>
              <div className="meta">
                <span className="term">已等 {waited} 秒</span><br />
                正在幫你找一位線上的真人對手。找到就直接開始，兩邊拿到的題目與選項順序完全一樣。
              </div>
            </div>
            <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="b" style={{ width: '100%' }} onClick={() => leavePvp(true)}>取消配對</button>
              {/* ⚠️ 這顆是給「現在沒人在線」的出口。它明講是模擬對手，
                     不會把機器人講成真人。 */}
              <button className="b" style={{ width: '100%' }}
                onClick={() => { leavePvp(false); start('bot') }}>改跟練習對手打（電腦模擬）</button>
            </div>
            <Disclaimer text="真人對戰需要另一位玩家同時在線。等太久的話，可以先跟練習對手打幾局熟悉節奏。" />
            <div style={{ height: 16 }} />
          </>
        )}

        {/* ================= 遊戲中 ================= */}
        {phase === 'play' && g && (
          <>
            <div className="calpage">
              <div className="hd">{g.mode !== 'solo' ? '兩人對戰' : '闖關生存'}</div>

              <div className="qz-hud">
                {g.mode === 'solo' ? (
                  <>
                    <div className="qz-stats">
                      <div><span className="qz-label">積分</span><span className="qz-val"><CountUp value={g.score} ms={420} /></span></div>
                      <div className="center"><span className="qz-label">連擊</span><span className="qz-val">×{1 + Math.floor(g.combo / 3)}</span></div>
                      <div style={{ textAlign: 'right' }}><span className="qz-label">剩餘</span><span className="qz-val">{fmtClock(g.timeLeft)}</span></div>
                    </div>
                    <HpBar pct={Math.max(0, g.hp)} ghost={ghost.me} hit={hit.me} />
                  </>
                ) : (
                  <div className="qz-duel">
                    <div>
                      <span className="qz-who"><b>{g.name}</b> {Math.max(0, g.hp)}</span>
                      <HpBar pct={Math.max(0, g.hp)} ghost={ghost.me} hit={hit.me} />
                    </div>
                    <span className="qz-vs">對</span>
                    <div>
                      <span className="qz-who" style={{ textAlign: 'right' }}><b>{g.foe.name}</b> {Math.max(0, g.foe.hp)}</span>
                      <HpBar pct={Math.max(0, g.foe.hp)} ghost={ghost.foe} hit={hit.foe} foe />
                    </div>
                  </div>
                )}

                {log && <div className={`qz-ticker ${log.kind}`}>{log.text}</div>}

                <div className="qz-qhead">
                  <span>第 {g.i + 1} 題</span>
                  <span className="qz-tag">{g.current.tag}</span>
                </div>
                <p className="qz-q">{g.current.q}</p>

                <div className="qz-opts">
                  {g.current.opts.map((t, idx) => {
                    const mark = g.locked
                      ? (idx === g.current.ans ? ' right' : (idx === g.picked ? ' wrong' : ''))
                      : ''
                    return (
                      <button key={idx} className={`qz-opt tap${mark}`} disabled={g.locked}
                        style={{ '--i': idx }} onClick={() => answer(idx)}>
                        <span className="qz-k">{KEYS[idx]}</span>
                        <span>{t}</span>
                      </button>
                    )
                  })}
                </div>

                <div className={`qz-verdict${g.verdict ? (g.verdict.ok ? ' good' : ' bad') : ''}`}>
                  <b>{g.verdict ? g.verdict.head : '作答中'}</b>
                  <span>{g.verdict ? `${g.verdict.detail} ${g.current.why}` : '沒有倒數，但越快答對積分越高'}</span>
                </div>
              </div>
            </div>

            <div className="pad">
              <button className="b" style={{ width: '100%' }} onClick={() => (g.mode === 'pvp' ? leavePvp(true) : finish('提前收工'))}>結束這局</button>
            </div>
            <div style={{ height: 16 }} />
          </>
        )}

        {/* ================= 結算 ================= */}
        {phase === 'end' && result && (
          <>
            <div className="calpage">
              <div className="hd">{result.mode !== 'solo' ? '戰果' : '結算'}</div>
              <div className="gz"><div className="zi">{result.title}</div></div>
              <div className="meta">
                <span className="term">{result.mode !== 'solo' ? '兩人對戰' : '闖關生存'}</span>
              </div>
              <div className="qz-big"><CountUp value={result.score} /><small>最終積分</small></div>
            </div>

            <div className={`qz-verdict ${result.ok ? 'good' : 'bad'}`} style={{ margin: '0 var(--space-4)' }}>
              <b>{result.mode !== 'solo' ? '戰報' : '總評'}</b><span>{result.note}</span>
            </div>

            <div className="yiji">
              <div className="gz">準確率 {result.acc}%</div>
              <div className="yj">
                <div><div className="yl" style={{ color: 'var(--yi)' }}>宜 · 答對</div><span className="qz-n">{result.right}</span> 題</div>
                <div><div className="yl" style={{ color: 'var(--ji)' }}>忌 · 答錯</div><span className="qz-n">{result.wrong}</span> 題</div>
              </div>
            </div>

            <SectionHead title="積分榜" extra="前六名" />
            <div className="chips">
              <button className={`chip${boardTab === 'solo' ? ' on' : ''}`} onClick={() => setBoardTab('solo')}>闖關生存</button>
              <button className={`chip${boardTab === 'pvp' ? ' on' : ''}`} onClick={() => setBoardTab('pvp')}>兩人對戰</button>
            </div>
            <Board mode={boardTab} highlight={boardTab === result.mode ? lastEntry : null} />

            <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn-primary tap" onClick={() => start(lastMode)}>再來一局</button>
              <button className="b" style={{ width: '100%' }} onClick={() => { setPhase('start'); setResult(null) }}>回到玩法選擇</button>
            </div>
            <div style={{ height: 16 }} />
          </>
        )}
      </div>

      {float && <div key={float.id} className={`qz-float ${float.tone}`}>{float.text}</div>}
    </>
  )
}
