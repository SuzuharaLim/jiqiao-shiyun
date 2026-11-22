// 大葉大學生態區 —— 校園植物名錄。每一種點進去是本站的介紹頁（DyuPlant.jsx，/dyu-eco/:slug）。
// 內容與照片來自大葉大學校園植物圖鑑（經授權，2026-11-22），見 scripts/build-dyu.mjs。
//
// 版面（2026-11-22 美化）：
//   ① 標本封面卡：標題＋三格分類統計（點了直接切到那一類並捲到名錄）
//   ② 先認識這三種：標本卡，手機橫向滑、桌機三欄
//   ③ 名錄：分段切換＋跨分類搜尋；每一格有分類色的字形磚
//   站內頁用一般箭頭；只有「開啟原站名錄」是外連，帶「新分頁」圖示。
import { useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead, Link } from '../components/ui.jsx'
import { scrollIntoContainer } from '../store/nav.jsx'
import { DYU_GROUPS, DYU_FEATURED, DYU_TOTAL, DYU_INDEX } from '../data/dyuPlants.js'
import { DYU_PHOTOS } from '../data/dyuPhotos.js'

// 照片載不出來（檔案缺、舊快取）就退回字形磚，尺寸一樣、版面不跳
// large＝精選卡：用相簿第一張（原尺寸，長邊約 300px），object-fit 填滿
function Thumb({ slug, large }) {
  const [bad, setBad] = useState(false)
  if (!DYU_PHOTOS.has(slug) || bad) return null
  return <img className="dyu-photo" src={`/dyu/${slug}${large ? '-0' : ''}.jpg`} alt="" loading="lazy" decoding="async"
    onError={() => setBad(true)} />
}

const ext = { target: '_blank', rel: 'noopener noreferrer' }
const GROUP_KEY = Object.fromEntries(DYU_GROUPS.map(g => [g.label, g.key]))

export default function DyuEco() {
  const [key, setKey] = useState('tree')
  const [q, setQ] = useState('')
  const listRef = useRef(null)
  const group = DYU_GROUPS.find(g => g.key === key) || DYU_GROUPS[0]

  // 有搜尋字時跨三類找（使用者多半不知道某種植物算喬木還是灌木）
  const query = q.trim()
  const items = useMemo(() => {
    if (!query) return group.items.map(p => ({ ...p, g: group }))
    return DYU_GROUPS.flatMap(g => g.items.filter(p => p.name.includes(query)).map(p => ({ ...p, g })))
  }, [query, group])

  const jump = (k) => {
    setKey(k); setQ('')
    // 下一輪才捲：切換後名錄高度會變
    setTimeout(() => { if (listRef.current) scrollIntoContainer(listRef.current) }, 0)
  }

  return (
    <>
      <TopBar title="大葉大學生態區" onBack />
      <div className="body dyu-body">
        <section className="dyu-hero" aria-labelledby="dyu-h">
          <p className="dyu-eyebrow">校園植物圖鑑</p>
          <h1 id="dyu-h" className="dyu-title">大葉大學生態區</h1>
          <p className="dyu-lead">
            校園裡常見的 {DYU_TOTAL} 種植物。點任一種，看照片、學名、科屬、原產地、用途與形態特徵。
          </p>
          <div className="dyu-stats">
            {DYU_GROUPS.map(g => (
              <button key={g.key} className={`dyu-stat tap is-${g.key}`} onClick={() => jump(g.key)}
                aria-label={`看${g.label}，共 ${g.items.length} 種`}>
                <b>{g.items.length}</b><span>{g.label}</span>
              </button>
            ))}
          </div>
          <a className="dyu-cta tap" href={DYU_INDEX} {...ext}>
            <span>開啟原站名錄</span><Icon name="ext" />
          </a>
        </section>

        <SectionHead title="先認識這三種" />
        <div className="dyu-feat">
          {DYU_FEATURED.map(f => (
            <Link key={f.name} className={`dyu-spec tap is-${GROUP_KEY[f.group] || 'tree'}`}
              screen="dyuPlant" params={{ slug: f.slug }}>
              <div className="dyu-spec-top">
                <span className="dyu-spec-glyph" aria-hidden="true">{f.name[0]}</span>
                <Thumb slug={f.slug} large />
                <span className="dyu-tag">{f.group}</span>
              </div>
              <div className="dyu-spec-body">
                <b className="dyu-spec-name">{f.name}</b>
                <i className="dyu-sci">{f.sci}</i>
                <span className="dyu-fam">{f.family}</span>
                <p>{f.note}</p>
              </div>
              <span className="dyu-spec-more">看完整介紹<Icon name="chev" /></span>
            </Link>
          ))}
        </div>

        <div ref={listRef} className="dyu-list-head">
          <SectionHead title="校園植物名錄" extra={query ? `找到 ${items.length} 種` : `${group.items.length} 種`} />
          <div className="dyu-tools">
            <div className="dyu-seg" role="tablist" aria-label="植物分類">
              {DYU_GROUPS.map(g => (
                <button key={g.key} role="tab" aria-selected={!query && g.key === key}
                  className={`dyu-seg-b tap ${!query && g.key === key ? 'on' : ''}`}
                  onClick={() => { setKey(g.key); setQ('') }}>
                  {g.label}<small>{g.items.length}</small>
                </button>
              ))}
            </div>
            <label className="dyu-search">
              <Icon name="search" />
              <input type="search" value={q} onChange={e => setQ(e.target.value)}
                placeholder="搜尋植物名稱，例如：櫻、松" aria-label="搜尋植物名稱" maxLength={12} />
              {q && <button className="dyu-clear tap" onClick={() => setQ('')} aria-label="清除搜尋"><Icon name="x" /></button>}
            </label>
          </div>
        </div>

        {items.length > 0 ? (
          <ul className="dyu-grid">
            {items.map(p => (
              <li key={p.url}>
                <Link className={`dyu-plant tap is-${p.g.key}`} screen="dyuPlant" params={{ slug: p.slug }}>
                  <span className="dyu-chip" aria-hidden="true">{p.name[0]}<Thumb slug={p.slug} /></span>
                  <span className="dyu-plant-t">
                    <b>{p.name}</b>
                    {query && <small>{p.g.label}</small>}
                  </span>
                  <Icon name="chev" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dyu-empty">名錄裡沒有「{query}」。原站只收錄校園常見的 {DYU_TOTAL} 種，可以換個字試試。</p>
        )}

        <p className="dyu-note">
          植物名稱、分類、介紹與照片：大葉大學校園植物圖鑑（plants.dyu.edu.tw），經授權使用。
        </p>
      </div>
    </>
  )
}
