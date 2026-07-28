import { useEffect, useState } from 'react'
import { TopBar, Avatar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 粉絲／追蹤中名單 —— 全部來自 follows 資料表，沒有任何示範資料。
export default function FollowList({ handle, rel = 'followers' }) {
  const { push } = useNav()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)   // 區分「載入中」與「真的沒有」
  const isFollowers = rel === 'followers'

  useEffect(() => {
    if (!handle || handle === 'guest') { setLoading(false); return }
    let alive = true
    const call = isFollowers ? api.followers(handle) : api.following(handle)
    call.then(r => { if (alive && Array.isArray(r.users)) setUsers(r.users) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [handle, rel])

  return (
    <>
      <TopBar title={isFollowers ? '粉絲' : '追蹤中'} onBack />
      <div className="body">
        {users.map(u => (
          <button key={u.id} className="tool tap" onClick={() => push('creatorPage', { user: u.handle })}>
            <div className="ti" style={{ background: u.avatarBg || 'var(--chip)', borderRadius: '50%', width: 44, height: 44, fontSize: 'var(--text-lg)', overflow: 'hidden' }}>
              <Avatar imageId={u.avatarImageId} emoji={u.avatar || '🌾'} />
            </div>
            <div className="tn2">
              <b>{u.name || u.handle}</b>
              <span>@{u.handle}{u.bio ? `　${u.bio}` : ''}</span>
            </div>
          </button>
        ))}

        {loading && users.length === 0 && <div className="empty">載入中…</div>}

        {!loading && users.length === 0 && (
          <div className="empty">
            <div className="big">{isFollowers ? '👥' : '🔭'}</div>
            {isFollowers ? '還沒有粉絲' : '還沒有追蹤任何人'}<br />
            <span style={{ fontSize: 'var(--text-xs)' }}>
              {isFollowers ? '發布作品讓更多人看見你' : '到探索頁看看其他創作者'}
            </span>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
