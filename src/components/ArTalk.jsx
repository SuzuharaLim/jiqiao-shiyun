import { useCallback, useEffect, useRef, useState } from 'react'
import { speechSupported, speak } from '../lib/speak.js'

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

export default function ArTalk({ obj, actorRef, onQuiz }) {
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
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
    setLog(obj ? [{ who: 'char', text: obj.line || `我是${obj.name}。` }] : [])
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
    setBusy(true)
    hush()
    setLog(l => [...l, { who: 'me', text: item.q }])

    const a = actorRef?.current
    // 先「想一下」再回答：立刻吐出答案讀起來像查表，停頓半秒才像在對話
    try { a?.setAction('think') } catch { /* ignore */ }

    timerRef.current = setTimeout(() => {
      setLog(l => [...l, { who: 'char', text: item.a, source: item.source }])
      try { a?.setAction(item.act || 'nod') } catch { /* ignore */ }

      let done = false
      const finish = () => {
        if (done) return
        done = true
        clearInterval(envRef.current); envRef.current = 0
        clearTimeout(guardRef.current); guardRef.current = 0
        try { a?.setOverlay(null) } catch { /* ignore */ }
        try { a?.setAction('present') } catch { /* ignore */ }
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

      speechRef.current = speak(item.a, {
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

  if (!obj) return null

  return (
    <div className="artalk">
      <div className="artalk-log" ref={logRef} aria-live="polite" aria-label={`與${obj.name}的對話`}>
        {log.map((m, i) => (
          <p key={i} className={`artalk-b ${m.who}`}>
            {m.text}
            {m.source && <i className="muted">（{m.source}）</i>}
          </p>
        ))}
        {busy && <p className="artalk-b char artalk-typing"><span /><span /><span /></p>}
      </div>

      <div className="artalk-asks">
        {asks.map((a, i) => (
          <button key={i} className="chip tap" disabled={busy} onClick={() => say(a)}>
            {a.q}
          </button>
        ))}
        {/* 動作不牽涉任何事實，純粹讓它「有反應」——這是最便宜的活著感 */}
        <button className="chip tap" disabled={busy} onClick={() => {
          const a = actorRef?.current
          const moves = ['wave', 'nod', 'jump', 'spin', 'dance', 'happy']
          const pick = moves[Math.floor(Math.random() * moves.length)]
          setLog(l => [...l, { who: 'me', text: '做個動作給我看' }])
          try { a?.setAction(pick) } catch { /* ignore */ }
          // ⚠️ 要自己收回 present：動作是循環的，不收的話它會一直跳下去
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => { try { a?.setAction('present') } catch { /* ignore */ } }, 4200)
        }}>
          做個動作給我看
        </button>
        {obj.quiz && (
          <button className="chip tap" disabled={busy} onClick={() => {
            setLog(l => [...l, { who: 'me', text: '考考我' }, { who: 'char', text: '好啊，往下看——我出一題。' }])
            try { actorRef?.current?.setAction('happy') } catch { /* ignore */ }
            onQuiz?.()
          }}>
            考考我
          </button>
        )}
      </div>
    </div>
  )
}
