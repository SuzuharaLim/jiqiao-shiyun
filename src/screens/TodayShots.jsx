import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg, PostCover } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { usePosts, useWorks } from '../hooks/useApi.js'

// 「今日大家拍的」看更多 —— 社群貼文＋市集作品合併成完整相簿，當前節氣的排前面。
export default function TodayShots({ term }) {
  const { push } = useNav()
  const posts = usePosts(null)
  const works = useWorks(null)
  const items = [
    ...posts.map(p => ({ id: p.id, kind: 'post', emoji: p.emoji, bg: p.bg, image: p.image, title: p.title, caption: p.caption, by: p.user, term: p.term })),
    ...works.map(w => ({ id: w.id, kind: 'work', emoji: w.emoji, bg: w.bg, image: w.image, title: w.title, by: w.author, term: w.term, price: w.price })),
  ]
  const sorted = [...items].sort((a, b) => (b.term === term) - (a.term === term))
  const open = (it) => it.kind === 'post' ? push('postDetail', { id: it.id }) : push('workDetail', { id: it.id })

  return (
    <>
      <TopBar title={term ? `今日大家拍的〈${term}〉` : '今日大家拍的'} onBack />
      <div className="body">
        <div className="railhd"><div className="t">節氣攝影作品</div><span className="more">{items.length} 件</span></div>
        <div className="album">
          {sorted.map((it, i) => (
            <button key={`${it.kind}-${it.id}-${i}`} className="it tap" onClick={() => open(it)}>
              <div className="ph" style={{ background: it.bg, position: 'relative', overflow: 'hidden' }}>
                <PostCover image={it.image} alt={`${it.title}｜${it.term || "節氣"}攝影，攝影者 @${it.user}`} title={it.title} caption={it.caption} term={it.term} />
                {it.price && <div className="gbadge">NT${it.price}</div>}
              </div>
              <div className="cap">{it.title}<small>@{it.by} · {it.term}</small></div>
            </button>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
