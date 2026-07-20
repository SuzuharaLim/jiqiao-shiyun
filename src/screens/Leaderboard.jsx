import { useState, useEffect } from 'react'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

const medal = ['🥇', '🥈', '🥉']

// 排行榜 —— 由真實作品按讚數即時計算（GET /api/leaderboard），不再使用預灌示範清單。
export default function Leaderboard() {
  const { push } = useNav()
  const [leaderboard, setLeaderboard] = useState([])
  useEffect(() => {
    let alive = true
    api.leaderboard().then(r => { if (alive) setLeaderboard(r.leaderboard || []) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return (
    <>
      <TopBar title="節氣攝影挑戰 · 排行榜" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t">🏆 即時排行（前 3 名收錄官方月曆）</div>
          <div className="d">依市集作品的社群讚數即時排名，投稿你的節氣作品一起競逐！</div>
        </div>
        {leaderboard.length === 0 && <div className="empty"><div className="big">🏆</div>還沒有上榜作品<br />發佈作品並獲得按讚即可上榜</div>}
        {leaderboard.map(r => (
          <button key={r.rank} className="tool tap" onClick={() => push('workDetail', { id: r.workId })}>
            <div style={{ width: 30, textAlign: 'center', fontSize: r.rank <= 3 ? 22 : 15, fontWeight: 800, flex: '0 0 auto', color: 'var(--muted)' }}>
              {medal[r.rank - 1] || r.rank}
            </div>
            <div className="ti" style={{ background: r.bg, width: 44, height: 44, fontSize: 22, position: 'relative', overflow: 'hidden' }}>
              {r.image ? <PhotoImg src={r.image} /> : r.emoji}
            </div>
            <div className="tn2">
              <b>{r.title}</b>
              <span>{r.user}</span>
            </div>
            <span style={{ color: 'var(--cinnabar)', fontWeight: 700, fontSize: 13 }}>♥ {r.likes}</span>
          </button>
        ))}
        <div className="note">投稿作品、累積讚數就會進榜<span className="acc" onClick={() => push('newPost')}>去投稿</span></div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
