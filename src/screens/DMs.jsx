import { TopBar } from '../components/ui.jsx'

// ⚠️ 私訊子系統（即時訊息、未讀狀態、推播）尚未建置——沒有資料表也沒有 API。
// 這裡原本硬編了三則假對話，會讓使用者以為有人傳訊息給自己。
export default function DMs() {
  return (
    <>
      <TopBar title="私訊" onBack />
      <div className="body">
        <div className="empty">
          <div className="big">✉️</div>
          私訊功能尚未開放<br />
          <span style={{ fontSize: 12 }}>目前可以到作品底下留言，或在個人檔案追蹤創作者</span>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
