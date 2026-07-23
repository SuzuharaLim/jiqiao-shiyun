import { TopBar } from '../components/ui.jsx'

// ⚠️ 私訊子系統尚未建置。原本這裡讀 mock.js 的 dmThreads，會顯示一段
// 使用者從未收到過的對話（含對方的訊息內容），並用腳本自動「回覆」。
export default function DMThread({ user }) {
  return (
    <>
      <TopBar title={user || '私訊'} onBack />
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
