import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { works } from '../data/mock.js'

export default function CreatorPage({ user = 'wang_photo', avatar = '🌾', avatarBg = '#cfe8d6' }) {
  const { push, setToast, following, toggleFollow } = useNav()
  const isFollowing = following[user]
  const own = works.filter(w => w.author === user)
  const grid = own.length ? own : works.slice(0, 6)
  return (
    <>
      <TopBar title={user} onBack />
      <div className="body">
        <div className="pf-hd">
          <div className="pf-av" style={{ background: avatarBg }}>{avatar}</div>
          <div className="stats">
            <div className="stat"><b>{grid.length}</b><span>作品</span></div>
            <div className="stat"><b>{(1247 + (isFollowing ? 1 : 0)).toLocaleString()}</b><span>粉絲</span></div>
            <div className="stat"><b>{grid.filter(w => w.price).length}</b><span>可授權</span></div>
          </div>
        </div>
        <div className="pf-name">{user}</div>
        <div className="pf-bio">節氣風景攝影 📷　可授權製作月曆</div>
        <div className="pf-btns">
          <button className={`b tap ${isFollowing ? '' : 'dark'}`} onClick={() => { toggleFollow(user); setToast(isFollowing ? '已取消追蹤' : `已追蹤 @${user} ✓`) }}>
            {isFollowing ? '追蹤中' : '追蹤'}
          </button>
          <button className="b tap" onClick={() => push('dms')}>訊息</button>
        </div>
        <div className="grid">
          {grid.map(w => (
            <button key={w.id} className="gimg tap" style={{ background: w.bg }} onClick={() => push('workDetail', { id: w.id })}>
              {w.emoji}{w.price && <div className="gbadge">${w.price}</div>}
            </button>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
