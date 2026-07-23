import { useState, useEffect } from 'react'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { pwError, pwChecks } from '../lib/password.js'

// 帳號安全：變更密碼 / 匯出資料（GDPR 可攜權）/ 刪除帳號（被遺忘權）
// 後端 API 早已存在（/api/password/change、/api/account/export、DELETE /api/account），此頁補上 UI。
export default function AccountSecurity() {
  const { user, setToast, logout } = useNav()
  const guest = !user || user.guest

  // ---- 變更密碼 ----
  const [cur, setCur] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const changePw = async () => {
    setErr('')
    { const e = pwError(pw1); if (e) { setErr(e); return } }
    if (pw1 !== pw2) { setErr('兩次輸入的新密碼不一致'); return }
    setBusy(true)
    try {
      const r = await api.changePassword({ current: cur, password: pw1 })
      setToast(r?.message || '密碼已更新 ✓')
      setCur(''); setPw1(''); setPw2('')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  // ---- 登入裝置（多裝置管理）----
  const [sess, setSess] = useState([])
  useEffect(() => {
    if (guest) return
    let alive = true
    api.sessions().then(r => { if (alive) setSess(r.sessions || []) }).catch(() => {})
    return () => { alive = false }
  }, [guest])
  const killAll = async () => {
    if (!window.confirm('確定登出所有裝置？（包含本裝置，需重新登入）')) return
    try { await api.logoutAll() } catch { /* ignore */ }
    setToast('已登出所有裝置')
    logout()
  }

  // ---- 匯出資料 ----
  const [exporting, setExporting] = useState(false)
  const exportData = async () => {
    setExporting(true)
    try {
      const data = await api.exportAccount()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `jiqiao-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setToast('已下載你的資料 ✓')
    } catch (e) { setToast(e.message) } finally { setExporting(false) }
  }

  // ---- 刪除帳號（兩段式 + 密碼確認） ----
  const [delArm, setDelArm] = useState(false)
  const [delPw, setDelPw] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')
  const doDelete = async () => {
    setDelErr('')
    if (!delPw) { setDelErr('請輸入密碼確認'); return }
    setDelBusy(true)
    try {
      await api.deleteAccount({ password: delPw })
      setToast('帳號已刪除，感謝你的使用')
      logout()
    } catch (e) { setDelErr(e.message); setDelBusy(false) }
  }

  if (guest) {
    return (
      <>
        <TopBar title="帳號安全" onBack />
        <div className="body">
          <div className="empty"><div className="big">🔐</div>訪客模式沒有帳號資料<br />註冊後即可管理密碼與個人資料</div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="帳號安全" onBack />
      <div className="body">
        <div className="strip">帳號：<b>{user.email}</b></div>

        <SectionHead title="變更密碼" />
        <div className="acc-form">
          <label className="f-label" htmlFor="as-cur">目前密碼</label>
          <div className="field"><input id="as-cur" type="password" autoComplete="current-password"
            value={cur} onChange={e => setCur(e.target.value)} /></div>
          <label className="f-label" htmlFor="as-new">新密碼（8 碼以上，含大小寫英文）</label>
          <div className="field"><input id="as-new" type="password" autoComplete="new-password"
            value={pw1} onChange={e => setPw1(e.target.value)} /></div>
          <label className="f-label" htmlFor="as-new2">再次輸入新密碼</label>
          <div className="field"><input id="as-new2" type="password" autoComplete="new-password"
            value={pw2} onChange={e => setPw2(e.target.value)} /></div>
          {err && <div className="form-err" role="alert">{err}</div>}
          <button className="btn-primary tap" onClick={changePw} disabled={busy}
            style={busy ? { opacity: .6 } : null}>{busy ? '更新中…' : '更新密碼'}</button>
          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.7, marginTop: 8 }}>更新後其他裝置會自動登出，本裝置維持登入。</p>
        </div>

        <SectionHead title="登入裝置" />
        <div className="acc-form">
          {sess.map(s => (
            <div key={s.id} className="kv" style={{ padding: '5px 0' }}>
              <span style={{ fontSize: 13 }}>{s.current ? '🟢 本裝置' : '💻 其他裝置'}
                <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{s.ip || ''}</span></span>
              <span className="muted" style={{ fontSize: 11 }}>{(s.created_at || '').slice(0, 10)}</span>
            </div>
          ))}
          {sess.length === 0 && <p className="muted" style={{ fontSize: 12 }}>載入中…</p>}
          <button className="b tap" style={{ width: '100%', marginTop: 6 }} onClick={killAll}>登出所有裝置（含本機）</button>
          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.7, marginTop: 8 }}>發現可疑登入時，先登出所有裝置再變更密碼。</p>
        </div>

        <SectionHead title="我的資料（GDPR）" />
        <div className="acc-form">
          <button className="b tap" style={{ width: '100%' }} onClick={exportData} disabled={exporting}>
            {exporting ? '打包中…' : '⬇️ 匯出我的資料（JSON）'}
          </button>
          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.7, marginTop: 8 }}>包含帳號基本資料與近期登入紀錄（資料可攜權）。</p>
        </div>

        <SectionHead title="刪除帳號" />
        <div className="acc-form">
          {!delArm ? (
            <button className="btn-ghost tap danger" onClick={() => setDelArm(true)}>刪除我的帳號…</button>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, marginBottom: 10 }}>
                ⚠️ 刪除後帳號與登入 Session 立即銷毀、<b>無法復原</b>。請輸入密碼確認（被遺忘權）。
              </p>
              <label className="f-label" htmlFor="as-delpw">密碼</label>
              <div className="field"><input id="as-delpw" type="password" autoComplete="current-password"
                value={delPw} onChange={e => setDelPw(e.target.value)} /></div>
              {delErr && <div className="form-err" role="alert">{delErr}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="b tap" style={{ flex: 1 }} onClick={() => { setDelArm(false); setDelPw(''); setDelErr('') }}>取消</button>
                <button className="b tap danger-solid" style={{ flex: 1 }} onClick={doDelete} disabled={delBusy}>
                  {delBusy ? '刪除中…' : '確認永久刪除'}
                </button>
              </div>
            </>
          )}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
