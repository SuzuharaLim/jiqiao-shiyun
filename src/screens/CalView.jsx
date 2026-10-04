import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Link } from '../components/ui.jsx'
import { api } from '../api.js'
import { buildPages } from '../data/calendarLayout.js'
import { normalizeDesign } from '../data/calendarRules.js'
import { baseHex, paperHex } from '../lib/calRender.js'
import { renderSurfaceCanvas } from '../lib/calPages.js'
import { stripEmoji } from '../lib/text.js'

const CalModel3D = lazy(() => import('../components/CalModel3D.jsx'))

// ============================================================================
// 桌曆分享頁 `/app/calendar/view/:token`
// 只能看、不能改、不能下載（使用者指定）。也拿來當後台與客人溝通時的共同畫面。
// ⚠️ noindex：這是個人的設計，不該出現在搜尋結果。
// ============================================================================
export default function CalView({ token, design: given = null, title: givenTitle = '', onClose }) {
  const [data, setData] = useState(given ? { design: normalizeDesign(given), title: givenTitle } : null)
  const [err, setErr] = useState(null)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    if (given || !token) return
    let alive = true
    api.calShared(token).then(r => { if (alive) setData({ ...r, design: normalizeDesign(r.design) }) })
      .catch(e => { if (alive) setErr(e?.message || '讀取失敗') })
    return () => { alive = false }
  }, [token, given])

  const pages = useMemo(() => (data ? buildPages(data.design) : []), [data])
  // 第 0 張是封面、之後第 i 張＝第 i-1 頁；每張紙的背面另外給
  const getCanvas = useCallback((i) => renderSurfaceCanvas(data.design, pages, i - 1, 'front', 1024), [data, pages])
  const getBack = useCallback((i) => renderSurfaceCanvas(data.design, pages, i - 1, 'back', 1024, { blankNull: true }), [data, pages])

  if (err) {
    return (<><TopBar title="桌曆" onBack /><div className="body"><div className="empty">
      <div className="empty-ic"><Icon name="scroll" /></div><div className="empty-t">{err}</div>
      <Link screen="makeCalendar" className="b dark tap empty-cta">我也來設計一本</Link>
    </div></div></>)
  }
  if (!data) return (<><TopBar title="桌曆" onBack /><div className="body"><div className="cal-skel ui-skeleton" aria-busy="true" /></div></>)

  const page = pages[cur - 1]
  const name = cur === 0 ? '封面' : page?.label || ''
  const total = pages.length + 1
  // 後台用（直接給 design）時是疊在管理後台上的浮層：不可有「返回」——
  // 那顆會 pop 掉整個管理後台，而使用者只是想關掉預覽。
  return (
    <>
      <TopBar title={stripEmoji(data.title)} onBack={given ? undefined : true} onClose={given ? onClose : undefined} />
      <div className="body cal-viewbody">
        <div className="cal-stage">
          <Suspense fallback={<div className="cal3d cal3d-loading">載入 3D 模型中…</div>}>
            <CalModel3D count={total} current={cur} getCanvas={getCanvas} getBack={getBack} version={token || 'given'}
              baseColor={baseHex(data.design)} paperColor={paperHex(data.design)}
              label={`${data.title}，${name}`}
              onFlip={(d) => setCur(c => Math.min(total - 1, Math.max(0, c + d)))} />
          </Suspense>
          <div className="cal-nav">
            <button className="cal-navb tap" onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0} aria-label="上一頁">‹</button>
            <span className="cal-navl" aria-live="polite"><b>{name}</b><small>{cur === 0 ? '封面' : `第 ${cur} / ${pages.length} 頁`}</small></span>
            <button className="cal-navb tap" onClick={() => setCur(c => Math.min(total - 1, c + 1))} disabled={cur >= total - 1} aria-label="下一頁">›</button>
          </div>
          <p className="cal-hint">拖曳轉動角度・雙指或滾輪縮放・點右側往後翻、點左側或轉到背面點一下往前翻・轉到後面看得到每一頁的背面</p>
        </div>
        {data.author && (
          <div className="cal-callout">
            <b>這是 @{data.author} 設計的桌曆</b>
            <p>你也可以設計一本自己的：放上自己的照片和一句話，用 3D 翻翻看。</p>
            <Link screen="makeCalendar" className="btn-primary tap">我也來設計一本</Link>
          </div>
        )}
      </div>
    </>
  )
}
