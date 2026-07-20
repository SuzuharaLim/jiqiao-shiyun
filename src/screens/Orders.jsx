import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

// 訂單狀態 → 標籤配色
const statusStyle = (s) => {
  if (s.includes('完成') || s.includes('出貨')) return { color: 'var(--yi)', bg: 'color-mix(in srgb, var(--yi) 14%, transparent)' }
  if (s.includes('取消') || s.includes('退')) return { color: 'var(--ji)', bg: 'color-mix(in srgb, var(--ji) 14%, transparent)' }
  return { color: 'var(--gold)', bg: 'color-mix(in srgb, var(--gold) 16%, transparent)' }
}

export default function Orders() {
  const { orders, setTab, popAll } = useNav()

  return (
    <>
      <TopBar title="我的訂單" onBack />
      <div className="body">
        {orders.length === 0 ? (
          <div className="empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>🧾</div>
            <div className="muted" style={{ margin: '10px 0 16px' }}>還沒有任何訂單</div>
            <button className="btn-primary tap" style={{ maxWidth: 220, margin: '0 auto' }}
              onClick={() => { popAll(); setTab(1) }}>逛逛市集 / 做一本月曆</button>
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 12, padding: '12px 16px 4px' }}>
              共 {orders.length} 筆訂單 · 授權下載與物流狀態同步於此
            </div>
            {orders.map(o => {
              const st = statusStyle(o.status)
              return (
                <div key={o.id} className="card ordercard">
                  <div className="orderhd">
                    <div>
                      <div className="ordid">{o.id}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{o.date} · {o.pay}</div>
                    </div>
                    <span className="ordtag" style={{ color: st.color, background: st.bg }}>{o.status}</span>
                  </div>
                  <div className="ordlines">
                    {o.items.map((it, i) => (
                      <div key={i} className="kv" style={{ padding: '6px 0', borderBottom: 'none' }}>
                        <span style={{ fontSize: 13.5 }}>{it.name}</span>
                        <b style={{ fontSize: 13.5 }}>NT${it.price}</b>
                      </div>
                    ))}
                  </div>
                  <div className="ordfoot">
                    <span className="muted" style={{ fontSize: 12 }}>共 {o.items.length} 項</span>
                    <span style={{ fontWeight: 800 }}>合計 NT${o.total}</span>
                  </div>
                </div>
              )
            })}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
