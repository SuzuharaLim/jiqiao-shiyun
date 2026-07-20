import { useState, useRef, useEffect } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'
import AnimatedText from '../components/AnimatedText.jsx'

// 相機工作室 —— 純瀏覽器 API（getUserMedia / MediaRecorder / Canvas / DeviceMotion / CSS filter），零第三方。
// 模式：拍攝(單點=照片,長按=錄影) / 版面(2–6格拼貼) / 建立(純色漸層+文字+票選+倒數限動)。
// 拍完 → 檢視：滑動換濾鏡、雙擊濾鏡調強度、加動態文字、套搖晃顯影框 → 發佈或帶回新貼文。

const LAYOUTS = [{ n: 2, g: '1x2' }, { n: 3, g: '1x3' }, { n: 4, g: '2x2' }, { n: 6, g: '2x3' }]

// 依強度(0–100)把 CSS filter 內插（原圖↔濾鏡）：用第二層原圖以 (1-strength) 疊上
const strengthStyle = (css, strength) => css === 'none' ? {} : { filter: css, opacity: 1 }

export default function Camera({ onDone }) {
  const { popAll, setToast, push, requireAccount } = useNav()
  const feedFilters = useContent('feedFilters', [{ id: 'normal', name: '原圖', css: 'none' }])
  const storyFilters = useContent('storyFilters', [{ id: 'original', name: 'Original', css: 'none' }])
  const effects = useContent('effects', [])

  const [mode, setMode] = useState('capture')       // capture | layout | create
  const [facing, setFacing] = useState('environment')
  const [status, setStatus] = useState('idle')      // idle | ready | denied
  const [shot, setShot] = useState(null)            // {url, w, h} 拍好的照片（進檢視）
  const [recording, setRecording] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)

  const [stream, setStream] = useState(null)        // ★ 用 state 而非 ref：換串流一定會重新掛上 video
  const [camKey, setCamKey] = useState(0)           // 「再試一次」用的重試計數

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const pressTimer = useRef(null)

  // ── 相機生命週期（單一 effect 掌管，避免多處 startCam 互相競爭）──
  // 雷區：先前 streamRef 是 ref、掛載 effect 依賴 status，切鏡頭時 status 一直是 'ready'
  //       不觸發重掛，video 仍連著已停止的舊串流 → 黑畫面。改用 state 才會正確重掛。
  useEffect(() => {
    const stopAll = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }
    const needCam = mode !== 'create' && !shot && !videoUrl
    if (!needCam) { stopAll(); setStream(null); return }   // 檢視/建立時關閉鏡頭（省電、鏡頭燈不亮）

    let cancelled = false
    ;(async () => {
      stopAll()
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true })
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return }  // 快速連按切鏡頭時丟棄過期串流
        streamRef.current = s; setStream(s); setStatus('ready')
      } catch { if (!cancelled) setStatus('denied') }
    })()
    return () => { cancelled = true }
  }, [facing, mode, shot, videoUrl, camKey])

  // 離開相機畫面時確實關閉（否則鏡頭燈會一直亮著）
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  // 串流或畫面模式一變就重新掛上 video 元素（mode 切換時 video 是不同的 DOM 節點）
  useEffect(() => {
    const v = videoRef.current
    if (v && stream) { v.srcObject = stream; v.play().catch(() => {}) }
  }, [stream, mode])

  const retryCam = () => { setStatus('idle'); setCamKey(k => k + 1) }

  // 拍照（把當前視訊畫格畫到 canvas）
  const grabPhoto = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return null
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1) }   // 前鏡自拍鏡像
    ctx.drawImage(v, 0, 0, c.width, c.height)
    return { url: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height }
  }

  // 單點快門 = 拍照；長按 = 錄影
  const shutterDown = () => {
    pressTimer.current = setTimeout(() => startRec(), 380)
  }
  const shutterUp = () => {
    if (recording) { stopRec(); return }
    clearTimeout(pressTimer.current)
    const p = grabPhoto(); if (p) setShot(p)
  }
  const startRec = () => {
    if (!streamRef.current) return
    try {
      chunksRef.current = []
      // Safari/iOS 不支援 webm → 依序嘗試 webm/mp4，全不支援時交給瀏覽器自選
      const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t))
      const mr = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
      mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data)
      mr.onstop = () => { const blob = new Blob(chunksRef.current, { type: mime || 'video/mp4' }); setVideoUrl(URL.createObjectURL(blob)) }
      mr.start(); recRef.current = mr; setRecording(true); setToast('錄影中…放開停止')
    } catch { setToast('此裝置不支援錄影') }
  }
  const stopRec = () => { try { recRef.current?.stop() } catch { /* ignore */ } setRecording(false) }

  // 檢視完成 → 進「發文頁」讓使用者自己填說明再發佈（IG 式流程）
  // ★ 刻意「不」在這裡直接發佈：拍完就上線會讓人來不及反悔，也無法自訂說明/地點/是否上架。
  //   照片在這裡還沒上傳，等使用者在發文頁按「發佈」才真的送出。
  const usePhoto = async (url) => {
    if (onDone) { onDone(url); return }        // 由別的畫面呼叫相機時，把照片交回去
    if (!requireAccount('發佈作品')) return
    popAll()
    push('newPost', { photo: url })            // 帶著照片進發文頁（可寫說明、標節氣地點、決定是否上架）
  }

  // ── 檢視畫面（拍照後）──
  // 放棄編輯只需把 shot 清掉，相機由上面的生命週期 effect 自動重開
  //（先前這裡另外呼叫 startCam() 會與 effect 互搶，導致回到拍攝畫面時黑畫面）
  if (shot) return <Review shot={shot} filters={storyFilters} feedFilters={feedFilters} effects={effects}
    onBack={() => setShot(null)} onUse={usePhoto} setToast={setToast} />

  // ── 錄影完成預覽 ──
  if (videoUrl) return (
    <div className="cam">
      <TopBar title="影片" onClose={() => setVideoUrl(null)} />
      <div className="cam-stage"><video src={videoUrl} controls autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      <div className="cam-bottom"><button className="btn-primary tap" onClick={() => { setToast('影片已保存（示範）'); setVideoUrl(null) }}>使用影片</button></div>
    </div>
  )

  // ── 建立模式（限動）──
  if (mode === 'create') return <CreateStory onExit={() => setMode('capture')} onUse={usePhoto} setToast={setToast} />

  // ── 版面 / 拍攝 ──
  return (
    <div className="cam">
      <TopBar title="相機" onClose={popAll}
        right={<button className="iconbtn tap" aria-label="切換鏡頭" onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}>🔄</button>} />

      {mode === 'layout'
        ? <LayoutMode videoRef={videoRef} grab={grabPhoto} onComposed={setShot} setToast={setToast} status={status} facing={facing} />
        : (
          <div className="cam-stage">
            {status === 'denied'
              ? <div className="cam-denied">📷<p>無法存取相機</p><small>請在瀏覽器允許相機權限，或用「建立」模式做純文字限動</small><button className="b dark tap" onClick={retryCam}>再試一次</button></div>
              : <video ref={videoRef} autoPlay playsInline muted className={facing === 'user' ? 'mirror' : ''} />}
          </div>
        )}

      {/* 模式列 */}
      <div className="cam-modes">
        {[['capture', '拍攝'], ['layout', '版面'], ['create', '建立']].map(([k, l]) => (
          <button key={k} className={`cm tap ${mode === k ? 'on' : ''}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>

      {mode === 'capture' && (
        <div className="cam-bottom">
          <div className="cam-hint">單點拍照・長按錄影</div>
          <button className={`shutter tap ${recording ? 'rec' : ''}`} aria-label="快門"
            onPointerDown={shutterDown} onPointerUp={shutterUp} onPointerLeave={() => clearTimeout(pressTimer.current)} />
          <div className="cam-hint">影片會自動保存</div>
        </div>
      )}
    </div>
  )
}

// ═══════ 版面拼貼 ═══════
function LayoutMode({ videoRef, grab, onComposed, setToast, status, facing }) {
  const [lay, setLay] = useState(LAYOUTS[2])   // 預設 2x2
  const [shots, setShots] = useState([])
  useEffect(() => { if (status === 'ready' && videoRef.current) videoRef.current.play().catch(() => {}) }, [shots, status, videoRef])

  const snap = () => {
    const p = grab(); if (!p) return
    const next = [...shots, p.url]
    if (next.length >= lay.n) { compose(next); setShots([]) } else setShots(next)
  }
  const compose = (urls) => {
    const [cols, rows] = lay.g === '1x2' ? [1, 2] : lay.g === '1x3' ? [1, 3] : lay.g === '2x2' ? [2, 2] : [2, 3]
    const cell = 500, gap = 8
    const c = document.createElement('canvas'); c.width = cols * cell + (cols + 1) * gap; c.height = rows * cell + (rows + 1) * gap
    const ctx = c.getContext('2d'); ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, c.width, c.height)
    let done = 0
    urls.forEach((u, i) => {
      const img = new Image()
      img.onload = () => {
        const cx = gap + (i % cols) * (cell + gap), cy = gap + Math.floor(i / cols) * (cell + gap)
        const s = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx, cy, cell, cell)
        if (++done === urls.length) onComposed({ url: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height })
      }
      img.src = u
    })
  }
  return (
    <>
      <div className="cam-stage">
        {status === 'denied' ? <div className="cam-denied">📷<p>無法存取相機</p></div>
          : <video ref={videoRef} autoPlay playsInline muted className={facing === 'user' ? 'mirror' : ''} />}
        <div className="lay-badge">{shots.length}/{lay.n}</div>
      </div>
      <div className="lay-picker">
        {LAYOUTS.map(l => <button key={l.g} className={`lp-chip tap ${lay.g === l.g ? 'on' : ''}`} onClick={() => { setLay(l); setShots([]) }}>{l.n} 格</button>)}
      </div>
      <div className="cam-bottom">
        <div className="cam-hint">連拍 {lay.n} 張自動拼貼</div>
        <button className="shutter tap" aria-label="拍一格" onClick={snap} />
        <div className="cam-hint">已拍 {shots.length}</div>
      </div>
    </>
  )
}

// 把檢視畫面的編輯結果「烘」成一張真的圖檔（濾鏡/強度/疊加特效/文字），
// 並縮到最長邊 1600px、JPEG 0.85 —— 與發貼文的上傳規格一致。
// 註：畫面上的濾鏡只是 CSS 預覽，不烘進來的話上傳的會是原圖。
//     Canvas 的 ctx.filter 吃的語法與 CSS filter 相同，可直接沿用濾鏡設定。
function bakeImage({ url, filterCss, strength = 100, overlayEmoji = '', overlayPos = 'top', text = '' }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const max = 1600
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d')

      // 1) 套濾鏡畫一次
      ctx.filter = filterCss && filterCss !== 'none' ? filterCss : 'none'
      ctx.drawImage(img, 0, 0, w, h)
      // 2) 強度 < 100：用原圖以不透明度疊回去內插（與畫面預覽同一套邏輯）
      if (strength < 100) {
        ctx.filter = 'none'
        ctx.globalAlpha = 1 - strength / 100
        ctx.drawImage(img, 0, 0, w, h)
        ctx.globalAlpha = 1
      }
      ctx.filter = 'none'
      // 3) 疊加型特效（貓耳/花冠…）
      if (overlayEmoji) {
        const size = Math.round(h * 0.22)
        ctx.font = `${size}px serif`
        ctx.textAlign = 'center'
        const y = overlayPos === 'top' ? size * 1.1 : overlayPos === 'eyes' ? h * 0.42 : h * 0.55
        ctx.fillText(overlayEmoji, w / 2, y)
      }
      // 4) 文字（動態效果是播放用的，靜態圖烘入文字本身）
      if (text) {
        const size = Math.round(h * 0.065)
        ctx.font = `700 ${size}px "Songti TC", serif`
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = size * 0.4
        ctx.fillStyle = '#fff'
        ctx.fillText(text.slice(0, 30), w / 2, h - size * 1.4)
        ctx.shadowBlur = 0
      }
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('圖片處理失敗'))
    img.src = url
  })
}

// ═══════ 檢視（濾鏡/強度/文字/搖晃框）═══════
function Review({ shot, filters, feedFilters, effects, onBack, onUse, setToast }) {
  const [lib, setLib] = useState('story')            // story | feed（經典濾鏡庫）
  const list = lib === 'story' ? filters : feedFilters
  const [fi, setFi] = useState(0)
  const [strength, setStrength] = useState(100)
  const [showSlider, setShowSlider] = useState(false)
  const [effOpen, setEffOpen] = useState(false)
  const [eff, setEff] = useState(null)               // 選中的特效
  const [text, setText] = useState('')
  const [textFxOpen, setTextFxOpen] = useState(false)
  const [tfx, setTfx] = useState('classic')
  const [shake, setShake] = useState(false)
  const [baking, setBaking] = useState(false)      // 正在把效果烘進圖檔 / 上傳
  const [reveal, setReveal] = useState(0)            // 0=模糊 1=清晰（搖晃顯影）
  const startX = useRef(0)
  const lastAcc = useRef(0)

  const cur = list[fi] || list[0]
  const baseCss = cur?.css && cur.css !== 'none' ? cur.css : ''
  const effCss = eff?.css || ''
  const filterCss = [baseCss, effCss].filter(Boolean).join(' ') || 'none'
  const blurPx = shake ? (1 - reveal) * 9 : 0
  const baseFilter = [filterCss !== 'none' ? filterCss : '', blurPx ? `blur(${blurPx.toFixed(1)}px)` : ''].filter(Boolean).join(' ') || 'none'

  // 搖晃顯影：監聽 DeviceMotion，加速度變化越大 → 顯影越多
  useEffect(() => {
    if (!shake) { setReveal(0); return }
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration || {}
      const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0)
      const delta = Math.abs(mag - lastAcc.current); lastAcc.current = mag
      if (delta > 3) setReveal(r => Math.min(1, r + delta / 90))
    }
    // iOS 需請求權限
    const DME = window.DeviceMotionEvent
    if (DME && typeof DME.requestPermission === 'function') DME.requestPermission().then(p => { if (p === 'granted') window.addEventListener('devicemotion', onMotion) }).catch(() => {})
    else window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [shake])

  const onSwipe = (e) => {
    const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
    const dx = x - startX.current
    if (Math.abs(dx) > 45) { setFi(i => (i + (dx < 0 ? 1 : -1) + list.length) % list.length); setShowSlider(false) }
  }

  return (
    <div className="cam review">
      <TopBar title="檢視" onClose={onBack}
        right={<button className="iconbtn tap" aria-label="加文字" onClick={() => setTextFxOpen(true)}>Ａ</button>} />

      <div className="cam-stage"
        onPointerDown={e => { startX.current = e.clientX }} onPointerUp={onSwipe}>
        {/* 底：原圖 + 濾鏡（強度用不透明度內插；搖晃時加模糊）*/}
        <img src={shot.url} alt="" className="rv-img base" style={{ filter: baseFilter }} />
        {strength < 100 && !shake && <img src={shot.url} alt="" className="rv-img over" style={{ opacity: 1 - strength / 100 }} />}
        {/* 疊加型特效（貓耳/雀斑…） */}
        {eff?.type === 'overlay' && <div className={`rv-overlay pos-${eff.pos || 'top'}`}>{eff.emoji}</div>}
        {/* 搖晃顯影框（拍立得）*/}
        {shake && reveal < 0.98 && (
          <div className="rv-shakeframe">
            <span>📳 搖一搖手機讓照片顯影（{Math.round(reveal * 100)}%）</span>
            <button className="b tap" onClick={() => setReveal(r => Math.min(1, r + 0.25))}>沒有體感？點我模擬搖晃</button>
          </div>
        )}
        {/* 動態文字 */}
        {text && <div className="rv-text"><AnimatedText text={text} fx={tfx} /></div>}
      </div>

      {/* 濾鏡列（可滑動；最右放大鏡＝特效庫）*/}
      <div className="rv-filters">
        <div className="rv-tabs">
          <button className={`rt tap ${lib === 'story' ? 'on' : ''}`} onClick={() => { setLib('story'); setFi(0) }}>滑動濾鏡</button>
          <button className={`rt tap ${lib === 'feed' ? 'on' : ''}`} onClick={() => { setLib('feed'); setFi(0) }}>經典濾鏡</button>
        </div>
        <div className="rv-strip">
          {list.map((f, i) => (
            <button key={f.id} className={`rvf tap ${i === fi ? 'on' : ''}`}
              onClick={() => { if (i === fi) { setShowSlider(s => !s) } else { setFi(i); setShowSlider(false) } }}>
              <span className="rvf-th" style={{ filter: f.css }}><img src={shot.url} alt="" /></span>
              <small>{f.name}</small>
            </button>
          ))}
          <button className="rvf mag tap" onClick={() => setEffOpen(true)} aria-label="特效庫">🔍<small>特效</small></button>
        </div>
        {showSlider && lib === 'feed' && (
          <div className="rv-slider">
            <span>強度 {strength}</span>
            <input type="range" min={0} max={100} value={strength} onChange={e => setStrength(+e.target.value)} aria-label="濾鏡強度" />
          </div>
        )}
      </div>

      <div className="cam-bottom row">
        <button className={`chip tap ${shake ? 'on' : ''}`} onClick={() => setShake(s => !s)}>📳 搖晃顯影框</button>
        <button className="btn-primary tap" disabled={baking}
          onClick={async () => {
            setBaking(true)
            try {
              // 把濾鏡/強度/特效/文字烘進圖檔再交出去（否則上傳的會是沒套效果的原圖）
              const baked = await bakeImage({
                url: shot.url, filterCss, strength,
                overlayEmoji: eff?.type === 'overlay' ? eff.emoji : '',
                overlayPos: eff?.pos, text,
              })
              await onUse(baked)
            } catch (e) {
              setToast(e?.message || '照片處理失敗')
            } finally { setBaking(false) }
          }}>{baking ? '處理中…' : '下一步 →'}</button>
      </div>

      {/* 特效庫 */}
      {effOpen && <EffectsLibrary effects={effects} shotUrl={shot.url} onClose={() => setEffOpen(false)} onPick={(e) => { setEff(e); setEffOpen(false); setToast(`已套用 ${e.name}`) }} />}

      {/* 加文字 */}
      {textFxOpen && (
        <div className="sheet-mask" onClick={() => setTextFxOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="lp-hd">加入文字</div>
            <input className="lp-search" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line2)', background: 'var(--field)', color: 'var(--text)' }}
              value={text} onChange={e => setText(e.target.value)} placeholder="輸入文字…" aria-label="限動文字" />
            <div className="tfx-row">
              {['classic', 'typewriter', 'karaoke', 'neon'].map(k => (
                <button key={k} className={`chip tap ${tfx === k ? 'on' : ''}`} onClick={() => setTfx(k)}>
                  {{ classic: '經典', typewriter: '打字機', karaoke: '卡拉OK', neon: '霓虹彈跳' }[k]}
                </button>
              ))}
            </div>
            <div className="tfx-preview"><AnimatedText text={text || '預覽文字'} fx={tfx} key={tfx + text} /></div>
            <button className="b dark tap" style={{ width: '100%', marginTop: 10 }} onClick={() => setTextFxOpen(false)}>完成</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════ 特效庫（美顏/疊加/變形）═══════
function EffectsLibrary({ effects, shotUrl, onClose, onPick }) {
  const [q, setQ] = useState('')
  const list = effects.filter(e => !q || e.name.includes(q) || e.id.includes(q))
  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet lp" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="lp-hd">特效大觀園<button className="lp-close tap" onClick={onClose} aria-label="關閉">✕</button></div>
        <input className="eff-search" value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋特效（美顏・貓耳・變形…）" aria-label="搜尋特效" />
        <div className="lp-scroll">
          <div className="eff-grid">
            {list.map(e => (
              <button key={e.id} className="eff-it tap" onClick={() => onPick(e)}>
                <span className="eff-th" style={{ filter: e.css || 'none' }}><img src={shotUrl} alt="" />{e.type === 'overlay' && <em>{e.emoji}</em>}</span>
                <small>{e.icon} {e.name}</small>
              </button>
            ))}
            {list.length === 0 && <div className="muted center" style={{ gridColumn: '1/-1', padding: 20 }}>找不到「{q}」</div>}
          </div>
          <div className="ad-note" style={{ padding: '4px 4px 12px' }}>臉部貼合（貓耳精準跟臉）需要臉部追蹤；此處以 FaceDetector（若支援）或置中疊加近似，美顏用即時濾鏡實作。</div>
        </div>
      </div>
    </div>
  )
}

// ═══════ 建立模式：純色/漸層 + 文字 + 票選/問答/倒數 ═══════
// datetime-local 需要「本地時間」字串（不能用 toISOString，那是 UTC 會差時區）
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function CreateStory({ onExit, onUse, setToast }) {
  const gradients = useContent('gradients', [{ id: 'ink', name: '墨', css: 'linear-gradient(160deg,#232526,#414345)' }])
  const [bg, setBg] = useState(0)
  const [text, setText] = useState('今天，芒種 🌾')
  const [tfx, setTfx] = useState('neon')
  const [sticker, setSticker] = useState(null)   // poll | qa | countdown
  const bgCss = gradients[bg]?.css || '#141210'

  // 貼紙內容（皆可自行編輯）
  const [poll, setPoll] = useState({ q: '你喜歡哪個節氣？', opts: ['芒種', '夏至'] })
  const [qa, setQa] = useState({ q: '問我任何事 💬', hint: '輸入你的問題…' })
  const [cd, setCd] = useState(() => ({
    q: '端午連假倒數',
    target: toLocalInput(new Date(Date.now() + 7 * 86400000)),   // 預設七天後
  }))

  // 倒數每秒更新（只在選了倒數貼紙時才跑計時器）
  const [nowTs, setNowTs] = useState(() => Date.now())
  useEffect(() => {
    if (sticker !== 'countdown') return
    const t = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [sticker])

  const remain = Math.max(0, new Date(cd.target).getTime() - nowTs)
  const cdParts = Number.isFinite(remain)
    ? [Math.floor(remain / 86400000), Math.floor(remain / 3600000) % 24, Math.floor(remain / 60000) % 60, Math.floor(remain / 1000) % 60]
    : [0, 0, 0, 0]
  const pad2 = (n) => String(n).padStart(2, '0')

  const setOpt = (i, v) => setPoll(p => ({ ...p, opts: p.opts.map((o, k) => (k === i ? v : o)) }))
  const addOpt = () => setPoll(p => (p.opts.length >= 4 ? p : { ...p, opts: [...p.opts, ''] }))
  const delOpt = (i) => setPoll(p => (p.opts.length <= 2 ? p : { ...p, opts: p.opts.filter((_, k) => k !== i) }))

  return (
    <div className="cam">
      <TopBar title="建立限動" onClose={onExit} />
      <div className="cam-stage create" style={{ background: bgCss }}>
        <div className="cs-text"><AnimatedText text={text} fx={tfx} key={tfx + text} /></div>
        {sticker === 'poll' && (
          <div className="cs-sticker poll">
            <div className="q">{poll.q || '（輸入票選問題）'}</div>
            <div className="opts">{poll.opts.map((o, i) => <span key={i}>{o || `選項 ${i + 1}`}</span>)}</div>
          </div>
        )}
        {sticker === 'qa' && (
          <div className="cs-sticker qa">
            <div className="q">{qa.q || '（輸入問題）'}</div>
            <div className="box">{qa.hint || '輸入你的問題…'}</div>
          </div>
        )}
        {sticker === 'countdown' && (
          <div className="cs-sticker cd">
            <div className="q">{cd.q || '（輸入倒數標題）'}</div>
            {remain > 0
              ? <div className="nums">{cdParts.map(pad2).join(' : ')}</div>
              : <div className="nums">時間到 🎉</div>}
            <div className="cd-lbl"><span>天</span><span>時</span><span>分</span><span>秒</span></div>
          </div>
        )}
      </div>

      <div className="cs-tools">
        <div className="cs-bgs">
          {gradients.map((g, i) => <button key={g.id} className={`cs-bg tap ${bg === i ? 'on' : ''}`} style={{ background: g.css }} onClick={() => setBg(i)} aria-label={g.name} />)}
        </div>
        <input className="cs-input" value={text} onChange={e => setText(e.target.value)} placeholder="輸入文字…" aria-label="限動文字" />
        <div className="tfx-row">
          {['classic', 'typewriter', 'karaoke', 'neon'].map(k => (
            <button key={k} className={`chip tap ${tfx === k ? 'on' : ''}`} onClick={() => setTfx(k)}>{{ classic: '經典', typewriter: '打字機', karaoke: '卡拉OK', neon: '霓虹' }[k]}</button>
          ))}
        </div>
        <div className="tfx-row">
          {[['poll', '📊 票選'], ['qa', '💬 問答'], ['countdown', '⏳ 倒數']].map(([k, l]) => (
            <button key={k} className={`chip tap ${sticker === k ? 'on' : ''}`} onClick={() => setSticker(s => s === k ? null : k)}>{l}</button>
          ))}
        </div>

        {/* 貼紙內容編輯區 —— 選了哪個貼紙就顯示哪組欄位 */}
        {sticker === 'poll' && (
          <div className="cs-edit">
            <label className="cs-lbl" htmlFor="cs-poll-q">票選問題</label>
            <input id="cs-poll-q" className="cs-input" value={poll.q} maxLength={40}
              onChange={e => setPoll(p => ({ ...p, q: e.target.value }))} placeholder="例：你喜歡哪個節氣？" />
            {poll.opts.map((o, i) => (
              <div key={i} className="cs-optrow">
                <input className="cs-input" value={o} maxLength={20} aria-label={`選項 ${i + 1}`}
                  onChange={e => setOpt(i, e.target.value)} placeholder={`選項 ${i + 1}`} />
                {poll.opts.length > 2 && (
                  <button className="cs-x tap" onClick={() => delOpt(i)} aria-label={`刪除選項 ${i + 1}`}>✕</button>
                )}
              </div>
            ))}
            {poll.opts.length < 4 && <button className="chip tap" onClick={addOpt}>＋ 新增選項</button>}
          </div>
        )}
        {sticker === 'qa' && (
          <div className="cs-edit">
            <label className="cs-lbl" htmlFor="cs-qa-q">問答標題</label>
            <input id="cs-qa-q" className="cs-input" value={qa.q} maxLength={40}
              onChange={e => setQa(v => ({ ...v, q: e.target.value }))} placeholder="例：問我任何事 💬" />
            <label className="cs-lbl" htmlFor="cs-qa-h">輸入框提示字</label>
            <input id="cs-qa-h" className="cs-input" value={qa.hint} maxLength={20}
              onChange={e => setQa(v => ({ ...v, hint: e.target.value }))} placeholder="例：輸入你的問題…" />
          </div>
        )}
        {sticker === 'countdown' && (
          <div className="cs-edit">
            <label className="cs-lbl" htmlFor="cs-cd-q">倒數標題</label>
            <input id="cs-cd-q" className="cs-input" value={cd.q} maxLength={40}
              onChange={e => setCd(v => ({ ...v, q: e.target.value }))} placeholder="例：端午連假倒數" />
            <label className="cs-lbl" htmlFor="cs-cd-t">結束時間</label>
            <input id="cs-cd-t" className="cs-input" type="datetime-local" value={cd.target}
              onChange={e => setCd(v => ({ ...v, target: e.target.value }))} />
            {remain <= 0 && <div className="cs-warn">⚠️ 這個時間已經過了，倒數會顯示「時間到」</div>}
          </div>
        )}
      </div>
      <div className="cam-bottom"><button className="btn-primary tap" onClick={() => { setToast('限動已發佈（示範）'); onExit() }}>發佈限時動態</button></div>
    </div>
  )
}
