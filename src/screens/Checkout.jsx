import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { checkoutItems } from '../data/mock.js'

const PAY = ['💳 信用卡 ·· 4242', '🏧 ATM 轉帳', '📱 LINE Pay', '🏪 超商代碼']
const PICK = ['📦 7-11 大墩門市', '📦 全家 大葉店', '🚚 宅配到府', '🏬 門市自取']
const INV = ['🧾 手機載具', '🧾 自然人憑證', '🏢 公司統編', '❤️ 捐贈發票']

export default function Checkout() {
  const { pop, popAll, setToast, cart, clearCart, subscribed, addOrder, requireAccount } = useNav()
  const items = cart.length ? cart : checkoutItems
  const sub = items.reduce((s, i) => s + (i.price || 0), 0)
  const discount = subscribed ? Math.round(sub * 0.1) : 0
  const total = sub - discount
  const creators = new Set(items.map(i => i.name)).size

  const [pay, setPay] = useState(0)
  const [pick, setPick] = useState(0)
  const [inv, setInv] = useState(0)
  const [detail, setDetail] = useState(false)

  const cycle = (setter, arr) => setter(i => (i + 1) % arr.length)

  const [paying, setPaying] = useState(false)
  const confirm = async () => {
    if (paying) return                       // 防連點重複送單（冪等）
    if (!requireAccount('結帳付款')) return
    setPaying(true)
    try {
      // 真帳號 → 後端建單（伺服器產生單號、計算金額、寄確認信）
      await addOrder({
        items: items.map(it => ({ name: it.name, price: it.price || 0 })),
        pay: PAY[pay].replace(/^[^一-龥A-Za-z]+\s*/, ''),
      })
      clearCart()
      popAll()
      setToast('付款成功 🎉 訂單已建立，確認信已寄出')
    } catch (e) {
      setToast(e.message || '建立訂單失敗，請稍後再試')   // 失敗不清購物車，可重試
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <TopBar title="結帳" onBack={pop} />
      <div className="body">
        <div className="sumcard">
          {items.map((it, i) => (
            <div key={i} className="sumrow"><span>{it.name}</span><b>${it.price}</b></div>
          ))}
          {subscribed && <div className="sumrow"><span className="muted">Premium 9 折折抵</span><span className="muted">−${discount}</span></div>}
          <div className="sumrow tot"><span>總計</span><span>NT${total}</span></div>
        </div>

        <button className="note tap" onClick={() => setDetail(v => !v)}>
          <span>本訂單含 <b>{creators}</b> 項創作者授權分潤</span>
          <span className="acc">{detail ? '收合' : '明細'}</span>
        </button>
        {detail && (
          <div className="sumcard" style={{ marginTop: 0 }}>
            {items.map((it, i) => (
              <div key={i} className="sumrow" style={{ fontSize: 12 }}>
                <span className="muted">{it.name}</span>
                <span style={{ color: 'var(--yi)' }}>分潤 NT${Math.round(it.price * 0.7)}</span>
              </div>
            ))}
          </div>
        )}

        {/* 以下皆可循環切換選項 */}
        <button className="opt tap" onClick={() => cycle(setPay, PAY)}>
          <div className="l">{PAY[pay]}</div><Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <button className="opt tap" onClick={() => cycle(setPick, PICK)}>
          <div className="l">{PICK[pick]}</div><Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <button className="opt tap" onClick={() => cycle(setInv, INV)}>
          <div className="l">{INV[inv]}</div><Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <div className="muted" style={{ fontSize: 11, padding: '10px 16px' }}>＊點各列可切換選項。金流與物流串接為正式版功能（此處為模擬）。</div>
      </div>

      <div className="paybar">
        <button className="btn-primary tap" onClick={confirm} disabled={paying}
          style={paying ? { opacity: .6 } : null}>
          {paying ? '處理中…' : `確認付款　NT$${total}`}
        </button>
      </div>
    </>
  )
}
