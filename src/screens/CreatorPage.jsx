import { useState, useEffect } from 'react'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 創作者頁 —— 來自資料庫（GET /api/users/:handle）：真實貼文/作品/粉絲數，追蹤走後端。
export default function CreatorPage({ user = '', avatar = '🌾', avatarBg = '#cfe8d6' }) {
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
  // 作品集＝貼文＋市集作品（點開對應詳情）
  const gallery = [
    ...(data?.works || []).map(w => ({ ...w, kind: 'work' })),
    ...(data?.posts || []).map(p => ({ id: p.id, emoji: p.emoji, bg: p.bg, image: p.image, price: 0, kind: 'post' })),
  ]

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
          <div className="pf-av" style={{ background: u.avatarBg || avatarBg }}>{u.avatar || avatar}</div>
          <div className="stats">
            <div className="stat"><b>{data?.stats?.posts + data?.stats?.works || gallery.length}</b><span>作品</span></div>
            <div className="stat"><b>{followers.toLocaleString()}</b><span>粉絲</span></div>
            <div className="stat"><b>{(data?.works || []).filter(w => w.price).length}</b><span>可授權</span></div>
          </div>
        </div>
        <div className="pf-name">{u.name || u.handle}
          {['creator', 'moderator', 'admin'].includes(u.role) &&
            <span title="認證創作者" style={{ color: 'var(--gold)', marginLeft: 4, fontSize: 13 }}>✦ 創作者</span>}
        </div>
        <div className="pf-bio">{u.bio || '節氣風景攝影 📷'}</div>
        <div className="pf-btns">
          <button className={`b tap ${following ? '' : 'dark'}`} onClick={onFollow}>{following ? '追蹤中' : '追蹤'}</button>
          <button className="b tap" onClick={() => push('dms')}>訊息</button>
        </div>
        {data?.notfound ? (
          <div className="empty"><div className="big">🔍</div>找不到這位創作者</div>
        ) : data?.isPrivate && gallery.length === 0 ? (
          <div className="empty"><div className="big">🔒</div>私密帳號<br />對方未公開貼文與作品</div>
        ) : gallery.length === 0 ? (
          <div className="empty"><div className="big">📷</div>還沒有作品</div>
        ) : (
          <div className="grid">
            {gallery.map(it => (
              <button key={`${it.kind}-${it.id}`} className="gimg tap" style={{ background: it.bg, position: 'relative', overflow: 'hidden' }}
                onClick={() => push(it.kind === 'work' ? 'workDetail' : 'postDetail', { id: it.id })}>
                {it.image ? <PhotoImg src={it.image} /> : it.emoji}
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
