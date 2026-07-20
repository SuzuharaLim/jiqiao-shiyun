import { useState } from 'react'
import { TopBar, Disclaimer } from '../components/ui.jsx'
import { useContent } from '../hooks/useApi.js'

export default function Matchmaking() {
  const zodiacs = useContent('zodiacs')   // 生肖清單嚴格來自資料庫
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)
  const done = a && b
  // 兩人運勢分差越小越契合（示範演算）
  const score = done ? Math.max(55, 100 - Math.abs(a.score - b.score)) : 0

  const Picker = ({ label, val, set }) => (
    <div style={{ flex: 1 }}>
      <div className="center muted" style={{ fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
        {zodiacs.map(z => (
          <button key={z.sign} className="tap" style={{
            border: `1.5px solid ${val?.sign === z.sign ? 'var(--go)' : 'var(--line2)'}`, borderRadius: 9,
            padding: '6px 0', background: val?.sign === z.sign ? 'var(--acard-bg)' : 'var(--bg)',
          }} onClick={() => set(z)}><div style={{ fontSize: 18 }}>{z.emoji}</div></button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <TopBar title="生肖・星座 婚配" onBack />
      <div className="body">
        <div className="pad" style={{ display: 'flex', gap: 12 }}>
          <Picker label="你" val={a} set={setA} />
          <Picker label="對方" val={b} set={setB} />
        </div>

        {done ? (
          <div className="card">
            <h4>{a.emoji} × {b.emoji} 配對指數 {score} 分</h4>
            <div className="meter"><div style={{ width: `${score}%` }} /></div>
            <p style={{ marginTop: 10 }}>
              屬{a.sign}與屬{b.sign}的組合{score >= 80 ? '相當契合，是能彼此扶持的良緣。' : score >= 65 ? '互補性佳，多溝通能長久。' : '需要更多耐心經營，先做朋友再談進一步。'}
              建議在吉時（未時）約會或談重要話題。
            </p>
          </div>
        ) : <div className="empty"><div className="big">💞</div>各選一個生肖，看配對分數</div>}
        <Disclaimer text="配對指數為示範演算，僅供參考娛樂，感情仍需真心經營。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
