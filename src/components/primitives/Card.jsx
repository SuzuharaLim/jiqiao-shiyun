// ═══════════════════════════════════════════════════════════════════════
// Card / Heading（DESIGN_BRIEF 階段 3）
//
// Card：極簡風「用 1px 邊框分隔，不用 box-shadow」（稽核：現況 28 處陰影）
// Heading：字級與 margin 全走代幣；--ls-tight 只用在大字級
// ═══════════════════════════════════════════════════════════════════════

export function Card({ as: As = 'div', flush = false, className = '', children, ...rest }) {
  return (
    <As className={`ui-card ${flush ? 'ui-card--flush' : ''} ${className}`} {...rest}>
      {children}
    </As>
  )
}

/**
 * Heading —— level 決定語意標籤（h1–h4），size 決定視覺大小。
 * 兩者分開是為了「語意正確」與「視覺需求」不打架：
 * 例如頁面第二層區塊語意上是 h2，但視覺上可能只需要 base 大小。
 */
export function Heading({
  level = 2, size, serif = true, className = '', children, ...rest
}) {
  const As = `h${Math.min(Math.max(level, 1), 6)}`
  const auto = { 1: '2xl', 2: 'xl', 3: 'lg', 4: 'base', 5: 'sm', 6: 'sm' }[level]
  const s = size || auto
  return (
    <As className={`ui-h ui-h--${s} ${serif ? 'ui-h--serif' : ''} ${className}`} {...rest}>
      {children}
    </As>
  )
}
