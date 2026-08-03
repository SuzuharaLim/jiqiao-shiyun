import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useWorks } from '../hooks/useApi.js'

export default function MakeCalendar() {
  const { pop, push, setToast, user , requireAccount } = useNav()
  const works = useWorks(null)   // 選圖來源＝真實市集作品（嚴格來自資料庫）
  const pool = [...works, ...works.slice(0, 6)].map((w, i) => ({ ...w, key: w.id + '_' + i }))
  const [src, setSrc] = useState('我的照片')
  const [sel, setSel] = useState(() => new Set())
  const N = 12
  // works 是非同步載入的，首次 render 時 pool 還是空的。
  // 原本用 useState 的惰性初始值預選 8 張，等於永遠選不到（初始化只跑一次）。
  // 改成等作品真的到齊之後才預選，且只做一次（使用者清空選取後不會被硬塞回去）。
  const [preselected, setPreselected] = useState(false)
  useEffect(() => {
    if (preselected || pool.length === 0) return
    setSel(new Set(pool.slice(0, 8).map(p => p.key)))
    setPreselected(true)
  }, [pool.length, preselected])   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k) => setSel(s => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k)
    else if (n.size < N) n.add(k)
    else { setToast('已選滿 12 張'); return n }
    return n
  })
  const aiPick = () => {
    const n = new Set(sel)
    for (const p of pool) { if (n.size >= N) break; n.add(p.key) }
    setSel(n)
    setToast('已自動補滿 12 張')
  }

  // 做月曆會產生要下單的商品，且專案需要綁在帳號上才留得住 → 訪客先擋下。
  // （後端本來就會擋，這裡是避免使用者做完 12 張才發現不能存。）
  if (!user || user.guest) {
    return (
      <>
        <TopBar title="做月曆" onClose={pop} />
        <div className="body">
          <div className="empty">
            <div className="empty-ic"><Icon name="scroll" /></div>
            做月曆需要註冊帳號<br />
            <span style={{ fontSize: 'var(--text-xs)' }}>月曆專案要綁在帳號上才留得住，也才能下單印製</span>
          </div>
          <div className="pad">
            {/* 原本只跳提示要使用者自己去別的分頁找——按鈕文字承諾了動作就該做到。
                requireAccount 會彈出 AuthWall（內含真正的註冊/登入入口）。 */}
            <button className="btn-primary tap" onClick={() => requireAccount('做月曆')}>註冊 / 登入</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="做月曆" onClose={pop}
        right={<button className="acc tap" onClick={() => push('calendarPreview', { count: sel.size })}>下一步</button>} />
      <div className="body">
        <div className="prog">
          <div className="plbl"><span>選擇照片</span><span>已選 {sel.size} / {N}</span></div>
          <div className="bar"><div style={{ width: `${(sel.size / N) * 100}%` }} /></div>
        </div>

        <div className="chips">
          {['我的照片', '收藏', '市集'].map(c => (
            <button key={c} className={`chip tap ${src === c ? 'on' : ''}`} onClick={() => setSrc(c)}>{c}</button>
          ))}
        </div>

        {(() => {
          const shown = pool.filter(p => src === '市集' ? p.price : src === '收藏' ? p.term === '芒種' : true)
          if (shown.length === 0) return (
            <div className="empty">
              <div className="empty-ic"><Icon name="photo2" /></div>
              {pool.length === 0 ? '還沒有可用的照片' : `「${src}」裡沒有照片`}<br />
              <span style={{ fontSize: 'var(--text-xs)' }}>
                {pool.length === 0 ? '先到「建立」拍一張或上傳作品，就能做成月曆' : '換一個來源看看'}
              </span>
            </div>
          )
          return null
        })()}
        <div className="grid">
          {pool.filter(p => src === '市集' ? p.price : src === '收藏' ? p.term === '芒種' : true).map(p => {
            const on = sel.has(p.key)
            return (
              <button key={p.key} className="gimg tap" style={{ background: p.bg, position: 'relative', overflow: 'hidden' }} onClick={() => toggle(p.key)}>
                {p.image ? <PhotoImg src={p.image} alt={`${p.title}｜可放進月曆的節氣照片`} /> : p.emoji}
                {on && <><div className="selo" /><div className="chk">✓</div></>}
              </button>
            )
          })}
        </div>

        <button className="ai-hint tap" onClick={aiPick}>
          ✨ 自動補滿 {N} 張
          <Icon name="chev" style={{ width: 16, height: 16, stroke: 'var(--accent)' }} />
        </button>
        <div style={{ height: 12 }} />
      </div>
    </>
  )
}
