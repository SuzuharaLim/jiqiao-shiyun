import { useCallback, useEffect, useRef, useState } from 'react'
import { speechSupported, speak } from '../lib/speak.js'
import { objectForHotspot } from '../data/arCards.js'
import { cardTimeContext, greetingFor } from '../data/cardTime.js'
import { earnBadge, hasBadge, BADGES } from '../lib/arBadges.js'
import { api } from '../api.js'

// ============================================================================
// 跟角色說話 —— `/ar/model/:slug` 的對話面板
//
// ★ 為什麼是「點選提問」不是「自由輸入 ＋ LLM」：
//   ① **法規**：讓語言模型扮演白菜開口，它兩三句之內就會說出「富含維生素 C、
//      膳食纖維」——那正是《食安法》規範、本站明令不可出現的內容
//      （`check-ar.mjs` 的 G 段），而**執行期的 AI 輸出沒有任何閘門擋得住**。
//      腳本化的答案每一句都可以在建置時被那道閘門掃過。
//   ② **訪客**：站上的訪客沒有 session，`/api/ai/chat` 一律 401。掃到卡片的人
//      多半是第一次來、還沒註冊——對他們來說「能不能講話」不該取決於有沒有帳號。
//   ③ **不編造**：答案逐字取自 `facts[].value`，來源照抄 `facts[].source`。
//      這一頁的每一句話都查得到出處，而 LLM 生成的句子查不到。
//   ⇒ 想問開放式問題的人，底下有一顆出口通往站上的 AI 時光顧問。
//
// ★ 這一版真正讓它「活起來」的是 `actor.setOverlay('talk')`：
//   那是 `actor.js` 早就寫好、但**在這之前沒有任何地方使用**的疊加通道
//   （CLAUDE.md：「setOverlay('talk') 走 additive 通道相加，既有 12 個動作
//   一行都不用改」）。說話時身體會跟著起伏，而且**與 base 動作並存**——
//   點頭時可以講話、揮手時也可以。
//
// ⚠️ 語音是**輔助不是替代**（同 SpeakButton 那條原則）：不支援語音合成的
//    瀏覽器一樣看得到全部的字，只是不會出聲。絕不可把文字藏在語音後面。
// ============================================================================

/** 單則輸入的字數上限（與後端的 AR_TALK_MAX_CHARS 一致）。 */
const MAX_CHARS = 500

/** 說話時的身體起伏。Web Speech API 拿不到音量，所以自己做一條包絡。 */
const ENVELOPE_MS = 90

/**
 * 回答前的一句招呼，讓它讀起來像在講話而不是在唸資料庫。
 *
 * ★★★ **只加語氣，不加事實**：招呼句一律是「我熟這個」「問對時候了」這類
 *   純語氣的話，後面接的答案仍然是逐字的 `fact.value`。
 *   ⚠️ 絕對不可以在這裡加任何關於白菜的敘述——那會變成沒有出處、也不會被
 *      建置期法規閘門（`check-ar.mjs` G 段）掃到的內容。這一層是「語氣」，
 *      不是「內容」，界線要一直守著。
 */
const WARMUP = {
  nod: ['這個我熟！', '問得好，', '嗯，這個我知道——'],
  think: ['讓我想想…', '嗯——'],
  happy: ['嘿嘿，問對時候了！', '這題我最愛講！'],
  wave: ['哈囉！', '嘿，'],
  shy: ['唔…', '這個嘛…'],
}
const warmupFor = (act) => {
  const pool = WARMUP[act] || WARMUP.nod
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 把一個物件的 facts 變成可以點的問題。
 *
 * ⚠️ **答案逐字用 `fact.value`，不改寫**。這裡新增的只有「問句的措辭」
 *    （`fact.ask`），沒有新增任何事實——改寫答案就會開始偏離出處。
 * ⚠️ 沒寫 `ask` 的 fact 用 `「◯◯呢？」` 兜底，這樣新增 fact 時不必同步改這裡。
 */
function asksFor(obj) {
  const out = []
  for (const f of obj?.facts ?? []) {
    if (!f?.label || !f?.value) continue
    out.push({
      q: f.ask || `${f.label}呢？`,
      a: f.value,
      source: f.source || null,
      act: f.act || 'nod',
    })
  }
  // 卡面的安全提醒也讓它說得出來——那是這張卡上最該被看見的一句
  if (obj?.warn) out.push({ q: '冬天有什麼要注意的？', a: obj.warn, act: 'think', urgent: true })
  return out
}

/**
 * 把使用者手打的字對到卡片上真的有的內容。
 *
 * ★ 這是「可以自由輸入」與「不可以編造」之間唯一誠實的接法：
 *   比對範圍是**這張卡自己的資料**（先找目前這個物件，再找同一張卡的其他熱區），
 *   命中就用該筆 `fact.value` 逐字回答、附上它的 source；查不到就明說查不到。
 *
 * ⚠️ **不可以在這裡接語言模型**（理由見檔頭）。查不到就查不到——
 *    「我不知道」是誠實的答案，掰一個看起來合理的句子不是。
 */
function findAnswer(text, card, currentObj) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const norm = (v) => String(v).toLowerCase().replace(/[\s，,。.？?！!、；;：:「」『』（）()]/g, '')
  const nq = norm(raw)
  if (!nq) return null

  const others = (card?.hotspots ?? []).map(objectForHotspot).filter(Boolean)
  const objs = [currentObj, ...others.filter(o => o && o !== currentObj)]

  for (const o of objs) {
    for (const f of o?.facts ?? []) {
      if (!f?.label || !f?.value) continue
      const label = norm(f.label)
      // ⚠️ 一個字的標籤不可拿來反向比對，否則「你」「的」之類的字會亂命中
      const hit = [f.ask, f.label, f.value].filter(Boolean).some(v => norm(v).includes(nq))
        || (label.length >= 2 && nq.includes(label))
      if (hit) return { a: f.value, source: f.source || null, act: f.act || 'nod', who: o }
    }
    if (o?.warn && /通風|一氧化碳|中毒|注意|安全|冬天|保暖/.test(raw)) {
      return { a: o.warn, source: null, act: 'think', who: o }
    }
  }
  return null
}

export default function ArTalk({ obj, card, actorRef, onQuiz, speaker, detailOpen, onDetail,
  objectId, onLayout, loggedIn }) {
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  // ★★★ `thinking` 與 `busy` **不是同一件事**，分開是必要的：
  //   `busy` 涵蓋「想 → 說完」整段（用來擋重複提問）；三個點只該出現在
  //   「想」那 480ms。共用一個旗標的話，答案會在**整段朗讀期間**被三個點蓋住
  //   ——一段 40 字的話要 7 秒才看得到字，而不支援語音合成的瀏覽器上
  //   `finish()` 立刻執行反而正常。這正好違反站上「語音是輔助不是替代，
  //   絕不可把文字藏在語音後面」那條原則，而且看起來只是「反應有點慢」。
  const [thinking, setThinking] = useState(false)
  const [draft, setDraft] = useState('')
  // ★★★ 小挑戰**在對話串裡**進行（2026-08-16 使用者指定）：題目由角色在泡泡裡
  //   問出來，選項暫時取代下面那一排 chip，答完再由角色回饋。
  //   ⚠️ 這一版把彈窗裡的 ArQuiz 從模型頁移除了——同一段動線不該有兩套出題 UI。
  //      `/ar/card/:slug`（沒有對話框的那一頁）仍然用 ArQuiz。
  //   ⚠️ 站上的題目**全部是複選**，所以不能做成「點一下就作答」，要能勾選再送出。
  const [qz, setQz] = useState(null)   // { picked: string[] }
  const logRef = useRef(null)
  const speechRef = useRef(null)
  const envRef = useRef(0)
  const timerRef = useRef(0)
  const guardRef = useRef(0)   // 語音看門狗，見 say()

  const asks = asksFor(obj)

  /** 停止說話並把角色收回待機。卸載、換物件、重新提問前都要走這裡。 */
  const hush = useCallback(() => {
    try { speechRef.current?.cancel() } catch { /* ignore */ }
    speechRef.current = null
    clearInterval(envRef.current); envRef.current = 0
    clearTimeout(timerRef.current); timerRef.current = 0
    clearTimeout(guardRef.current); guardRef.current = 0
    const a = actorRef?.current
    // ⚠️ 一定要把疊加通道關掉：留著的話角色會一直微微起伏，
    //    看起來像「還在講但沒有聲音」。
    try { a?.setOverlay(null) } catch { /* ignore */ }
    try { a?.setAction('present') } catch { /* ignore */ }
  }, [actorRef])

  // ⚠️ 換熱區（obj 變了）要把對話清掉並閉嘴——否則白菜會用臘八粥的身分
  //    繼續把上一段唸完，而畫面上的名字已經換人了。
  useEffect(() => {
    hush()
    // ★ 開場白要**把玩法講出來**（使用者剛從相機被送過來，畫面上是一隻會動的
    //   白菜、兩顆按鈕、一條輸入列，沒有任何前例可循）。
    //   ⚠️ 這句話是**介面說明不是事實陳述**，所以不需要出處。
    // ★★★★ 而且**語態要跟著今天走**：`obj.line`（「小寒前後正是我最甜的時候」）
    //   是現在式，只有真的在小寒那段時間才成立。8 月的台灣講這句話，
    //   使用者的第一反應是「這東西壞了」。三種語態見 `cardTime.js`。
    setThinking(false)
    setQz(null)
    setLog(obj ? [{ who: 'char', text: greetingFor(obj, cardTimeContext(card)), intro: true }] : [])
    setBusy(false)
  }, [obj, card, hush])

  // ⚠️ `speechSynthesis` 是全域單例、跨頁面存活：不在卸載時 cancel，
  //    使用者按上一頁離開之後聲音**還會繼續唸完**，而畫面上已經沒有東西能停它。
  useEffect(() => hush, [hush])

  // ★★★★ 泡泡的高度一變，就要請上層重新框景——`jq-fit` 的可見區是**量**出來的，
  //   不重量的話角色會停在舊的框景，而泡泡已經往下長到它頭上了。
  //   ⚠️ 要等這一輪 render 之後才量得到新高度，所以放在 effect 裡（不是事件裡）。
  useEffect(() => { onLayout?.() }, [log, thinking, onLayout])

  // 新訊息捲到底（只捲對話框自己，不動整頁）
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  const say = (item) => {
    if (busy) return
    // 招呼在這裡決定（一次），不是在 render 時決定——否則每次重繪都換一句
    item = { ...item, warm: item.warm ?? warmupFor(item.act) }
    setBusy(true); setThinking(true)
    hush()
    setLog(l => [...l, { who: 'me', text: item.q }])

    const a = actorRef?.current
    // 先「想一下」再回答：立刻吐出答案讀起來像查表，停頓半秒才像在對話
    try { a?.setAction('think') } catch { /* ignore */ }

    timerRef.current = setTimeout(() => {
      // ⚠️ 招呼與答案分成兩個欄位：畫面上招呼用較淡的樣式，而**答案本身仍逐字**。
      //    不可以把招呼字串黏進 `item.a` ——那會讓「答案是逐字的 fact.value」
      //    這件事在程式碼裡看不出來，日後很容易被人順手改掉。
      setLog(l => [...l, { who: 'char', text: item.a, source: item.source, warm: item.warm }])
      setThinking(false)   // ⚠️ 答案一進 log 就要停止三個點——字要與聲音同時出現
      try { a?.setAction(item.act || 'nod') } catch { /* ignore */ }

      let done = false
      const finish = () => {
        if (done) return
        done = true
        clearInterval(envRef.current); envRef.current = 0
        clearTimeout(guardRef.current); guardRef.current = 0
        try { a?.setOverlay(null) } catch { /* ignore */ }
        try { a?.setAction('present') } catch { /* ignore */ }
        setThinking(false)
        setBusy(false)
      }

      if (!speechSupported()) { finish(); return }

      // ★★★ 看門狗：**不可以把「能不能再提問」交給語音合成引擎**。
      //
      // ⚠️ `speak.js` 已經處理了「run() 拋例外」與「某一句 onerror」，但還有
      //    一種它接不到的失敗：`synth.speak()` **靜默地什麼都沒做**
      //    （部分 WebView、系統沒有中文語音、音訊被系統佔用時都會這樣）。
      //    那時 `onend` 與 `onerror` 都不會觸發 ⇒ `busy` 永遠是 true ⇒
      //    **每一顆提問 chip 都永久 disabled**，畫面看起來完全正常，
      //    使用者只會覺得「點了沒反應」。
      // ⚠️ 逾時就直接放行：字已經顯示在畫面上了，沒唸出來只是少了聲音，
      //    不該連帶把整個對話鎖死。這與站上「失效要退回可用狀態，不是卡在
      //    中間態」是同一條原則。
      // 中文語速約每秒 5~6 字；除以 4 再加 4 秒緩衝，寬到不會誤殺正常朗讀。
      guardRef.current = setTimeout(finish, (item.a.length / 4) * 1000 + 4000)

      speechRef.current = speak((item.warm ? item.warm + '　' : '') + item.a, {
        onState: (s) => {
          if (s === 'speaking') {
            // ★ 這一行就是「看起來在講話」的全部：疊加通道與 base 動作相加，
            //   所以點頭／思考的姿勢會保留，身體只是多了說話的起伏。
            try { a?.setOverlay('talk', 0.6) } catch { /* ignore */ }
            clearInterval(envRef.current)
            // Web Speech API 不給音量，用一條有隨機感的包絡假裝語氣起伏。
            // ⚠️ 不要用固定值：等幅起伏看起來像機器在震動不像人在講話。
            envRef.current = setInterval(() => {
              const t = performance.now() / 1000
              const lv = 0.35 + 0.45 * Math.abs(Math.sin(t * 7.3)) + 0.2 * Math.random()
              try { a?.setOverlayLevel(Math.min(1, lv)) } catch { /* ignore */ }
            }, ENVELOPE_MS)
          } else finish()
        },
      })
    }, 480)
  }

  /**
   * 跟角色聊天。**AI 是主聲道，卡片資料是它查得到的資料**（2026-08-11 使用者指定）。
   *
   * ★ 先前的設計是反過來的：卡上有的由 `findAnswer` 逐字回答、沒有的才問 AI。
   *   那樣讀起來像查詢機——問一句答一句、句句附出處、不會寒暄也接不了上一句。
   *   現在整張卡的資料都放進伺服器端的系統提示（`AR_PERSONAS`），由模型自己去
   *   引用，並被要求「數字、品種名、地名、日期一律照抄並附出處」。
   *   ⇒ `findAnswer` 退居**降級路徑**：沒有 AI（訪客未登入）或 AI 失敗時才用。
   *
   * ⚠️⚠️ **法規**：模型扮演一顆白菜時，兩三句內就會自己講到維生素——那受
   *    《食品安全衛生管理法》規範。建置期的閘門（check-ar.mjs G 段）**掃不到
   *    執行期的 AI 輸出**，所以守門做在**伺服器**（`HEALTH_RE`，攔到整段換掉）。
   *    這裡不做第二套判斷，避免兩份規則分岔——但也因此**不可以繞過後端直接
   *    呼叫模型**。
   * ⚠️ AI 的回答**沒有逐字保證**，所以泡泡上要標記，不可與卡面原文混為一談。
   * ★★★ **訪客也走這條**：走 `/api/ar/talk`（不需登入，只吃白名單 persona，
   *    有 IP 與每日總量上限）。掃到卡片的人多半還沒註冊，先前那句罐頭
   *    「這張卡上沒有寫到」正是他們**唯一**會看到的回答——模型從頭到尾沒被叫用過。
   * ⚠️ `findAnswer` 只在**這一條也失敗**時接手（網路斷線、額度用完、未設金鑰）。
   */
  const askAi = async (q) => {
    setBusy(true); setThinking(true)
    hush()
    setLog(l => [...l, { who: 'me', text: q }])
    const a = actorRef?.current
    try { a?.setAction('think') } catch { /* ignore */ }

    // 帶上前幾輪，追問才接得起來（像一般的對話而不是一問一答的查詢機）
    const hist = log.filter(m => m.who === 'me' || m.who === 'char').slice(-6)
      .map(m => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text }))

    let got = ''
    let meta = null       // JSON 短路分支（婉拒／危機／未設金鑰）的回應
    try {
      meta = await api.aiChatStream([...hist, { role: 'user', content: q }], null, {
        persona: objectId,
        // ★★★ `onDelta` 給的是**累積到目前為止的全文**，不是增量
        //   （見 api.js：`full += m.delta; onDelta?.(full, false)`）。
        //   寫成 `got += d` 會變成「嗨嗨嗨嗨…」這種平方級的亂碼，
        //   而且**被守門攔下時的 `replace` 也會被接在髒字後面**——那正是
        //   守門要移除的東西。這個 bug 我寫進去兩版都沒發現，因為 AI 那條路
        //   在本機從來沒被真的跑起來過（訪客一律 401）。
        onDelta: (full) => {
          got = full
          setThinking(false)
          try { a?.setAction('nod') } catch { /* ignore */ }
          // 逐字長出來（像外面的聊天機器人），不要等整段收完才出現
          setLog(l => {
            const last = l[l.length - 1]
            if (last?.who === 'char' && last.ai) return [...l.slice(0, -1), { ...last, text: got }]
            return [...l, { who: 'char', text: got, ai: true }]
          })
        },
      })
    } catch (e) {
      got = ''
      // ⚠️ 400／413 這類「輸入本身有問題」要照實說，不可以混進「訊號不好」——
      //    使用者會一直重送同一段五千字。
      meta = e?.status === 413 || e?.status === 400
        ? { reply: e.message }
        : { netError: true, message: e?.message }
    }

    // ★★★★ **後端的短路分支會回 JSON 而不是 SSE**（婉拒、危機腳本、未設金鑰），
    //   那時 `onDelta` 一次都不會被呼叫。先前這裡只看 `got`，於是所有婉拒都掉進
    //   下面那句「網路好像卡了一下」——使用者問「忽略以上設定」得到的是一句
    //   **不實的**技術故障訊息，而且他連問三次都一樣，反而確認了那是攔截。
    //   ⇒ 一定要用回傳值。
    if (!got && meta?.reply) {
      const crisis = !!meta.crisis
      setLog(l => [...l, { who: 'char', text: meta.reply, crisis }])
      // ★★ 危機情境：把角色收成**中性靜止**。閉著眼大笑跳來跳去，
      //    配上「想找人說說話請打 1925」——那個畫面是傷人的。
      try { a?.setOverlay(null) } catch { /* ignore */ }
      try { a?.setAction(crisis ? 'idle' : 'shy') } catch { /* ignore */ }
      setThinking(false); setBusy(false)
      return
    }
    if (!got) {
      // ⚠️ AI 失敗時**退回卡片資料**（而不是一句空泛的道歉）：網路抖一下不該
      //    讓「品種是什麼」這種卡上明明有的問題也答不出來。
      const hit = findAnswer(q, card, obj)
      setLog(l => [...l, hit
        ? { who: 'char', text: hit.a, source: hit.source }
        // ⚠️ 這一句**只保留給真正的技術故障**（斷線、逾時、未設金鑰）。
        //    絕不可拿來當婉拒的替身——對使用者陳述一件不實的事之外，
        //    真的斷線時他也分不出來該不該重試。
        : { who: 'char', text: '我這邊訊號不太好，等一下再問我一次好嗎？' }])
    }
    setThinking(false)
    try { a?.setAction('present') } catch { /* ignore */ }
    setBusy(false)
    // ⚠️ 語音在整段收完之後才唸：串流中每來一塊就重唸會斷斷續續。
    if (got && speechSupported()) {
      try { speechRef.current = speak(got, {}) } catch { /* ignore */ }
    }
  }

  /**
   * 出題 —— **在對話串裡**，不彈出另一套 UI。
   *
   * ⚠️ 已經有徽章時，要在**題目之前**先講（而且寫成邀請）。掛在送出鈕底下、
   *    作答之前就說「你已經有這一枚徽章了」，讀起來像「你做這題也沒用」。
   */
  const askQuiz = () => {
    if (busy || !obj?.quiz) return
    const owned = obj.quiz.badge ? hasBadge(obj.quiz.badge) : false
    setLog(l => [...l,
      { who: 'me', text: '考考我' },
      { who: 'char', text: (owned ? '這枚徽章你已經有了，再玩一次也行——\n' : '好啊，聽好囉——\n') + obj.quiz.question },
    ])
    setQz({ picked: [] })
    try { actorRef?.current?.setAction('happy') } catch { /* ignore */ }
    if (speechSupported()) { try { speechRef.current = speak(obj.quiz.question, {}) } catch { /* ignore */ } }
  }

  const togglePick = (k) => setQz(q => (q
    ? { picked: q.picked.includes(k) ? q.picked.filter(x => x !== k) : [...q.picked, k] }
    : q))

  /** 作答。⚠️ 答錯不扣分、不鎖、不記次數（與卡片頁同一個原則）。 */
  const answerQuiz = () => {
    const quiz = obj?.quiz
    if (!quiz || !qz?.picked.length) return
    const right = quiz.options.filter(o => o.correct).map(o => o.key).sort().join(',')
    const ok = [...qz.picked].sort().join(',') === right
    const names = quiz.options.filter(o => o.correct).map(o => o.label).join('、')
    let fresh = false
    if (ok && quiz.badge) fresh = earnBadge(quiz.badge, { loggedIn })
    const badgeName = quiz.badge ? (BADGES?.[quiz.badge]?.name || quiz.badge) : ''
    const lines = [
      ok ? '答對了！' : `還差一點——正解是${names}。`,
      quiz.note || '',
      // ★★ 徽章狀態在**作答之後**才是重點
      ok && fresh && badgeName ? `你拿到徽章：${badgeName}` : '',
    ].filter(Boolean)
    setLog(l => [...l,
      // ⚠️ 這一行是**作答**不是提問，標籤要跟著換（「你問：彰化、雲林」讀起來很怪）
      { who: 'me', text: quiz.options.filter(o => qz.picked.includes(o.key)).map(o => o.label).join('、'), answer: true },
      { who: 'char', text: lines.join('\n') },
    ])
    setQz(null)
    try { actorRef?.current?.setAction(ok ? 'happy' : 'shy') } catch { /* ignore */ }
    if (speechSupported()) { try { speechRef.current = speak(lines.join('。'), {}) } catch { /* ignore */ } }
  }

  /** 使用者手打的問題。 */
  const submit = (e) => {
    e.preventDefault()
    const t = draft.trim()
    // ⚠️ 只有空白時也要把欄位清掉：不清的話 placeholder 不會回來，
    //    使用者看到一個空的、沒有提示字的框，會以為壞了。
    if (!t) { setDraft(''); return }
    if (busy) return
    setDraft('')
    // ★★★ AI 是主聲道（見 askAi 的註解）：整張卡的資料都在它的系統提示裡，
    //   所以「品種是什麼」它也答得出來，而且是用聊天的語氣、接得上上一句。
    // ★★★ 訪客也走 AI（`/api/ar/talk` 不需登入）——掃到卡片的人多半還沒註冊，
    //   而先前那句罐頭「這張卡上沒有寫到」正是他們**唯一**會看到的回答。
    if (objectId) { askAi(t); return }

    // ── 以下是**降級路徑**：沒有 AI 可用（訪客沒有 session ⇒ 一律 401）──
    const hit = findAnswer(t, card, obj)
    if (hit) {
      // 卡片資料逐字回答（附出處）
      say({ q: t, a: hit.a, source: hit.source, act: hit.act })
      return
    }
    // ★★★ 沒有 AI 可用（訪客沒有 session）時就**明說查不到**，不可以掰。
    //   同時把「我知道什麼」列出來——只說「不知道」等於把人丟在原地。
    const known = asks.slice(0, 3).map(a => a.q).join('　')
    say({
      q: t,
      a: `這張卡上沒有寫到這個，我只認得卡片上的內容。你可以問我：${known}`,
      act: 'shy',
      noSpeakSource: true,
    })
  }

  if (!obj) return null

  // 泡泡裡放**最新一句角色的話**；先前的往來收在上面那個可捲的小紀錄裡。
  const latest = [...log].reverse().find(m => m.who === 'char')
  const lastMe = [...log].reverse().find(m => m.who === 'me') ?? null
  const lastAsked = lastMe?.text ?? null

  // ★★★ 說話的人**永遠是卡片的主角**（這張卡只有結球白菜有 3D 模型），
  //   上下滑動換的是「在講哪個主題」不是「換一隻角色」。所以問句的稱謂要用
  //   `speaker`——用 `obj.name` 會變成「問問小寒 · 身體保健…」。
  const who = speaker || obj.name

  return (
    <>
      {/* ★★★ 對話泡泡在角色**上方偏右**（使用者指定），尖端朝**下**指向它。
          ⚠️ 它是絕對定位疊在場景上緣，**不在**底下那個控制面板裡——
             所以 `jq-fit` 的可見區不再貼著畫布頂端，一定要連 `offset` 一起量，
             否則角色會被往上頂、臉正好躲進泡泡後面。
          ⚠️ **不顯示對話紀錄**：先前做過可捲的歷史區，它會把輸入列往下推
             （實測問四題後輸入列跑到 top 984 而視窗只有 889）。 */}
      <div className="artalk-say">
        {lastAsked && <p className="artalk-asked">{lastMe?.answer ? '你答' : '你問'}：{lastAsked}</p>}
        <div className="artalk-bubble">
          {/* ⚠️ 限高與捲動在**內層**：尖角是外層的 ::after 且伸出框外，
              外層一有 overflow 就會把它裁掉（症狀是泡泡變成一塊圓角方塊）。 */}
          <div className="artalk-bubble-in" aria-live="polite" aria-label={`${who}說`}>
            {thinking
              ? <span className="artalk-typing"><span /><span /><span /></span>
              : <>{latest?.warm && <em className="artalk-warm">{latest.warm}</em>}{latest?.text}
                {latest?.source && <i className="muted">（{latest.source}）</i>}</>}
          </div>
          {/* ★★★ 免責標註要釘在泡泡**底部、捲動區之外**。
              先前它跟內文一起放在可捲的區塊裡，長一點的回答就把它捲出可視範圍
              ——看不到的免責標註等於沒有。
              ⚠️ AI 的回答沒有出處，一定要與卡面資料在視覺上分開：這一頁的信任
                 基礎是「每一句都查得到出處」，混在一起就毀了。 */}
          {!thinking && latest?.ai && (
            <i className="muted artalk-aitag">AI 生成 · 非卡片原文</i>
          )}
        </div>
      </div>

      <div className="artalk">
        {/* ★★★ 選項只留**兩顆**（使用者要求）。
            原本 6 顆排成 3 列，光那一塊就佔掉畫布 ~136px——而這一頁的每一格
            高度都會直接換算成角色變小（`jq-fit` 按可見區算距離）。
            ⚠️ 砍掉的四顆不可以就這樣消失，各自要有著落：
              · 三顆提問  → 打字問（`findAnswer` 本來就搜整張卡），
                            開場白已經舉了例子告訴使用者可以問什麼。
              · 做個動作  → **點角色本人**（`onPoke`），比按鈕自然。
              · 看詳細資料 → 留在這裡（它是彈窗唯一的入口，而彈窗裡有小挑戰、
                            完整資料與「再掃一次」）。
            ⚠️ 縮小的是視覺重量不是可點範圍：min-height 仍守著 WCAG 2.5.8。 */}
        {/* ★★★ 作答中：這一排 chip **暫時變成選項**（使用者指定）。
            ⚠️ 站上的題目全部是**複選**，所以不能做成「點一下就作答」——
               要能勾選（`aria-pressed`）再送出。
            ⚠️ 答錯不扣分、不鎖、不記次數；**送出後才標對錯**，作答中就標紅
               等於直接給答案（與 `/ar/card/:slug` 同一個原則）。 */}
        {qz ? (
          <div className="artalk-grid artalk-grid-quiz">
            {obj.quiz.options.map(o => (
              <button key={o.key} type="button"
                className={`artalk-opt tap${qz.picked.includes(o.key) ? ' on' : ''}`}
                aria-pressed={qz.picked.includes(o.key)}
                onClick={() => togglePick(o.key)}>
                {o.label}
              </button>
            ))}
            <button type="button" className="artalk-opt tap artalk-opt-send"
              disabled={!qz.picked.length} onClick={answerQuiz}>
              送出答案
            </button>
            <button type="button" className="artalk-opt tap" onClick={() => setQz(null)}>
              先不答
            </button>
          </div>
        ) : (
          <div className="artalk-grid">
            {obj.quiz && (
              <button className="artalk-opt tap" disabled={busy} onClick={askQuiz}>
                考考我
              </button>
            )}
            {onDetail && (
              <button className="artalk-opt tap" type="button"
                aria-expanded={!!detailOpen} aria-controls="armodel-card"
                onClick={onDetail}>
                {detailOpen ? '收起詳細資料' : '看詳細資料'}
              </button>
            )}
          </div>
        )}

        {/* ★ 手動輸入。
            ⚠️ 這裡**不接語言模型**（理由見檔頭）：先在這張卡自己的資料裡找，
               找不到就誠實說找不到並列出它知道什麼。 */}
        <form className="artalk-form" onSubmit={submit}>
          <input
            className="artalk-input" type="text" value={draft} disabled={busy}
            // ⚠️ 這只是**即時提示**，不是防線——前端可以被繞過，
            //    真正擋成本的是後端的 413（見 server 的 AR_TALK_MAX_CHARS）。
            maxLength={MAX_CHARS}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`問問${who}…`}
            aria-label={`輸入想問${who}的問題`}
            enterKeyHint="send" autoComplete="off"
          />
          <button className="btn-primary tap artalk-send" type="submit" disabled={busy || !draft.trim()}>
            發送
          </button>
          {/* 快到上限才顯示，平常不佔版面也不干擾 */}
          {draft.length > MAX_CHARS * 0.8 && (
            <span className="artalk-count" aria-live="polite">{draft.length}/{MAX_CHARS}</span>
          )}
        </form>

      </div>
    </>
  )
}
