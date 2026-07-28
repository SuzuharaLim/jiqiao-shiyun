import { TopBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'

// 手帳／月曆專案。
// ⚠️ 專案子系統（草稿儲存、狀態流轉、企業客製報價）尚未建置——沒有資料表也沒有 API。
// 原本這裡讀 mock.js 的 projects，會讓使用者看到自己從未建立過的「專案」。
// 在真的做出來之前，一律顯示空狀態，不得再放示範資料。
export default function MyProjects() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="我的專案" onBack />
      <div className="body">
        <div className="empty">
          <div className="empty-ic"><Icon name="book2" /></div>
          還沒有專案<br />
          <span style={{ fontSize: 'var(--text-xs)' }}>做好的月曆會存成專案，方便之後繼續編輯或下單</span>
        </div>
        <div className="pad">
          <button className="btn-primary tap" onClick={() => push('makeCalendar')}>＋ 建立新月曆</button>
        </div>
        <p className="muted" style={{ padding: '0 16px', fontSize: 'var(--text-2xs)', lineHeight: 1.7 }}>
          ＊專案儲存功能仍在開發中，目前做好的月曆離開頁面後不會保留。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
