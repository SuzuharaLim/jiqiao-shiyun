import { useState, useMemo } from 'react'
import Icon from './Icon.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

// 頂列（Top bar）
// ★ 無障礙關鍵：title 渲染成 <h1>。稽核發現全站原本 0 個 h1（標題都畫在這裡
//   但用 <div>），改這一處即補上 48 個畫面的標題語意。
//   tabIndex={-1} 供頁面切換後移轉焦點用（SPA 無障礙必要，見 App.jsx）。
//
// ★ 每頁只能有一個 h1：開啟堆疊畫面（如貼文詳情）時，根分頁的 TopBar 仍在
//   DOM 裡（只是 CSS 隱藏），若兩者都是 h1 就會重複。故底層的降級為 <p>，
//   只有「最上層畫面」的標題才是 h1。
export function TopBar({ title, brand, left, right, onBack, onClose }) {
  const { pop, stack } = useNav()
  // 有堆疊時，沒有 onBack/onClose 的 TopBar 代表它是被蓋住的根畫面
  const isTop = stack.length === 0 || onBack !== undefined || onClose !== undefined
  const TitleTag = isTop ? 'h1' : 'p'
  // onBack / onClose 可為 bare flag（true）或函式；bare 時預設呼叫 pop
  const showBack = onBack !== undefined
  const showClose = onClose !== undefined
  const backFn = typeof onBack === 'function' ? onBack : pop
  const closeFn = typeof onClose === 'function' ? onClose : pop
  return (
    <div className="topbar">
      <div className="row" style={{ minWidth: 30 }}>
        {showBack ? (
          <button className="iconbtn tap" onClick={backFn} aria-label="返回"><Icon name="back" /></button>
        ) : showClose ? (
          <button className="iconbtn tap" onClick={closeFn} aria-label="關閉"><Icon name="x" /></button>
        ) : (left || null)}
      </div>
      {brand
        ? <TitleTag className="brand" {...(isTop && { 'data-screen-title': true, tabIndex: -1 })}>{brand}</TitleTag>
        : <TitleTag className="ttl" {...(isTop && { 'data-screen-title': true, tabIndex: -1 })}>{title}</TitleTag>}
      <div className="row" style={{ minWidth: 30, justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )
}

// 底部分頁列（Tab bar）—— 加中文標籤，去 IG 純圖示化
const TABS = [
  { i: 0, name: 'home', label: '首頁' }, { i: 1, name: 'search', label: '探索' },
  { i: 2, name: 'plus', label: '建立' }, { i: 3, name: 'fortune', label: '占卜' },
  { i: 4, name: 'user', label: '我的' },
]
export function TabBar() {
  const { tab, setTab, push } = useNav()
  return (
    <div className="tabbar">
      {TABS.map(t => (
        <button key={t.i} className={`tabbtn tap ${tab === t.i ? 'on' : ''}`} onClick={() => setTab(t.i)}
          aria-label={t.label} aria-current={tab === t.i ? 'page' : undefined}>
          <Icon name={t.name} fill={tab === t.i} />
          <span className="tablbl">{t.label}</span>
        </button>
      ))}
      {/* 掃描：開啟鏡頭掃描實體明信片／手帳（之後接明信片辨識） */}
      <button className="tabbtn tap scanbtn" onClick={() => push('scan')} aria-label="掃描明信片">
        <Icon name="scan" />
        <span className="tablbl">掃描</span>
      </button>
    </div>
  )
}

// 清單列（工具 / 選項）
export function ToolRow({ icon, bg, title, sub, onClick, right }) {
  return (
    <button className="tool tap" onClick={onClick}>
      {icon && <div className="ti" style={{ background: bg }}>{icon}</div>}
      <div className="tn2">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </div>
      {right !== undefined ? right : <Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />}
    </button>
  )
}

// 開關（Switch）—— 用 span（非 button），避免巢狀在 ToolRow 的 <button> 內造成 DOM 穿模
export function Switch({ on, onChange }) {
  return (
    <span
      className={`sw ${on ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange && onChange(!on) }}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onChange && onChange(!on) } }}
      role="switch" aria-checked={on} tabIndex={0}
    ><i /></span>
  )
}

// 區段標題
export function SectionHead({ title, extra }) {
  return <div className="sech">{title}{extra && <span>{extra}</span>}</div>
}

// 命理／占卜 免責聲明（上線合規）
export function Disclaimer({ text }) {
  return (
    <p className="muted" style={{ padding: '6px 16px 16px', fontSize: 11, lineHeight: 1.7 }}>
      ＊{text || '本結果結合傳統民俗文化與 AI 生成內容，僅供參考娛樂，不構成醫療、法律、財務、婚姻或投資等專業建議。'}
    </p>
  )
}

// ---------- 宜／忌 詞彙白話解釋 ----------
// 用法：父層 const gl = useGlossary() → 用 <GlossTerm term={t} cls="ty" gl={gl} /> 取代原本的文字，
// 再在合適位置放一個 <GlossPanel gl={gl} />（通常放在兩欄之下，才有整行寬度顯示說明）。
// 詞彙表存 DB 的 ref_items（kind=almanacTerms），查不到解釋的詞會自動退化成純文字（不可點）。
export function useGlossary() {
  const items = useContent('almanacTerms')
  const map = useMemo(
    () => Object.fromEntries((items || []).map(it => [it.term, it.mean])),
    [items])
  const [open, setOpen] = useState(null)
  return {
    map, open,
    toggle: (t) => setOpen(o => (o === t ? null : t)),
    close: () => setOpen(null),
  }
}

export function GlossTerm({ term, cls = '', gl }) {
  if (!gl?.map[term]) return <span className={cls}>{term}</span>   // 無解釋 → 純文字
  const on = gl.open === term
  return (
    <button type="button" className={`${cls} glossable tap${on ? ' on' : ''}`}
      aria-expanded={on} aria-label={`${term}，查看說明`}
      onClick={() => gl.toggle(term)}>{term}</button>
  )
}

export function GlossPanel({ gl }) {
  if (!gl?.open) return null
  return (
    <div className="glosspanel" role="status">
      <b>{gl.open}</b>
      <span>{gl.map[gl.open]}</span>
      <button type="button" className="x tap" aria-label="關閉說明" onClick={gl.close}>✕</button>
    </div>
  )
}

// 使用者上傳的照片：填滿容器（.ph/.img/.gimg 等 emoji 佔位框），無圖時由呼叫端 fallback 到 emoji
export function PhotoImg({ src, style }) {
  return <img src={src} alt="" loading="lazy"
    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit', ...style }} />
}

// 浮動提示（Toast）
export function Toast() {
  const { toast } = useNav()
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

// 頭像：有上傳的照片就顯示照片，否則回退 emoji。
// 放在 .pf-av/.av/.wn-ava 等既有圓形容器內，靠 object-fit 填滿。
export function Avatar({ imageId, emoji = '🌾' }) {
  if (!imageId) return <>{emoji}</>
  return <img src={`/api/images/${imageId}`} alt=""
    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
}
