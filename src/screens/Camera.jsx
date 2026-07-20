import { useState, useRef, useEffect, useCallback } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
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

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const pressTimer = useRef(null)

  // 開關相機
  const startCam = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true })
      streamRef.current = s; setStatus('ready')
    } catch { setStatus('denied') }
  }, [facing])

  useEffect(() => { if (mode !== 'create' && !shot) startCam(); return () => streamRef.current?.getTracks().forEach(t => t.stop()) }, [facing, mode, shot, startCam])
  useEffect(() => { if (status === 'ready' && videoRef.current && streamRef.current) { videoRef.current.srcObject = streamRef.current; videoRef.current.play().catch(() => {}) } }, [status, shot, mode])

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

  // 檢視／建立完成 → 帶回新貼文或發佈
  const usePhoto = async (url) => {
    if (onDone) { onDone(url); return }
    // 沒有 onDone（直接進相機）→ 當作發佈：需登入
    if (!requireAccount('發佈作品')) return
    try {
      await api.createPost({ emoji: '📷', bg: '#141210', term: '', title: '相機作品', caption: '用機巧時運相機拍攝 📷', tags: [] })
      setToast('已發佈 📷'); popAll(); push('todayShots', {})
    } catch (e) { setToast(e?.message || '發佈失敗') }
  }

  // ── 檢視畫面（拍照後）──
  if (shot) return <Review shot={shot} filters={storyFilters} feedFilters={feedFilters} effects={effects}
    onBack={() => { setShot(null); startCam() }} onUse={usePhoto} setToast={setToast} />

  // ── 錄影完成預覽 ──
  if (videoUrl) return (
    <div className="cam">
      <TopBar title="影片" onClose={() => { setVideoUrl(null); startCam() }} />
      <div className="cam-stage"><video src={videoUrl} controls autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      <div className="cam-bottom"><button className="btn-primary tap" onClick={() => { setToast('影片已保存（示範）'); setVideoUrl(null); startCam() }}>使用影片</button></div>
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
        ? <LayoutMode videoRef={videoRef} grab={grabPhoto} onComposed={setShot} setToast={setToast} status={status} startCam={startCam} facing={facing} />
        : (
          <div className="cam-stage">
            {status === 'denied'
              ? <div className="cam-denied">📷<p>無法存取相機</p><small>請在瀏覽器允許相機權限，或用「建立」模式做純文字限動</small><button className="b dark tap" onClick={startCam}>再試一次</button></div>
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
function LayoutMode({ videoRef, grab, onComposed, setToast, status, startCam, facing }) {
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
        <button className="btn-primary tap" onClick={() => onUse(shot.url)}>使用照片</button>
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
function CreateStory({ onExit, onUse, setToast }) {
  const gradients = useContent('gradients', [{ id: 'ink', name: '墨', css: 'linear-gradient(160deg,#232526,#414345)' }])
  const [bg, setBg] = useState(0)
  const [text, setText] = useState('今天，芒種 🌾')
  const [tfx, setTfx] = useState('neon')
  const [sticker, setSticker] = useState(null)   // poll | qa | countdown
  const bgCss = gradients[bg]?.css || '#141210'

  return (
    <div className="cam">
      <TopBar title="建立限動" onClose={onExit} />
      <div className="cam-stage create" style={{ background: bgCss }}>
        <div className="cs-text"><AnimatedText text={text} fx={tfx} key={tfx + text} /></div>
        {sticker === 'poll' && <div className="cs-sticker poll"><div className="q">你喜歡哪個節氣？</div><div className="opts"><span>芒種</span><span>夏至</span></div></div>}
        {sticker === 'qa' && <div className="cs-sticker qa"><div className="q">問我任何事 💬</div><div className="box">輸入你的問題…</div></div>}
        {sticker === 'countdown' && <div className="cs-sticker cd"><div className="q">端午連假倒數</div><div className="nums">03 : 12 : 45 : 09</div></div>}
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
      </div>
      <div className="cam-bottom"><button className="btn-primary tap" onClick={() => { setToast('限動已發佈（示範）'); onExit() }}>發佈限時動態</button></div>
    </div>
  )
}
