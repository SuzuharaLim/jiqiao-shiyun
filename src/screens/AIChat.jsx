import { stripEmoji } from '../lib/text.js'
import { useState, useRef, useEffect, Fragment } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Seal } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { aiOpenFor, aiQuickRepliesFor, aiReply } from '../data/mock.js'
import { dayFor, todayOffset, offsetFromDate } from '../data/almanac.js'
import { localAnswer } from '../data/aiKnowledge.js'

// ⚠️ 防禦性 Markdown 清除。
// system prompt 已明確禁止 Markdown（server/index.js 的 AI_SYSTEM），但模型不是
// 每次都聽話，而 .msg 是 white-space:pre-wrap 的純文字容器、不會 render。
// 沒有這一層，模型一吐 **粗體** 或 ### 標題，使用者看到的就是滿螢幕星號與井字號。
function stripMdRaw(s) {
  return String(s)
    .replace(/```[\s\S]*?```/g, '')            // 整塊程式碼圍籬（後端也擋，這是雙保險）
    .replace(/^#{1,6}\s+/gm, '')               // # 標題
    .replace(/^\s*[-*+]\s+/gm, '· ')           // - 清單 → 中文項目符號
    .replace(/^\s*>\s?/gm, '')                 // > 引用
    .replace(/^\s*\|.*\|\s*$/gm, '')           // | 表格列
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')        // --- 分隔線
    .replace(/\*\*([^*]+)\*\*/g, '$1')         // **粗體**
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2') // *斜體*
    .replace(/`([^`\n]+)`/g, '$1')             // `行內碼`
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// 逐句浮現（只用在「非串流」的訊息：開場白、示範腳本、婉拒）。
// 串流訊息本身就是一個字一個字出來的，再套進場動畫會兩種節奏打架。
function AiSegments({ text }) {
  const parts = String(text).split(/(?<=[。！？!?\n])/).filter(Boolean)
  return parts.map((s, i) => (
    // ⚠️ class 不可叫 `.seg`：那是全站「分段切換」元件的名字（白底、6px 16px 內距、
    //    14px 圓角），撞名的結果是 AI 每一句都被畫成一顆獨立的白色膠囊，
    //    行內換行處出現缺口與重疊（2026-10-04 修）。站規記過同一類的坑：`.calcell.empty`。
    <span key={i} className="ai-seg" style={{ animationDelay: `${i * 0.16}s` }}>{s}</span>
  ))
}

// 續問建議：對話式介面最常見的流失點，就是使用者答完第一題後面對一個空輸入框。
// 依「上一則問的是什麼」給三個方向，沿用現成的 .qchip 樣式。
const FOLLOWUPS = [
  // 站上沒有抽籤功能，續問建議不可出現「這支籤怎麼解？」「再抽一支」——
  //    一支籤都沒抽到，這兩句只會讓人更困惑。
  { keys: ['籤'], list: ['今天的宜忌是什麼？', '這幾天適合出遊嗎？', '這個節氣要注意什麼？'] },
  { keys: ['夢', '解夢'], list: ['夢裡還有別的細節', '這代表要注意什麼？'] },
  { keys: ['節氣', '養生', '吃', 'food'], list: ['這節氣吃什麼好？', '有什麼禁忌？', '推薦拍什麼題材'] },
  { keys: ['簽約', '開市', '生意', '合約'], list: ['那明天呢？', '有哪些要避開的？', '看完整國民曆'] },
]
const followupsFor = (q) =>
  (FOLLOWUPS.find(f => f.keys.some(k => q.includes(k)))?.list)
  || ['那明天呢？', '今天沖什麼生肖？', '這個節氣要注意什麼？']

// 對話持久化（階段一：sessionStorage）。
// msgs 原本是純 useState，pop() 讓元件卸載 → 整段對話蒸發。
//    使用者從 AI 頁點去看完整國民曆再回來，得從頭問起。
//    帶 date 是為了跨日自動重置——昨天的「今日運勢」今天看沒有意義。
const LS_KEY = 'jq-ai-chat'
const todayKey = () => new Date().toISOString().slice(0, 10)

export default function AIChat() {
  // 要用「使用者正在看的那一天」，不是永遠today。先前在 8/31 的曆頁點進來，
  //    開場白仍寫「今天是大暑、庚戌日」——剛翻的日期被整個丟掉。
  const { setToast, requireAccount, push, user, homeDate } = useNav()
  const viewOff = homeDate
    ? (() => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(homeDate); return m ? offsetFromDate(new Date(+m[1], +m[2] - 1, +m[3])) : todayOffset() })()
    : todayOffset()
  const today = dayFor(viewOff)
  const opening = aiOpenFor(today)

  const [msgs, setMsgs] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(LS_KEY) || 'null')
      if (s?.date === todayKey() && Array.isArray(s.msgs) && s.msgs.length) return s.msgs
    } catch { /* 隱私模式／壞資料 → 重新開始 */ }
    return [{ who: 'ai', text: opening, t: Date.now() }]
  })
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)      // 已送出、還沒收到第一個字
  const [streaming, setStreaming] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [aiLive, setAiLive] = useState(null)       // 後端是否已接金鑰：null=未知 / true / false
  const scroller = useRef(null)
  const taRef = useRef(null)
  const abortRef = useRef(null)
  const undoRef = useRef(null)
  // 送出鎖必須是 ref 不能是 state：state 更新是非同步的，
  //    同一個 render 內連點三次讀到的 typing 都還是 false，三個請求照樣送出去
  //    （實測連點 3 下＝3 則訊息、3 次 token）。ref 是同步寫入，才擋得住。
  const busyRef = useRef(false)

  useEffect(() => {
    try { sessionStorage.setItem(LS_KEY, JSON.stringify({ date: todayKey(), msgs })) } catch { /* 空間不足則不存 */ }
  }, [msgs])

  // 登入之後要把「請先登入」那類系統訊息清掉。
  // 對話存在 sessionStorage，所以訪客時期跳出的
  //    「這一段要登入才能請顧問開口／去註冊・登入」在登入後仍然掛在畫面上，
  //    使用者已經登入了卻還被叫去登入——那顆 CTA 也已經沒有意義。
  //    這一則的生命週期綁的是登入狀態，不是對話內容，所以要單獨處理。
  useEffect(() => {
    if (!user || user.guest) return
    setMsgs(list => (list.some(m => m.cta === 'login') ? list.filter(m => m.cta !== 'login') : list))
  }, [user?.id, user?.guest])

  // 免責聲明的文案要跟著實際狀態走：接了金鑰還寫「AI 回覆為示範內容」就是錯的
  useEffect(() => {
    let alive = true
    fetch('/api/health').then(r => r.json()).then(j => { if (alive) setAiLive(j?.ai === 'on') }).catch(() => {})
    return () => { alive = false }
  }, [])

  // 只在「已經接近底部」時才自動捲：使用者往回讀舊訊息時被硬拉到底非常惱人。
  const nearBottom = () => {
    const el = scroller.current
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }
  useEffect(() => {
    const el = scroller.current
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, atBottom])

  const pushMsg = (m) => setMsgs(list => [...list, { t: Date.now(), ...m }])

  const restart = () => {
    undoRef.current = msgs                       // 留一份，讓「復原」有東西可回
    setMsgs([{ who: 'ai', text: opening, t: Date.now() }])
    setText('')
    setToast('已開始新的對話 ', {
      label: '復原',
      onClick: () => { if (undoRef.current) { setMsgs(undoRef.current); undoRef.current = null } },
    })
  }

  const stop = () => { abortRef.current?.abort() }

  const send = async (t) => {
    const q = (t ?? text).trim()
    // 沒有這道鎖的話連點三次＝三個並行請求，回覆亂序插入還白燒三次 token
    if (!q || busyRef.current) return
    busyRef.current = true
    setMsgs(list => [...list, { who: 'me', text: q, t: Date.now() }])
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setAtBottom(true)
    setTyping(true)

    // 先讓本地知識層接手（見 aiKnowledge.js）。
    //    這些題目本來就有確定答案（來自 dayFor 的真實曆算或站內事實），
    //    交給模型只會多花 token 又多一次幻覺機會——實測金鑰接上後，
    //    模型會編出不存在的商品價格與退費政策。
    //    附帶好處：不打 API＝不受 requireAuth 擋，**訪客也能用**。
    const local = localAnswer(q, today)
    if (local) {
      setTyping(false)
      busyRef.current = false
      pushMsg({ who: 'ai', text: local.text, actions: local.actions, local: true, followups: followupsFor(q) })
      return
    }

    const base = [...msgs, { who: 'me', text: q, t: Date.now() }]
    const history = base.filter(m => m.who === 'me' || m.who === 'ai')
      .map(m => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text }))
    const ctx = `今天${today.term}，${today.ganzhi.replace('日', '')}日，宜${today.yi.join('、')}；忌${today.ji.join('、')}；吉時${today.luckyHours}`

    const ctrl = new AbortController()
    abortRef.current = ctrl
    let started = false
    try {
      const r = await api.aiChatStream(history, ctx, {
        signal: ctrl.signal,
        date: homeDate || null,
        onDelta: (full) => {
          if (!started) { started = true; setTyping(false); setStreaming(true); pushMsg({ who: 'ai', text: '', live: true }) }
          setMsgs(list => {
            const copy = [...list]
            copy[copy.length - 1] = { ...copy[copy.length - 1], text: stripMd(full) }
            return copy
          })
          if (!nearBottom()) setAtBottom(false)
        },
      })
      // 後端沒接金鑰 → 明確標成「示範」，不假裝是 AI 回的
      if (r?.fallback) {
        pushMsg({ who: 'ai', text: aiReply(q, today), demo: true, followups: followupsFor(q) })
      } else if (started) {
        setMsgs(list => {
          const copy = [...list]
          copy[copy.length - 1] = { ...copy[copy.length - 1], live: false, followups: followupsFor(q) }
          return copy
        })
      } else if (r?.reply) {
        pushMsg({ who: 'ai', text: stripMd(r.reply), followups: followupsFor(q) })
      }
    } catch (e) {
      // 舊版是 `catch { reply = aiReply(q) }`——任何錯誤都被靜默換成寫死的腳本，
      //    使用者完全不知道自己在跟 5 條 if 講話。降級必須「看得見」。
      if (e?.stopped) { /* 使用者自己按停止，保留已收到的內容 */ }
      else {
        // 503（設定有誤）不可給「再試一次」——金鑰無效或模型名稱不對時，
        //    重試一萬次都不會好，那顆按鈕只是讓使用者做白工。
        //    改成誠實說明＋導向站內還能用的東西（曆頁、聯絡我們）。
        const map = {
          401: { text: '這一段要登入才能請顧問開口 免費註冊後，今日運勢、解籤、解夢都能問。', cta: 'login' },
          429: { text: '問得有點快，讓顧問喘口氣～稍等十秒再試 ', cta: 'retry' },
          502: { text: '顧問那頭線路不穩，要再問一次嗎？', cta: 'retry' },
          503: { text: 'AI 顧問暫時休息中 我們已經收到通知，會盡快恢復。\n\n這期間曆頁、宜忌、吉時、沖煞這些還是查得到——你也可以直接問我這類問題，我不用連線就答得出來。', cta: 'almanac' },
          504: { text: '這題想太久了，換個問法或稍後再試 ', cta: 'retry' },
        }
        const hit = map[e?.status] || { text: e?.message || '發生錯誤，請稍後再試', cta: 'retry' }
        if (started) setMsgs(list => list.map((m, i) => i === list.length - 1 ? { ...m, live: false } : m))
        pushMsg({ who: 'sys', ...hit, q })
      }
    } finally {
      busyRef.current = false
      abortRef.current = null
      setTyping(false)
      setStreaming(false)
    }
  }

  const showQuick = msgs.length <= 1
  const lastAi = [...msgs].reverse().find(m => m.who === 'ai')

  return (
    <>
      <TopBar title="AI 時光顧問" onBack
        right={<button className="iconbtn tap" aria-label="重新開始對話" onClick={restart}><Icon name="dots" /></button>} />

      {/* 今日一列：原本是一張置中的大卡＋一段免責，佔掉手機畫面三分之一，
          資訊卻只有星等、日柱、兩個宜。壓成一列，把高度還給對話。 */}
      <div className="ai-today">
        <span className="ai-today-k">今日</span>
        <span className="ai-today-gz">{today.ganzhi}</span>
        {/* 星等逐顆點亮（--i 給 stagger 延遲；沿用曆頁同一套 starPop） */}
        <span className="ai-today-s" role="img" aria-label={`今日運勢 ${today.stars} 顆星`}>
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} aria-hidden="true" style={{ '--i': i }}>{i < today.stars ? '★' : '☆'}</i>
          ))}
        </span>
        {today.yi.length > 0 && <span className="ai-today-yi">宜 {today.yi.slice(0, 2).join('、')}</span>}
      </div>

      <div className="chat" ref={scroller} role="log" aria-live="polite" aria-relevant="additions"
        onScroll={() => setAtBottom(nearBottom())}>
        {msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const gap = prev && m.t && prev.t && (m.t - prev.t > 5 * 60 * 1000)
          return (
            <Fragment key={i}>
              {gap && <div className="chat-time">{new Date(m.t).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</div>}
              {m.who === 'sys' ? (
                <div className="msg sys">
                  <span>{m.text}</span>
                  <div className="sys-acts">
                    {m.cta === 'login' ? (
                      <button className="qchip tap" onClick={() => requireAccount('AI 時光顧問')}>去註冊 / 登入</button>
                    ) : m.cta === 'almanac' ? (
                      /* 設定有誤時「再試一次」是白工，改導向還能用的功能 */
                      <>
                        <button className="qchip tap" onClick={() => push('almanacDay')}> 看完整國民曆</button>
                        <button className="qchip tap" onClick={() => push('dms')}> 回報問題</button>
                      </>
                    ) : (
                      <button className="qchip tap" onClick={() => send(m.q)} disabled={typing || streaming}>再試一次</button>
                    )}
                  </div>
                </div>
              ) : m.who === 'ai' ? (
                <div className="ai-row">
                {/* 頭像只掛在一串 AI 訊息的第一則：每則都掛會變成一整排印章 */}
                {prev?.who === 'ai'
                  ? <span className="ai-av ghost" aria-hidden="true" />
                  : <span className="ai-av" aria-hidden="true"><Seal badge alt="" /></span>}
                <div className={`msg ai${m.live ? ' live' : ''}`} data-demo={m.demo ? '示範' : undefined}>
                  {m.live ? m.text : <AiSegments text={m.text} />}
                  {/* 行動卡片：本地層回答時附上站內導引，讓「聊天」可以直接變「辦事」 */}
                  {m.actions?.length > 0 && (
                    <div className="msg-acts">
                      {m.actions.map(a => (
                        <button key={a.screen} className="qchip tap" onClick={() => push(a.screen)}>{a.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              ) : (
                <div className="msg me">{m.text}</div>
              )}
            </Fragment>
          )
        })}
        {showQuick && (
          <div className="ai-starters" role="group" aria-label="可以這樣問">
            <span className="ai-starters-h">可以這樣問</span>
            <div className="ai-starters-g">
              {aiQuickRepliesFor(today).map((q, i) => (
                <button key={q} className="ai-starter tap" style={{ '--i': i }} onClick={() => send(q)}>
                  <span>{q}</span><Icon name="chev" />
                </button>
              ))}
            </div>
          </div>
        )}
        {typing && <div className="ai-row"><span className="ai-av ghost" aria-hidden="true" /><div className="typing"><i /><i /><i /></div></div>}

        {/* 回到最新：使用者往回讀時，新訊息不該把他硬拉走，但要讓他知道有新的。
             必須放在 .chat 內部——sticky 只在自己的捲動容器裡有效；
               放外面用 absolute 的話，桌機的 .screen 是 position:static，定位會飄掉。 */}
        {!atBottom && (
          <button className="tolatest tap" onClick={() => {
            setAtBottom(true)
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
          }}>↓ 回到最新</button>
        )}

        {/* 續問建議：跟著最後一則 AI 回覆走 */}
        {!typing && !streaming && lastAi?.followups && (
          <div className="quick followup">
            {lastAi.followups.map((q, i) => (
              <button key={q} className="qchip tap" style={{ '--i': i }} onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        )}
      </div>

      <div className="cinput">
        <div className="f">
          {/* textarea 不是 input：長問題要能換行。
              Enter 送出、Shift+Enter 換行；輸入法組字中（isComposing）不可送出，
              否則中文選字按 Enter 會把半成品送出去。 */}
          <textarea
            ref={taRef}
            rows={1}
            placeholder="輸入你的問題…"
            aria-label="輸入你的問題"
            value={text}
            onChange={e => {
              setText(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 108) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
            }}
          />
        </div>
        {streaming
          ? <button className="sendbtn tap stop" onClick={stop} aria-label="停止回覆"><Icon name="x" /></button>
          : <button className="sendbtn tap" onClick={() => send()} aria-label="送出"
              disabled={typing || !text.trim()}><Icon name="send" /></button>}
      </div>
      {/* 免責文案依實際狀態切換：接了金鑰之後還寫「示範內容」就是不實陳述。
          放在輸入列正下方＝每次送出前都在視線內，而不是捲走就看不到。 */}
      <p className="ai-note">
        {aiLive === false
          ? 'AI 尚未接上，目前為示範內容。命理僅供參考娛樂，不構成專業建議。'
          : 'AI 可能出錯；命理與宜忌僅供參考，不構成醫療、投資、法律或婚姻建議。'}
      </p>
    </>
  )
}
function stripMd(s) { return stripEmoji(stripMdRaw(s)) }
