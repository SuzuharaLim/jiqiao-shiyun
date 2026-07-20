import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

const records = [
  { e: '⭐', t: '今日運勢 · 丙午日', d: '宜開市納財，忌動土', when: '今天 09:12', to: 'aiChat' },
  { e: '🎋', t: '芒種第七籤 · 中吉', d: '耕耘有時，靜待花開', when: '今天 09:15', to: 'aiChat' },
  { e: '🌙', t: '解夢 · 下雨', d: '主潤澤、財氣將至', when: '昨天', to: 'dream' },
  { e: '💞', t: '婚配 · 馬 × 虎', d: '配對指數 90 分', when: '3 天前', to: 'matchmaking' },
  { e: '✍️', t: '命名 · 時光訊息', d: '大吉 · 92 分', when: '上週', to: 'nameFortune' },
]

export default function Records() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="我的占卜紀錄" onBack />
      <div className="body">
        <SectionHead title="運勢 · 籤詩 · 解夢" />
        {records.map((r, i) => (
          <button key={i} className="list-item tap" style={{ width: '100%', textAlign: 'left', background: 'var(--bg)' }}
            onClick={() => push(r.to)}>
            <div className="big">{r.e}</div>
            <div className="txt"><b>{r.t}</b><span>{r.d}</span></div>
            <span className="muted" style={{ fontSize: 11 }}>{r.when}</span>
          </button>
        ))}
        <div className="pad"><button className="btn-primary tap" onClick={() => push('aiChat')}>再問 AI 時光顧問</button></div>
        <div style={{ height: 8 }} />
      </div>
    </>
  )
}
