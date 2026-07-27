import { TopBar, SectionHead } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

// 商品清單原本硬編在這個檔案裡，是最後一個寫死在畫面檔的內容清單。
// 改吃 ref_items('storeProducts')，與其餘內容一致，可由管理後台 CMS 編輯。
export default function Store() {
  const { addToCart, push, setToast, requireAccount } = useNav()
  const products = useContent('storeProducts')
  return (
    <>
      <TopBar title="商店" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t">🛍️ 機巧時運選物</div>
          <div className="d">虛實整合的「會說話文化手帳」。實體引流、軟體留存、數位加值。</div>
        </div>
        <SectionHead title="全部商品" />
        {products.length === 0 && (
          <div className="empty">
            <div className="empty-ic"><Icon name="basket" /></div>
            目前沒有商品
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="tool st-item" style={{ alignItems: 'flex-start' }}>
            <div className="ti" style={{ background: p.bg, width: 56, height: 56, fontSize: 26 }}>{p.e}</div>
            <div className="tn2">
              <b>{p.name}</b>
              <span>{p.desc}</span>
              <div className="st-buy">
                <b className="st-price">{p.price ? `NT$${p.price}` : '洽詢報價'}</b>
                {p.price ? (
                  <button className="pill dark tap" onClick={() => { if (!requireAccount('購買商品')) return; addToCart({ id: p.id, name: p.name, price: p.price }); setToast(`已加入購物車：${p.name}`); push('checkout') }}>加入購物車</button>
                ) : (
                  <button className="pill tap" onClick={() => push('dms')}>企業詢價</button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
