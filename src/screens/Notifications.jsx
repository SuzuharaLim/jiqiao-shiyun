import { useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { notifications } from '../data/mock.js'

export default function Notifications() {
  const { push, setNotifRead } = useNav()
  useEffect(() => { setNotifRead(true) }, [setNotifRead])
  return (
    <>
      <TopBar title="通知" onBack />
      <div className="body">
        {notifications.map(n => (
          <button key={n.id} className="list-item tap" style={{ width: '100%', textAlign: 'left', background: 'var(--bg)' }}
            onClick={() => n.to && push(n.to, n.props || {})}>
            <div className="big">{n.emoji}</div>
            <div className="txt"><b style={{ fontWeight: 500 }}>{n.text}</b><span>{n.time}</span></div>
            <Icon name="chev" style={{ width: 16, stroke: 'var(--muted)' }} />
          </button>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
