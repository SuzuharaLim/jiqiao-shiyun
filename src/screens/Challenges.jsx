import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent, usePosts, useWorks } from '../hooks/useApi.js'
import { dayFor, todayOffset } from '../data/almanac.js'

// 距離下一個節氣還有幾天 —— 往後掃曆算，直到節氣名改變。
// 節氣間隔約 15 天，掃 20 天足夠；掃不到就回 null（不顯示，而不是編一個數字）。
function daysToNextTerm(off, term) {
  for (let i = 1; i <= 20; i++) {
    if (dayFor(off + i).term.replace('（交節）', '') !== term) return i
  }
  return null
}

export default function Challenges() {
  const { push } = useNav()
  const today = dayFor(todayOffset())
  const term = today.term.replace('（交節）', '')

  // ⚠️ 參加人數與剩餘天數過去寫死在 mock.js（328 人 / 2 天 / 標題還停在「芒種」）。
  // 人數造假等於謊報活動熱度，一律改由真實投稿計算。
  const posts = usePosts()
  const works = useWorks(null)
  const entries = [...posts, ...works].filter(x => x.term === term)
  const joined = new Set(entries.map(x => x.user).filter(Boolean)).size
  const left = daysToNextTerm(todayOffset(), term)

  // ref_items 只保留獎勵與規則文案（可由管理後台編輯），不再存人數／天數。
  const cfg = useContent('challenges')[0] || {}
  const prize = cfg.prize || '前 3 名作品收錄官方植物月曆'

  return (
    <>
      <TopBar title="節氣挑戰活動" onBack />
      <div className="body">
        <div className="card">
          <h4>🎯 {term}攝影挑戰</h4>
          <div className="kv"><span>獎勵</span><span className="muted">{prize}</span></div>
          <div className="kv">
            <span>參加人數</span>
            <span className="muted">{joined} 人{joined === 0 && '　（還沒有人投稿，快來當第一個）'}</span>
          </div>
          {/* 剩餘天數用 --gold（加深橙 5.28 ✓）；--heart/--go 是填色用的原色橙，
              當文字在白底只有 3.18 不合 AA。
              ⚠️ JSX 註解不可放在 `{cond && (` 之後——那會變成兩個運算式，整支檔案編譯失敗。 */}
          {left !== null && (
            <div className="kv"><span>剩餘</span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{left} 天</span></div>
          )}
          <div className="kv" style={{ borderBottom: 'none' }}>
            <span>投稿作品</span><span className="muted">{entries.length} 件</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="b tap" onClick={() => push('challengesBoard')}>排行榜</button>
            <button className="b dark tap" onClick={() => push('camera')}>參加投稿</button>
          </div>
        </div>

        <SectionHead title="玩法" />
        <div className="article" style={{ paddingTop: 4 }}>
          <p>
            每個節氣一檔，發布作品時標記當前節氣即自動參賽。依社群按讚與官方評審加權排名，
            前段名次作品將收錄進官方植物月曆，並可獲得 Premium 訂閱等獎勵。
          </p>
          <p className="muted" style={{ fontSize: 12 }}>
            ＊參加人數與投稿件數為即時統計（標記「{term}」的貼文與市集作品）；
            剩餘天數依節氣交節日推算。
          </p>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
