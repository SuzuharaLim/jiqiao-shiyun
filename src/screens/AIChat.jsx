import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { aiOpenFor, aiQuickRepliesFor, aiReply } from '../data/mock.js'
import { dayFor, todayOffset } from '../data/almanac.js'

// AI 回覆逐句浮現。
// ⚠️ 整段瞬間出現會讓人覺得「這是預先寫好的罐頭」——對一個叫「AI 時光顧問」
//    的功能，這個印象是致命的。但也不要真的逐字打（太慢、讀起來卡）：
//    逐句就夠了，既有生成感又不拖時間。純呈現層，不動資料流。
function AiMsg({ text }) {
  // 依中英句末標點斷句；保留標點（lookbehind 分割）
  const parts = String(text).split(/(?<=[。！？!?\n])/).filter(Boolean)
  return (
    <div className="msg ai">
      {parts.map((s, i) => (
        <span key={i} className="seg" style={{ animationDelay: `${i * 0.16}s` }}>{s}</span>
      ))}
    </div>
  )
}

export default function AIChat() {
  const { setToast } = useNav()
  const today = dayFor(todayOffset())   // 真實今日運勢
  const opening = aiOpenFor(today)          // 依真實今日節氣與干支生成
  const [msgs, setMsgs] = useState([{ who: 'ai', text: opening }])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const scroller = useRef(null)

  const restart = () => { setMsgs([{ who: 'ai', text: opening }]); setShowQuick(true); setText(''); setToast('已開始新的對話 🌿') }

  useEffect(() => {
    const el = scroller.current
    // ⚠️ 平滑捲動而非瞬跳：訊息本身有進場動畫，捲動如果是瞬間的，
    //    會看到「訊息還在浮上來、畫面已經跳到底」兩種節奏打架。
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  const send = async (t) => {
    const q = (t ?? text).trim()
    if (!q) return
    const mine = { who: 'me', text: q }
    const base = [...msgs, mine]
    setMsgs(base)
    setText('')
    setShowQuick(false)
    setTyping(true)
    // 真實 GPT：後端代呼叫（金鑰在後端）；未設金鑰／訪客／失敗 → 退回內建示範腳本
    const history = base.filter(m => m.who === 'me' || m.who === 'ai')
      .map(m => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text }))
    const ctx = `今天${today.term}，${today.ganzhi.replace('日', '')}日，宜${today.yi.join('、')}；忌${today.ji.join('、')}；吉時${today.luckyHours}`
    let reply
    try {
      const r = await api.aiChat(history, ctx)
      reply = (r && r.reply && !r.fallback) ? r.reply : aiReply(q, today)
    } catch {
      reply = aiReply(q, today)   // 離線/未登入/未設金鑰
    }
    setTyping(false)
    setMsgs(m => [...m, { who: 'ai', text: reply }])
  }

  return (
    <>
      <TopBar title="AI 時光顧問" onBack
        right={<button className="iconbtn tap" aria-label="重新開始對話" onClick={restart}><Icon name="dots" /></button>} />

      {/* 今日運勢橫幅 */}
      <div className="luck">
        <div className="s">{'★'.repeat(today.stars)}{'☆'.repeat(5 - today.stars)}</div>
        <div className="l">今日運勢 · {today.ganzhi} · 宜{today.yi.slice(0, 2).join('')}</div>
      </div>
      <div className="center muted" style={{ fontSize: 'var(--text-2xs)', padding: '4px 16px 0', flex: '0 0 auto' }}>
        ＊AI 回覆為示範內容，僅供參考娛樂，不構成專業建議
      </div>

      <div className="chat" ref={scroller}>
        {msgs.map((m, i) => (m.who === 'ai'
          ? <AiMsg key={i} text={m.text} />
          : <div key={i} className={`msg ${m.who}`}>{m.text}</div>))}
        {typing && <div className="typing"><i /><i /><i /></div>}
      </div>

      {showQuick && (
        <div className="quick">
          {aiQuickRepliesFor(today).map(q => (
            <button key={q} className="qchip tap" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      <div className="cinput">
        <div className="f">
          <input
            placeholder="輸入你的問題…"
            aria-label="輸入你的問題"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
          />
        </div>
        <button className="sendbtn tap" onClick={() => send()} aria-label="送出"><Icon name="send" /></button>
      </div>
    </>
  )
}
