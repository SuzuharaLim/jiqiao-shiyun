import { useState } from 'react'
import { TopBar, Switch, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

// 明年月曆預拍：整年依節氣提醒補拍，年底一鍵成曆
const TERMS = [
  { m: '1月', t: '小寒', e: '❄️', shot: true }, { m: '2月', t: '立春', e: '🌱', shot: true },
  { m: '3月', t: '驚蟄', e: '🐛', shot: true }, { m: '4月', t: '清明', e: '🍃', shot: true },
  { m: '5月', t: '立夏', e: '🌿', shot: true }, { m: '6月', t: '芒種', e: '🌾', shot: false },
  { m: '7月', t: '小暑', e: '🌡️', shot: false }, { m: '8月', t: '立秋', e: '🍂', shot: false },
  { m: '9月', t: '白露', e: '💧', shot: false }, { m: '10月', t: '寒露', e: '🌾', shot: false },
  { m: '11月', t: '立冬', e: '🍁', shot: false }, { m: '12月', t: '冬至', e: '⛄', shot: false },
]

export default function PrePlan() {
  const { push, setToast } = useNav()
  const [shots, setShots] = useState(() => TERMS.map(t => t.shot))
  const [remind, setRemind] = useState(true)
  const done = shots.filter(Boolean).length

  const toggleShot = (i) => setShots(s => s.map((v, k) => k === i ? !v : v))

  return (
    <>
      <TopBar title="明年月曆・預拍" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t">🔮 一整年，慢慢拍</div>
          <div className="d">每到節氣就提醒你拍一張，年底 AI 自動挑 12 張、配詩詞成一本專屬植物月曆。</div>
          <div className="prog" style={{ padding: 0 }}>
            <div className="plbl"><span>今年進度</span><span>已拍 {done} / 12</span></div>
            <div className="bar"><div style={{ width: `${done / 12 * 100}%` }} /></div>
          </div>
        </div>

        <div className="opt">
          <div className="l">🔔 節氣到了就提醒我拍照</div>
          <Switch on={remind} onChange={(v) => { setRemind(v); setToast(v ? '已開啟節氣拍照提醒 🔔' : '已關閉提醒') }} />
        </div>

        <SectionHead title="24 節氣・拍照清單" extra="點一下標記已拍" />
        <div className="grid" style={{ gap: 8, padding: '4px 12px' }}>
          {TERMS.map((t, i) => (
            <button key={t.m} className="tap" style={{
              border: `1.5px solid ${shots[i] ? 'var(--yi)' : 'var(--line2)'}`, borderRadius: 12,
              padding: '12px 4px', textAlign: 'center',
              background: shots[i] ? 'var(--ok-bg)' : 'var(--bg)',
            }} onClick={() => toggleShot(i)}>
              <div style={{ fontSize: 26, opacity: shots[i] ? 1 : .5 }}>{t.e}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{t.t}</div>
              <div style={{ fontSize: 10, color: shots[i] ? 'var(--yi)' : 'var(--muted)', fontWeight: 700 }}>
                {shots[i] ? '✓ 已拍' : t.m}
              </div>
            </button>
          ))}
        </div>

        <div className="pad">
          <button className="btn-primary tap" style={done === 0 ? { opacity: .55 } : null}
            onClick={() => {
              if (done === 0) { setToast('先點幾個節氣標記「已拍」再成曆吧 📷'); return }
              setToast(`AI 從你已拍的 ${done} 張補齊 12 張，開始排版 ✨`); push('makeCalendar')
            }}>
            ✨ AI 一鍵成曆（{done}/12）
          </button>
        </div>
        <div style={{ height: 8 }} />
      </div>
    </>
  )
}
