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

// ── 影片（2026-11-15）──
// 上限 30 MB／60 秒（後端 /api/videos 也擋 30 MB）。檔案直接以原始位元組上傳，存 printStore。
// 封面：在瀏覽器裡擷取一格畫面當 image 上傳——卡片、分享預覽、og:image 都不必另外處理影片。
const VIDEO_MAX_MB = 30
const VIDEO_MAX_SEC = 60
const VIDEO_EXT = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' }
// file.type 有時是空字串（部分 Android 檔案管理員、.mov），用副檔名補
function videoType(f) {
  const t = String(f?.type || '').split(';')[0].toLowerCase()
  if (/^video\/(mp4|webm|quicktime)$/.test(t)) return t
  return VIDEO_EXT[String(f?.name || '').split('.').pop().toLowerCase()] || ''
}
// 讀影片：長度、尺寸、封面。⚠️ 瀏覽器解不開的格式（例如 Chrome 遇到 iPhone 的 HEVC）
//   metadata 不會載入 ⇒ 直接拒絕：這裡播不了，別人多半也播不了。
// ⚠️ MediaRecorder 錄的 webm 沒有長度資訊（duration＝Infinity），這時不檢查秒數，靠 30 MB 擋。
function readVideo(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const v = document.createElement('video')
    v.muted = true; v.playsInline = true; v.preload = 'auto'
    let done = false, seeking = false
    const end = (fn) => { if (done) return; done = true; clearTimeout(timer); fn() }
    const meta = (poster) => ({ url, poster, w: v.videoWidth, h: v.videoHeight,
      duration: Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null })
    const grab = () => end(() => {
      let poster = null
      try {
        const s = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight))
        const c = document.createElement('canvas')
        c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s)
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        poster = c.toDataURL('image/jpeg', 0.82)
      } catch { /* 擷取失敗就沒有封面，仍可發佈 */ }
      resolve(meta(poster))
    })
    v.onloadedmetadata = () => {
      if (!v.videoWidth) return end(() => { URL.revokeObjectURL(url); reject(new Error('decode')) })
      const d = v.duration
      // 第一格常是黑畫面（淡入），封面取 0.5 秒（短片取三分之一處）
      if (Number.isFinite(d) && d > 0.6) { seeking = true; try { v.currentTime = Math.min(0.5, d / 3) } catch { seeking = false } }
    }
    v.onseeked = grab
    v.onloadeddata = () => { if (!seeking) grab() }
    v.onerror = () => end(() => { URL.revokeObjectURL(url); reject(new Error('decode')) })
    const timer = setTimeout(() => {
      if (v.videoWidth) end(() => resolve(meta(null)))
      else end(() => { URL.revokeObjectURL(url); reject(new Error('decode')) })
    }, 8000)
    v.src = url
  })
}
const fmtDur = (sec) => sec == null ? '' : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

// photo：由相機「下一步」帶進來的照片（已套好濾鏡）。
// 走這條路徑時不再另外壓縮——相機的 bakeImage() 已縮到 1600px / JPEG 0.85。
// challenge：從「節氣挑戰」的「參加投稿」進來時帶入的節氣名稱——節氣鎖定為它
//   （標記當前節氣＝參賽），頁首另顯示一行參賽提示。
//   ⚠️ 參加投稿過去直接 push('camera')，使用者沒辦法用手機相簿或自己站上的舊作品投稿。
// video：由相機錄影「下一步」帶進來的影片 Blob。
export default function NewPost({ photo: incomingPhoto = null, video: incomingVideo = null, challenge = null }) {
  const { push, pop, popAll, setToast, setStamp, requireAccount, user } = useNav()
  const draft = useRef(readDraft()).current
  const [sel, setSel] = useState(draft?.sel ?? 0)
  const [photo, setPhoto] = useState(incomingPhoto)   // 使用者選的照片（壓縮後 dataURL；調整過就是裁好的版本）
  // 調整位置與縮放：orig＝未裁切的原圖（再調整一次要從原圖開始，不可對裁過的圖再裁）
  const [orig, setOrig] = useState(incomingPhoto)
  const [cropInfo, setCropInfo] = useState(null)       // { aspect, z, x, y }；null＝沒調整過
  const [cropOpen, setCropOpen] = useState(false)
  // 影片：{ blob, url, poster, duration, w, h }。照片與影片擇一。
  const [video, setVideo] = useState(null)
  const [readingVideo, setReadingVideo] = useState(false)
  const fromCamera = !!incomingPhoto || !!incomingVideo
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

  // 影片網址用完要釋放（換一個、移除、離開頁面）
  useEffect(() => () => { if (video?.url) URL.revokeObjectURL(video.url) }, [video?.url])

  const takeVideo = async (blob) => {
    const type = videoType(blob)
    if (!type) return setToast('影片格式不支援，請用 MP4、WebM 或 MOV')
    if (blob.size > VIDEO_MAX_MB * 1024 * 1024) return setToast(`影片太大（${(blob.size / 1048576).toFixed(1)} MB），上限 ${VIDEO_MAX_MB} MB`)
    setReadingVideo(true)
    try {
      const info = await readVideo(blob)
      if (info.duration && info.duration > VIDEO_MAX_SEC + 0.5) {
        URL.revokeObjectURL(info.url)
        return setToast(`影片太長（${fmtDur(info.duration)}），上限 ${VIDEO_MAX_SEC} 秒`)
      }
      // type 正規化：上傳時 Content-Type 要對（Blob 包一層不會複製資料）
      setVideo({ ...info, blob: blob.type === type ? blob : new Blob([blob], { type }) })
      setPhoto(null); setOrig(null); setCropInfo(null); setSiteImageId(null)
    } catch {
      setToast('這個影片在瀏覽器裡無法播放（例如 iPhone 的 HEVC 格式），請改用 MP4（H.264）')
    } finally { setReadingVideo(false) }
  }
  // 相機錄好的影片：掛載時讀一次
  useEffect(() => { if (incomingVideo) takeVideo(incomingVideo) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const pickFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (videoType(f) || /^video\//.test(f.type)) return takeVideo(f)
    if (!/^image\//.test(f.type)) return setToast('請選擇照片或影片')
    try {
      const c = await compressImage(f)
      setPhoto(c); setOrig(c); setCropInfo(null); setSiteImageId(null); setVideo(null)
      setCropOpen(true)        // 選完直接進「調整位置與縮放」（可略過）
    } catch { setToast('讀取圖片失敗，請換一張') }
  }
  const openSite = () => { if (requireAccount('從網站相簿選照片')) setSitePicker(true) }
  const pickSite = (item) => { setPhoto(item.image); setOrig(item.image); setCropInfo(null); setSiteImageId(item.imageId); setVideo(null) }
  const removePhoto = () => { setPhoto(null); setOrig(null); setCropInfo(null); setSiteImageId(null) }
  const applyCrop = (data, info) => {
    if (!data) { setPhoto(orig); setCropInfo(null) }   // 沒有調整＝用原圖（網站相簿的圖就不必重傳）
    else { setPhoto(data); setCropInfo(info) }
  }

  const price = licenseTiers[priceI]
  const sell = !!photo && !video && onSale          // 沒照片就沒有東西可以上架（影片不上架市集）
  const empty = !photo && !video && !cap.trim() && !titleIn.trim()

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
      // 1) 有照片先上傳（拿 imageId）；網站相簿的圖沒調整過就直接用原本的 id
      let imageId = null, videoId = null
      if (video) {
        if (video.poster) { try { imageId = (await api.uploadImage(video.poster)).id } catch { /* 沒封面仍可發 */ } }
        videoId = (await api.uploadVideo(video.blob)).id
      } else if (siteImageId && !cropInfo) imageId = siteImageId
      else if (photo) { const r = await api.uploadImage(photo); imageId = r.id }
      // 2) 發佈貼文
      await api.createPost({
        emoji: COVERS[sel].e, bg: COVERS[sel].bg, term, title, caption: cap.trim(), tags,
        place: place || '', imageId, videoId,
      })
      // 3) 有照片且勾「上架市集」→ 真的建立市集作品（同一張圖）
      if (sell) await api.createWork({ emoji: COVERS[sel].e, bg: COVERS[sel].bg, term, title, tags, price: price || 0, imageId })
      clearDraft()
      popAll()
      setStamp('已發佈')
      setToast(`已發佈「${term}」${video ? '影片' : photo ? '貼文' : '文章'}` + (sell ? `（已上架市集 ${price ? 'NT$' + price : '免費授權'}）` : ''))
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
            aria-label="內文" maxLength={CAPTION_MAX} rows={photo || video ? 4 : 9}
            value={cap} onChange={e => setCap(e.target.value)} />
          <div className="np-count">{cap.length} / {CAPTION_MAX}</div>
        </div>

        {/* 照片或影片：附加，不是必要 */}
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,video/*" hidden onChange={pickFile} aria-label="從相簿選照片或影片" />
        {readingVideo ? (
          <div className="np-photo"><div className="np-photo-img ui-skeleton" aria-busy="true" aria-label="讀取影片中" /></div>
        ) : video ? (
          <div className="np-photo">
            <div className="np-photo-img np-video">
              <video src={video.url} poster={video.poster || undefined} controls playsInline preload="metadata" aria-label="即將發布的影片預覽" />
            </div>
            <div className="np-media-meta">
              影片{video.duration ? ` · ${fmtDur(video.duration)}` : ''} · {video.blob.size < 1048576 ? `${Math.max(1, Math.round(video.blob.size / 1024))} KB` : `${(video.blob.size / 1048576).toFixed(1)} MB`}
              {video.poster ? '' : ' · 無法擷取封面，卡片會改顯示文字'}
            </div>
            <div className="np-photo-acts">
              {fromCamera
                ? <button className="b tap" onClick={pop}>返回重拍</button>
                : <button className="b tap" onClick={() => fileRef.current?.click()}>換一個</button>}
              <button className="b tap" onClick={() => setVideo(null)}>移除影片</button>
            </div>
          </div>
        ) : photo ? (
          <div className="np-photo">
            <div className="np-photo-img"><PhotoImg src={photo} alt="即將發布的照片預覽" style={{ objectFit: 'contain' }} /></div>
            <div className="np-photo-acts">
              <button className="b dark tap" onClick={() => setCropOpen(true)}>調整位置與縮放</button>
              {fromCamera
                ? <button className="b tap" onClick={pop}>返回重拍</button>
                : <button className="b tap" onClick={() => siteImageId ? openSite() : fileRef.current?.click()}>換一張</button>}
              <button className="b tap" onClick={removePhoto}>移除照片</button>
            </div>
          </div>
        ) : (
          <div className="np-attach" role="group" aria-label="附加照片或影片（選填）">
            <span className="np-attach-h">附加照片或影片（選填）· 附照片才能同時上架市集</span>
            <div className="np-attach-g">
              <button className="np-attach-b tap" onClick={() => push('camera')}>
                <Icon name="camera" /><span>拍照・錄影<small>相機工作室・濾鏡特效</small></span>
              </button>
              <button className="np-attach-b tap" onClick={() => fileRef.current?.click()}>
                <Icon name="image" /><span>手機相簿<small>照片或影片（{VIDEO_MAX_SEC} 秒內）</small></span>
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

        {/* 上架市集：只有附了照片才有東西可以授權（影片不上架） */}
        {photo && !video && <>
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
            {busy ? (video ? '上傳影片中…' : '發佈中…') : video ? '發佈影片' : photo ? '發佈貼文' : '發佈文章'}
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>

      {cropOpen && orig && <CropSheet src={orig} init={cropInfo} onApply={applyCrop} onClose={() => setCropOpen(false)} />}
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

// ── 調整位置與縮放（2026-11-15）──
// 模型與桌曆設計器的 img.crop 相同：z＝填滿之上再放大幾倍、x/y＝可移動範圍的比例（-1…1）。
// 版面全用「相對框的百分比」算，與框的實際像素無關 ⇒ 換尺寸、轉向都不會跑掉。
// 套用時才用 canvas 把那一塊裁出來（最長邊 1600），所以後端與資料庫一行都不用改。
// ⚠️ 滾輪監聽要 passive:false（React 的 onWheel 是 passive，preventDefault 無效 ⇒ 整頁會被捲走）。
// ⚠️ setPointerCapture 可能拋例外（指標已放開），要包 try，否則拖不動且沒有任何提示。
const ASPECTS = [
  { k: 'orig', l: '原比例' }, { k: '1:1', l: '1:1', r: 1 }, { k: '4:5', l: '4:5', r: 4 / 5 }, { k: '16:9', l: '16:9', r: 16 / 9 },
]
const ZMAX = 4
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
function CropSheet({ src, init, onApply, onClose }) {
  const [nat, setNat] = useState(null)
  const [aspect, setAspect] = useState(init?.aspect || 'orig')
  const [z, setZ] = useState(init?.z || 1)
  const [x, setX] = useState(init?.x || 0)
  const [y, setY] = useState(init?.y || 0)
  const frameRef = useRef(null)
  const imgRef = useRef(null)
  useEffect(() => {
    let alive = true
    const im = new Image()
    im.onload = () => { if (alive) { imgRef.current = im; setNat({ w: im.naturalWidth, h: im.naturalHeight }) } }
    im.src = src
    return () => { alive = false }
  }, [src])

  const a = nat ? nat.w / nat.h : 1
  const A = aspect === 'orig' ? a : ASPECTS.find(o => o.k === aspect).r
  // 圖片在框裡的大小（% of 框）：先 cover 填滿，再乘 z
  const W = 100 * z * (a > A ? a / A : 1)
  const H = 100 * z * (a > A ? 1 : A / a)
  const mx = (W - 100) / 2, my = (H - 100) / 2
  const left = mx * (x - 1), top = my * (y - 1)

  // 手勢處理用的最新值（監聽器只掛一次）
  const st = useRef({})
  st.current = { z, x, y, mx, my, left, top, W, H }
  const ptrs = useRef(new Map())
  const pinch = useRef(null)
  // 螢幕座標 → 框內百分比
  const toPct = (cx, cy) => {
    const r = frameRef.current?.getBoundingClientRect()
    return r ? { px: (cx - r.left) / r.width * 100, py: (cy - r.top) / r.height * 100 } : null
  }
  // ★ 以「手指（或游標）底下那一點」為中心縮放：(u,v) 是那一點在圖片上的比例位置，
  //   縮放後讓同一點仍落在 (px,py)。只繞框中心縮放的話，捏的地方會一直滑走，手感很怪。
  const zoomAt = (z2, px, py, u, v) => {
    const s = st.current
    const W2 = s.W / s.z * z2, H2 = s.H / s.z * z2
    const mx2 = (W2 - 100) / 2, my2 = (H2 - 100) / 2
    setZ(z2)
    setX(mx2 > 0.01 ? clamp((px - u * W2) / mx2 + 1, -1, 1) : 0)
    setY(my2 > 0.01 ? clamp((py - v * H2) / my2 + 1, -1, 1) : 0)
  }
  const startPinch = () => {
    const [p, q] = [...ptrs.current.values()]
    const m = toPct((p.x + q.x) / 2, (p.y + q.y) / 2)
    if (!m) return
    const s = st.current
    pinch.current = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, z: s.z,
      u: (m.px - s.left) / s.W, v: (m.py - s.top) / s.H }
  }
  const onDown = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 已放開 */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 2) startPinch()
  }
  const onMove = (e) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    ptrs.current.set(e.pointerId, cur)
    if (ptrs.current.size >= 2 && pinch.current) {
      // 雙指：捏合縮放＋兩指一起移動＝平移（以兩指中點為錨）
      const [p, q] = [...ptrs.current.values()]
      const m = toPct((p.x + q.x) / 2, (p.y + q.y) / 2)
      if (!m) return
      const pc = pinch.current
      zoomAt(clamp(pc.z * Math.hypot(p.x - q.x, p.y - q.y) / pc.d, 1, ZMAX), m.px, m.py, pc.u, pc.v)
      return
    }
    const r = frameRef.current?.getBoundingClientRect()
    if (!r) return
    const { mx: MX, my: MY } = st.current
    if (MX > 0.01) setX(v => clamp(v + ((cur.x - prev.x) / r.width * 100) / MX, -1, 1))
    if (MY > 0.01) setY(v => clamp(v + ((cur.y - prev.y) / r.height * 100) / MY, -1, 1))
  }
  const onUp = (e) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null }
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const wheel = (e) => {
      e.preventDefault()
      const m = toPct(e.clientX, e.clientY)
      const s = st.current
      if (!m) return
      zoomAt(clamp(s.z * Math.exp(-e.deltaY * 0.0015), 1, ZMAX), m.px, m.py, (m.px - s.left) / s.W, (m.py - s.top) / s.H)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [nat])
  const onKey = (e) => {
    const step = 0.08
    const k = e.key
    if (k === 'ArrowLeft') setX(v => clamp(v - step, -1, 1))
    else if (k === 'ArrowRight') setX(v => clamp(v + step, -1, 1))
    else if (k === 'ArrowUp') setY(v => clamp(v - step, -1, 1))
    else if (k === 'ArrowDown') setY(v => clamp(v + step, -1, 1))
    else if (k === '+' || k === '=') setZ(v => clamp(v * 1.1, 1, ZMAX))
    else if (k === '-' || k === '_') setZ(v => clamp(v / 1.1, 1, ZMAX))
    else return
    e.preventDefault()
  }
  // 觸控裝置用手指縮放（滑桿那一列在 CSS 以 pointer:coarse 隱藏），提示文字跟著換
  const isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  const reset = () => { setZ(1); setX(0); setY(0) }
  const untouched = aspect === 'orig' && z === 1

  const apply = (close) => {
    if (untouched) { onApply(null, null); close(); return }
    const im = imgRef.current
    if (!im || !nat) return
    const sx = (-left / W) * nat.w, sw = (100 / W) * nat.w
    const sy = (-top / H) * nat.h, sh = (100 / H) * nat.h
    let ow, oh
    if (A >= 1) { ow = Math.min(1600, Math.round(sw)); oh = Math.round(ow / A) }
    else { oh = Math.min(1600, Math.round(sh)); ow = Math.round(oh * A) }
    const c = document.createElement('canvas')
    c.width = Math.max(1, ow); c.height = Math.max(1, oh)
    c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height)
    onApply(c.toDataURL('image/jpeg', 0.85), { aspect, z, x, y })
    close()
  }

  return (
    <SheetMask onClose={onClose} label="調整位置與縮放">
      {(close) => (
        <div className="sheet np-crop" onClick={e => e.stopPropagation()}>
          <div className="np-pick-hd"><b>調整位置與縮放</b><button className="iconbtn tap" aria-label="關閉" onClick={close}><Icon name="x" /></button></div>
          <div className="np-crop-asp" role="group" aria-label="裁切比例">
            {ASPECTS.map(o => (
              <button key={o.k} type="button" className={`chip tap ${aspect === o.k ? 'on' : ''}`} aria-pressed={aspect === o.k}
                onClick={() => { setAspect(o.k); setX(0); setY(0) }}>{o.l}</button>
            ))}
          </div>
          <div className="np-crop-stage">
            {nat ? (
              <div ref={frameRef} className="np-crop-frame" tabIndex={0}
                style={{ aspectRatio: String(A), width: `min(100%, calc(48dvh * ${A}))` }}
                role="group" aria-label="拖曳移動照片、雙指或滾輪縮放；鍵盤可用方向鍵移動、加減號縮放" onKeyDown={onKey}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <img src={src} alt="" draggable={false}
                  style={{ left: `${left}%`, top: `${top}%`, width: `${W}%`, height: `${H}%` }} />
              </div>
            ) : <div className="np-crop-frame ui-skeleton" style={{ aspectRatio: '1', width: 'min(100%, 48dvh)' }} />}
          </div>
          <div className="np-crop-zoom">
            <button type="button" className="iconbtn tap" aria-label="縮小" onClick={() => setZ(v => clamp(v / 1.15, 1, ZMAX))}>−</button>
            <input type="range" min="1" max={ZMAX} step="0.01" value={z} aria-label="縮放"
              onChange={e => setZ(Number(e.target.value))} />
            <button type="button" className="iconbtn tap" aria-label="放大" onClick={() => setZ(v => clamp(v * 1.15, 1, ZMAX))}>+</button>
          </div>
          <div className="np-crop-hint">{isTouch
            ? '單指拖曳移動 · 雙指捏合放大縮小 · 框內就是發佈出去的樣子'
            : '拖曳移動位置 · 滾輪或滑桿縮放 · 框內就是發佈出去的樣子'}</div>
          <div className="np-crop-acts">
            <button type="button" className="b tap" onClick={reset} disabled={z === 1 && x === 0 && y === 0}>重設</button>
            <button type="button" className="b dark tap" onClick={() => apply(close)} disabled={!nat}>套用</button>
          </div>
        </div>
      )}
    </SheetMask>
  )
}
