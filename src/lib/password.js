// 密碼規則（前端）——必須與 server/index.js 的 passwordError() 保持一致。
// 前端檢查只是為了即時回饋；真正的把關在後端，繞過前端也無效。
export const PASSWORD_RULE = '密碼至少 8 碼，且需同時包含大寫與小寫英文字母'

export function pwError(pw) {
  const v = String(pw || '')
  if (v.length < 8) return PASSWORD_RULE
  if (!/[a-z]/.test(v) || !/[A-Z]/.test(v)) return PASSWORD_RULE
  return null
}

// 即時強度提示：回傳尚未達成的條件，讓使用者邊打邊看得到還差什麼
export function pwChecks(pw) {
  const v = String(pw || '')
  return [
    { ok: v.length >= 8, label: '8 碼以上' },
    { ok: /[a-z]/.test(v), label: '小寫英文' },
    { ok: /[A-Z]/.test(v), label: '大寫英文' },
  ]
}
