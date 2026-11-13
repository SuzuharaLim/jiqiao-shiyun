import Icon from '../components/Icon.jsx'
import { useState, useRef, useEffect } from 'react'
import { TopBar, Switch, PhotoImg, SheetMask } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import LocationPicker from '../components/LocationPicker.jsx'
import { licenseTiers } from '../data/mock.js'
import { TERM_NAMES } from '../data/lunisolar.js'
import { dayFor, todayOffset } from '../data/almanac.js'
import { CAPTION_MAX, TITLE_MAX } from '../data/postRules.js'
import { stripEmoji } from '../lib/text.js'

// ============================================================================
// 發布貼文（2026-10-04 改版：不再限定照片）
//
// 貼文可以是**照片**，也可以是**純文字的文章**（使用者指定）。所以這一頁的主體是
// 「標題＋內文」，照片改成「附加」——可以從相機工作室拍、也可以從相簿選，或不附。
//
// ⚠️ 「上架市集」**只在附了照片時出現**：市集賣的是攝影授權，一篇文字沒有東西可授權。
//   改版前沒照片時它仍預設勾選，會建出一件沒有圖的市集作品。
// ⚠️ 草稿存 sessionStorage：寫到一半點「拍照」會進相機工作室，相機的「下一步」會再
//   push 一個新的發文頁——沒有草稿的話，剛寫的文字就在那一跳之間消失了。
// ⚠️ 曾有「標記題材」欄位，隨探索頁的題材篩選一併移除。說明裡的 #標籤 仍會解析並
//   存進資料庫，供「搜尋」比對。
// ============================================================================

// 沒有照片時，文章卡片的底色
const COVERS = [
  { e: '', bg: 'var(--tone-2)' }, { e: '', bg: 'var(--tone-3)' }, { e: '', bg: 'var(--tone-4)' },
  { e: '', bg: 'var(--tone-6)' }, { e: '', bg: 'var(--tone-1)' },
]

const DRAFT_KEY = 'jq-post-draft'
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null') } catch { return null } }
const writeDraft = (d) => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* 無痕模式忽略 */ } }
const clearDraft = () => { try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

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

// photo：由相機「下一步」帶進來的照片（已套好濾鏡）。
// 走這條路徑時不再另外壓縮——相機的 bakeImage() 已縮到 1600px / JPEG 0.85。
// challenge：從「節氣挑戰」的「參加投稿」進來時帶入的節氣名稱——節氣鎖定為它
//   （標記當前節氣＝參賽），頁首另顯示一行參賽提示。
//   ⚠️ 參加投稿過去直接 push('camera')，使用者沒辦法用手機相簿或自己站上的舊作品投稿。
export default function NewPost({ photo: incomingPhoto = null, challenge = null }) {
  const { push, pop, popAll, setToast, setStamp, requireAccount, user } = useNav()
  const draft = useRef(readDraft()).current
  const [sel, setSel] = useState(draft?.sel ?? 0)
  const [photo, setPhoto] = useState(incomingPhoto)   // 使用者選的照片（壓縮後 dataURL）
  const fromCamera = !!incomingPhoto
  // 從「網站相簿」（自己發過的照片）選的：圖已經在伺服器上，發佈時直接用這個 id，不必再上傳一次
  const [siteImageId, setSiteImageId] = useState(null)
  const [sitePicker, setSitePicker] = useState(false)
  const fileRef = useRef(null)
  const [titleIn, setTitleIn] = useState(draft?.title ?? '')
  const [cap, setCap] = useState(draft?.cap ?? '')
  const [onSale, setOnSale] = useState(true)
  const [term, setTerm] = useState(() => challenge || draft?.term || dayFor(todayOffset()).term)   // 預設＝真實當前節氣
  const [pickTerm, setPickTerm] = useState(false)
  const [place, setPlace] = useState(draft?.place ?? '')
  const [locOpen, setLocOpen] = useState(false)
  const [priceI, setPriceI] = useState(1) // licenseTiers 索引，預設 $30
  const [busy, setBusy] = useState(false)

  // 草稿：照片不存（dataURL 太大，sessionStorage 會爆），只存文字與選項
  useEffect(() => { writeDraft({ title: titleIn, cap, term, place, sel }) }, [titleIn, cap, term, place, sel])

  const pickFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\//.test(f.type)) return setToast('請選擇圖片檔')
    try { setPhoto(await compressImage(f)); setSiteImageId(null) } catch { setToast('讀取圖片失敗，請換一張') }
  }
  const openSite = () => { if (requireAccount('從網站相簿選照片')) setSitePicker(true) }
  const pickSite = (item) => { setPhoto(item.image); setSiteImageId(item.imageId) }
  const removePhoto = () => { setPhoto(null); setSiteImageId(null) }

  const price = licenseTiers[priceI]
  const sell = !!photo && onSale          // 沒照片就沒有東西可以上架
  const empty = !photo && !cap.trim() && !titleIn.trim()

  const publish = async () => {
    if (!requireAccount('發佈貼文')) return
    if (busy) return
    if (empty) { setToast('寫點什麼，或附一張照片'); return }
    setBusy(true)
    // 說明裡的 #標籤 → 存進資料庫供搜尋比對（不再有題材篩選 UI）
    const tags = [...new Set((cap.match(/#[^\s#]+/g) || []).map(t => t.slice(1)))].slice(0, 8)
    const title = titleIn.trim().slice(0, TITLE_MAX)
      || (cap.trim().split('\n')[0] || '').replace(/#[^\s#]+/g, '').trim().slice(0, TITLE_MAX)
      || `${term}・新作`
    try {
      // 1) 有照片先上傳（拿 imageId）
      let imageId = null
      if (siteImageId) imageId = siteImageId
      else if (photo) { const r = await api.uploadImage(photo); imageId = r.id }
      // 2) 發佈貼文
      await api.createPost({
        emoji: COVERS[sel].e, bg: COVERS[sel].bg, term, title, caption: cap.trim(), tags,
        place: place || '', imageId,
      })
      // 3) 有照片且勾「上架市集」→ 真的建立市集作品（同一張圖）
      if (sell) await api.createWork({ emoji: COVERS[sel].e, bg: COVERS[sel].bg, term, title, tags, price: price || 0, imageId })
      clearDraft()
      popAll()
      setStamp('已發佈')
      setToast(`已發佈「${term}」${photo ? '貼文' : '文章'}` + (sell ? `（已上架市集 ${price ? 'NT$' + price : '免費授權'}）` : ''))
    } catch (e) {
      setBusy(false)
      setToast(e?.message || '發佈失敗，請稍後再試')
    }
  }

  return (
    <>
      <TopBar title="發布貼文" onClose={pop}
        right={<button className="acc tap" onClick={publish} disabled={busy || empty}>發佈</button>} />
      <div className="body np-body">
        {challenge && (
          <div className="np-chal" role="note">參加「{challenge}攝影挑戰」：發佈後即自動參賽{term !== challenge && `（目前標記的是「${term}」，改回「${challenge}」才算參賽）`}</div>
        )}

        <div className="np-compose">
          <input className="np-title" placeholder="標題（選填）" aria-label="標題（選填）"
            maxLength={TITLE_MAX} value={titleIn} onChange={e => setTitleIn(e.target.value)} />
          <textarea className="np-text" placeholder={'寫下這個節氣的觀察、心得或一篇文章…\n#芒種 #田間'}
            aria-label="內文" maxLength={CAPTION_MAX} rows={photo ? 4 : 9}
            value={cap} onChange={e => setCap(e.target.value)} />
          <div className="np-count">{cap.length} / {CAPTION_MAX}</div>
        </div>

        {/* 照片：附加，不是必要 */}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} aria-label="從相簿選照片" />
        {photo ? (
          <div className="np-photo">
            <div className="np-photo-img"><PhotoImg src={photo} alt="即將發布的照片預覽" /></div>
            <div className="np-photo-acts">
              {fromCamera
                ? <button className="b tap" onClick={pop}>返回重拍</button>
                : <button className="b tap" onClick={() => siteImageId ? openSite() : fileRef.current?.click()}>換一張</button>}
              <button className="b tap" onClick={removePhoto}>移除照片</button>
            </div>
          </div>
        ) : (
          <div className="np-attach" role="group" aria-label="附加照片（選填）">
            <span className="np-attach-h">附加照片（選填）· 附照片才能同時上架市集</span>
            <div className="np-attach-g">
              <button className="np-attach-b tap" onClick={() => push('camera')}>
                <Icon name="camera" /><span>拍照<small>相機工作室・濾鏡特效</small></span>
              </button>
              <button className="np-attach-b tap" onClick={() => fileRef.current?.click()}>
                <Icon name="image" /><span>手機相簿<small>手機或電腦裡的照片</small></span>
              </button>
              <button className="np-attach-b tap" onClick={openSite}>
                <Icon name="grid" /><span>網站相簿<small>我在站上發過的照片</small></span>
              </button>
            </div>
            <span className="np-attach-h" style={{ marginTop: 6 }}>沒有照片時的文章卡片底色</span>
            <div className="thumbs">
              {COVERS.map((t, i) => (
                <button key={i} className={`th tap ${i === sel ? 'on' : ''}`} style={{ background: t.bg }}
                  aria-label={`底色 ${i + 1}`} aria-pressed={i === sel} onClick={() => setSel(i)}><Icon name="pen" /></button>
              ))}
            </div>
          </div>
        )}

        {/* 標記節氣 */}
        <button className="opt tap" onClick={() => setPickTerm(v => !v)} aria-expanded={pickTerm}>
          <div className="l">標記節氣</div>
          <div className="muted" style={{ color: 'var(--cinnabar)' }}>{term} {pickTerm ? '▾' : '›'}</div>
        </button>
        {pickTerm && (
          // 24 節氣全列，依四季分四列（立春起），換行不橫捲——橫捲時大半個節氣藏在畫面外
          <div className="np-terms" style={{ padding: '10px var(--space-4)', display: 'grid', gap: 8 }}>
            {['春', '夏', '秋', '冬'].map((s, si) => (
              <div key={s} role="group" aria-label={s + '季節氣'}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                <span className="muted" style={{ gridColumn: '1 / -1', fontSize: 'var(--text-2xs)' }}>{s}</span>
                {TERM_NAMES.slice(si * 6, si * 6 + 6).map(t => (
                  <button key={t} type="button" aria-pressed={term === t} className={`chip tap ${term === t ? 'on' : ''}`} style={{ justifyContent: 'center', margin: 0 }}
                    onClick={() => { setTerm(t); setPickTerm(false) }}>{t}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 新增地點 —— 開地圖搜尋/目前位置/常用位置 */}
        <button className="opt tap" onClick={() => setLocOpen(true)}>
          <div className="l">新增地點</div>
          <div className="muted" style={{ color: place ? 'var(--cinnabar)' : undefined }}>{place || '搜尋或定位'} ›</div>
        </button>

        {/* 上架市集：只有附了照片才有東西可以授權 */}
        {photo && <>
          <div className="opt">
            <div className="l">同時上架市集販售</div>
            <Switch on={onSale} onChange={setOnSale} />
          </div>
          {onSale && (
            <div style={{ padding: '10px var(--space-4)', borderBottom: '1px solid var(--line)' }}>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 8 }}>單張授權價</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {licenseTiers.map((p, i) => (
                  <button key={p} className={`chip tap ${priceI === i ? 'on' : ''}`} style={{ flex: 1, textAlign: 'center' }}
                    onClick={() => setPriceI(i)}>{p ? `$${p}` : '免費'}</button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-2xs)', marginTop: 8 }}>
                {price ? `售出可分潤 70%（約 NT$${Math.round(price * 0.7)}／張）` : '開放免費授權，累積曝光與人氣'}
              </div>
            </div>
          )}
        </>}

        <div style={{ height: 16 }} />
        <div style={{ padding: '0 var(--space-4)' }}>
          <button className="btn-primary tap" onClick={publish} disabled={busy || empty}>
            {busy ? '發佈中…' : photo ? '發佈貼文' : '發佈文章'}
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {sitePicker && <SitePicker handle={user?.handle} onPick={pickSite} onClose={() => setSitePicker(false)} />}
      {locOpen && <LocationPicker onClose={() => setLocOpen(false)} onPick={(p) => setPlace(p.name)} />}
    </>
  )
}

// 網站相簿：自己貼文／市集作品裡的照片（同一張圖上架時貼文與作品共用 image，以網址去重）
function SitePicker({ handle, onPick, onClose }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    let alive = true
    if (!handle) { setItems([]); return }
    api.userProfile(handle).then(r => {
      if (!alive) return
      const seen = new Set(), out = []
      for (const x of [...(r.posts || []), ...(r.works || [])]) {
        const m = /\/api\/images\/([^/?#]+)/.exec(x.image || '')
        if (!m || seen.has(x.image)) continue
        seen.add(x.image); out.push({ key: x.image, image: x.image, imageId: decodeURIComponent(m[1]), title: x.title || '', term: x.term || '' })
      }
      setItems(out)
    }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [handle])
  return (
    <SheetMask onClose={onClose} label="從網站相簿選照片">
      {(close) => (
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <div className="np-pick-hd"><b>網站相簿</b><button className="iconbtn tap" aria-label="關閉" onClick={close}><Icon name="x" /></button></div>
          {items === null ? <div className="np-pick-skel ui-skeleton" /> : items.length === 0
            ? <div className="empty"><div className="empty-t">站上還沒有你發過的照片</div><div style={{ marginTop: 6 }}>可以改用拍照或手機相簿</div></div>
            : (
              <div className="np-pick">
                {items.map(p => (
                  <button key={p.key} type="button" className="tap" onClick={() => { onPick(p); close() }}
                    aria-label={`選這張：${stripEmoji(p.title) || '照片'}${p.term ? '（' + p.term + '）' : ''}`}>
                    <img src={p.image} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
        </div>
      )}
    </SheetMask>
  )
}
