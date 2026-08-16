import { Avatar, Seal, Link } from './ui.jsx'
// 桌機版「網站式」頂部導覽列（≥900px；取代側邊欄與底部分頁列，讓電腦版像網頁而非 App）
import Icon from './Icon.jsx'
import { useNav } from '../store/nav.jsx'

const NAV = [
  { i: 0, label: '今日曆頁' }, { i: 1, label: '探索' }, { i: 2, label: '建立' },
  { i: 3, label: '曆書' }, { i: 4, label: '我的' },
]

export default function WebNav() {
  const { tab, theme, toggleTheme, user, logout, notifRead } = useNav()
  return (
    <header className="webnav">
      <div className="wn-inner">
        <Link tab={0} className="wn-brand tap" aria-label="回首頁">
          <Seal className="wn-seal" badge /><span className="wn-word">機巧時運</span>
        </Link>

        <nav className="wn-links" aria-label="主導覽">
          {/* 真連結：中鍵/Cmd+點擊可開新分頁；一般左鍵仍走 SPA（Link 內處理） */}
          {NAV.map(n => (
            <Link key={n.i} tab={n.i} className={`wn-link tap ${tab === n.i ? 'on' : ''}`}
              aria-current={tab === n.i ? 'page' : undefined}>{n.label}</Link>
          ))}
        </nav>

        <div className="wn-right">
          <Link screen="scan" className="wn-icon wn-scan tap" aria-label="掃描明信片"><Icon name="scan" /></Link>
          <Link screen="notifications" className="wn-icon tap" aria-label="通知">
            <Icon name="bell" />{!notifRead && <span className="badge-dot" />}
          </Link>
          <Link screen="dms" className="wn-icon tap" aria-label="私訊"><Icon name="send" /></Link>
          <button className="wn-icon tap" onClick={(e) => toggleTheme(e)} aria-label="切換主題">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <Link screen="settings" className="wn-user tap" aria-label="帳號與設定">
            <span className="wn-ava" style={{ overflow: 'hidden' }}>
              <Avatar imageId={user?.avatarImageId} emoji={user?.avatar || (user?.guest ? '👤' : '🌾')} />
            </span>
            <span className="wn-uname">{user?.name || '使用者'}</span>
          </Link>
          {/* ★★ 訪客沒有帳號，「登出」對他毫無意義——他要的是「登入／註冊」。
              ⚠️ 訪客身分是純前端狀態（`jq-guest`），所以「登入」也要先清掉它，
                 否則按下去只會回到同一個訪客畫面。`logout()` 本來就會清。 */}
          <button className="wn-logout tap" onClick={logout}>
            {user?.guest ? '登入／註冊' : '登出'}
          </button>
        </div>
      </div>
    </header>
  )
}
