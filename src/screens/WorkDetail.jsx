import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 作品詳情 —— 嚴格來自資料庫（GET /api/works/:id）。
export default function WorkDetail({ id }) {
  const { push, pop, setToast, addToCart, saved, toggleSave, requireAccount, user } = useNav()
  const [w, setW] = useState(null)
  useEffect(() => {
    let alive = true
    api.work(id).then(r => { if (alive && r.work) setW(r.work) }).catch(() => {})
    return () => { alive = false }
  }, [id])

  if (!w) {
    return (
      <>
        <TopBar title="作品" onBack />
        <div className="body"><div className="empty"><div className="empty-ic"><Icon name="photo2" /></div>載入中…</div></div>
      </>
    )
  }

  const price = w.price || 30
  const isSaved = saved[w.id]

  return (
    <>
      <TopBar title="作品" onBack right={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {!!user && !user.guest && w.author === user.handle
          ? <button className="acc tap" onClick={async () => {
              if (!window.confirm('確定刪除這件作品？（無法復原）')) return
              try { await api.deleteWork(w.id); setToast('作品已刪除'); pop() } catch { setToast('刪除失敗，請稍後再試') }
            }}>刪除</button>
          : <button className="acc tap" onClick={async () => {
              if (!requireAccount('檢舉這件作品')) return
              try { const r = await api.report('work', w.id, ''); setToast(r.message || '已收到檢舉') } catch { setToast('檢舉失敗，請稍後再試') }
            }}>檢舉</button>}
        <button className="iconbtn tap" aria-label="分享" onClick={() => {
          const url = location.href
          if (navigator.share) navigator.share({ title: `機巧時運 · ${w.title}`, url }).catch(() => {})
          else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
        }}><Icon name="share" /></button>
      </span>} />
      <div className="body wd-body">
        <div className="wd-media">
          <div className="img" style={{ background: w.bg, height: 320, fontSize: 60, padding: 0, position: 'relative', overflow: 'hidden' }}>
            {w.image ? <PhotoImg src={w.image} alt={`${w.title}｜${w.term || "節氣"}攝影作品，攝影者 @${w.user}`} /> : w.emoji}
          </div>
        </div>

        <div className="wd-info">
          <button className="post-hd tap" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
            onClick={() => push('creatorPage', { user: w.author, avatar: w.avatar || w.emoji, avatarBg: w.avatarBg || w.bg })}>
            <div className="av" style={{ background: w.avatarBg || w.bg }}>{w.avatar || w.emoji}</div>
            <div className="uname">{w.author}</div>
          </button>

          <div className="cap2" style={{ marginTop: 10 }}><b>{w.title}</b>　<span className="tag">#{w.term}</span></div>
          <div className="cap2 muted">節氣攝影作品，可授權用於個人植物月曆與手帳排版。</div>

          <div className="card">
            <div className="kv"><span>市集授權價</span><b>NT${price}</b></div>
            <div className="kv"><span>用途</span><span className="muted">個人非商用</span></div>
            <div className="kv"><span>創作者分潤</span><span className="muted">70%（NT${Math.round(price * 0.7)}）</span></div>
          </div>

          <div className="wd-acts" style={{ padding: '4px var(--space-4)', display: 'flex', gap: 8 }}>
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
