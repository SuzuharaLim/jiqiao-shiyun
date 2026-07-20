import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

const dms = [
  { u: 'flora.tw', e: '🌸', bg: '#fce7f3', last: '你的初荷可以授權給我做月曆嗎？', t: '10 分鐘', unread: true },
  { u: 'lin_ocean', e: '🌊', bg: '#dbeafe', last: '芒種挑戰一起衝！', t: '1 小時' },
  { u: '機巧時運 小編', e: '🤖', bg: '#ede9fe', last: '恭喜作品入選官方月曆 🎉', t: '昨天' },
]

export default function DMs() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="私訊" onBack />
      <div className="body">
        {dms.map((d, i) => (
          <button key={i} className="tool tap" onClick={() => push('dmThread', { user: d.u })}>
            <div className="ti" style={{ background: d.bg, borderRadius: '50%', width: 44, height: 44, fontSize: 20 }}>{d.e}</div>
            <div className="tn2">
              <b>{d.u}</b>
              <span style={{ color: d.unread ? 'var(--text)' : 'var(--muted)', fontWeight: d.unread ? 600 : 400 }}>{d.last}</span>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>{d.t}{d.unread && <span className="badge-dot" style={{ position: 'static', display: 'inline-block', marginLeft: 6 }} />}</span>
          </button>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
