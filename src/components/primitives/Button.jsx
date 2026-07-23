// ═══════════════════════════════════════════════════════════════════════
// Button —— 三種 variant（DESIGN_BRIEF 階段 3）
//
//   primary  實心朱紅，主要動作。極簡風：無陰影、小圓角
//   ghost    描邊，次要動作
//   text     純文字，第三順位（原 .acc / .iconbtn 的角色）
//
// 稽核發現全站沒有 Button 元件，改用 8 種 class 散寫：
//   btn-primary(18) acc(18) iconbtn(17) b tap(17) b dark(14) pill(7) btn-ghost(6) chip(2)
// 這裡收斂為 3 種；舊 class 保留但已在 buttons.css 改走代幣，兩者視覺一致。
//
// 無障礙：:focus-visible 用 --c-focus 畫 2px 外框 + 2px offset（規格要求）。
// ═══════════════════════════════════════════════════════════════════════
export default function Button({
  variant = 'ghost', size = 'md', block = false, danger = false,
  as: As = 'button', className = '', children, ...rest
}) {
  const cls = [
    'ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`,
    block && 'ui-btn--block', danger && 'is-danger', className,
  ].filter(Boolean).join(' ')

  // <button> 沒寫 type 預設是 submit，在表單內會意外送出——顯式指定
  const typeAttr = As === 'button' ? { type: rest.type || 'button' } : {}
  return <As className={cls} {...typeAttr} {...rest}>{children}</As>
}
