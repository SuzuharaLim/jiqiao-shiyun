import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

// ⚠️ 占卜紀錄尚未儲存到後端——沒有資料表也沒有 API。
// 這裡原本硬編了五筆假紀錄（含日期「今天 09:12」），會讓使用者以為自己問過。
export default function Records() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="我的占卜紀錄" onBack />
      <div className="body">
        <div className="empty">
          <div className="big">🎋</div>
          還沒有占卜紀錄<br />
          <span style={{ fontSize: 12 }}>抽過的籤、解過的夢、問過的運勢會留在這裡</span>
        </div>
        <div className="pad">
          <button className="btn-primary tap" onClick={() => push('aiChat')}>問 AI 時光顧問</button>
        </div>
        <p className="muted" style={{ padding: '0 16px', fontSize: 11, lineHeight: 1.7 }}>
          ＊紀錄保存功能仍在開發中，目前的占卜結果離開頁面後不會保留。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
