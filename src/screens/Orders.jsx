import { useState } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 訂單狀態 → 標籤配色
const statusStyle = (s) => {
  if (s.includes('完成') || s.includes('出貨')) return { color: 'var(--yi)', bg: 'color-mix(in srgb, var(--yi) 14%, transparent)' }
  if (s.includes('取消') || s.includes('退')) return { color: 'var(--ji)', bg: 'color-mix(in srgb, var(--ji) 14%, transparent)' }
  return { color: 'var(--gold)', bg: 'color-mix(in srgb, var(--gold) 16%, transparent)' }
}

export default function Orders() {
  const { orders, setTab, popAll, setToast, refreshOrders } = useNav()
  // 兩段式取消：第一次點顯示確認，避免誤觸取消掉真的要買的訂單
  const [arm, setArm] = useState(null)
  const [busy, setBusy] = useState(false)
  // ⚠️ 只有「處理中／待付款」可自行取消（與後端規則一致）；
  // 已付款或已出貨要走客服，否則使用者可能取消掉已在處理的實體訂單。
  const cancellable = (st) => ['處理中', '待付款'].includes(st)
  const doCancel = async (id) => {
    if (busy) return
    setBusy(true)
    try {
      await api.cancelOrder(id, { reason: '使用者自行取消' })
      setToast('訂單已取消')
      setArm(null)
      await refreshOrders()
    } catch (e) { setToast(e?.message || '取消失敗') }
    finally { setBusy(false) }
  }

  return (
    <>
      <TopBar title="我的訂單" onBack />
      <div className="body">
        {orders.length === 0 ? (
          <div className="empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-3xl)' }}>🧾</div>
            <div className="muted" style={{ margin: '10px 0 16px' }}>還沒有任何訂單</div>
            <button className="btn-primary tap" style={{ maxWidth: 220, margin: '0 auto' }}
              onClick={() => { popAll(); setTab(1) }}>逛逛市集 / 做一本月曆</button>
          </div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', padding: '12px 16px 4px' }}>
              共 {orders.length} 筆訂單 · 授權下載與物流狀態同步於此
            </div>
            {orders.map(o => {
              const st = statusStyle(o.status)
              return (
                <div key={o.id} className="card ordercard">
                  <div className="orderhd">
                    <div>
                      <div className="ordid">{o.id}</div>
                      <div className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{o.date} · {o.pay}</div>
                    </div>
                    <span className="ordtag" style={{ color: st.color, background: st.bg }}>{o.status}</span>
                  </div>
                  <div className="ordlines">
                    {o.items.map((it, i) => (
                      <div key={i} className="kv" style={{ padding: '6px 0', borderBottom: 'none' }}>
                        <span style={{ fontSize: 'var(--text-xs)' }}>{it.name}</span>
                        <b style={{ fontSize: 'var(--text-xs)' }}>NT${it.price}</b>
                      </div>
                    ))}
                  </div>
                  <div className="ordfoot">
                    <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>共 {o.items.length} 項</span>
                    <span style={{ fontWeight: 800 }}>合計 NT${o.total}</span>
                  </div>
                  {cancellable(o.status) && (
                    <div style={{ padding: '8px 0 0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {arm === o.id ? (
                        <>
                          <button className="b tap" style={{ flex: '0 0 auto', padding: '7px 14px' }}
                            onClick={() => setArm(null)}>不取消</button>
                          <button className="b danger-solid tap" style={{ flex: '0 0 auto', padding: '7px 14px' }}
                            disabled={busy} onClick={() => doCancel(o.id)}>
                            {busy ? '處理中…' : '確認取消訂單'}
                          </button>
                        </>
                      ) : (
                        <button className="b tap" style={{ flex: '0 0 auto', padding: '7px 14px' }}
                          onClick={() => setArm(o.id)}>取消訂單</button>
                      )}
                    </div>
                  )}
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
