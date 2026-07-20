import { useState } from 'react'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { BRAND } from '../data/mock.js'

// 若使用者是點 email 裡的 /reset-password?token=... 進來，開場就進重設模式
const initialReset = () => {
  try {
    if (location.pathname.includes('reset-password')) {
      const t = new URLSearchParams(location.search).get('token')
      if (t) return t
    }
  } catch { /* ignore */ }
  return null
}

export default function Auth() {
  const { login, loginGuest, setToast } = useNav()
  const resetToken0 = initialReset()
  const [mode, setMode] = useState(resetToken0 ? 'reset' : 'login') // login|register|forgot|reset
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' })
  const [hp, setHp] = useState('')               // honeypot（防機器人；真人不可見）
  const [agree, setAgree] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [devLink, setDevLink] = useState(null)   // { type:'verify'|'reset', token }
  const [resetToken, setResetToken] = useState(resetToken0)
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))

  const run = async (fn) => {
    if (busy) return
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(e.message || '發生錯誤') } finally { setBusy(false) }
  }
  const tokenFrom = (link) => { try { return new URLSearchParams(new URL(link).search).get('token') } catch { return null } }

  const doLogin = () => run(async () => {
    if (!f.email.trim() || !f.pw) { setErr('請輸入帳號與密碼'); return }
    const r = await api.login({ email: f.email.trim(), password: f.pw })
    login(r.user, r.csrfToken)
  })
  const doRegister = () => run(async () => {
    if (!f.name.trim()) return setErr('請輸入暱稱')
    if (f.pw.length < 8) return setErr('密碼至少 8 碼')
    if (f.pw !== f.pw2) return setErr('兩次密碼不一致')
    if (!agree) return setErr('請先同意服務條款與隱私權政策')
    // website = honeypot 隱藏欄位：真人看不到也不會填，機器人自動填表會被後端擋下
    const r = await api.register({ name: f.name.trim(), email: f.email.trim(), password: f.pw, website: hp })
    if (r.devVerifyLink) setDevLink({ type: 'verify', token: tokenFrom(r.devVerifyLink) })
    login(r.user, r.csrfToken)
    setToast('註冊成功，歡迎加入 🌾（請記得驗證 Email）')
  })
  const doForgot = () => run(async () => {
    if (!f.email.trim()) return setErr('請輸入註冊 Email')
    const r = await api.forgot({ email: f.email.trim() })
    setToast(r.message)
    if (r.devResetLink) setDevLink({ type: 'reset', token: tokenFrom(r.devResetLink) })
    else setMode('login')
  })
  const doReset = () => run(async () => {
    if (f.pw.length < 8) return setErr('新密碼至少 8 碼')
    if (f.pw !== f.pw2) return setErr('兩次密碼不一致')
    await api.reset({ token: resetToken, password: f.pw })
    setToast('密碼已更新，請用新密碼登入')
    try { history.replaceState(null, '', '/') } catch { /* ignore */ }
    setMode('login'); setF(s => ({ ...s, pw: '', pw2: '' })); setResetToken(null); setDevLink(null)
  })

  const pwField = (label, key, ac) => (
    <div className="field"><label>{label}</label>
      <div className="pw-wrap">
        <input type={showPw ? 'text' : 'password'} value={f[key]} onChange={set(key)} autoComplete={ac} aria-label={label} />
        <button type="button" className="pw-eye tap" onClick={() => setShowPw(s => !s)} aria-label={showPw ? '隱藏密碼' : '顯示密碼'}>{showPw ? '🙈' : '👁'}</button>
      </div>
    </div>
  )

  return (
    <div className="auth body">
      <div className="auth-hero">
        <div className="auth-seal">印</div>
        <div className="auth-title">{BRAND}</div>
        <div className="auth-sub">
          {mode === 'register' ? '建立你的節氣文化手帳帳號'
            : mode === 'forgot' ? '找回你的帳號'
            : mode === 'reset' ? '設定新密碼'
            : '智慧互動農民曆 · 節氣攝影社群'}
        </div>
      </div>

      <div className="auth-form">
        {err && <div className="auth-err" role="alert">{err}</div>}

        {mode === 'register' && (
          <div className="field"><label>暱稱</label>
            <input value={f.name} onChange={set('name')} placeholder="你想被怎麼稱呼" autoComplete="nickname" aria-label="暱稱" /></div>
        )}
        {mode === 'register' && (
          /* Honeypot：真人不可見不可及；機器人自動填表會填入 → 後端擋下 */
          <input className="hp-trap" type="text" name="website" value={hp} onChange={e => setHp(e.target.value)}
            tabIndex={-1} autoComplete="off" aria-hidden="true" />
        )}
        {mode !== 'reset' && (
          <div className="field"><label>Email{mode === 'login' ? ' 或帳號' : ''}</label>
            <input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com"
              autoComplete={mode === 'register' ? 'email' : 'username'} aria-label="Email" /></div>
        )}
        {mode === 'login' && pwField('密碼', 'pw', 'current-password')}
        {(mode === 'register' || mode === 'reset') && pwField(mode === 'reset' ? '新密碼' : '密碼', 'pw', 'new-password')}
        {(mode === 'register' || mode === 'reset') && pwField('確認密碼', 'pw2', 'new-password')}

        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <button className="auth-link tap" onClick={() => { setErr(''); setMode('forgot') }}>忘記密碼？</button>
          </div>
        )}
        {mode === 'register' && (
          <label className="auth-agree">
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
            <span>我同意 <b>服務條款</b> 與 <b>隱私權政策</b></span>
          </label>
        )}

        {mode === 'login' && <button className="auth-btn tap" onClick={doLogin} disabled={busy}>{busy ? '登入中…' : '登入'}</button>}
        {mode === 'register' && <button className="auth-btn tap" onClick={doRegister} disabled={busy}>{busy ? '建立中…' : '建立帳號'}</button>}
        {mode === 'forgot' && <button className="auth-btn tap" onClick={doForgot} disabled={busy}>{busy ? '寄送中…' : '寄送重設連結'}</button>}
        {mode === 'reset' && <button className="auth-btn tap" onClick={doReset} disabled={busy}>{busy ? '更新中…' : '更新密碼'}</button>}

        {/* Demo：無真實信箱，把驗證/重設連結就地顯示可點 */}
        {devLink?.token && (
          <div className="auth-dev">
            📩 示範信件（正式版會寄到你的 Email）：
            {devLink.type === 'verify'
              ? <button className="auth-link tap" onClick={() => run(async () => { await api.verifyEmail({ token: devLink.token }); setToast('Email 已驗證 ✓'); setDevLink(null) })}>點此立即驗證 Email</button>
              : <button className="auth-link tap" onClick={() => { setResetToken(devLink.token); setMode('reset'); setDevLink(null); setErr('') }}>點此重設密碼</button>}
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="auth-sep">或使用以下方式</div>
            <div className="social-row">
              <button className="social-btn tap" onClick={() => setToast('Google 登入需設定 OAuth（Demo）')}>🔵 Google</button>
              <button className="social-btn tap" onClick={() => setToast('LINE 登入需設定 OAuth（Demo）')}>🟢 LINE</button>
              <button className="social-btn tap" onClick={() => setToast('Apple 登入需設定 OAuth（Demo）')}>⚫ Apple</button>
            </div>
          </>
        )}
      </div>

      <div className="auth-alt">
        {mode === 'login' && <>還沒有帳號？<button className="auth-link tap" onClick={() => { setErr(''); setMode('register') }}>免費註冊</button></>}
        {mode === 'register' && <>已經有帳號了？<button className="auth-link tap" onClick={() => { setErr(''); setMode('login') }}>登入</button></>}
        {(mode === 'forgot' || mode === 'reset') && <button className="auth-link tap" onClick={() => { setErr(''); setMode('login') }}>← 返回登入</button>}
      </div>

      <div className="auth-guest">
        <button className="btn-ghost tap" onClick={loginGuest}>訪客先逛逛（免註冊）</button>
        <p className="muted" style={{ fontSize: 11, lineHeight: 1.7, marginTop: 12 }}>
          ＊帳號由後端建立、密碼經 bcrypt 雜湊。此示範環境無真實寄信與 OAuth，驗證信改為就地顯示連結。
        </p>
      </div>
    </div>
  )
}
