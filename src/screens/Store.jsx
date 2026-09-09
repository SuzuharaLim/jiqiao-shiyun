import { TopBar, SectionHead, Link } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'
import { PRODUCTS } from '../data/products.js'

// 商店總覽 /store
//
// ⚠️ 商品目錄由 ref_items('storeProducts') 改讀靜態的 products.js——理由見該檔檔頭：
//    有獨立網址的商品頁需要伺服器端**同步**取得 slug 與描述，而 seo.js 的
//    injectMeta／entryExists／sitemap 都是同步函式，不能 await 資料庫。
//    （與 termArticle／deityArticle／glossary 同一個分界：文章型走靜態模組，
//     清單型走 ref_items。正式站的 ref_items 殘留該類請在管理後台刪除。）
// ⚠️ 每一列都要有真的 <a href="/store/:slug">（ui.jsx 的 Link），不可只有按鈕——
//    爬蟲點不到按鈕，而這幾條正是要讓「節氣手帳」「客製化企業月曆」這些
//    高意圖的字有落地頁可以排。
export default function Store() {
  const { addToCart, push, setToast, requireAccount } = useNav()
  return (
    <>
      {/* ⚠️ 標題原本只有「商店」兩個字，沒有任何關鍵字。 */}
      <TopBar title="機巧時運選物｜節氣手帳、企業客製月曆與數位素材" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t"> 機巧時運選物</div>
          <div className="d">虛實整合的「會說話文化手帳」。實體引流、軟體留存、數位加值。</div>
        </div>
        <SectionHead title="全部商品" extra={`${PRODUCTS.length} 件`} />
        {PRODUCTS.length === 0 && (
          <div className="empty">
            <div className="empty-ic"><Icon name="basket" /></div>
            目前沒有商品
          </div>
        )}
        {PRODUCTS.map(p => (
          <div key={p.slug} className="tool st-item" style={{ alignItems: 'flex-start' }}>
            <div className="ti" style={{ background: p.bg, width: 56, height: 56, fontSize: 'var(--text-xl)' }}><Icon name="gift" /></div>
            <div className="tn2">
              <Link screen="productDetail" params={{ slug: p.slug }} className="st-name"><b>{p.name}</b></Link>
              <span>{p.tagline}</span>
              <div className="st-buy">
                <b className="st-price">{p.price != null ? `NT$${p.price}` : '洽詢報價'}</b>
                {p.price != null ? (
                  <button className="pill dark tap" onClick={() => { if (!requireAccount('購買商品')) return; addToCart({ id: p.id, name: p.name, price: p.price }); setToast(`已加入購物車：${p.name}`); push('checkout') }}>加入購物車</button>
                ) : (
                  <button className="pill tap" onClick={() => push('dms')}>企業詢價</button>
                )}
                <Link screen="productDetail" params={{ slug: p.slug }} className="st-more">看詳細 ›</Link>
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
