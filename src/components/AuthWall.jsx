// 登入牆：訪客觸發「下單/上傳/發佈」等需帳號的動作時彈出
import { useNav } from '../store/nav.jsx'

export default function AuthWall() {
  const { authWall, setAuthWall, logout } = useNav()
  if (!authWall) return null
  return (
    <div className="sheet-mask" onClick={() => setAuthWall(null)}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: 'unset', paddingBottom: 24 }}>
        <div className="sheet-grip" />
        <div style={{ textAlign: 'center', padding: '6px 24px' }}>
          <div className="auth-seal" style={{ margin: '6px auto 14px' }}>印</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, margin: '0 0 6px' }}>「{authWall}」需要登入</h3>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.7, margin: '0 0 18px' }}>
            訪客可以自由瀏覽，但<b>下單、購買、上傳與發佈作品</b>需要註冊帳號，以保護你的訂單與作品權益。
          </p>
          <button className="auth-btn tap" onClick={() => { setAuthWall(null); logout() }}>註冊 / 登入</button>
          <button className="btn-ghost tap" style={{ marginTop: 10 }} onClick={() => setAuthWall(null)}>先繼續逛逛</button>
        </div>
      </div>
    </div>
  )
}
