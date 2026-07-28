// 登入牆：訪客觸發「下單/上傳/發佈」等需帳號的動作時彈出
import { useNav } from '../store/nav.jsx'
import { Seal } from './ui.jsx'

export default function AuthWall() {
  const { authWall, setAuthWall, logout } = useNav()
  if (!authWall) return null
  return (
    <div className="sheet-mask" onClick={() => setAuthWall(null)}>
      {/* ⚠️ 曾用 inline maxHeight:'unset' 取消高度上限——內容一多就會超出視窗，
          且蓋掉 .sheet 的 env(safe-area-inset-bottom)。高度交給 .sheet 樣式，
          這裡只補「內容不多時不要被 min-height 拉長」的視覺調整。 */}
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div style={{ textAlign: 'center', padding: '6px 24px' }}>
          <Seal className="auth-seal" alt="" />
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'var(--text-lg)', margin: '0 0 6px' }}>「{authWall}」需要登入</h3>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.7, margin: '0 0 18px' }}>
            訪客可以自由瀏覽，但<b>下單、購買、上傳與發佈作品</b>需要註冊帳號，以保護你的訂單與作品權益。
          </p>
          <button className="auth-btn tap" onClick={() => { setAuthWall(null); logout() }}>註冊 / 登入</button>
          <button className="btn-ghost tap" style={{ marginTop: 10 }} onClick={() => setAuthWall(null)}>先繼續逛逛</button>
        </div>
      </div>
    </div>
  )
}
