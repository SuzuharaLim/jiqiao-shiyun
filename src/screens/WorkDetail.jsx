import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { works } from '../data/mock.js'

export default function WorkDetail({ id }) {
  const { push, setToast, addToCart, saved, toggleSave, requireAccount } = useNav()
  const w = works.find(x => x.id === id) || works[0]
  const price = w.price || 30
  const isSaved = saved[w.id]

  return (
    <>
      <TopBar title="作品" onBack right={<button className="iconbtn tap" aria-label="分享" onClick={() => {
        const url = location.href
        if (navigator.share) navigator.share({ title: `機巧時運 · ${w.title}`, url }).catch(() => {})
        else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
      }}><Icon name="share" /></button>} />
      <div className="body wd-body">
        <div className="wd-media">
          <div className="img" style={{ background: w.bg, height: 320, fontSize: 60 }}>{w.emoji}</div>
        </div>

        <div className="wd-info">
          <div className="post-hd">
            <div className="av" style={{ background: w.bg }}>{w.emoji}</div>
            <div className="uname">{w.author}</div>
          </div>

          <div className="cap2" style={{ marginTop: 10 }}><b>{w.title}</b>　<span className="tag">#{w.term}</span></div>
          <div className="cap2 muted">節氣攝影作品，可授權用於個人植物月曆與手帳排版。</div>

          <div className="card">
            <div className="kv"><span>市集授權價</span><b>NT${price}</b></div>
            <div className="kv"><span>用途</span><span className="muted">個人非商用</span></div>
            <div className="kv"><span>創作者分潤</span><span className="muted">70%（NT${Math.round(price * 0.7)}）</span></div>
          </div>

          <div className="wd-acts" style={{ padding: '4px 13px', display: 'flex', gap: 8 }}>
            <button className="b tap" onClick={() => { toggleSave(w.id); setToast(isSaved ? '已移除' : '已加入月曆素材 ✓') }}>
              {isSaved ? '已加入月曆' : '＋ 加入月曆'}
            </button>
            <button className="b dark tap" onClick={() => { if (!requireAccount('購買授權')) return; addToCart({ id: w.id, name: `${w.title} 授權`, price }); push('checkout') }}>
              購買授權 NT${price}
            </button>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
