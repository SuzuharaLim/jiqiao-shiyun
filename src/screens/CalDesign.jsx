import { useEffect, useMemo, useRef, useState, lazy, Suspense, useCallback } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SheetMask, Link, Disclaimer } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { buildPages, TERM_START_OPTIONS } from '../data/calendarLayout.js'
import { CADENCES, FONTS, CAL_LIMITS, PALETTES, COLOR_SLOTS, TEXT_LIMITS, defaultDesign, normalizeDesign, designFlags, designSurfaces, slotLabel, resolveColors, contrast } from '../data/calendarRules.js'
import { baseHex, paperHex, pageRegions, cropRect, measureTextLayer, PAGE_RATIO, FONT } from '../lib/calRender.js'
import { renderSurfaceCanvas } from '../lib/calPages.js'
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

// 「我的配色」：自己調好、取了名字的顏色組合，存在這個瀏覽器，下一本桌曆也能用
const MYPAL_KEY = 'jq-cal-palettes'
const readMyPals = () => { try { const a = JSON.parse(localStorage.getItem(MYPAL_KEY) || '[]'); return Array.isArray(a) ? a.filter(p => p && p.colors).slice(0, 12) : [] } catch { return [] } }
const writeMyPals = (a) => { try { localStorage.setItem(MYPAL_KEY, JSON.stringify(a)) } catch { /* 無痕模式存不了也無妨 */ } }
const sameColors = (a = {}, b = {}) => COLOR_SLOTS.every(({ key }) => String(a[key] || '').toLowerCase() === String(b[key] || '').toLowerCase())
const SW = ['base', 'paper', 'accent', 'weekend']

// 視角預設（建模軟體的「正視圖／側視圖／俯視圖」）
const VIEWS = [['persp', '透視'], ['front', '正面'], ['side', '側面'], ['back', '背面'], ['top', '俯視']]
const TABS = [['page', '這一頁'], ['layout', '版型'], ['style', '樣式'], ['send', '分享・洽詢']]
// ── 「面」：c＝-1 是封面、0 起是日曆頁；f＝'front'|'back' ──
// 所有「這一頁」的編輯（照片、文字、標題）都經過這兩支，封面與背面才不必各寫一套。
const sideOf = (d, c, f) => { const b = (c < 0 ? d.cover : d.pages?.[c]) || {}; return f === 'back' ? b.back || {} : b }
function withSide(d, c, f, fn) {
  const b = (c < 0 ? d.cover : d.pages?.[c]) || {}
  const nb = f === 'back' ? { ...b, back: fn(b.back || {}) } : fn(b)
  return c < 0 ? { ...d, cover: nb } : { ...d, pages: { ...d.pages, [c]: nb } }
}

const dist = (pts) => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1 }
const thisYear = new Date().getFullYear()
const YEARS = [thisYear, thisYear + 1, thisYear + 2]

export default function CalDesign({ id = 'local' }) {
  const { user, push, replace, setToast, setStamp, requireAccount } = useNav()
  const isLocal = id === 'local'
  const signedIn = !!user && !user.guest

  const [design, setDesign] = useState(null)
  // ⚠️ 這兩個 ref 一定要宣告在載入 effect 之前（站規：TDZ 在本專案已經咬過三次，build 不會報）
  const designRef = useRef(null)                     // 目前的設計（update／undo 讀這一份，不讀 render 閉包）
  const hist = useRef({ past: [], future: [], key: '', at: 0 })
  const [meta, setMeta] = useState(null)              // 伺服器上的 { status, shareToken }
  const [err, setErr] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | dirty | saving | error
  const [cur, setCur] = useState(0)                   // -1＝封面
  const [face, setFace] = useState('front')           // 正面／背面
  const [viewCmd, setViewCmd] = useState(null)        // 視角按鈕：{ name, n }（n 讓同一個視角可以連按）
  // ★ 預設看 3D 實物、預設停在「這一頁」：使用者要的是「直接感受到這個畫面」，
  //   一進來先看到的應該是成品，而不是一張版型設定表（2026-10-04 使用者回饋「不直觀」）。
  const [tab, setTab] = useState('page')
  const [view, setView] = useState('3d')
  const [adjust, setAdjust] = useState(false)          // 照片調整模式（拖曳移動、縮放）
  const [myPals, setMyPals] = useState(readMyPals)    // 我的配色（存在這個瀏覽器）
  const [customOpen, setCustomOpen] = useState(false)
  const [palName, setPalName] = useState('')
  const [sel, setSel] = useState(null)                // 選中的文字框 { scope: 'page'|'global', id }
  const [guide, setGuide] = useState(null)             // 拖曳文字時的置中參考線 { v, h }
  const [pw, setPw] = useState(0)                      // 平面預覽在畫面上的寬度（文字框覆蓋層要用）
  const measureCtx = useRef(null)
  const drag = useRef(null)
  // ⚠️ React 的 onWheel 是 passive，preventDefault 無效 ⇒ 在照片上滾輪縮放會連整頁一起捲走。
  //    自己掛一個 passive:false 的監聽器，處理函式用 ref 拿最新的那一份。
  const adjRef = useRef(null)
  const wheelFn = useRef(null)
  useEffect(() => {
    const el = adjRef.current
    if (!el) return
    const h = (e) => wheelFn.current?.(e)
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [adjust, view, cur])
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
    hist.current = { past: [], future: [], key: '', at: 0 }
    const load = (d) => { designRef.current = d; setDesign(d) }
    if (isLocal) { load(readLocalDesign() || normalizeDesign(defaultDesign())); setMeta(null); return }
    api.calGet(id).then(r => {
      if (!alive) return
      load(normalizeDesign(r.design.design))
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
  // ── 改動＋復原／重做 ──
  // ⚠️ 不可把「存檔、記歷史」寫進 setState 的更新函式裡：React 可能為了併發重跑它，
  //    副作用會執行不只一次（站規：remember() 那個坑）。改用 ref 拿目前的設計、在外面算好再 set。
  const persist = useCallback((next) => {
    if (isLocal) { writeLocal(next); return }
    pending.current = next
    setSaveState('dirty')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, 1200)
  }, [isLocal, flush])
  const [histTick, setHistTick] = useState(0)        // 讓復原／重做按鈕的可用狀態跟著更新
  /**
   * @param fn  prev → next
   * @param key 同一種連續動作（拖曳文字、拖曳照片、滑桿）用同一個 key：
   *            0.7 秒內的連續改動併成一步，否則拖一下就要按幾十次復原。
   */
  const update = useCallback((fn, key = '') => {
    const prev = designRef.current
    if (!prev) return
    const next = normalizeDesign(fn(prev))
    const h = hist.current, t = Date.now()
    if (!key || key !== h.key || t - h.at > 700) {
      h.past.push(prev)
      if (h.past.length > 80) h.past.shift()
    }
    h.future = []
    h.key = key; h.at = t
    designRef.current = next
    setDesign(next)
    persist(next)
    setHistTick(x => x + 1)
  }, [persist])
  const undo = useCallback(() => {
    const h = hist.current
    if (!h.past.length || !designRef.current) return
    h.future.push(designRef.current)
    const d = h.past.pop()
    h.key = ''
    designRef.current = d; setDesign(d); persist(d); setHistTick(x => x + 1)
    setToast('已復原上一步')
  }, [persist, setToast])
  const redo = useCallback(() => {
    const h = hist.current
    if (!h.future.length || !designRef.current) return
    h.past.push(designRef.current)
    const d = h.future.pop()
    h.key = ''
    designRef.current = d; setDesign(d); persist(d); setHistTick(x => x + 1)
    setToast('已重做')
  }, [persist, setToast])
  void histTick

  // 離開一個文字框時（選了別的、按完成、換頁），如果它還是空的就清掉。
  // ⚠️ 不可以在「打字的當下」清（那正是使用者把字刪光準備重打的時候），只在離開時清。
  const prevSel = useRef(null)
  useEffect(() => {
    const p = prevSel.current
    prevSel.current = sel ? { ...sel, page: cur, face } : null
    if (!p || (sel && sel.id === p.id && sel.scope === p.scope)) return
    const d = designRef.current
    if (!d) return
    const arr = p.scope === 'global' ? d.texts || [] : sideOf(d, p.page, p.face).texts || []
    const t = arr.find(x => x.id === p.id)
    if (!t || String(t.text).trim()) return
    update(dd => (p.scope === 'global'
      ? { ...dd, texts: (dd.texts || []).filter(x => x.id !== p.id) }
      : withSide(dd, p.page, p.face, sd => ({ ...sd, texts: (sd.texts || []).filter(x => x.id !== p.id) }))), 'drop-empty')
  }, [sel, cur, face, update])
  // 離開頁面前把還沒送出的改動送出去
  useEffect(() => () => { clearTimeout(saveTimer.current); flush() }, [flush])

  const pages = useMemo(() => (design ? buildPages(design) : []),
    // 只有影響日期的欄位才需要重算頁面
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [design?.cadence, design?.start?.year, design?.start?.month, design?.start?.termIndex, design?.start?.date, design?.style?.weekStart])
  useEffect(() => { if (cur >= pages.length && pages.length) setCur(pages.length - 1) }, [pages.length, cur])
  // 換頁、切回 3D 時結束調整模式。⚠️ 不可寫成「view 一變就關」：「調整大小與位置」是
  //    先切到平面再打開調整模式，effect 在 render 之後才跑，會把剛打開的又關掉。
  useEffect(() => { setAdjust(false) }, [cur, face])
  useEffect(() => { if (view === '3d') setAdjust(false) }, [view])
  useEffect(() => { setSel(s => (s?.scope === 'global' && face === 'front' && cur >= 0 ? s : null)) }, [cur, face])
  useEffect(() => { if (adjust) setSel(null) }, [adjust])

  // 平面預覽的實際寬度：文字框覆蓋層要用它把「頁寬比例」換成螢幕像素
  useEffect(() => {
    const el = previewRef.current
    if (!el || view !== '2d') return
    const set = () => setPw(el.clientWidth)
    set()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(set) : null
    ro?.observe(el)
    window.addEventListener('resize', set)
    return () => { ro?.disconnect(); window.removeEventListener('resize', set) }
  }, [view, design === null])

  // 鍵盤：復原／重做、刪除與微調選中的文字框。處理函式在 render 後半段才定義，用 ref 拿最新的。
  const keyFn = useRef(null)
  useEffect(() => {
    const h = (e) => keyFn.current?.(e)
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // 內容版本：任何會改變畫面的東西都算進來（2D 重畫、3D 重新載貼圖）
  const version = useMemo(() => JSON.stringify([design?.style, design?.pages, design?.cover, design?.title, design?.texts, design?.cadence, design?.start]), [design])

  // ── 2D 預覽 ──
  useEffect(() => {
    if (!design || view !== '2d' || !pages.length || (cur >= 0 && !pages[cur])) return
    let alive = true
    renderSurfaceCanvas(design, pages, cur, face, 900).then(c => {
      if (!alive || !c || !previewRef.current) return
      c.className = 'cal-page-canvas'
      c.setAttribute('role', 'img')
      c.setAttribute('aria-label', `${cur < 0 ? '封面' : pages[cur].label}${face === 'back' ? '背面' : ''}的版面預覽`)
      c.oncontextmenu = (e) => e.preventDefault()     // 不給「另存圖片」
      previewRef.current.replaceChildren(c)
    })
    return () => { alive = false }
  }, [design, pages, cur, face, view, version])

  // 3D 的第 i 張紙＝第 i-1 頁（第 0 張是封面）
  const getCanvas = useCallback((i) => renderSurfaceCanvas(design, pages, i - 1, 'front', 1024), [design, pages])
  const getBack = useCallback((i) => renderSurfaceCanvas(design, pages, i - 1, 'back', 1024, { blankNull: true }), [design, pages])

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
  const isCover = cur < 0, isBack = face === 'back'
  const calFront = !isCover && !isBack                 // 只有日曆頁正面才有日期格、標題列、「每一頁都放」的文字
  const over = sideOf(design, cur, face)
  const setPage = (patch, key) => update(d => withSide(d, cur, face, sd => ({ ...sd, ...patch })), key)
  const flags = designFlags(design)
  const base = baseHex(design), paper = paperHex(design)
  const regions = pageRegions(isBack ? 'back' : isCover ? 'cover' : page?.kind)
  const sideName = `${isCover ? '封面' : page?.label || ''}${isBack ? '・背面' : ''}`
  const goTo = (c, f = 'front') => { setCur(Math.max(-1, Math.min(pages.length - 1, c))); setFace(f) }
  // 3D：編輯背面時那張紙要翻過去（背面才朝外）
  const sheet3d = cur + 1 + (isBack ? 1 : 0)
  const crop = over.img?.crop || { z: 1, x: 0, y: 0 }
  const setCrop = (c) => setPage({ img: { ...over.img, crop: { ...crop, ...c } } }, 'crop')

  // ── 照片調整：拖曳移動、滾輪／雙指／滑桿縮放 ──
  // 位置存成「可移動範圍的比例」（calRender.cropRect），所以預覽、3D、印刷取景一致。
  const panBy = (dxPx, dyPx, rect) => {
    const img = over.img
    if (!img?.w || !img?.h) return
    const r = cropRect(img.w, img.h, rect.width, rect.height, crop)
    const rangeX = (img.w - r.sw) / 2, rangeY = (img.h - r.sh) / 2
    // 手指往右拖＝照片往右移＝取景窗往左 ⇒ x 減少
    const nx = rangeX > 0 ? (crop.x || 0) - (dxPx * (r.sw / rect.width)) / rangeX : 0
    const ny = rangeY > 0 ? (crop.y || 0) - (dyPx * (r.sh / rect.height)) / rangeY : 0
    setCrop({ x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) })
  }
  const zoomTo = (z) => setCrop({ z: Math.max(1, Math.min(3, z)) })
  const onAdjDown = (e) => {
    // ⚠️ setPointerCapture 在某些情況會拋例外（指標已不存在、部分 WebView）——
    //    拋出去的話後面的拖曳狀態不會被記下來，照片就拖不動，而且沒有任何錯誤提示。
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* 沒捕捉也能拖，只是手指滑出框外會中斷 */ }
    const d = drag.current || { pts: new Map() }
    d.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    d.pinch = d.pts.size === 2 ? { dist: dist(d.pts), z: crop.z || 1 } : null
    drag.current = d
  }
  const onAdjMove = (e) => {
    const d = drag.current
    if (!d?.pts?.has(e.pointerId)) return       // 文字拖曳也用 drag.current（形狀不同），要防呆
    const prev = d.pts.get(e.pointerId)
    d.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (d.pinch && d.pts.size === 2) { zoomTo(d.pinch.z * dist(d.pts) / d.pinch.dist); return }
    panBy(e.clientX - prev.x, e.clientY - prev.y, e.currentTarget.getBoundingClientRect())
  }
  const onAdjUp = (e) => {
    const d = drag.current
    if (!d?.pts) return
    d.pts.delete(e.pointerId)
    if (d.pts.size < 2) d.pinch = null
    if (!d.pts.size) drag.current = null
  }
  const onAdjWheel = (e) => { e.preventDefault(); zoomTo((crop.z || 1) * Math.exp(-e.deltaY * 0.0015)) }
  wheelFn.current = onAdjWheel

  // 點頁面上的照片區：沒照片就放照片，有照片就進入調整模式
  const tapPhoto = () => { setTab('page'); if (over.img) setAdjust(true); else pickPhoto() }
  const tapHeader = () => {
    setTab('page')
    setTimeout(() => { const el = document.getElementById('cal-ptitle'); el?.focus({ preventScroll: true }); el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }) }, 60)
  }
  const pct = (r) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` })

  // ── 自由文字框 ───────────────────────────────────────────────
  const colors = resolveColors(design)
  const layersOf = (d, scope) => (scope === 'global' ? d.texts || [] : sideOf(d, cur, face).texts || [])
  const setLayers = (scope, fn, key) => update(d => (scope === 'global'
    ? { ...d, texts: fn(d.texts || []) }
    : withSide(d, cur, face, sd => ({ ...sd, texts: fn(sd.texts || []) }))), key)
  const shownLayers = [...(calFront ? (design.texts || []).map(t => ['global', t]) : []), ...(over.texts || []).map(t => ['page', t])]
  const selLayer = sel ? layersOf(design, sel.scope).find(t => t.id === sel.id) : null
  const patchLayer = (patch, key) => sel && setLayers(sel.scope, arr => arr.map(t => (t.id === sel.id ? { ...t, ...patch } : t)), key)
  const rid = () => Math.random().toString(36).slice(2, 10)
  const addText = () => {
    if (layersOf(design, 'page').length >= TEXT_LIMITS.PER_PAGE) { setToast(`一頁最多 ${TEXT_LIMITS.PER_PAGE} 個文字框`); return }
    const t = { id: rid(), text: '輸入文字', x: 0.5, y: 0.22, size: 5, font: design.style.font, color: colors.ink, bold: true, align: 'center', bg: 'paper' }
    setLayers('page', arr => [...arr, t])
    setAdjust(false); setView('2d'); setSel({ scope: 'page', id: t.id })
    setTimeout(() => { const el = document.getElementById('cal-tl-text'); el?.focus(); el?.select?.() }, 80)
  }
  const removeLayer = () => { if (!sel) return; setLayers(sel.scope, arr => arr.filter(t => t.id !== sel.id)); setSel(null) }
  const duplicateLayer = () => {
    if (!selLayer) return
    if (layersOf(design, sel.scope).length >= (sel.scope === 'global' ? TEXT_LIMITS.GLOBAL : TEXT_LIMITS.PER_PAGE)) { setToast('文字框已經到上限了'); return }
    const t = { ...selLayer, id: rid(), x: Math.min(0.95, selLayer.x + 0.04), y: Math.min(0.95, selLayer.y + 0.04) }
    setLayers(sel.scope, arr => [...arr, t]); setSel({ scope: sel.scope, id: t.id })
  }
  // 「每一頁都放」：在 design.texts（全部頁）與這一頁的 texts 之間搬移
  const toggleGlobal = () => {
    if (!selLayer) return
    const to = sel.scope === 'global' ? 'page' : 'global'
    if (to === 'global' && (design.texts || []).length >= TEXT_LIMITS.GLOBAL) { setToast(`「每一頁都放」最多 ${TEXT_LIMITS.GLOBAL} 個`); return }
    update(d => {
      const t = layersOf(d, sel.scope).find(x => x.id === sel.id)
      if (to === 'global') return { ...withSide(d, cur, face, sd => ({ ...sd, texts: (sd.texts || []).filter(x => x.id !== sel.id) })), texts: [...(d.texts || []), t] }
      return { ...withSide(d, cur, face, sd => ({ ...sd, texts: [...(sd.texts || []), t] })), texts: (d.texts || []).filter(x => x.id !== sel.id) }
    })
    setSel({ scope: to, id: sel.id })
  }

  // 文字框在螢幕上的外框（跟畫布上畫出來的字用同一支量測，框才會剛好包住字）
  const ph = pw * PAGE_RATIO
  const boxOf = (t) => {
    if (!pw) return null
    if (!measureCtx.current) measureCtx.current = document.createElement('canvas').getContext('2d')
    // 空的框用提示字「輸入文字」量大小：否則框縮成一條細線，抓不到也看不到
    const m = measureTextLayer(measureCtx.current, String(t.text).trim() ? t : { ...t, text: '輸入文字' }, pw / 100)
    const w = m.w + m.padX * 2, h = m.h + m.padY * 2
    return { left: t.x * pw - w / 2, top: t.y * ph - h / 2, width: w, height: h }
  }
  // 拖曳移動／拉角縮放。靠近頁面中線時吸附並顯示參考線——對齊不用靠眼力。
  const SNAP = 0.012
  const onTextDown = (e, scope, t, mode = 'move') => {
    e.stopPropagation()
    setSel({ scope, id: t.id })
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* 見照片拖曳的註解 */ }
    const cx = t.x * pw, cy = t.y * ph
    const r = previewRef.current.getBoundingClientRect()
    drag.current = { text: { mode, scope, id: t.id, sx: e.clientX, sy: e.clientY, x0: t.x, y0: t.y, size0: t.size,
      d0: Math.hypot(e.clientX - (r.left + cx), e.clientY - (r.top + cy)) || 1, left: r.left, top: r.top } }
  }
  const onTextMove = (e) => {
    const d = drag.current?.text
    if (!d) return
    const upd = (patch) => setLayers(d.scope, arr => arr.map(t => (t.id === d.id ? { ...t, ...patch } : t)), 'text-' + d.mode)
    if (d.mode === 'resize') {
      const cx = d.left + d.x0 * pw, cy = d.top + d.y0 * ph
      const k = Math.hypot(e.clientX - cx, e.clientY - cy) / d.d0
      upd({ size: Math.max(TEXT_LIMITS.SIZE_MIN, Math.min(TEXT_LIMITS.SIZE_MAX, d.size0 * k)) })
      return
    }
    let x = d.x0 + (e.clientX - d.sx) / pw, y = d.y0 + (e.clientY - d.sy) / ph
    const gv = Math.abs(x - 0.5) < SNAP, gh = Math.abs(y - 0.5) < SNAP
    if (gv) x = 0.5
    if (gh) y = 0.5
    setGuide({ v: gv, h: gh })
    upd({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) })
  }
  const onTextUp = () => { if (drag.current?.text) drag.current = null; setGuide(null) }

  keyFn.current = (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable
    const mod = e.ctrlKey || e.metaKey
    // 在輸入框裡打字時交給瀏覽器自己的復原（那是使用者預期的行為）
    if (mod && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
    if (mod && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
    if (!sel || typing || view !== '2d') return
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeLayer(); return }
    if (e.key === 'Escape') { setSel(null); return }
    const step = e.shiftKey ? 0.02 : 0.004
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (mv && selLayer) { e.preventDefault(); patchLayer({ x: Math.max(0, Math.min(1, selLayer.x + mv[0])), y: Math.max(0, Math.min(1, selLayer.y + mv[1])) }, 'text-nudge') }
  }
  const lowContrast = contrast(colors.ink, colors.paper) < 4.5

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
      // 放好照片的下一步幾乎一定是「移一下、放大一點」——直接帶進調整模式
      setView('2d'); setAdjust(true)
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
    // 每一面（封面、各頁正背面）各自的原圖，編號見 calendarRules.js 的 SLOT
    const withImg = designSurfaces(design).filter(x => x.side.img?.src === 'upload')
    try {
      setBusy('建立洽詢…')
      const { inquiryId } = await api.calInquire(id, { ...form, qty: Number(form.qty) || 1 })
      const missing = []
      for (let k = 0; k < withImg.length; k++) {
        const { slot: i, side } = withImg[k]
        setBusy(`上傳印刷用原圖 ${k + 1} / ${withImg.length}…`)
        const blob = await getPrintBlob(side.img.id)
        if (!blob) { missing.push(i); continue }
        const data = await blobToDataURL(blob)
        // 網路抖一下就重試一次；兩次都失敗才算缺頁（後台會看到，用預覽圖接洽）
        try { await api.calPrint(inquiryId, i, { data, w: side.img.w, h: side.img.h }) }
        catch { try { await api.calPrint(inquiryId, i, { data, w: side.img.w, h: side.img.h }) } catch { missing.push(i) } }
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
      <div className="body cal-body cal-ws">
        {/* ── 工具列（像建模軟體：檢視模式｜視角｜編輯動作）── */}
        <div className="cal-topbar" role="toolbar" aria-label="設計工具">
          <div className="cal-viewtabs" role="tablist" aria-label="預覽方式">
            {[['3d', '3D 實物'], ['2d', '平面編輯']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={view === k} className={`cal-vt tap${view === k ? ' on' : ''}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
          {view === '3d' && (
            <div className="cal-views" role="group" aria-label="視角">
              {VIEWS.map(([k, l]) => (
                <button key={k} className={`cal-vbtn tap${viewCmd?.name === k ? ' on' : ''}`} aria-pressed={viewCmd?.name === k}
                  onClick={() => setViewCmd(v => ({ name: k, n: (v?.n || 0) + 1 }))}>{l}</button>
              ))}
            </div>
          )}
          <span className="cal-tb-sp" />
          {/* 復原／重做：自由編輯工具最重要的安全網——敢試，是因為隨時退得回去 */}
          <div className="cal-hist">
            <button className="cal-hb tap" onClick={undo} disabled={!hist.current.past.length} aria-label="復原" title="復原（Ctrl+Z）">↶</button>
            <button className="cal-hb tap" onClick={redo} disabled={!hist.current.future.length} aria-label="重做" title="重做（Ctrl+Shift+Z）">↷</button>
            <button className="cal-addt tap" onClick={addText}>＋ 文字</button>
          </div>
        </div>

        {/* ── 大綱：封面＋每一頁（像建模軟體的物件清單）── */}
        <aside className="cal-outliner" aria-label="頁面清單">
          <div className="cal-ol-hd">頁面<small>{pages.length + 1} 張</small></div>
          {/* 每一張紙都是雙面的：正面／背面切換。背面沒放東西就是空白紙。 */}
          <div className="cal-faces" role="radiogroup" aria-label="正面或背面">
            {[['front', isCover ? '封面' : '正面'], ['back', '背面']].map(([f, l]) => (
              <button key={f} role="radio" aria-checked={face === f} className={`cal-face tap${face === f ? ' on' : ''}`} onClick={() => setFace(f)}>
                {l}{f === 'back' && (isCover ? design.cover?.back : design.pages[cur]?.back) ? <i className="cal-face-dot" aria-label="已有內容" /> : null}
              </button>
            ))}
          </div>
          <div className="cal-strip" role="listbox" aria-label="選擇頁面">
            <button role="option" aria-selected={cur === -1} className={`cal-chip tap cover${cur === -1 ? ' on' : ''}${design.cover?.img ? ' has-img' : ''}${design.cover?.back ? ' has-back' : ''}`}
              onClick={() => goTo(-1, face)}><span>封面</span></button>
            {pages.map((p, i) => (
              <button key={i} role="option" aria-selected={i === cur} className={`cal-chip tap${i === cur ? ' on' : ''}${design.pages[i]?.img ? ' has-img' : ''}${design.pages[i]?.back ? ' has-back' : ''}`}
                onClick={() => goTo(i, face)}><span>{p.label}</span></button>
            ))}
          </div>
        </aside>

        {/* ── 視窗 ── */}
        <div className="cal-stage">
          <div className="cal-vp">
          <span className="cal-vp-tag" aria-hidden="true">{view === '3d' ? '透視' : '平面'} · {sideName}</span>
          {view === '2d' ? (
            <div className="cal-page-wrap">
              <div className="cal-page" ref={previewRef} />
              {/* 直接在頁面上編輯：點照片區放／調整照片、點標題區寫字。
                  虛線框與提示一直看得到——「可以點這裡」不能靠使用者自己猜。 */}
              {adjust ? (
                <div className="cal-hit photo adjusting" style={pct(regions.photo)} ref={adjRef}
                  onPointerDown={onAdjDown} onPointerMove={onAdjMove} onPointerUp={onAdjUp} onPointerCancel={onAdjUp}
                  role="application" aria-label="拖曳移動照片位置，滾輪或雙指縮放">
                  <span className="cal-hit-tag">拖曳移動・滾輪或雙指縮放</span>
                </div>
              ) : (
                <>
                  <button type="button" className={`cal-hit photo tap${over.img ? ' has' : ''}`} style={pct(regions.photo)} onClick={tapPhoto}
                    aria-label={over.img ? '調整這張照片的大小與位置' : '在這一頁放照片'}>
                    <span className="cal-hit-tag">{over.img ? '點一下調整照片' : '＋ 點這裡放照片'}</span>
                  </button>
                  {regions.header && (
                    <button type="button" className="cal-hit header tap" style={pct(regions.header)} onClick={tapHeader} aria-label={isCover ? '編輯封面書名' : '編輯這一頁的標題與文字'}>
                      <span className="cal-hit-tag">{isCover ? '點一下改書名' : over.title ? '點一下改文字' : '＋ 點這裡寫標題'}</span>
                    </button>
                  )}
                  {/* 自由文字框：疊在最上層，可以拖曳、拉右下角縮放 */}
                  {shownLayers.map(([scope, t]) => {
                    const b = boxOf(t)
                    if (!b) return null
                    const on = sel?.id === t.id
                    return (
                      <div key={t.id} className={`cal-tl${on ? ' on' : ''}${scope === 'global' ? ' global' : ''}`}
                        style={{ left: b.left - 4, top: b.top - 4, width: b.width + 8, height: b.height + 8 }}
                        role="button" tabIndex={0} aria-label={`文字框：${t.text}，拖曳可移動`}
                        onPointerDown={(e) => onTextDown(e, scope, t)} onPointerMove={onTextMove} onPointerUp={onTextUp} onPointerCancel={onTextUp}
                        onClick={(e) => e.stopPropagation()}>
                        {scope === 'global' && <span className="cal-tl-tag">每一頁</span>}
                        {!String(t.text).trim() && <span className="cal-tl-ph" style={{ fontFamily: FONT[t.font], fontSize: t.size * pw / 100 }}>輸入文字</span>}
                        {on && (
                          <span className="cal-tl-resize" aria-label="拖曳縮放文字"
                            onPointerDown={(e) => onTextDown(e, scope, t, 'resize')} onPointerMove={onTextMove} onPointerUp={onTextUp} onPointerCancel={onTextUp} />
                        )}
                      </div>
                    )
                  })}
                  {guide?.v && <span className="cal-guide v" aria-hidden="true" />}
                  {guide?.h && <span className="cal-guide h" aria-hidden="true" />}
                </>
              )}
            </div>
          ) : (
            <Suspense fallback={<div className="cal3d cal3d-loading">載入 3D 模型中…</div>}>
              <CalModel3D count={pages.length + 1} current={sheet3d} getCanvas={getCanvas} getBack={getBack} face={face} viewCmd={viewCmd} onOrbit={() => setViewCmd(v => (v ? { ...v, name: null } : v))} version={version}
                baseColor={base} paperColor={paper} label={`${design.title}，${sideName}，拖曳可轉動，點左右兩側翻頁`}
                onFlip={(d) => goTo(Math.min(pages.length, Math.max(0, sheet3d + d)) - 1)} />
            </Suspense>
          )}
          </div>
          {selLayer && view === '2d' && !adjust && (
            <div className="cal-adjust cal-textbar" role="group" aria-label="編輯文字框">
              <textarea id="cal-tl-text" className="cal-input cal-area" rows={2} maxLength={TEXT_LIMITS.MAX_CHARS} value={selLayer.text}
                aria-label="文字內容" onChange={e => patchLayer({ text: e.target.value }, 'text-typing')} />
              <div className="cal-row">
                {FONTS.map(f => (
                  <button key={f.id} className={`chip tap${selLayer.font === f.id ? ' on' : ''}`} style={{ fontFamily: FONT[f.id] }}
                    onClick={() => patchLayer({ font: f.id })}>{f.name}</button>
                ))}
                <button className={`chip tap${selLayer.bold ? ' on' : ''}`} aria-pressed={selLayer.bold} onClick={() => patchLayer({ bold: !selLayer.bold })}><b>粗體</b></button>
              </div>
              <label className="cal-adjust-z">
                <span>大小</span>
                <input type="range" min={TEXT_LIMITS.SIZE_MIN} max={TEXT_LIMITS.SIZE_MAX} step="0.1" value={selLayer.size} aria-label="文字大小"
                  onChange={e => patchLayer({ size: Number(e.target.value) }, 'text-size')} />
                <b>{selLayer.size.toFixed(1)}</b>
              </label>
              <span className="cal-label">文字顏色</span>
              <div className="cal-row cal-tcolors">
                {[...new Set([colors.ink, colors.accent, colors.weekend, colors.base, '#FFFFFF', '#22201E'])].map(c => (
                  <button key={c} className={`cal-sw sm tap${selLayer.color.toLowerCase() === c.toLowerCase() ? ' on' : ''}`} style={{ '--sw': c }}
                    aria-label={`文字顏色 ${c}`} onClick={() => patchLayer({ color: c })} />
                ))}
                <label className="cal-sw sm custom" title="自訂顏色">
                  <input type="color" value={selLayer.color} aria-label="自訂文字顏色" onChange={e => patchLayer({ color: e.target.value }, 'text-color')} />
                </label>
              </div>
              {(() => {
                // 文字與它的底色太接近就提醒（大字的 AA 門檻是 3）。沒有底色時拿紙張色比——
                // 疊在照片上的字無從判斷，那種情況交給「淺底／深底」解決。
                const under = selLayer.bg === 'ink' ? colors.ink : selLayer.bg === 'accent' ? colors.accent : colors.paper
                const c = contrast(selLayer.color, under)
                return c < 3 && <p className="cal-warn">文字顏色和底色太接近（對比 {c.toFixed(1)}），印出來可能看不清楚。換個顏色，或改用「淺底／深底」。</p>
              })()}
              <span className="cal-label">底色・對齊</span>
              <div className="cal-row">
                {[['none', '無'], ['paper', '淺底'], ['ink', '深底'], ['accent', '強調色']].map(([v, l]) => (
                  <button key={v} className={`chip tap${selLayer.bg === v ? ' on' : ''}`} onClick={() => patchLayer({ bg: v })}>{l}</button>
                ))}
                {[['left', '靠左'], ['center', '置中'], ['right', '靠右']].map(([v, l]) => (
                  <button key={v} className={`chip tap${selLayer.align === v ? ' on' : ''}`} onClick={() => patchLayer({ align: v })}>{l}</button>
                ))}
              </div>
              <div className="cal-row">
                <button className="b tap" onClick={() => patchLayer({ x: 0.5 })}>水平置中</button>
                {calFront && (
                  <button className={`b tap${sel.scope === 'global' ? ' dark' : ''}`} aria-pressed={sel.scope === 'global'} onClick={toggleGlobal}>
                    {sel.scope === 'global' ? '✓ 每一頁都放' : '每一頁都放'}
                  </button>
                )}
                <button className="b tap" onClick={duplicateLayer}>複製</button>
                <button className="b tap" onClick={removeLayer}>刪除</button>
                <button className="b dark tap" onClick={() => setSel(null)}>完成</button>
              </div>
              <p className="cal-note">也可以用方向鍵微調位置（Shift 加大步距），Delete 刪除。</p>
            </div>
          )}
          {adjust && (
            <div className="cal-adjust">
              <label className="cal-adjust-z">
                <span>縮放</span>
                <input type="range" min="1" max="3" step="0.01" value={crop.z || 1} aria-label="照片縮放"
                  onChange={e => zoomTo(Number(e.target.value))} />
                <b>{Math.round((crop.z || 1) * 100)}%</b>
              </label>
              <div className="cal-row">
                <button className="b tap" onClick={() => setCrop({ z: 1, x: 0, y: 0 })}>置中重設</button>
                <button className="b tap" onClick={pickPhoto}>換一張</button>
                <button className="b dark tap" onClick={() => setAdjust(false)}>完成</button>
              </div>
            </div>
          )}
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
                    onClick={() => { update(d => ({ ...d, cadence: k })); goTo(0) }}>
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
              <span className="cal-label">{isCover ? '封面照片' : isBack ? `${sideName}的照片` : '這一頁的照片'}</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} aria-label="選擇照片" />
              {over.img ? (
                <div className="cal-photo">
                  <img src={`/api/images/${over.img.id}`} alt="" draggable="false" onContextMenu={e => e.preventDefault()} />
                  <div>
                    {Math.max(over.img.w, over.img.h) < CAL_LIMITS.LOWRES_LONG_EDGE
                      ? <p className="cal-warn">解析度偏低（{over.img.w}×{over.img.h}），印出來可能會模糊。建議換一張原始照片。</p>
                      : <p className="cal-ok">解析度足夠印刷（{over.img.w}×{over.img.h}）</p>}
                    <div className="cal-row">
                      <button className="b dark tap" onClick={() => { setView('2d'); setAdjust(true) }}>調整大小與位置</button>
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
              <p className="cal-note">{isBack
                ? '背面是整面照片，翻過去之後從桌曆後面看得到。不放東西就是空白紙。'
                : isCover ? '封面沒放照片時，用年份大字當主視覺。'
                : `沒有照片的頁會用頁名（「${page?.term || page?.label}」）的大字當主視覺。`}照片原檔上限 {CAL_LIMITS.SOURCE_MAX_BYTES / 1048576} MB。</p>

              {!isBack && (<>
                <label className="cal-label" htmlFor="cal-ptitle">{isCover ? '封面書名' : '頁面標題（選填）'}</label>
                <input id="cal-ptitle" className="cal-input" maxLength={30} placeholder={isCover ? design.title : '例如：全家第一次露營'} value={over.title || ''}
                  onChange={e => setPage({ title: e.target.value })} />
              </>)}
              <span className="cal-label">文字</span>
              <p className="cal-note">在頁面上任何位置加文字：拖曳移動、拉右下角縮放，可以換字體、顏色、底色。</p>
              <div className="cal-layers">
                {shownLayers.map(([scope, t]) => (
                  <button key={t.id} className={`cal-layer tap${sel?.id === t.id ? ' on' : ''}`}
                    onClick={() => { setView('2d'); setAdjust(false); setSel({ scope, id: t.id }) }}>
                    <span style={{ fontFamily: FONT[t.font], color: t.color }}>{t.text.split('\n')[0] || '（空白）'}</span>
                    {scope === 'global' && <em>每一頁</em>}
                  </button>
                ))}
                <button className="b dark tap" onClick={addText}>＋ 加文字</button>
              </div>
            </div>
          )}

          {tab === 'style' && (() => {
            const overrides = Object.keys(design.style.colors || {}).length > 0
            const mine = overrides ? myPals.find(p => sameColors(p.colors, colors)) : null
            const customOn = customOpen || (overrides && !mine)
            const setColors = (c) => update(d => ({ ...d, style: { ...d.style, colors: { ...c } } }))
            const sw = (c) => <span className="cal-pchip-sw" aria-hidden="true">{SW.map(k => <i key={k} style={{ background: c[k] }} />)}</span>
            return (
              <div className="cal-sec cal-style">
                <span className="cal-label">配色</span>
                {/* 一列橫向捲動：自訂＋我的配色＋預設組合 */}
                <div className="cal-palrow">
                  <button className={`cal-pchip custom tap${customOn ? ' on' : ''}`} aria-pressed={customOn}
                    onClick={() => { setCustomOpen(true); if (!overrides) setColors(colors) }}>
                    {sw(colors)}<b>自訂</b>
                  </button>
                  {myPals.map(p => {
                    const on = mine?.id === p.id && !customOpen
                    return (
                      <span key={p.id} className="cal-pchip-wrap">
                        <button className={`cal-pchip tap${on ? ' on' : ''}`} aria-pressed={on}
                          onClick={() => { setCustomOpen(false); setColors(p.colors) }}>{sw(p.colors)}<b>{p.name}</b></button>
                        <button className="cal-pchip-x tap" aria-label={`刪除我的配色「${p.name}」`}
                          onClick={() => { const a = myPals.filter(x => x.id !== p.id); setMyPals(a); writeMyPals(a) }}>×</button>
                      </span>
                    )
                  })}
                  {PALETTES.map(p => {
                    const on = design.style.palette === p.id && !overrides && !customOpen
                    return (
                      <button key={p.id} className={`cal-pchip tap${on ? ' on' : ''}`} aria-pressed={on}
                        onClick={() => { setCustomOpen(false); update(d => ({ ...d, style: { ...d.style, palette: p.id, colors: {} } })) }}>
                        {sw(p.colors)}<b>{p.name}</b>
                      </button>
                    )
                  })}
                </div>

                {customOn && (
                  <div className="cal-custom">
                    <div className="cal-colors">
                      {COLOR_SLOTS.map(({ key, name }) => (
                        <label key={key} className="cal-color">
                          <input type="color" value={colors[key]} aria-label={`${name}的顏色`}
                            onChange={e => update(d => ({ ...d, style: { ...d.style, colors: { ...(d.style.colors || {}), [key]: e.target.value } } }), 'color-' + key)} />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                    {lowContrast && (
                      <p className="cal-warn">「日期數字」和「紙張」太接近（對比 {contrast(colors.ink, colors.paper).toFixed(1)}），印出來會看不清楚，建議 4.5 以上。</p>
                    )}
                    <div className="cal-row cal-savepal">
                      <input className="cal-input" maxLength={8} placeholder="幫這組配色取個名字" aria-label="配色名稱"
                        value={palName} onChange={e => setPalName(e.target.value)} />
                      <button className="b dark tap" disabled={!palName.trim()} onClick={() => {
                        const a = [{ id: Math.random().toString(36).slice(2, 9), name: palName.trim().slice(0, 8), colors: { ...colors } }, ...myPals].slice(0, 12)
                        setMyPals(a); writeMyPals(a); setPalName(''); setCustomOpen(false)
                        setToast('已存成我的配色，下一本桌曆也能用')
                      }}>存成我的配色</button>
                    </div>
                  </div>
                )}

                <div className="cal-inline">
                  <span className="cal-label">字體</span>
                  <div className="cal-row">
                    {FONTS.map(f => (
                      <button key={f.id} className={`chip tap${design.style.font === f.id ? ' on' : ''}`} style={{ fontFamily: FONT[f.id] }}
                        onClick={() => update(d => ({ ...d, style: { ...d.style, font: f.id } }))}>{f.name}</button>
                    ))}
                  </div>
                </div>
                <div className="cal-inline">
                  <span className="cal-label">每週從</span>
                  <div className="cal-row">
                    {[[0, '星期日'], [1, '星期一']].map(([v, l]) => (
                      <button key={v} className={`chip tap${design.style.weekStart === v ? ' on' : ''}`}
                        onClick={() => update(d => ({ ...d, style: { ...d.style, weekStart: v } }))}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="cal-inline">
                  <span className="cal-label">日期格標示</span>
                  <div className="cal-row">
                    {[['lunar', '農曆'], ['term', '節氣'], ['fest', '節日'], ['yiji', '每日宜']].map(([k, l]) => (
                      <button key={k} className={`chip tap${design.style.marks[k] ? ' on' : ''}`} aria-pressed={!!design.style.marks[k]}
                        onClick={() => update(d => ({ ...d, style: { ...d.style, marks: { ...d.style.marks, [k]: !d.style.marks[k] } } }))}>
                        {design.style.marks[k] ? '✓ ' : ''}{l}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="cal-note">字體為裝置系統字、顏色以打樣為準；農曆節氣為天文演算，「每日宜」屬民俗推算；國定假日以政府公告為準。</p>
              </div>
            )
          })()}

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
                    {flags.lowres.length > 0 && <p className="cal-warn">{flags.lowres.map(slotLabel).join('、')}的照片解析度偏低，印出來可能會模糊。</p>}
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
        {/* ── 狀態列 ── */}
        <div className="cal-status">
          <button className="cal-navb tap" onClick={() => goTo(cur - 1, face)} disabled={cur <= -1} aria-label="上一頁">‹</button>
          <span className="cal-navl" aria-live="polite"><b>{sideName}</b><small>{isCover ? '封面' : `第 ${cur + 1} / ${pages.length} 頁`}</small></span>
          <button className="cal-navb tap" onClick={() => goTo(cur + 1, face)} disabled={cur >= pages.length - 1} aria-label="下一頁">›</button>
          <span className="cal-hint">{view === '3d'
            ? '左鍵拖曳旋轉・滾輪縮放・點右側往後翻、點左側或轉到背面往前翻'
            : '直接點頁面上的照片或標題就能編輯'}</span>
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
