import { useId } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// Field —— 表單欄位（DESIGN_BRIEF 階段 3）
//
// 規格要求：
//   · label 一律「可見」，不可只靠 placeholder（稽核：34 個 input
//     只有 17 個有可見 label、10 個靠 aria-label、7 個什麼都沒有）
//   · 錯誤訊息用 aria-describedby 綁定、aria-invalid 標記
//   · 錯誤要能被螢幕閱讀器宣告 → role="alert"
//
// useId() 產生穩定唯一 id，避免同頁多個欄位 id 相撞。
// ═══════════════════════════════════════════════════════════════════════
export default function Field({
  label, hint, error, required = false,
  as: As = 'input', id: idProp, className = '', children, ...rest
}) {
  const auto = useId()
  const id = idProp || `f-${auto}`
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`ui-field ${error ? 'is-invalid' : ''} ${className}`}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required && <span className="ui-field__req" aria-hidden="true"> *</span>}
        {required && <span className="visually-hidden">（必填）</span>}
      </label>

      {children ?? (
        <As id={id} className="ui-field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          required={required || undefined}
          {...rest} />
      )}

      {hint && !error && <p id={hintId} className="ui-field__hint">{hint}</p>}
      {/* role=alert：錯誤出現時立刻被輔助技術宣告 */}
      {error && <p id={errId} className="ui-field__err" role="alert">{error}</p>}
    </div>
  )
}
