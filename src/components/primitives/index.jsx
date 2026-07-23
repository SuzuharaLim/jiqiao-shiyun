// ═══════════════════════════════════════════════════════════════════════
// Primitives —— 版面與文字的基本積木
//
// 用途：讓「間距、行長、字級」只能從代幣挑，不能隨手填數字。
//       稽核發現現況有 35 種字級、358 處 inline style，就是缺這一層造成的。
//
// 原則：這些元件不帶任何裝飾（無背景、無邊框、無陰影），只管排版。
//       視覺樣式交給 Card / Button 等元件層。
// ═══════════════════════════════════════════════════════════════════════

const SPACE = { 0: '0', 1: 'var(--s-1)', 2: 'var(--s-2)', 3: 'var(--s-3)', 4: 'var(--s-4)',
  5: 'var(--s-5)', 6: 'var(--s-6)', 7: 'var(--s-7)', 8: 'var(--s-8)', 9: 'var(--s-9)', 10: 'var(--s-10)' }

const SIZE = { xs: 'var(--t-xs)', sm: 'var(--t-sm)', base: 'var(--t-base)', lg: 'var(--t-lg)',
  xl: 'var(--t-xl)', '2xl': 'var(--t-2xl)', '3xl': 'var(--t-3xl)' }

const TONE = { default: 'var(--c-text)', muted: 'var(--c-text-2)', subtle: 'var(--c-text-3)',
  accent: 'var(--c-accent)', danger: 'var(--c-danger)' }

/** 內容容器：最大寬 --container，左右留 --gutter */
export function Container({ as: As = 'div', wide = false, className = '', style, children, ...rest }) {
  return (
    <As className={className} {...rest}
      style={{
        width: '100%',
        maxWidth: wide ? 'none' : 'var(--container)',
        marginInline: 'auto',
        paddingInline: 'var(--gutter)',
        ...style,
      }}>{children}</As>
  )
}

/** 垂直流：唯一的區塊間距來源。gap 只能給 0–10 的代幣階，不接受任意數字 */
export function Stack({ as: As = 'div', gap = 4, align, className = '', style, children, ...rest }) {
  return (
    <As className={className} {...rest}
      style={{ display: 'flex', flexDirection: 'column', gap: SPACE[gap] ?? SPACE[4], alignItems: align, ...style }}>
      {children}
    </As>
  )
}

/** 正文區塊：限制行長 --measure（68ch）以維持可讀性，行高用 --lh-body */
export function Prose({ as: As = 'div', className = '', style, children, ...rest }) {
  return (
    <As className={className} {...rest}
      style={{ maxWidth: 'var(--measure)', lineHeight: 'var(--lh-body)', ...style }}>{children}</As>
  )
}

/**
 * 文字：統一字級與顏色的出口。
 * size: xs|sm|base|lg|xl|2xl|3xl   tone: default|muted|subtle|accent|danger
 * serif: 標題等需要文化調性時使用（方案 B 保留襯線作為品牌識別）
 */
export function Text({
  as: As = 'p', size = 'base', tone = 'default', weight, serif = false,
  className = '', style, children, ...rest
}) {
  const big = size === '2xl' || size === '3xl' || size === 'xl'
  return (
    <As className={className} {...rest}
      style={{
        fontSize: SIZE[size] ?? SIZE.base,
        color: TONE[tone] ?? TONE.default,
        fontWeight: weight,
        fontFamily: serif ? 'var(--f-serif)' : undefined,
        lineHeight: big ? 'var(--lh-tight)' : undefined,
        letterSpacing: big ? 'var(--ls-tight)' : undefined,
        ...style,
      }}>{children}</As>
  )
}

export { default as Link } from './Link.jsx'
