import { useState } from 'react'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 未驗證 Email 提示橫幅（登入後、非訪客、尚未驗證時顯示）。
// 示範環境無真 SMTP → 重寄後就地顯示可點連結完成驗證；正式接 SMTP 後改為真的寄信。
const tokenFrom = (link) => { try { return new URLSearchParams(new URL(link).search).get('token') } catch { return null } }

export default function VerifyBanner() {
  const { user, updateProfile, setToast } = useNav()
  const [devToken, setDevToken] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  if (!user || user.guest || user.emailVerified || dismissed) return null

  const resend = async () => {
    setBusy(true)
    try {
      const r = await api.resendEmail()
      if (r.devVerifyLink) { setDevToken(tokenFrom(r.devVerifyLink)); setToast('驗證信已寄出（示範：點「完成驗證」）') }
      else setToast('驗證信已寄出，請至信箱查收')
    } catch (e) { setToast(e?.message || '寄送失敗，請稍後再試') } finally { setBusy(false) }
  }
  const verify = async () => {
    try { await api.verifyEmail({ token: devToken }); updateProfile({ emailVerified: true }); setToast('Email 已驗證 ✓'); setDismissed(true) }
    catch { setToast('驗證連結已失效，請重寄') }
  }

  return (
    <div className="verify-banner" role="status">
      <span className="vb-t">✉️ 你的 Email（{user.email}）尚未驗證</span>
      {!devToken
        ? <button className="vb-btn tap" onClick={resend} disabled={busy}>{busy ? '寄送中…' : '重寄驗證信'}</button>
        : <button className="vb-btn on tap" onClick={verify}>完成驗證</button>}
      <button className="vb-x tap" aria-label="關閉提示" onClick={() => setDismissed(true)}>✕</button>
    </div>
  )
}
