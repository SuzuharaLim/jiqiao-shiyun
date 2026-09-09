import { stripEmoji } from '../lib/text.js'
import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

export default function Notifications() {
  const { push, setNotifRead, user } = useNav()
  const [notifications, setNotifications] = useState([])   // 嚴格來自資料庫
  const [loading, setLoading] = useState(true)             // 區分「載入中」與「真的沒通知」
                                                           // ——兩者都是空陣列，不分會讓使用者以為壞了
  useEffect(() => { setNotifRead(true) }, [setNotifRead])
  useEffect(() => {
    if (!user) { setLoading(false); return }
    let alive = true
    api.notifications().then(r => {
      if (alive && r.notifications) setNotifications(r.notifications)
      // 開啟通知中心＝全部標為已讀（存 DB，跨重整/裝置一致）
      if (r.unread) api.notificationsRead().catch(() => {})
    }).catch(() => {}).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user])
  return (
    <>
      <TopBar title="通知" onBack />
      <div className="body">
        {notifications.map(n => (
          <button key={n.id} className="list-item tap" style={{ width: '100%', textAlign: 'left', background: 'var(--bg)' }}
            onClick={() => n.to && push(n.to, n.props || {})}>
            <div className="big"><Icon name="bell" /></div>
            <div className="txt"><b style={{ fontWeight: 500 }}>{stripEmoji(n.text)}</b><span>{n.time}</span></div>
            <Icon name="chev" style={{ width: 16, stroke: 'var(--muted)' }} />
          </button>
        ))}
        {loading && notifications.length === 0 && (
          <div className="empty">載入中…</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="empty">
            <div className="empty-ic"><Icon name="bell2" /></div>
            還沒有通知<br />
            <span style={{ fontSize: 'var(--text-xs)' }}>有人按讚、留言或追蹤你時，會出現在這裡</span>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
