import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { creatorStats } from '../data/mock.js'

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
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--acard-t)', margin: '4px 0 12px' }}>NT$ {balance.toLocaleString()}</div>
          <button className="go tap" onClick={doWithdraw} style={balance <= 0 ? { opacity: .5 } : null}>
            {balance <= 0 ? '已申請提領' : '提領到銀行帳戶'}
          </button>
        </div>

        <div className="pad" style={{ display: 'flex', gap: 8 }}>
          <div className="card" style={{ flex: 1, margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{creatorStats.monthSales}</div>
            <div className="muted" style={{ fontSize: 11 }}>本月成交</div>
          </div>
          <div className="card" style={{ flex: 1, margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{creatorStats.licensed}</div>
            <div className="muted" style={{ fontSize: 11 }}>作品被選用</div>
          </div>
        </div>

        <SectionHead title="近期入帳" />
        {creatorStats.rows.map((r, i) => (
          <div key={i} className="kv" style={{ padding: '12px 16px' }}>
            <span>{r.name}</span><b style={{ color: 'var(--yi)' }}>+NT${r.amount}</b>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
