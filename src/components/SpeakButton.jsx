import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { speechSupported, speak, scriptForObject } from '../lib/speak.js'

// ============================================================================
// 「聽這一段」按鈕 —— AR 掃描頁與卡片備援頁共用
//
// ⚠️ 不支援的瀏覽器**整顆不渲染**，不可顯示一顆按了沒反應的按鈕
//    ——那比沒有這個功能更糟。
//
// ⚠️ 三個一定要做的清理，漏任何一個都會讓聲音「跟著使用者跑」：
//    ① 元件卸載時 cancel（按上一頁離開後還在唸，而畫面上已經沒東西能停它）
//    ② 換到別的物件時 cancel（不然兩個物件的內容會疊在一起唸）
//    ③ 分頁切到背景時 cancel（使用者跳去別的 App，聲音還在背景講）
//
// ⚠️ AR 掃描頁尤其需要 ②：鏡頭一移開，命中的熱區就換了。追蹤層的
//    `makeHotspotLatch` 已經做了遲滯（進 3 幀、離 8 幀）避免抖動，
//    但真的換了物件時，上一段一定要停——否則使用者瞄準白菜卻聽到臘八粥。
// ============================================================================
export default function SpeakButton({ obj, className = '' }) {
  const [state, setState] = useState('idle')   // idle | speaking
  const ctrl = useRef(null)

  const stop = () => { ctrl.current?.cancel(); ctrl.current = null }

  // ①＋② obj 變了或元件卸載 → 停
  useEffect(() => stop, [obj?.id])

  // ③ 分頁切到背景 → 停
  useEffect(() => {
    const h = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])

  if (!speechSupported() || !obj) return null

  const toggle = () => {
    if (state === 'speaking') { stop(); setState('idle'); return }
    ctrl.current = speak(scriptForObject(obj), { onState: setState })
  }

  return (
    <button className={`btn-ghost tap cardp-speak ${className}`} onClick={toggle}
      aria-label={state === 'speaking' ? '停止朗讀' : `朗讀${obj.name}的介紹`}>
      {/* ⚠️ 圖示名寫錯不會拋錯，Icon 會靜靜地退回 `dots`——站上的關閉是 `x` 不是 `close` */}
      <Icon name={state === 'speaking' ? 'x' : 'sound'}
        style={{ width: 18, height: 18, stroke: 'currentColor', verticalAlign: '-3px', marginRight: 6 }} />
      {state === 'speaking' ? '停止朗讀' : '聽這一段'}
    </button>
  )
}
