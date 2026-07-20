// 桌機版「網站式」頂部導覽列（≥900px；取代側邊欄與底部分頁列，讓電腦版像網頁而非 App）
import Icon from './Icon.jsx'
import { useNav } from '../store/nav.jsx'

const NAV = [
  { i: 0, label: '今日曆頁' }, { i: 1, label: '探索' }, { i: 2, label: '建立' },
  { i: 3, label: '占卜' }, { i: 4, label: '我的' },
]

export default function WebNav() {
  const { tab, setTab, theme, toggleTheme, user, logout, push, notifRead } = useNav()
  return (
    <header className="webnav">
      <div className="wn-inner">
        <button className="wn-brand tap" onClick={() => setTab(0)} aria-label="回首頁">
          <span className="wn-seal">印</span><span className="wn-word">機巧時運</span>
        </button>

        <nav className="wn-links" aria-label="主導覽">
          {NAV.map(n => (
            <button key={n.i} className={`wn-link tap ${tab === n.i ? 'on' : ''}`}
              onClick={() => setTab(n.i)} aria-current={tab === n.i ? 'page' : undefined}>{n.label}</button>
          ))}
        </nav>

        <div className="wn-right">
          <button className="wn-icon wn-scan tap" onClick={() => push('scan')} aria-label="掃描明信片"><Icon name="scan" /></button>
          <button className="wn-icon tap" onClick={() => push('notifications')} aria-label="通知">
            <Icon name="bell" />{!notifRead && <span className="badge-dot" />}
          </button>
          <button className="wn-icon tap" onClick={() => push('dms')} aria-label="私訊"><Icon name="send" /></button>
          <button className="wn-icon tap" onClick={toggleTheme} aria-label="切換主題">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <button className="wn-user tap" onClick={() => push('settings')} aria-label="帳號與設定">
            <span className="wn-ava">{user?.avatar || (user?.guest ? '👤' : '🌾')}</span>
            <span className="wn-uname">{user?.name || '使用者'}</span>
          </button>
          <button className="wn-logout tap" onClick={logout}>登出</button>
        </div>
      </div>
    </header>
  )
}
