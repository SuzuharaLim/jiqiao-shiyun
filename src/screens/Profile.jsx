import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, ToolRow, SectionHead, PhotoImg, Avatar} from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

export default function Profile() {
  const { push, subscribed, followCount, user, logout, orders } = useNav()
  const [view, setView] = useState('works') // works | market | books
  const [my, setMy] = useState(null)         // { stats, posts, works } —— 登入者真實內容

  useEffect(() => {
    if (!user || user.guest || !user.handle) { setMy(null); return }
    let alive = true
    api.userProfile(user.handle).then(r => { if (alive) setMy(r) }).catch(() => {})
    return () => { alive = false }
  }, [user?.handle, user?.guest])

  const me = {
    name: user?.name || user?.handle || '訪客', handle: user?.handle || 'guest',
    bio: user?.bio || '尚未填寫簡介', avatar: user?.avatar || '🌾', avatarImageId: user?.avatarImageId || null,
    avatarBg: user?.avatarBg || '#f3e7c9', guest: user?.guest,
  }
  // 統計與作品嚴格來自資料庫；未登入/未載入 → 顯示 0 與空狀態
  // ⚠️「作品」＝posts 而非 posts+works。上架市集的作品一定同時有一則貼文
  // （NewPost.publish 先 createPost 再 createWork），相加會把同一張照片算兩次——
  // 先前顯示「作品 3」但點進去只有 2 件。市集上架是其中的子集，另外計。
  const stats = my ? { works: my.stats.posts, followers: my.stats.followers, following: my.stats.following }
    : { works: 0, followers: 0, following: followCount() }
  const minePosts = my ? my.posts : []
  const marketWorks = my ? my.works : []
  const shown = view === 'market' ? marketWorks : minePosts
  const openItem = (it) => push(view === 'market' ? 'workDetail' : 'postDetail', { id: it.id })

  return (
    <>
      <TopBar title={me.handle}
        right={<button className="iconbtn tap" onClick={() => push('settings')} aria-label="設定"><Icon name="menu" /></button>} />

      <div className="body">
        <div className="tiepost">
          <div className="band" />
          <div className="row1">
            <div className="seal" style={{ background: me.avatarBg, overflow: 'hidden' }}>
              <Avatar imageId={me.avatarImageId} emoji={me.avatar} />
            </div>
            <div className="nm">
              <div className="n">{me.name} {subscribed && <span style={{ color: 'var(--gold)', fontSize: 13 }}>· Premium ✦</span>}</div>
              <div className="h">@{me.handle}</div>
            </div>
          </div>
          <div className="bio">{me.bio}　<button className="acc tap" style={{ fontSize: 12, fontWeight: 400 }}
            onClick={() => push('followList', { handle: me.handle, rel: 'following' })}>· 追蹤中 {stats.following ?? followCount()} 位</button></div>
          {/* 三個統計都可點：作品／市集上架切換下方清單，粉絲開真實名單 */}
          <div className="nums">
            <button className="tap" onClick={() => setView('works')}>
              <b>{stats.works}</b><span>作品</span>
            </button>
            <button className="tap" onClick={() => push('followList', { handle: me.handle, rel: 'followers' })}>
              <b>{stats.followers}</b><span>粉絲</span>
            </button>
            <button className="tap" onClick={() => setView('market')}>
              <b>{my ? my.stats.works : 0}</b><span>市集上架</span>
            </button>
          </div>
        </div>

        {me.guest && (
          <div className="note" style={{ borderColor: 'var(--cinnabar)' }}>
            你目前是訪客，註冊即可發文、購買與同步資料
            <button className="acc tap" onClick={() => { logout() }}>註冊 / 登入</button>
          </div>
        )}

        <div className="pf-btns">
          <button className="b tap" onClick={() => push('editProfile')}>編輯名帖</button>
          <button className="b dark tap" onClick={() => push('creatorConsole')}>創作者後台</button>
        </div>

        <ToolRow icon="🧾" bg="#e0ecff" title="我的訂單" sub={`購買紀錄 · 授權下載${orders.length ? ` · ${orders.length} 筆` : ''}`} onClick={() => push('orders')} />
        <ToolRow icon="📔" bg="#f3e7c9" title="我的手帳專案" sub="草稿 · 歷年月曆 · 重訂" onClick={() => push('myProjects')} />
        <ToolRow icon="🔮" bg="#e9e3fb" title="我的占卜紀錄" sub="運勢 · 籤詩 · 解夢" onClick={() => push('records')} />
        <ToolRow icon="✦" bg="#f3e7c9" title="訂閱與帳號" sub={subscribed ? 'Premium 會員 · 管理' : 'Free · 升級 Premium'} onClick={() => push('subscription')} />
        <ToolRow icon="💰" bg="#dcfce7" title="錢包 / 收益" sub="訂單 · 授權 · 提領" onClick={() => push('wallet')} />
        <ToolRow icon="🛍️" bg="#ffedd5" title="商店" sub="手帳 · 方案 · 企業版" onClick={() => push('store')} />

        <SectionHead title="我的作品冊" />
        <div className="termwheel" style={{ borderBottom: 'none', paddingBottom: 4 }}>
          {[['works', '節氣作品'], ['market', '市集上架'], ['books', '我的月曆']].map(([k, l]) => (
            <button key={k} className={`tm tap ${view === k ? 'on' : ''}`} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        {view === 'books' ? (
          <div className="empty"><div className="big">📔</div>你製作的月曆與手帳會收藏在這裡<br />
            <button className="pill dark tap" style={{ marginTop: 12 }} onClick={() => push('makeCalendar')}>＋ 做一本月曆</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty"><div className="big">📷</div>{view === 'market' ? '還沒有上架市集的作品' : '還沒有作品，去發一則吧'}
            <br /><button className="pill dark tap" style={{ marginTop: 12 }} onClick={() => push('camera')}>＋ 開相機創作</button>
          </div>
        ) : (
          <div className="album">
            {shown.map(w => (
              <button key={w.id} className="it tap" onClick={() => openItem(w)}>
                <div className="ph" style={{ background: w.bg, position: 'relative', overflow: 'hidden' }}>
                  {w.image ? <PhotoImg src={w.image} /> : w.emoji}
                  {w.price ? <div className="gbadge">NT${w.price}</div> : null}
                </div>
                <div className="cap">{w.title}<small>{w.term}{w.price ? ' · 市集上架' : ''}</small></div>
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
