import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { leaderboard } from '../data/mock.js'

const medal = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="芒種攝影挑戰 · 排行榜" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t">🏆 本檔排行（前 3 名收錄官方月曆）</div>
          <div className="d">依社群讚數＋官方評審加權即時排名。剩 2 天，衝一波！</div>
        </div>
        {leaderboard.map(r => (
          <button key={r.rank} className="tool tap" onClick={() => push('workDetail', { id: r.workId })}>
            <div style={{ width: 30, textAlign: 'center', fontSize: r.rank <= 3 ? 22 : 15, fontWeight: 800, flex: '0 0 auto', color: 'var(--muted)' }}>
              {medal[r.rank - 1] || r.rank}
            </div>
            <div className="ti" style={{ background: r.bg, width: 44, height: 44, fontSize: 22 }}>{r.emoji}</div>
            <div className="tn2">
              <b>{r.title}</b>
              <span>{r.user}</span>
            </div>
            <span style={{ color: 'var(--cinnabar)', fontWeight: 700, fontSize: 13 }}>♥ {r.likes}</span>
          </button>
        ))}
        <div className="note">你目前排名 <b>#12</b>，距離前 3 名還差 <b>87</b> 個讚<span className="acc" onClick={() => push('newPost')}>去投稿</span></div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
