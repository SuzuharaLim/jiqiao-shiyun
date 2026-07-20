import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { challenges } from '../data/mock.js'

export default function Challenges() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="節氣挑戰活動" onBack />
      <div className="body">
        {challenges.map(c => (
          <div key={c.id} className="card">
            <h4>{c.emoji} {c.title}</h4>
            <div className="kv"><span>獎勵</span><span className="muted">{c.prize}</span></div>
            <div className="kv"><span>參加人數</span><span className="muted">{c.join} 人</span></div>
            <div className="kv"><span>剩餘</span><span style={{ color: 'var(--heart)', fontWeight: 700 }}>{c.days} 天</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="b tap" onClick={() => push('challengesBoard')}>排行榜</button>
              <button className="b dark tap" onClick={() => { push('newPost') }}>參加投稿</button>
            </div>
          </div>
        ))}
        <SectionHead title="玩法" />
        <div className="article" style={{ paddingTop: 4 }}>
          <p>依當前節氣主題投稿攝影作品，獲得社群按讚與官方評審加權。前段名次作品將收錄進官方植物月曆，並可獲得 Premium 訂閱等獎勵。</p>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
