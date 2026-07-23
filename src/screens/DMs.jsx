import { useState } from 'react'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

const TOPICS = ['一般問題', '企業客製詢價', '帳號問題', '回報問題']

// 使用者之間的私訊子系統尚未建置（原本這裡硬編三則假對話）。
// 但「能不能傳訊息給團隊」是真需求，所以這頁改成真正會送出的客服管道：
// 訊息寫進 support_messages 表，並在有設定寄信服務時通知營運信箱。
export default function DMs() {
  const { user, setToast } = useNav()
  const [topic, setTopic] = useState(TOPICS[0])
  const [body, setBody] = useState('')
  const [email, setEmail] = useState(user?.guest ? '' : (user?.email || ''))
  const [sending, setSending] = useState(false)
  const [sentId, setSentId] = useState(null)
  const needEmail = !user || user.guest

  const send = async () => {
    if (sending) return
    if (body.trim().length < 5) { setToast('請多描述一點（至少 5 個字）'); return }
    if (needEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setToast('請留下可以回覆你的 Email'); return
    }
    setSending(true)
    try {
      const r = await api.support({ topic, body: body.trim(), email: email.trim() })
      setSentId(r.id)
      setBody('')
    } catch (e) {
      setToast(e?.message || '送出失敗，請稍後再試')
    } finally { setSending(false) }
  }

  if (sentId) {
    return (
      <>
        <TopBar title="聯絡我們" onBack />
        <div className="body">
          <div className="empty">
            <div className="big">📮</div>
            訊息已送出<br />
            <span style={{ fontSize: 12 }}>我們會回覆到 {email || user?.email}</span>
          </div>
          <div className="pad">
            <button className="b tap" onClick={() => setSentId(null)}>再傳一則</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="聯絡我們" onBack />
      <div className="body">
        <div className="note">
          使用者之間的私訊功能尚未開放。有問題、企業客製需求或想回報狀況，都可以從這裡直接傳給我們。
        </div>

        <SectionHead title="主題" />
        <div className="chips">
          {TOPICS.map(t => (
            <button key={t} className={`chip tap ${topic === t ? 'on' : ''}`} onClick={() => setTopic(t)}>{t}</button>
          ))}
        </div>

        {needEmail && (
          <div className="auth-form" style={{ maxWidth: 'none' }}>
            <div className="field">
              <label>你的 Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com" aria-label="你的 Email" />
            </div>
          </div>
        )}

        <SectionHead title="訊息內容" />
        <div className="capin">
          <textarea rows={6} maxLength={2000} value={body} onChange={e => setBody(e.target.value)}
            placeholder="想說什麼都可以，越具體我們越好處理…" aria-label="訊息內容" />
          <div className="muted" style={{ textAlign: 'right', fontSize: 11, padding: '0 4px 4px' }}>{body.length} / 2000</div>
        </div>

        <div className="pad">
          <button className="btn-primary tap" onClick={send} disabled={sending}
            style={sending ? { opacity: .6 } : null}>
            {sending ? '送出中…' : '送出訊息'}
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
