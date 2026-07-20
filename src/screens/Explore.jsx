import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { works, exploreChips } from '../data/mock.js'

const creators = [
  { user: 'flora.tw', emoji: '🌸', bg: '#fce7f3', works: 36 },
  { user: 'wang_photo', emoji: '🌾', bg: '#cfe8d6', works: 28 },
  { user: 'lin_ocean', emoji: '🌊', bg: '#dbeafe', works: 21 },
  { user: 'sky_diary', emoji: '🌅', bg: '#ffedd5', works: 17 },
]

export default function Explore() {
  const { push, setToast } = useNav()
  const [chip, setChip] = useState('全部')
  const [q, setQ] = useState('')

  const list = works.filter(w => {
    const okChip = chip === '全部' || w.term === chip
    const okQ = !q || w.title.includes(q) || w.author.includes(q) || w.term.includes(q)
    return okChip && okQ
  })

  return (
    <>
      <TopBar title="探索・節氣冊"
        right={<button className="iconbtn tap" aria-label="分享" onClick={() => {
          const url = location.href
          if (navigator.share) navigator.share({ title: '機巧時運 · 探索', url }).catch(() => {})
          else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
        }}><Icon name="share" /></button>} />

      <div className="body">
        <div className="search">
          <Icon name="search" style={{ width: 17, height: 17, stroke: 'var(--muted)' }} />
          <input placeholder="搜尋節氣、植物、創作者" aria-label="搜尋節氣、植物、創作者" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {/* 節氣選擇輪 */}
        <div className="termwheel">
          {exploreChips.map(c => (
            <button key={c} className={`tm tap ${chip === c ? 'on' : c === '芒種' ? 'now' : ''}`}
              onClick={() => setChip(c)}>{c === '芒種' ? '● 芒種' : c}</button>
          ))}
        </div>

        {/* 節氣挑戰封面 */}
        <button className="coverbig tap" onClick={() => push('challenges')} style={{ width: 'calc(100% - 26px)' }}>
          <div className="bt">🎯 芒種攝影挑戰</div>
          <div className="bd">拍下你的芒種，前 3 名收錄官方植物月曆 · 328 人參加 · 剩 2 天</div>
        </button>

        {/* 本月人氣創作者 */}
        <div className="railhd"><div className="t">本月人氣創作者</div><span className="more">依被選用數</span></div>
        <div className="rail">
          {creators.map(c => (
            <button key={c.user} className="railcard tap" style={{ width: 92 }}
              onClick={() => push('creatorPage', { user: c.user, avatar: c.emoji, avatarBg: c.bg })}>
              <div className="seal" style={{ background: c.bg, width: 66, height: 66, margin: '0 auto', borderRadius: '50%', border: '2px solid var(--gold)' }}>{c.emoji}</div>
              <div className="cap center" style={{ marginTop: 7 }}>@{c.user}</div>
              <div className="by center">{c.works} 件作品</div>
            </button>
          ))}
        </div>

        {/* 作品冊頁（2 欄框卡，非 IG 無縫方格） */}
        <div className="railhd"><div className="t">{chip === '全部' ? '全部作品' : <>〈<small>{chip}</small>〉作品</>}</div><span className="more">{list.length} 件</span></div>
        {list.length === 0 ? (
          <div className="empty"><div className="big">🔍</div>找不到「{q || chip}」的作品</div>
        ) : (
          <div className="album">
            {list.map(w => (
              <button key={w.id} className="it tap" onClick={() => push('workDetail', { id: w.id })}>
                <div className="ph" style={{ background: w.bg }}>
                  {w.emoji}
                  {w.price && <div className="gbadge">NT${w.price}</div>}
                </div>
                <div className="cap">{w.title}<small>@{w.author} · {w.term}</small></div>
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
