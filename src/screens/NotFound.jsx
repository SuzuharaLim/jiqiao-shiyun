import { TopBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'

// 找不到頁面。
// ⚠️ 伺服器對未知路由已回真正的 404 狀態碼（server/seo.js 的路由表），
// 但畫面原本會靜默顯示首頁——使用者不知道自己打錯網址，只覺得「連結壞了」。
// 這裡給明確說明與出口，不要讓人走到死路。
export default function NotFound() {
  const { setTab, push } = useNav()
  return (
    <>
      <TopBar title="找不到這個頁面" />
      <div className="body">
        <div className="empty">
          <div className="empty-ic"><Icon name="search" /></div>
          找不到這個頁面<br />
          <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            網址可能打錯了，或這個內容已經被移除
          </span>
        </div>
        <div className="pad">
          <button className="btn-primary tap" onClick={() => setTab(0)}>回今日曆頁</button>
        </div>
        <div className="sech"><span className="sech-t">你可能想找</span></div>
        <button className="tool tap" onClick={() => push('almanacDay')}>
          <div className="ti ti-line"><Icon name="scroll" /></div>
          <div className="tn2"><b>今日完整國民曆</b><span>宜忌 · 吉時 · 沖煞 · 建除</span></div>
          <Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <button className="tool tap" onClick={() => setTab(1)}>
          <div className="ti ti-line"><Icon name="search" /></div>
          <div className="tn2"><b>探索節氣作品</b><span>看看此刻的台灣</span></div>
          <Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <button className="tool tap" onClick={() => push('solarterms')}>
          <div className="ti ti-line"><Icon name="branch" /></div>
          <div className="tn2"><b>二十四節氣專欄</b><span>由來 · 物候 · 養生</span></div>
          <Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
