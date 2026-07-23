import { useState, useRef } from 'react'
import { TopBar, Switch, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import LocationPicker from '../components/LocationPicker.jsx'
import { solarTermNames, licenseTiers } from '../data/mock.js'
import { dayFor, todayOffset } from '../data/almanac.js'

// ⚠️ 這裡原本叫 thumbs，5 個 emoji 排成一列「相簿縮圖」的樣子，
// 看起來像使用者自己的照片，其實是假的。改名並改為明確的「封面色票」——
// 沒有上傳照片時貼文用的佔位配色，不再假裝是相簿。
const COVERS = [
  { e: '🌾', bg: '#cfe3d3' }, { e: '🌊', bg: '#dbeafe' }, { e: '🌸', bg: '#fce7f3' },
  { e: '🌅', bg: '#ffedd5' }, { e: '🪷', bg: '#e9e3fb' },
]

// 裝置端壓縮：最長邊 1600px、JPEG 0.82（上傳前先縮，省流量也符合後端 body 上限）
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 1600
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('讀取圖片失敗')) }
    img.src = url
  })
}

// fromCamera：由相機「下一步」帶進來的照片（已套好濾鏡）。
// 走這條路徑時不再另外壓縮——相機的 bakeImage() 已縮到 1600px / JPEG 0.85。
export default function NewPost({ photo: incomingPhoto = null }) {
  const { pop, popAll, setToast, requireAccount } = useNav()
  const [sel, setSel] = useState(0)
  const [photo, setPhoto] = useState(incomingPhoto)   // 使用者選的照片（壓縮後 dataURL）
  const fromCamera = !!incomingPhoto
  const fileRef = useRef(null)
  const [cap, setCap] = useState('')
  const [onSale, setOnSale] = useState(true)
  const [term, setTerm] = useState(() => dayFor(todayOffset()).term)   // 預設＝真實當前節氣
  const [pickTerm, setPickTerm] = useState(false)
  const [place, setPlace] = useState('')
  const [locOpen, setLocOpen] = useState(false)
  const [priceI, setPriceI] = useState(1) // licenseTiers 索引，預設 $30

  const pickFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\//.test(f.type)) return setToast('請選擇圖片檔')
    try { setPhoto(await compressImage(f)) } catch { setToast('讀取圖片失敗，請換一張') }
  }

  const price = licenseTiers[priceI]
  const [busy, setBusy] = useState(false)
  const publish = async () => {
    if (!requireAccount('發佈作品')) return
    if (busy) return
    setBusy(true)
    const tags = (cap.match(/#[^\s#]+/g) || []).map(t => t.slice(1)).slice(0, 8)
    const title = (cap.trim().split('\n')[0] || '').replace(/#[^\s#]+/g, '').trim().slice(0, 60) || `${term}・新作`
    try {
      // 1) 有照片先上傳（拿 imageId）
      let imageId = null
      if (photo) { const r = await api.uploadImage(photo); imageId = r.id }
      // 2) 發佈貼文
      await api.createPost({
        emoji: COVERS[sel].e, bg: COVERS[sel].bg, term, title, caption: cap.trim(), tags,
        place: place || '', imageId,
      })
      // 3) 勾「上架市集」→ 真的建立市集作品（同一張圖）
      if (onSale) await api.createWork({ emoji: COVERS[sel].e, bg: COVERS[sel].bg, term, title, tags, price: price || 0, imageId })
      popAll()
      setToast(`已發佈「${term}」貼文 🌾` + (onSale ? `（已上架市集 ${price ? 'NT$' + price : '免費授權'}）` : ''))
    } catch (e) {
      setBusy(false)
      setToast(e?.message || '發佈失敗，請稍後再試')
    }
  }

  return (
    <>
      <TopBar title="新貼文" onClose={pop}
        right={<button className="acc tap" onClick={publish}>發佈</button>} />
      <div className="body">
        <div className="img" style={{ background: photo ? '#000' : COVERS[sel].bg, height: 260, fontSize: 56, padding: 0, position: 'relative', overflow: 'hidden' }}>
          {photo ? <PhotoImg src={photo} /> : COVERS[sel].e}
        </div>

        {/* 從相機帶照片進來時，就不再顯示選圖選項（照片已定案，要重拍請返回相機）*/}
        {fromCamera ? (
          <div className="note" style={{ marginTop: 10 }}>
            📷 這張照片來自相機（已套用你選的濾鏡）
            <button className="acc tap" onClick={pop}>返回重拍</button>
          </div>
        ) : (
          <>
            {/* 選照片（真實上傳）／或用 emoji 佔位圖 */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickFile} aria-label="選擇照片" />
            <div style={{ display: 'flex', gap: 8, padding: '10px 13px 0' }}>
              <button className="b dark tap" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
                📷 {photo ? '換一張照片' : '上傳照片（相簿/拍照）'}
              </button>
              {photo && <button className="b tap" onClick={() => setPhoto(null)}>移除照片</button>}
            </div>
            {!photo && <>
            <div className="muted" style={{ fontSize: 11, padding: '2px 16px 6px' }}>
              沒有照片也可以發文，先挑一個封面配色：
            </div>
            <div className="thumbs">
              {COVERS.map((t, i) => (
                <button key={i} className={`th tap ${i === sel ? 'on' : ''}`} style={{ background: t.bg }} onClick={() => setSel(i)}>{t.e}</button>
              ))}
            </div></>}
          </>
        )}

        <div className="capin">
          <textarea placeholder="撰寫說明…　#芒種 #田間" aria-label="貼文說明" maxLength={400}
            value={cap} onChange={e => setCap(e.target.value)} />
          <div className="muted" style={{ textAlign: 'right', fontSize: 11, padding: '0 4px 4px' }}>{cap.length} / 400</div>
        </div>

        {/* 標記節氣 —— 真的可選 */}
        <button className="opt tap" onClick={() => setPickTerm(v => !v)}>
          <div className="l">🕓 標記節氣</div>
          <div className="muted" style={{ color: 'var(--cinnabar)' }}>{term} {pickTerm ? '▾' : '›'}</div>
        </button>
        {pickTerm && (
          <div className="chips" style={{ padding: '10px 13px' }}>
            {solarTermNames.map(t => (
              <button key={t} className={`chip tap ${term === t ? 'on' : ''}`}
                onClick={() => { setTerm(t); setPickTerm(false) }}>{t}</button>
            ))}
          </div>
        )}

        {/* 新增地點 —— 開地圖搜尋/目前位置/常用位置 */}
        <button className="opt tap" onClick={() => setLocOpen(true)}>
          <div className="l">📍 新增地點</div>
          <div className="muted" style={{ color: place ? 'var(--cinnabar)' : undefined }}>{place || '搜尋或定位'} ›</div>
        </button>

        <div className="opt">
          <div className="l">🏷️ 同時上架市集販售</div>
          <Switch on={onSale} onChange={setOnSale} />
        </div>

        {/* 授權價 —— 真的可選分級 */}
        {onSale && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>單張授權價</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {licenseTiers.map((p, i) => (
                <button key={p} className={`chip tap ${priceI === i ? 'on' : ''}`} style={{ flex: 1, textAlign: 'center' }}
                  onClick={() => setPriceI(i)}>{p ? `$${p}` : '免費'}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {price ? `售出可分潤 70%（約 NT$${Math.round(price * 0.7)}／張）` : '開放免費授權，累積曝光與人氣'}
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
        <div style={{ padding: '0 13px' }}>
          <button className="btn-primary tap" onClick={publish}>發佈貼文</button>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {locOpen && <LocationPicker onClose={() => setLocOpen(false)} onPick={(p) => setPlace(p.name)} />}
    </>
  )
}
