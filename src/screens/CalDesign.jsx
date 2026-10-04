import { useEffect, useMemo, useRef, useState, lazy, Suspense, useCallback } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Switch, SheetMask, Link, Disclaimer } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { buildPages, TERM_START_OPTIONS } from '../data/calendarLayout.js'
import { CADENCES, BASE_COLORS, PAPER_COLORS, FONTS, CAL_LIMITS, defaultDesign, normalizeDesign, designFlags } from '../data/calendarRules.js'
import { baseHex, paperHex } from '../lib/calRender.js'
import { renderPageCanvas } from '../lib/calPages.js'
import { processPick, putPrintBlob, getPrintBlob, blobToDataURL } from '../lib/calImages.js'
import { stripEmoji } from '../lib/text.js'

// three 不可進主 bundle：3D 只在使用者切到 3D 時才下載
const CalModel3D = lazy(() => import('../components/CalModel3D.jsx'))

// ============================================================================
// 桌曆設計器 `/app/calendar/design/:id`（2026-10-04）
//
// id === 'local'：訪客（或還沒存到帳號的）設計，存在這個瀏覽器的 localStorage。
//   ⚠️ 訪客不能上傳照片（沒有帳號就沒有地方放），版型、文字、樣式都能玩；
//      要上傳照片、分享、送出洽詢時才請他註冊；登入後回到這一頁按「存到我的帳號」，
//      本機那份就整份搬進帳號，不用重做。
// 其他 id：存在伺服器，邊改邊自動存（1.2 秒去抖動）。
//
// ★ 預覽一律是低解析＋浮水印（calRender.js），也沒有任何「下載」按鈕：
//   使用者不能把設計存回自己的電腦，要印就跟我們聯絡（使用者指定）。
// ============================================================================

const LOCAL_KEY = 'jq-cal-local'
export const readLocalDesign = () => {
  try { const s = localStorage.getItem(LOCAL_KEY); return s ? normalizeDesign(JSON.parse(s)) : null } catch { return null }
}
const writeLocal = (d) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)) } catch { /* 無痕模式 */ } }
export const clearLocalDesign = () => { try { localStorage.removeItem(LOCAL_KEY) } catch { /* ignore */ } }

const TABS = [['layout', '版型'], ['page', '這一頁'], ['style', '樣式'], ['send', '分享・洽詢']]
const thisYear = new Date().getFullYear()
const YEARS = [thisYear, thisYear + 1, thisYear + 2]

export default function CalDesign({ id = 'local' }) {
  const { user, push, replace, setToast, setStamp, requireAccount } = useNav()
  const isLocal = id === 'local'
  const signedIn = !!user && !user.guest

  const [design, setDesign] = useState(null)
  const [meta, setMeta] = useState(null)              // 伺服器上的 { status, shareToken }
  const [err, setErr] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | dirty | saving | error
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('layout')
  const [view, setView] = useState('2d')
  const [busy, setBusy] = useState('')
  const [picker, setPicker] = useState(false)
  const [inq, setInq] = useState([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', qty: 1, note: '', rights: false })
  const [sent, setSent] = useState(null)
  const fileRef = useRef(null)
  const previewRef = useRef(null)
  const saveTimer = useRef(null)
  const pending = useRef(null)

  // ── 載入 ──
  useEffect(() => {
    let alive = true
    setErr(null); setDesign(null)
    if (isLocal) { setDesign(readLocalDesign() || defaultDesign()); setMeta(null); return }
    api.calGet(id).then(r => {
      if (!alive) return
      setDesign(normalizeDesign(r.design.design))
      setMeta({ status: r.design.status, shareToken: r.design.shareToken })
    }).catch(e => { if (alive) setErr(e?.status === 404 ? 'notfound' : e?.status === 401 ? 'login' : 'net') })
    if (signedIn) api.calInquiries(id).then(r => { if (alive) setInq(r.inquiries || []) }).catch(() => {})
    return () => { alive = false }
  }, [id, isLocal, signedIn])

  useEffect(() => {
    if (user && !user.guest) setForm(f => ({ ...f, name: f.name || stripEmoji(user.name || ''), email: f.email || user.email || '' }))
  }, [user])

  // ── 存檔：本機立即、伺服器去抖動 ──
  const flush = useCallback(async () => {
    if (!pending.current || isLocal) return
    const d = pending.current
    pending.current = null
    setSaveState('saving')
    try { await api.calSave(id, d); setSaveState(pending.current ? 'dirty' : 'saved') } catch { setSaveState('error') }
  }, [id, isLocal])
  const update = useCallback((fn) => {
    setDesign(prev => {
      const next = normalizeDesign(fn(prev))
      if (isLocal) writeLocal(next)
      else {
        pending.current = next
        setSaveState('dirty')
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(flush, 1200)
      }
      return next
    })
  }, [isLocal, flush])
  // 離開頁面前把還沒送出的改動送出去
  useEffect(() => () => { clearTimeout(saveTimer.current); flush() }, [flush])

  const pages = useMemo(() => (design ? buildPages(design) : []),
    // 只有影響日期的欄位才需要重算頁面
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [design?.cadence, design?.start?.year, design?.start?.month, design?.start?.termIndex, design?.start?.date, design?.style?.weekStart])
  useEffect(() => { if (cur >= pages.length && pages.length) setCur(pages.length - 1) }, [pages.length, cur])

  // 內容版本：任何會改變畫面的東西都算進來（2D 重畫、3D 重新載貼圖）
  const version = useMemo(() => JSON.stringify([design?.style, design?.pages, design?.cadence, design?.start]), [design])

  // ── 2D 預覽 ──
  useEffect(() => {
    if (!design || view !== '2d' || !pages[cur]) return
    let alive = true
    renderPageCanvas(design, pages, cur, 900).then(c => {
      if (!alive || !c || !previewRef.current) return
      c.className = 'cal-page-canvas'
      c.setAttribute('role', 'img')
      c.setAttribute('aria-label', `${pages[cur].label}的版面預覽`)
      c.oncontextmenu = (e) => e.preventDefault()     // 不給「另存圖片」
      previewRef.current.replaceChildren(c)
    })
    return () => { alive = false }
  }, [design, pages, cur, view, version])

  const getCanvas = useCallback((i) => renderPageCanvas(design, pages, i, 1024), [design, pages])

  if (err) {
    return (
      <>
        <TopBar title="桌曆設計" onBack />
        <div className="body"><div className="empty">
          <div className="empty-ic"><Icon name="scroll" /></div>
          <div className="empty-t">{err === 'notfound' ? '找不到這份設計' : err === 'login' ? '請先登入' : '讀取失敗'}</div>
          <div className="empty-h">{err === 'notfound' ? '它可能已經被刪除，或不是你的設計。' : err === 'login' ? '這份設計存在你的帳號裡，登入後才看得到。' : '網路好像不太順，稍後再試一次。'}</div>
          <Link screen="makeCalendar" className="b dark tap empty-cta">回到我的桌曆</Link>
        </div></div>
      </>
    )
  }
  if (!design) {
    return (<><TopBar title="桌曆設計" onBack /><div className="body"><div className="cal-skel ui-skeleton" aria-busy="true" /></div></>)
  }

  const page = pages[cur]
  const over = design.pages[cur] || {}
  const setPage = (patch) => update(d => ({ ...d, pages: { ...d.pages, [cur]: { ...(d.pages[cur] || {}), ...patch } } }))
  const flags = designFlags(design)
  const base = baseHex(design), paper = paperHex(design)

  // ── 照片 ──
  const pickPhoto = () => {
    if (!requireAccount('上傳照片到桌曆')) return
    if (isLocal) { setToast('先把設計存到你的帳號，才能放照片'); setTab('send'); return }
    fileRef.current?.click()
  }
  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy('處理照片中…')
    try {
      const { preview, print, w, h } = await processPick(f)
      const r = await api.uploadImage(preview)
      await putPrintBlob(r.id, print)                  // 印刷版只存在這個瀏覽器，送出時才上傳
      setPage({ img: { id: r.id, w, h, src: 'upload' } })
      if (Math.max(w, h) < CAL_LIMITS.LOWRES_LONG_EDGE) setToast('這張照片解析度偏低，印出來可能會有點模糊')
    } catch (er) {
      setToast(er?.message || '照片處理失敗，請換一張')
    } finally { setBusy('') }
  }
  const pickSite = (p) => {
    const m = /\/api\/images\/([a-f0-9-]+)/i.exec(p.image || '')
    if (!m) return
    // 站上的作品只有壓縮過的版本（最長邊約 1600px）——一定會被標成低解析，這是實話
    const im = new Image()
    im.onload = () => setPage({ img: { id: m[1], w: im.naturalWidth, h: im.naturalHeight, src: 'site' } })
    im.onerror = () => setPage({ img: { id: m[1], w: 0, h: 0, src: 'site' } })
    im.src = p.image
    setPicker(false)
  }

  // ── 存到帳號（本機草稿 → 伺服器）──
  const saveToAccount = async () => {
    if (!requireAccount('儲存桌曆設計')) return
    setBusy('儲存中…')
    try {
      const r = await api.calCreate(design)
      clearLocalDesign()
      replace('calDesign', { id: r.design.id })
      setToast('已存到你的帳號')
    } catch (e) {
      setToast(e?.message || '儲存失敗，請稍後再試')
    } finally { setBusy('') }
  }

  // ── 分享 ──
  const share = async () => {
    try {
      const r = await api.calShare(id)
      setMeta(m => ({ ...m, shareToken: r.token }))
      const url = location.origin + '/app/calendar/view/' + r.token
      if (navigator.share) { try { await navigator.share({ title: design.title, url }); return } catch (e) { if (e?.name === 'AbortError') return } }
      try { await navigator.clipboard.writeText(url); setToast('分享連結已複製') } catch { setToast(url) }
    } catch (e) { setToast(e?.message || '產生連結失敗') }
  }
  const unshare = async () => {
    try { await api.calUnshare(id); setMeta(m => ({ ...m, shareToken: null })); setToast('已關閉分享，舊連結失效了') } catch { setToast('關閉失敗，請稍後再試') }
  }

  // ── 送出洽詢 ──
  const submit = async () => {
    if (!form.name.trim()) return setToast('請填寫聯絡人姓名')
    if (!form.rights) return setToast('請確認你擁有照片的使用權')
    await flush()
    const n = CADENCES[design.cadence].pages
    const withImg = []
    for (let i = 0; i < n; i++) if (design.pages[i]?.img?.src === 'upload') withImg.push(i)
    try {
      setBusy('建立洽詢…')
      const { inquiryId } = await api.calInquire(id, { ...form, qty: Number(form.qty) || 1 })
      const missing = []
      for (let k = 0; k < withImg.length; k++) {
        const i = withImg[k]
        setBusy(`上傳印刷用原圖 ${k + 1} / ${withImg.length}…`)
        const blob = await getPrintBlob(design.pages[i].img.id)
        if (!blob) { missing.push(i); continue }
        const data = await blobToDataURL(blob)
        // 網路抖一下就重試一次；兩次都失敗才算缺頁（後台會看到，用預覽圖接洽）
        try { await api.calPrint(inquiryId, i, { data, w: design.pages[i].img.w, h: design.pages[i].img.h }) }
        catch { try { await api.calPrint(inquiryId, i, { data, w: design.pages[i].img.w, h: design.pages[i].img.h }) } catch { missing.push(i) } }
      }
      setBusy('完成送出…')
      const r = await api.calFinalize(inquiryId, missing)
      setSent({ replyDays: r.replyDays, missing })
      setMeta(m => ({ ...m, status: 'submitted' }))
      api.calInquiries(id).then(x => setInq(x.inquiries || [])).catch(() => {})
      setStamp('已送出')
    } catch (e) {
      setToast(e?.message || '送出失敗，請稍後再試')
    } finally { setBusy('') }
  }

  const saveLabel = isLocal ? '存在這個瀏覽器' : { saved: '已儲存', dirty: '尚未儲存', saving: '儲存中…', error: '儲存失敗，會再試' }[saveState]

  return (
    <>
      <TopBar title={stripEmoji(design.title)} onBack right={<span className={`cal-save s-${isLocal ? 'local' : saveState}`}>{saveLabel}</span>} />
      <div className="body cal-body">
        {/* ── 預覽 ── */}
        <div className="cal-stage">
          <div className="cal-viewtabs" role="tablist" aria-label="預覽方式">
            {[['2d', '平面'], ['3d', '3D 立體']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={view === k} className={`cal-vt tap${view === k ? ' on' : ''}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
          {view === '2d'
            ? <div className="cal-page" ref={previewRef} />
            : (
              <Suspense fallback={<div className="cal3d cal3d-loading">載入 3D 模型中…</div>}>
                <CalModel3D count={pages.length} current={cur} getCanvas={getCanvas} version={version}
                  baseColor={base} paperColor={paper} label={`${design.title}，第 ${cur + 1} 頁 ${page?.label || ''}，拖曳可轉動、點一下翻頁`}
                  onFlip={(d) => setCur(c => Math.min(pages.length - 1, Math.max(0, c + d)))} />
              </Suspense>
            )}
          <div className="cal-nav">
            <button className="cal-navb tap" onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0} aria-label="上一頁">‹</button>
            <span className="cal-navl" aria-live="polite"><b>{page?.label}</b><small>第 {cur + 1} / {pages.length} 頁</small></span>
            <button className="cal-navb tap" onClick={() => setCur(c => Math.min(pages.length - 1, c + 1))} disabled={cur >= pages.length - 1} aria-label="下一頁">›</button>
          </div>
          {view === '3d' && <p className="cal-hint">拖曳轉動角度・雙指或滾輪縮放・點一下翻頁</p>}
          <div className="cal-strip" role="listbox" aria-label="選擇頁面">
            {pages.map((p, i) => (
              <button key={i} role="option" aria-selected={i === cur} className={`cal-chip tap${i === cur ? ' on' : ''}${design.pages[i]?.img ? ' has-img' : ''}`}
                onClick={() => setCur(i)}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* ── 編輯面板 ── */}
        <div className="cal-panel">
          <div className="cal-tabs" role="tablist" aria-label="編輯項目">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={`cal-tab tap${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === 'layout' && (
            <div className="cal-sec">
              <label className="cal-label" htmlFor="cal-title">桌曆名稱</label>
              <input id="cal-title" className="cal-input" maxLength={40} value={design.title}
                onChange={e => update(d => ({ ...d, title: e.target.value }))} />

              <span className="cal-label">一頁放多久</span>
              <div className="cal-cards">
                {Object.entries(CADENCES).map(([k, c]) => (
                  <button key={k} className={`cal-card tap${design.cadence === k ? ' on' : ''}`} aria-pressed={design.cadence === k}
                    onClick={() => { update(d => ({ ...d, cadence: k })); setCur(0) }}>
                    <b>{c.label}</b><small>{c.pages} 頁 · {c.hint}</small>
                  </button>
                ))}
              </div>

              <span className="cal-label">從哪裡開始</span>
              <div className="cal-row">
                <select className="cal-input" aria-label="年份" value={design.start.year}
                  onChange={e => update(d => ({ ...d, start: { ...d.start, year: Number(e.target.value), date: `${e.target.value}-01-04` } }))}>
                  {YEARS.map(y => <option key={y} value={y}>{y} 年</option>)}
                </select>
                {(design.cadence === 'month' || design.cadence === 'quarter') && (
                  <select className="cal-input" aria-label="起始月份" value={design.start.month}
                    onChange={e => update(d => ({ ...d, start: { ...d.start, month: Number(e.target.value) } }))}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1} 月</option>)}
                  </select>
                )}
                {design.cadence === 'term' && (
                  <select className="cal-input" aria-label="起始節氣" value={design.start.termIndex}
                    onChange={e => update(d => ({ ...d, start: { ...d.start, termIndex: Number(e.target.value) } }))}>
                    {TERM_START_OPTIONS.map(t => <option key={t.index} value={t.index}>{t.name}</option>)}
                  </select>
                )}
                {design.cadence === 'week' && (
                  <input type="date" className="cal-input" aria-label="起始日期" value={design.start.date}
                    min={`${YEARS[0]}-01-01`} max={`${YEARS[2]}-12-31`}
                    onChange={e => e.target.value && update(d => ({ ...d, start: { ...d.start, date: e.target.value } }))} />
                )}
              </div>
              <p className="cal-note">共 {pages.length} 頁：{pages[0]?.label}（{pages[0]?.sub}）到 {pages.at(-1)?.label}（{pages.at(-1)?.sub}）</p>
            </div>
          )}

          {tab === 'page' && (
            <div className="cal-sec">
              <span className="cal-label">這一頁的照片</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} aria-label="選擇照片" />
              {over.img ? (
                <div className="cal-photo">
                  <img src={`/api/images/${over.img.id}`} alt="" draggable="false" onContextMenu={e => e.preventDefault()} />
                  <div>
                    {Math.max(over.img.w, over.img.h) < CAL_LIMITS.LOWRES_LONG_EDGE
                      ? <p className="cal-warn">解析度偏低（{over.img.w}×{over.img.h}），印出來可能會模糊。建議換一張原始照片。</p>
                      : <p className="cal-ok">解析度足夠印刷（{over.img.w}×{over.img.h}）</p>}
                    <div className="cal-row">
                      <button className="b tap" onClick={pickPhoto}>換一張</button>
                      <button className="b tap" onClick={() => setPage({ img: null })}>移除</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cal-row">
                  <button className="b dark tap" onClick={pickPhoto}><Icon name="image" style={{ display: 'inline-block', verticalAlign: '-4px', width: 18, height: 18 }} /> 上傳照片</button>
                  <button className="b tap" onClick={() => { if (requireAccount('使用你的作品')) { if (isLocal) { setToast('先把設計存到你的帳號'); setTab('send') } else setPicker(true) } }}>從我的作品選</button>
                </div>
              )}
              <p className="cal-note">沒有照片的頁會用頁名（「{page?.term || page?.label}」）的大字當主視覺。照片原檔上限 {CAL_LIMITS.SOURCE_MAX_BYTES / 1048576} MB。</p>

              <label className="cal-label" htmlFor="cal-ptitle">頁面標題（選填）</label>
              <input id="cal-ptitle" className="cal-input" maxLength={30} placeholder="例如：全家第一次露營" value={over.title || ''}
                onChange={e => setPage({ title: e.target.value })} />
              <label className="cal-label" htmlFor="cal-ptext">一句話或詩詞（選填，最多兩行）</label>
              <textarea id="cal-ptext" className="cal-input cal-area" maxLength={140} rows={2} value={over.text || ''}
                placeholder="印在照片左下角" onChange={e => setPage({ text: e.target.value.split('\n').slice(0, 2).join('\n') })} />
            </div>
          )}

          {tab === 'style' && (
            <div className="cal-sec">
              <span className="cal-label">底座顏色</span>
              <div className="cal-swatches">
                {BASE_COLORS.map(c => (
                  <button key={c.id} className={`cal-sw tap${design.style.base === c.id ? ' on' : ''}`} style={{ '--sw': c.hex }}
                    aria-label={c.name} aria-pressed={design.style.base === c.id} title={c.name}
                    onClick={() => update(d => ({ ...d, style: { ...d.style, base: c.id } }))} />
                ))}
              </div>
              <span className="cal-label">紙張</span>
              <div className="cal-row">
                {PAPER_COLORS.map(c => (
                  <button key={c.id} className={`chip tap${design.style.paper === c.id ? ' on' : ''}`}
                    onClick={() => update(d => ({ ...d, style: { ...d.style, paper: c.id } }))}>{c.name}</button>
                ))}
              </div>
              <span className="cal-label">字體</span>
              <div className="cal-row">
                {FONTS.map(f => (
                  <button key={f.id} className={`chip tap${design.style.font === f.id ? ' on' : ''}`}
                    onClick={() => update(d => ({ ...d, style: { ...d.style, font: f.id } }))}>{f.name}</button>
                ))}
              </div>
              <span className="cal-label">一週從哪天開始</span>
              <div className="cal-row">
                {[[0, '星期日'], [1, '星期一']].map(([v, l]) => (
                  <button key={v} className={`chip tap${design.style.weekStart === v ? ' on' : ''}`}
                    onClick={() => update(d => ({ ...d, style: { ...d.style, weekStart: v } }))}>{l}</button>
                ))}
              </div>
              <span className="cal-label">日期格上要標什麼</span>
              {[['lunar', '農曆日期'], ['term', '二十四節氣'], ['fest', '節日'], ['yiji', '每日宜（民俗）']].map(([k, l]) => (
                <div className="opt" key={k}>
                  <div className="l">{l}</div>
                  <Switch on={!!design.style.marks[k]} onChange={(v) => update(d => ({ ...d, style: { ...d.style, marks: { ...d.style.marks, [k]: v } } }))} />
                </div>
              ))}
              <p className="cal-note">農曆與節氣是天文演算；「每日宜」屬傳統民俗推算，各家說法不同。節日只標名稱，國定假日以政府公告為準。</p>
            </div>
          )}

          {tab === 'send' && (
            <div className="cal-sec">
              {isLocal ? (
                <div className="cal-callout">
                  <b>{signedIn ? '把設計存到你的帳號' : '登入後才能放照片、分享與洽詢'}</b>
                  <p>{signedIn
                    ? '目前這份設計只存在這個瀏覽器。存到帳號之後就能放照片、分享給別人看，也能送出洽詢。'
                    : '你現在做的設計會先存在這個瀏覽器。註冊或登入後回到這裡，按一下就能存進帳號，不用重做。'}</p>
                  <button className="btn-primary tap" onClick={saveToAccount} disabled={!!busy}>{signedIn ? '存到我的帳號' : '登入／註冊並儲存'}</button>
                </div>
              ) : sent ? (
                <div className="cal-callout ok">
                  <b>已送出，謝謝你！</b>
                  <p>我們會在 {sent.replyDays} 個工作天內用 Email 或電話與你聯絡，確認數量、規格與報價。<strong>這是洽詢不是訂單</strong>，報價確認之前不會收費。確認信已寄到 {form.email}。</p>
                  {sent.missing.length > 0 && <p className="cal-warn">有 {sent.missing.length} 頁的原圖不在這台裝置上，我們會先用預覽圖跟你確認，再請你補傳原檔。</p>}
                  <button className="b tap" onClick={() => setSent(null)}>回到設計</button>
                </div>
              ) : (
                <>
                  <span className="cal-label">分享給別人看</span>
                  <p className="cal-note">對方只能在網站上用 3D 看，不能下載。關閉分享後舊連結就會失效。</p>
                  <div className="cal-row">
                    <button className="b dark tap" onClick={share}>{meta?.shareToken ? '再次分享連結' : '產生分享連結'}</button>
                    {meta?.shareToken && <button className="b tap" onClick={unshare}>關閉分享</button>}
                  </div>

                  <span className="cal-label" style={{ marginTop: 18 }}>送出客製洽詢</span>
                  {inq.length > 0 && (
                    <p className="cal-note">你已經送出過 {inq.length} 次洽詢（最近一次：{new Date(inq[0].createdAt).toLocaleDateString('zh-TW')}）。之後的修改不會影響已送出的那一份，有大改動可以再送一次。</p>
                  )}
                  <div className="cal-checks">
                    {flags.lowres.length > 0 && <p className="cal-warn">第 {flags.lowres.map(i => i + 1).join('、')} 頁的照片解析度偏低，印出來可能會模糊。</p>}
                    {flags.folk && <p className="cal-note">這份設計含「每日宜」民俗內容，我們報價前會再跟你確認。</p>}
                    <p className="cal-note">螢幕與印刷的顏色會有差異，實際以打樣為準；國定假日以政府公告為準。</p>
                  </div>
                  <div className="cal-form">
                    <label className="cal-label" htmlFor="q-name">聯絡人</label>
                    <input id="q-name" className="cal-input" maxLength={40} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <label className="cal-label" htmlFor="q-email">Email</label>
                    <input id="q-email" type="email" className="cal-input" maxLength={120} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <label className="cal-label" htmlFor="q-phone">電話（選填）</label>
                    <input id="q-phone" type="tel" className="cal-input" maxLength={30} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    <label className="cal-label" htmlFor="q-qty">預計數量（本）</label>
                    <input id="q-qty" type="number" inputMode="numeric" min={1} max={100000} className="cal-input" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
                    <label className="cal-label" htmlFor="q-note">需求說明（選填）</label>
                    <textarea id="q-note" className="cal-input cal-area" rows={3} maxLength={1000} placeholder="例如：公司年節禮、需要加印 LOGO、希望 12 月中前交貨"
                      value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                    <label className="cal-rights">
                      <input type="checkbox" checked={form.rights} onChange={e => setForm({ ...form, rights: e.target.checked })} />
                      <span>我確認設計中的照片是我自己拍攝，或我有權使用。</span>
                    </label>
                    <button className="btn-primary tap" onClick={submit} disabled={!!busy}>{busy || '送出洽詢'}</button>
                    <p className="cal-note">送出後我們會在 {CAL_LIMITS.REPLY_WORKDAYS} 個工作天內聯絡你。這是洽詢不是訂單，不會收費。</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {busy && <div className="cal-busy" role="status">{busy}</div>}
      </div>

      {picker && <WorksPicker handle={user?.handle} onPick={pickSite} onClose={() => setPicker(false)} />}
    </>
  )
}

function WorksPicker({ handle, onPick, onClose }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    let alive = true
    api.userProfile(handle).then(r => { if (alive) setItems((r.posts || []).filter(p => p.image)) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [handle])
  return (
    <SheetMask onClose={onClose} label="從我的作品選照片">
      {(close) => (
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-hd"><b>從我的作品選</b><button className="iconbtn tap" aria-label="關閉" onClick={close}><Icon name="x" /></button></div>
          <p className="cal-note" style={{ padding: '0 var(--space-4)' }}>站上的作品是壓縮過的版本，印刷會比較模糊；想印清楚建議直接上傳原始照片。</p>
          {items === null ? <div className="cal-skel ui-skeleton" /> : items.length === 0
            ? <div className="empty"><div className="empty-t">還沒有含照片的作品</div></div>
            : (
              <div className="cal-picker">
                {items.map(p => (
                  <button key={p.id} className="tap" onClick={() => { onPick(p); close() }} aria-label={stripEmoji(p.title)}>
                    <img src={p.image} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
        </div>
      )}
    </SheetMask>
  )
}
