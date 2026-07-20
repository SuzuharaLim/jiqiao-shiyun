import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

const products = [
  { id: 's1', e: '📔', bg: '#f3e7c9', name: '植物萬年曆手帳（無時效）', desc: '鋼筆防透墨紙材 · 24 節氣植物插畫', price: 800 },
  { id: 's2', e: '🖊️', bg: '#dbeafe', name: '時光訊息典藏套組', desc: '手帳 ＋ 自立式鋼筆 ＋ 皮革收納', price: 1280 },
  { id: 's3', e: '🎁', bg: '#e9e3fb', name: '企業客製版', desc: '封面壓印 LOGO · 專屬 AI 歡迎語', price: null },
  { id: 's4', e: '✨', bg: '#fce7f3', name: '數位手帳素材包', desc: '節慶貼紙 · 電子模板（邊際成本近零）', price: 120 },
]

export default function Store() {
  const { addToCart, push, setToast, requireAccount } = useNav()
  return (
    <>
      <TopBar title="商店" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t">🛍️ 機巧時運選物</div>
          <div className="d">虛實整合的「會說話文化手帳」。實體引流、軟體留存、數位加值。</div>
        </div>
        <SectionHead title="全部商品" />
        {products.map(p => (
          <div key={p.id} className="tool" style={{ alignItems: 'flex-start' }}>
            <div className="ti" style={{ background: p.bg, width: 56, height: 56, fontSize: 26, borderRadius: 12 }}>{p.e}</div>
            <div className="tn2">
              <b>{p.name}</b>
              <span>{p.desc}</span>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <b style={{ fontSize: 14 }}>{p.price ? `NT$${p.price}` : '洽詢報價'}</b>
                {p.price ? (
                  <button className="pill dark tap" onClick={() => { if (!requireAccount('購買商品')) return; addToCart({ id: p.id, name: p.name, price: p.price }); setToast(`已加入購物車：${p.name}`); push('checkout') }}>加入購物車</button>
                ) : (
                  <button className="pill tap" onClick={() => setToast('企業詢價已送出（Demo）')}>企業詢價</button>
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
