// 大葉大學生態區 —— 單一植物介紹頁（/dyu-eco/:slug）
// 內容與照片來自大葉大學校園植物圖鑑（經授權），由 scripts/build-dyu.mjs 產生 dyuDetails.js。
// ⚠️ dyuDetails.js 約 95 KB，用 import() 懶載入，不進主 bundle（多數人不會點進這一區）。
// ⚠️ 原站照片本身很小（長邊約 220–400px）：相簿以固定高度、接近原尺寸顯示，不拉滿版（會糊）。
import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Link } from '../components/ui.jsx'
import { DYU_GROUPS } from '../data/dyuPlants.js'

const ext = { target: '_blank', rel: 'noopener noreferrer' }
let cache = null
const loadDetails = () => (cache ??= import('../data/dyuDetails.js').then(m => m.DYU_DETAILS))

function findPlant(slug) {
  for (const g of DYU_GROUPS) {
    const i = g.items.findIndex(p => p.slug === slug)
    if (i >= 0) return { g, i, p: g.items[i] }
  }
  return null
}

const paras = s => (s || '').split('\n').filter(Boolean)

export default function DyuPlant({ slug }) {
  const hit = findPlant(slug)
  const [all, setAll] = useState(null)
  const [bad, setBad] = useState(() => new Set())   // 載入失敗的照片序號
  useEffect(() => { let on = true; loadDetails().then(d => on && setAll(d)); return () => { on = false } }, [])

  if (!hit) {
    return (
      <>
        <TopBar title="大葉大學生態區" onBack />
        <div className="body">
          <p className="dyu-empty">名錄裡沒有這種植物。</p>
          <div className="dyu-pager"><Link screen="dyuEco">回校園植物名錄</Link></div>
        </div>
      </>
    )
  }
  const { g, i, p } = hit
  const d = all?.[slug]
  const prev = g.items[i - 1], next = g.items[i + 1]

  return (
    <>
      <TopBar title={p.name} onBack />
      <div className="body dyu-body">
        {/* ⚠️ 載不出來的照片直接拿掉（不留「破圖＋alt 文字」的空框）；全部失敗就顯示字形磚。
               實際發生過：部署切換新版本的那幾十秒，部分請求打到還沒有這些照片的舊版本。
               ⚠️ 不用 loading="lazy"：相簿只有 2–3 張小圖（各約 20 KB），橫向捲動容器裡的
               lazy 圖有些瀏覽器要捲到才載，使用者會先看到空框。 */}
        <div className={`dyu-gal is-${g.key}`} aria-label={`${p.name}的照片`}>
          {d && d.photos.some((_, k) => !bad.has(k))
            ? d.photos.map(([w, h], k) => !bad.has(k) && (
                <img key={`${slug}-${k}`} src={`/dyu/${slug}-${k}.jpg`} width={w} height={h} decoding="async"
                  alt={`${p.name}照片 ${k + 1}，攝於大葉大學校園`} style={{ aspectRatio: `${w} / ${h}` }}
                  onError={() => setBad(s => new Set(s).add(k))} />
              ))
            : <span className="dyu-gal-ph" aria-hidden="true">{p.name[0]}</span>}
        </div>

        <header className="dyu-head">
          <span className={`dyu-tag is-${g.key}`}>{g.label}</span>
          <h1 className="dyu-pname">{p.name}</h1>
          {d && <p className="dyu-psci"><i>{d.sci}</i>{d.en && <span>{d.en}</span>}</p>}
        </header>

        {!d ? (
          <div className="dyu-loading" aria-busy="true"><span /><span /><span /></div>
        ) : (
          <>
            <dl className="dyu-facts">
              <div><dt>科名</dt><dd>{d.family}</dd></div>
              <div><dt>別名</dt><dd>{d.alias}</dd></div>
              <div><dt>原產地</dt><dd>{d.origin}</dd></div>
            </dl>
            {[['用途', d.use], ['生長習性', d.habit], ['形態特徵', d.form]].map(([t, s]) => (
              <section key={t} className="dyu-sec">
                <h2>{t}</h2>
                {paras(s).map((x, k) => <p key={k}>{x}</p>)}
              </section>
            ))}
          </>
        )}

        <div className="dyu-credit">
          <p>介紹內容與照片：大葉大學校園植物圖鑑，經授權使用。</p>
          <a className="dyu-credit-a tap" href={p.url} {...ext}>在原站看這一頁<Icon name="ext" /></a>
        </div>

        <nav className="dyu-pager" aria-label={`同為${g.label}的植物`}>
          {prev ? <Link screen="dyuPlant" params={{ slug: prev.slug }}>‹ {prev.name}</Link> : <span />}
          <Link screen="dyuEco">名錄</Link>
          {next ? <Link screen="dyuPlant" params={{ slug: next.slug }}>{next.name} ›</Link> : <span />}
        </nav>
      </div>
    </>
  )
}
