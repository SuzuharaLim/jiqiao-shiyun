import { useState } from 'react'
import { TopBar, Disclaimer } from '../components/ui.jsx'
import { useContent } from '../hooks/useApi.js'

// 依時間範圍對基礎分做確定性微調，讓今日/本週/本月有差異
const scoreFor = (base, range) => {
  const mult = { 今日: 1, 本週: 0.94, 本月: 1.07 }[range] || 1
  return Math.max(52, Math.min(99, Math.round(base * mult)))
}

export default function Zodiac() {
  const zodiacs = useContent('zodiacs')   // 生肖運勢嚴格來自資料庫
  const [range, setRange] = useState('今日')
  const [pick, setPick] = useState(null)
  return (
    <>
      <TopBar title="生肖運勢" onBack />
      <div className="body">
        <div className="chips" style={{ paddingTop: 12 }}>
          {['今日', '本週', '本月'].map(r => (
            <button key={r} className={`chip tap ${range === r ? 'on' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>

        <div className="grid" style={{ gap: 8, padding: '0 12px' }}>
          {zodiacs.map(z => {
            const s = scoreFor(z.score, range)
            return (
              <button key={z.sign} className="tap" style={{
                border: `1.5px solid ${pick === z.sign ? 'var(--go)' : 'var(--line2)'}`, borderRadius: 12,
                padding: '12px 6px', background: pick === z.sign ? 'var(--acard-bg)' : 'var(--bg)', textAlign: 'center',
              }} onClick={() => setPick(z.sign)}>
                <div style={{ fontSize: 30 }}>{z.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{z.sign}</div>
                <div style={{ fontSize: 11, color: 'var(--go)', fontWeight: 800 }}>{s}</div>
              </button>
            )
          })}
        </div>

        {pick && (() => {
          const z = zodiacs.find(x => x.sign === pick)
          const s = scoreFor(z.score, range)
          return (
            <div className="card">
              <h4>{z.emoji} 屬{z.sign} · {range}運勢 {s} 分</h4>
              <div className="meter"><div style={{ width: `${s}%` }} /></div>
              <p style={{ marginTop: 10 }}>{z.luck}。{range === '今日' ? '把握吉時「辰時・未時」處理要事，能事半功倍。' : range === '本週' ? '一週節奏漸入佳境，週中適合推進計畫。' : '本月宜穩中求進，月底運勢回升。'}</p>
            </div>
          )
        })()}
        {!pick && <div className="empty"><div className="big">🐲</div>點一個生肖，看 {range}運勢</div>}
        <Disclaimer />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
