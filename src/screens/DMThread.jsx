import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { dmThreads } from '../data/mock.js'

export default function DMThread({ user = 'flora.tw' }) {
  const t = dmThreads[user] || dmThreads['flora.tw']
  const [msgs, setMsgs] = useState(() => t.msgs.map(m => ({ ...m })))
  const [text, setText] = useState('')
  const [replied, setReplied] = useState(false)
  const scroller = useRef(null)

  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  const send = () => {
    const q = text.trim()
    if (!q) return
    setMsgs(m => [...m, { who: 'me', text: q }])
    setText('')
    if (!replied) {
      setReplied(true)
      setTimeout(() => setMsgs(m => [...m, { who: 'them', text: t.reply }]), 800)
    }
  }

  return (
    <>
      <TopBar title={`${t.emoji} ${user}`} onBack />
      <div className="chat" ref={scroller}>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.who === 'me' ? 'me' : 'ai'}`}>{m.text}</div>
        ))}
      </div>
      <div className="cinput">
        <div className="f">
          <input placeholder="傳訊息…" aria-label="傳訊息" value={text}
            onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        </div>
        <button className="sendbtn tap" onClick={send} aria-label="送出"><Icon name="send" /></button>
      </div>
    </>
  )
}
