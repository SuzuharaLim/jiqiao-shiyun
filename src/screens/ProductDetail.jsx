import { TopBar, SectionHead, Breadcrumb, Link, JsonLd, productLd } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { PRODUCTS, productBySlug, SHIPPING_NOTE } from '../data/products.js'

// 單一商品頁 /store/:slug
//
// ⚠️ 為什麼要獨立網址：原本四件商品全擠在 /store 一頁、H1 只有「商店」兩個字，
//    「節氣手帳」「農民曆手帳」「鋼筆不透墨手帳」「客製化企業月曆」這些字一個都吃不到，
//    也沒有任何 Product schema ⇒ 不會有商品類的豐富結果。
// ⚠️ 企業客製版（b2b）走的是完整 B2B 落地頁：適用場景、可客製項目、詢價需附什麼。
//    這一塊客單價遠高於 C 端而競爭低，是整個網站商業價值最被低估的地方。
export default function ProductDetail({ slug }) {
  const { addToCart, push, setToast, requireAccount } = useNav()
  const p = productBySlug(slug)
  if (!p) {
    return (<><TopBar title="找不到這件商品" onBack />
      <div className="body"><div className="empty">商店裡沒有這件商品。</div></div></>)
  }
  const others = PRODUCTS.filter(x => x.slug !== p.slug)

  return (
    <>
      <TopBar title={p.title} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '商店', screen: 'store' },
          { label: p.name },
        ]} />

        <JsonLd data={productLd({
          name: p.name,
          description: p.lead,
          url: `https://chengqi.tw/store/${p.slug}`,
          price: p.price,
          sku: p.id,
        })} />

        <div className="pd-hero">
          <div className="pd-ph" style={{ background: p.bg }}>{p.emoji}</div>
          <div className="pd-head">
            <h2 className="pd-name">{p.name}</h2>
            <p className="pd-tag">{p.tagline}</p>
            <div className="pd-buy">
              <b className="st-price">{p.price != null ? `NT$${p.price}` : '洽詢報價'}</b>
              {p.price != null ? (
                <button className="pill dark tap" onClick={() => {
                  if (!requireAccount('購買商品')) return
                  addToCart({ id: p.id, name: p.name, price: p.price })
                  setToast(`已加入購物車：${p.name}`)
                  push('checkout')
                }}>加入購物車</button>
              ) : (
                <button className="pill dark tap" onClick={() => push('dms')}>企業詢價</button>
              )}
            </div>
          </div>
        </div>

        {/* ⚠️ 開頭就給完整回答、不鋪陳——AI 摘要與 AI Overviews 抽的就是這一段。 */}
        <div className="card gl-answer"><p>{p.lead}</p></div>

        {p.b2b ? (
          <>
            <SectionHead title="適合什麼場合？" />
            <div className="card">
              {p.scenes.map(([k, v]) => (
                <div key={k} className="kv"><b>{k}</b><span>{v}</span></div>
              ))}
            </div>

            <SectionHead title="可以客製哪些部分？" />
            <div className="card">
              {p.custom.map(([k, v]) => (
                <div key={k} className="kv"><b>{k}</b><span>{v}</span></div>
              ))}
            </div>

            <SectionHead title="怎麼詢價？" />
            <div className="card">
              <p>{p.ask}</p>
              {/* ⚠️ 這裡刻意不寫最低訂量、單價與交期——那是營運決定，
                  寫死的規格一旦與實際報價不符就是締約爭議。 */}
              <p className="muted">最低訂量、單價與交期依客製項目與數量而定，回覆詢價時一併提供。</p>
              <button className="b dark tap" onClick={() => push('dms')}>送出企業詢價</button>
            </div>
          </>
        ) : (
          <>
            <SectionHead title="規格" />
            <div className="card">
              {p.specs.map(([k, v]) => (
                <div key={k} className="kv"><b>{k}</b><span>{v}</span></div>
              ))}
            </div>

            <SectionHead title="購買說明" />
            <div className="card">
              <p>{p.digital
                ? '本商品為數位下載，購買後於「我的訂單」取得下載連結。數位內容一經提供即完成交付，'
                  + '依《消費者保護法》第 19 條之合理例外情形，不適用七日猶豫期解除契約。'
                : SHIPPING_NOTE}</p>
            </div>
          </>
        )}

        <SectionHead title="為什麼做這個" />
        <div className="card"><p>{p.why}</p></div>

        <SectionHead title="其他商品" />
        <nav className="home-portal" aria-label="其他商品">
          {others.map(o => (
            <Link key={o.slug} screen="productDetail" params={{ slug: o.slug }}>{o.name}</Link>
          ))}
          <Link screen="store">回商店 ›</Link>
        </nav>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
