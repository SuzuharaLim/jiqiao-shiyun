import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { today, aiOpen, aiQuickReplies, aiReply } from '../data/mock.js'

export default function AIChat() {
  const { setToast } = useNav()
  const [msgs, setMsgs] = useState([{ who: 'ai', text: aiOpen }])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const scroller = useRef(null)

  const restart = () => { setMsgs([{ who: 'ai', text: aiOpen }]); setShowQuick(true); setText(''); setToast('已開始新的對話 🌿') }

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  const send = (t) => {
    const q = (t ?? text).trim()
    if (!q) return
    setMsgs(m => [...m, { who: 'me', text: q }])
    setText('')
    setShowQuick(false)
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs(m => [...m, { who: 'ai', text: aiReply(q) }])
    }, 900)
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
      <div className="center muted" style={{ fontSize: 10.5, padding: '4px 16px 0', flex: '0 0 auto' }}>
        ＊AI 回覆為示範內容，僅供參考娛樂，不構成專業建議
      </div>

      <div className="chat" ref={scroller}>
        {msgs.map((m, i) => <div key={i} className={`msg ${m.who}`}>{m.text}</div>)}
        {typing && <div className="typing"><i /><i /><i /></div>}
      </div>

      {showQuick && (
        <div className="quick">
          {aiQuickReplies.map(q => (
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
