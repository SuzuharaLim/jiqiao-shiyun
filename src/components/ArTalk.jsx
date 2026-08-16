import { useCallback, useEffect, useRef, useState } from 'react'
import { speechSupported, speak } from '../lib/speak.js'
import { objectForHotspot } from '../data/arCards.js'
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
  objectId, aiReady }) {
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
    // ★ 開場白要**把玩法講出來**（參考圖的第一句就是「請選擇一個選項或直接輸入」）。
    //   這一頁沒有任何前例可循——使用者剛從相機掃到卡片被送過來，畫面上是一隻
    //   會動的白菜、四顆看起來像標籤的按鈕、一條輸入列。不講的話多數人只會看著它自轉。
    //   ⚠️ 這句話是**介面說明不是事實陳述**，所以不需要出處；也不可以寫成
    //      「我什麼都可以回答」——它只認得這張卡上的內容。
    setThinking(false)
    setLog(obj
      ? [{ who: 'char', text: `${obj.line || `我是${obj.name}。`}\n想知道什麼？打字問我，例如「品種」「產地」；點我一下我會動。`, intro: true }]
      : [])
    setBusy(false)
  }, [obj, hush])

  // ⚠️ `speechSynthesis` 是全域單例、跨頁面存活：不在卸載時 cancel，
  //    使用者按上一頁離開之後聲音**還會繼續唸完**，而畫面上已經沒有東西能停它。
  useEffect(() => hush, [hush])

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
   * ⚠️ 訪客沒有 session，`/api/ai/chat` 一律 401 ⇒ `aiReady` 為 false 時
   *    直接走 `findAnswer`，不要讓使用者按了沒反應。
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
    try {
      await api.aiChatStream([...hist, { role: 'user', content: q }], null, {
        persona: objectId,
        onDelta: (d) => {
          got += d
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
    } catch {
      got = ''
    }
    if (!got) {
      // ⚠️ AI 失敗時**退回卡片資料**（而不是一句空泛的道歉）：網路抖一下不該
      //    讓「品種是什麼」這種卡上明明有的問題也答不出來。
      const hit = findAnswer(q, card, obj)
      const known = asks.slice(0, 2).map(x => x.q).join('、')
      setLog(l => [...l, hit
        ? { who: 'char', text: hit.a, source: hit.source }
        : { who: 'char', text: `唔，我一時答不上來。卡片上寫的我都可以聊${known ? `，像是${known}` : ''}` }])
    }
    setThinking(false)
    try { a?.setAction('present') } catch { /* ignore */ }
    setBusy(false)
    // ⚠️ 語音在整段收完之後才唸：串流中每來一塊就重唸會斷斷續續。
    if (got && speechSupported()) {
      try { speechRef.current = speak(got, {}) } catch { /* ignore */ }
    }
  }

  /** 使用者手打的問題。 */
  const submit = (e) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t || busy) return
    setDraft('')
    // ★★★ AI 是主聲道（見 askAi 的註解）：整張卡的資料都在它的系統提示裡，
    //   所以「品種是什麼」它也答得出來，而且是用聊天的語氣、接得上上一句。
    if (aiReady && objectId) { askAi(t); return }

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
  const lastAsked = [...log].reverse().find(m => m.who === 'me')?.text ?? null

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
        {lastAsked && <p className="artalk-asked">你問：{lastAsked}</p>}
        <div className="artalk-bubble">
          {/* ⚠️ 限高與捲動在**內層**：尖角是外層的 ::after 且伸出框外，
              外層一有 overflow 就會把它裁掉（症狀是泡泡變成一塊圓角方塊）。 */}
          <div className="artalk-bubble-in" aria-live="polite" aria-label={`${who}說`}>
            {thinking
              ? <span className="artalk-typing"><span /><span /><span /></span>
              : <>{latest?.warm && <em className="artalk-warm">{latest.warm}</em>}{latest?.text}
                {/* ⚠️ AI 的回答**沒有出處**，一定要與卡面資料在視覺上分開——
                    這一頁的信任基礎是「每一句都查得到出處」，混在一起就毀了。 */}
                {latest?.ai && <i className="muted artalk-aitag">AI 生成 · 非卡片原文</i>}
                {latest?.source && <i className="muted">（{latest.source}）</i>}</>}
          </div>
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
        <div className="artalk-grid">
          {obj.quiz && (
            <button className="artalk-opt tap" disabled={busy} onClick={() => {
              setLog(l => [...l, { who: 'me', text: '考考我' }, { who: 'char', text: '好啊，我出一題——看跳出來的那張。' }])
              try { actorRef?.current?.setAction('happy') } catch { /* ignore */ }
              onQuiz?.()
            }}>
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

        {/* ★ 手動輸入。
            ⚠️ 這裡**不接語言模型**（理由見檔頭）：先在這張卡自己的資料裡找，
               找不到就誠實說找不到並列出它知道什麼。 */}
        <form className="artalk-form" onSubmit={submit}>
          <input
            className="artalk-input" type="text" value={draft} disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`問問${who}…`}
            aria-label={`輸入想問${who}的問題`}
            enterKeyHint="send" autoComplete="off"
          />
          <button className="btn-primary tap artalk-send" type="submit" disabled={busy || !draft.trim()}>
            發送
          </button>
        </form>

      </div>
    </>
  )
}
