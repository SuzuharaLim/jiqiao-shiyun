import { TopBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

export default function Subscription() {
  const { subscribed, setSubscribed, setToast } = useNav()
  // 方案內容嚴格來自資料庫 ref_items（可經管理後台 CMS 修改）
  const arr = useContent('plans')
  const plans = {
    free: arr.find(p => p.id === 'free'),
    premium: arr.find(p => p.id === 'premium'),
  }
  if (!plans.free || !plans.premium) {
    return (
      <>
        <TopBar title="訂閱與帳號" onBack />
        <div className="body"><div className="empty"><div className="empty-ic"><Icon name="sparkle" /></div>方案載入中…</div></div>
      </>
    )
  }
  return (
    <>
      <TopBar title="訂閱與帳號" onBack />
      <div className="body">
        <div className="plan">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 16 }}>{plans.free.name}</b>
            {!subscribed && <span className="ty">目前方案</span>}
          </div>
          <div className="price" style={{ fontSize: 20, margin: '6px 0' }}>NT$0</div>
          {plans.free.feats.map(f => <div key={f} className="feat"><span className="dot">✓</span>{f}</div>)}
        </div>

        <div className="plan pro">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 16, color: 'var(--acard-t)' }}>{plans.premium.name} ✦</b>
            {subscribed && <span className="ty">使用中</span>}
          </div>
          <div className="price" style={{ color: 'var(--acard-t)' }}>NT${plans.premium.price}<small> / 月</small></div>
          {plans.premium.feats.map(f => <div key={f} className="feat"><span className="dot">✓</span>{f}</div>)}
          <div style={{ height: 12 }} />
          {/* ⚠️ 這裡原本是「按一下就 setSubscribed(true)」——沒有任何付款流程，
              等於免費帳號可以直接變成 Premium。訂閱金流尚未串接（PAY_PROVIDER=demo），
              在真的能收款之前不得授予付費權益。串好金流後改成導向結帳即可。 */}
          {subscribed ? (
            <button className="btn-ghost tap" onClick={() => { setSubscribed(false); setToast('已取消 Premium') }}>取消訂閱</button>
          ) : (
            <button className="btn-primary tap" onClick={() => setToast('訂閱功能尚未開放（金流尚未串接）')}>升級 Premium</button>
          )}
        </div>

        <p className="muted" style={{ padding: '4px 16px 16px', fontSize: 11.5, lineHeight: 1.7 }}>
          免費方案提供基礎 AI 模型並每日限額，付費可切換高階 AI 模型與無限對話。
          訂閱付款功能仍在開發中（金流尚未串接），目前無法升級。
        </p>
      </div>
    </>
  )
}
