import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { plans } from '../data/mock.js'

export default function Subscription() {
  const { subscribed, setSubscribed, setToast, pop } = useNav()
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
          {subscribed ? (
            <button className="btn-ghost tap" onClick={() => { setSubscribed(false); setToast('已取消 Premium（Demo）') }}>取消訂閱</button>
          ) : (
            <button className="btn-primary tap" onClick={() => { setSubscribed(true); setToast('升級 Premium 成功 ✦ 已解鎖高階 AI 模型') }}>升級 Premium</button>
          )}
        </div>

        <p className="muted" style={{ padding: '4px 16px 16px', fontSize: 11.5, lineHeight: 1.7 }}>
          免費方案提供基礎 AI 模型並每日限額，付費可切換高階 AI 模型與無限對話。
          （示範 Demo；實際模型供應商與計費將於正式上線時公告）
        </p>
      </div>
    </>
  )
}
