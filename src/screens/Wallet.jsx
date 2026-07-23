import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

// 錢包／收益。
// ⚠️ 分潤結算子系統（成交紀錄、入帳明細、提領）尚未建置——沒有資料表也沒有 API。
// 原本這裡顯示 mock.js 的 creatorStats：本月成交 42、被選用 18、三筆入帳明細，
// 且 nav.jsx 把餘額初始化成 NT$1,840。使用者會看到自己從沒賺過的錢。
// 在真的接上金流與結算之前，一律顯示 0 與空狀態。
export default function Wallet() {
  const { setToast, balance, withdraw } = useNav()
  const doWithdraw = () => {
    const amt = balance
    if (!withdraw()) { setToast('目前沒有可提領餘額'); return }
    setToast(`提領 NT$${amt.toLocaleString()} 已送出，1–3 個工作天入帳 💸`)
  }
  return (
    <>
      <TopBar title="錢包 / 收益" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t" style={{ fontSize: 13 }}>可提領餘額</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--acard-t)', margin: '4px 0 12px' }}>
            NT$ {balance.toLocaleString()}
          </div>
          <button className="go tap" onClick={doWithdraw} style={balance <= 0 ? { opacity: .5 } : null}>
            {balance <= 0 ? '尚無可提領金額' : '提領到銀行帳戶'}
          </button>
        </div>

        <div className="empty">
          <div className="big">💸</div>
          還沒有收益紀錄<br />
          <span style={{ fontSize: 12 }}>作品被授權或選入月曆後，分潤會出現在這裡</span>
        </div>

        <p className="muted" style={{ padding: '0 16px', fontSize: 11, lineHeight: 1.7 }}>
          ＊分潤結算與提領功能仍在開發中（尚未串接金流），目前不會產生任何金額。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
