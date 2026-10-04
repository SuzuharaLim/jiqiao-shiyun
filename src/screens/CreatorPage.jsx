import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg, PostCover, Avatar} from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { stripEmoji } from '../lib/text.js'   // DB 的舊 bio 仍帶 emoji（全站禁用）

// 創作者頁 —— 來自資料庫（GET /api/users/:handle）：真實貼文/作品/粉絲數，追蹤走後端。
export default function CreatorPage({ user = '', avatar = '', avatarBg = 'var(--tone-2)' }) {
  const { push, setToast, requireAccount } = useNav()
  const [data, setData] = useState(null)
  const [following, setFollowing] = useState(false)
  const [followers, setFollowers] = useState(0)

  useEffect(() => {
    let alive = true
    api.userProfile(user).then(r => {
      if (!alive) return
      setData(r); setFollowing(r.isFollowing); setFollowers(r.stats.followers)
    }).catch(() => { if (alive) setData({ notfound: true }) })
    return () => { alive = false }
  }, [user])

  const u = data?.user || { handle: user, name: user, avatar, avatarBg, bio: '' }
  // 作品集＝貼文 ∪ 市集作品，但**以照片去重**。
  // ⚠️ 上架市集時會同時建立 post 與 work（NewPost 先 createPost 再 createWork），
  // 直接串接會讓同一張照片出現兩次。標題不是可靠的鍵（兩者標題可各自不同），
  // 用圖片 URL 當鍵才對得準；沒有圖片的則各自保留，不會被誤併。
  // 同一張照片配到 work 時只補上價格徽章，不多開一格。
  const gallery = (() => {
    const m = new Map()
    ;(data?.posts || []).forEach(p =>
      m.set(p.image || `post:${p.id}`,
        { id: p.id, emoji: p.emoji, bg: p.bg, image: p.image, price: 0, kind: 'post', title: p.title, caption: p.caption }))
    ;(data?.works || []).forEach(w => {
      const k = w.image || `work:${w.id}`
      const hit = m.get(k)
      if (hit) hit.price = w.price || 0
      else m.set(k, { id: w.id, emoji: w.emoji, bg: w.bg, image: w.image, price: w.price || 0, kind: 'work' })
    })
    return [...m.values()]
  })()

  const onFollow = async () => {
    if (!requireAccount(`追蹤 @${u.handle}`)) return
    const next = !following; setFollowing(next); setFollowers(c => c + (next ? 1 : -1))
    try { const r = await api.follow({ handle: u.handle }); setFollowing(r.following); setFollowers(r.followers); setToast(r.following ? `已追蹤 @${u.handle} ✓` : '已取消追蹤') }
    catch { setFollowing(!next); setFollowers(c => c + (next ? -1 : 1)); setToast('操作失敗') }
  }

  return (
    <>
      <TopBar title={u.handle || user} onBack />
      <div className="body">
        <div className="pf-hd">
          <div className="pf-av" style={{ background: u.avatarBg || avatarBg, overflow: 'hidden' }}>
            <Avatar imageId={u.avatarImageId} emoji={u.avatar || avatar} />
          </div>
          <div className="stats">
            {/* 用去重後的實際格數，數字才與底下相簿一致。
                ⚠️ 原本是 `posts + works || gallery.length`，有兩個 bug：
                (1) 相加會重複計算同一張照片；
                (2) `a + b || c` 的優先序是 `(a+b) || c`，真的 0 件時會落到後備值。 */}
            <div className="stat"><b>{gallery.length}</b><span>作品</span></div>
            <div className="stat"><b>{followers.toLocaleString()}</b><span>粉絲</span></div>
            <div className="stat"><b>{(data?.works || []).filter(w => w.price).length}</b><span>可授權</span></div>
          </div>
        </div>
        <div className="pf-name">{u.name || u.handle}
          {['creator', 'moderator', 'admin'].includes(u.role) &&
            <span title="認證創作者" style={{ color: 'var(--gold)', marginLeft: 4, fontSize: 'var(--text-xs)' }}>✦ 創作者</span>}
        </div>
        <div className="pf-bio">{stripEmoji(u.bio || '') || '節氣風景攝影'}</div>
        <div className="pf-btns">
          <button className={`b tap ${following ? '' : 'dark'}`} onClick={onFollow}>{following ? '追蹤中' : '追蹤'}</button>
          <button className="b tap" onClick={() => push('dms')}>訊息</button>
        </div>
        {data?.notfound ? (
          <div className="empty"><div className="empty-ic"><Icon name="search" /></div>找不到這位創作者</div>
        ) : data?.isPrivate && gallery.length === 0 ? (
          <div className="empty"><div className="empty-ic"><Icon name="lock" /></div>私密帳號<br />對方未公開貼文與作品</div>
        ) : gallery.length === 0 ? (
          <div className="empty"><div className="empty-ic"><Icon name="photo2" /></div>還沒有作品</div>
        ) : (
          <div className="grid">
            {gallery.map(it => (
              <button key={`${it.kind}-${it.id}`} className="gimg tap" style={{ background: it.bg, position: 'relative', overflow: 'hidden' }}
                onClick={() => push(it.kind === 'work' ? 'workDetail' : 'postDetail', { id: it.id })}>
                <PostCover image={it.image} alt={`${it.title}｜${it.term || "節氣"}攝影作品`} title={it.title} caption={it.caption} />
                {it.price ? <div className="gbadge">${it.price}</div> : null}
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
