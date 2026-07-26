import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { dayFor } from '../data/almanac.js'
import { makeSignature, bestMatchMultiWindow, matchScore, cropRgba, serializeSig, deserializeSig } from '../lib/scanner.js'

// 取樣尺寸：GRAB = 相機取樣畫面，WIN = 比對視窗（多視窗比對容忍手持偏移）
const GRAB_W = 160, GRAB_H = 120
const WIN_W = 128, WIN_H = 96
const MIN_SCORE = 60        // 匹配門檻（0–100）
const HITS_NEEDED = 3       // 連續命中幀數 → 確認辨識（防單幀誤判）
const TICK_MS = 300         // 比對頻率
const MAX_REFS = 12         // 登錄上限（localStorage 空間考量）
const LS_KEY = 'jq-postcards'

// ---- 已登錄明信片的持久化（簽名 + 縮圖，全存本機；影像不上傳） ----
// 逐筆驗證＋逐筆 try/catch：單筆壞資料只剔除該筆，不會讓全部登錄消失
// （若整批包一個 try/catch，一筆污染 → 回 []，之後 saveRefs 覆寫 = 完好登錄永久遺失）
const HIST_LEN = 24   // 8 bins × 3 通道
function loadRefs() {
  let parsed
  try { parsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  if (!Array.isArray(parsed)) return []
  const out = []
  for (const r of parsed) {
    try {
      const valid = typeof r?.id === 'string' && typeof r?.name === 'string'
        && typeof r?.sig?.hash === 'string' && /^[0-9a-fA-F]{16}$/.test(r.sig.hash)
        && Array.isArray(r.sig.hist) && r.sig.hist.length === HIST_LEN && r.sig.hist.every(Number.isFinite)
      if (valid) out.push({ ...r, ...deserializeSig(r.sig) })
    } catch { /* 剔除單筆壞資料 */ }
  }
  return out
}
function saveRefs(refs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(refs.map(r => ({ id: r.id, name: r.name, thumb: r.thumb, sig: serializeSig(r) }))))
    return true
  } catch { return false }
}

// 鏡頭掃描 —— 自研辨識管線（dHash + 色彩直方圖，src/lib/scanner.js），零第三方相依。
export default function Scan() {
  const { setToast, pop } = useNav()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const grabRef = useRef(null)               // 取樣 canvas + context（只建一次）
  const hitsRef = useRef({ id: null, n: 0 })
  const pendingRef = useRef(null)            // 剛登錄的卡片 id：須先離場一次才允許自動辨識
  const blurRef = useRef(0)                  // 模糊遲滯計數（連續 2 幀才切換，防提示閃爍）
  const armTimer = useRef(null)
  const prevFocus = useRef(null)
  const sheetRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading | ready | denied | unsupported
  const [refs, setRefs] = useState(loadRefs)
  const refsRef = useRef(refs); refsRef.current = refs
  const [live, setLive] = useState(null)          // { score, name } 即時比對回饋
  const [blurry, setBlurry] = useState(false)
  const [found, setFound] = useState(null)        // 辨識成功 { name, score, thumb }
  const foundRef = useRef(null); foundRef.current = found
  const [lastAdded, setLastAdded] = useState(null) // 剛登錄的 chip id（閃爍確認）
  const [armId, setArmId] = useState(null)         // 兩段式刪除：已武裝的 chip id

  // ---- 開關相機 ----
  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        }).catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }))
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        setStatus('ready')
      } catch (e) {
        setStatus(e?.name === 'NotAllowedError' ? 'denied' : 'unsupported')
      }
    }
    start()
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // <video> 在 status==='ready' 才進 DOM → 必須在渲染後才接上 stream
  // （若在 getUserMedia resolve 當下接，videoRef 還是 null，畫面會全黑）
  useEffect(() => {
    if (status === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play?.().catch(() => { /* autoplay 受阻時靠 muted+playsInline */ })
    }
  }, [status])

  // ---- 取樣一幀（video → 160×120 ImageData）----
  // canvas 尺寸只設一次：對 width/height 賦值（即使同值）依規格會清空 bitmap 並重置 context
  const grabFrame = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return null
    if (!grabRef.current) {
      const cv = document.createElement('canvas')
      cv.width = GRAB_W; cv.height = GRAB_H
      grabRef.current = { cv, ctx: cv.getContext('2d', { willReadFrequently: true }) }
    }
    const { ctx } = grabRef.current
    ctx.drawImage(video, 0, 0, GRAB_W, GRAB_H)
    return ctx.getImageData(0, 0, GRAB_W, GRAB_H)
  }

  // ---- 即時比對迴圈 ----
  useEffect(() => {
    if (status !== 'ready') return
    const timer = setInterval(() => {
      if (document.hidden || foundRef.current) return
      const frame = grabFrame()
      if (!frame) return
      const list = refsRef.current
      // 中央視窗清晰度 → 模糊提示（連續 2 幀才切換，防閃爍）
      const cx = (GRAB_W - WIN_W) >> 1, cy = (GRAB_H - WIN_H) >> 1
      const centerSig = makeSignature(cropRgba(frame.data, GRAB_W, GRAB_H, cx, cy, WIN_W, WIN_H), WIN_W, WIN_H)
      const isBlur = centerSig.sharp < 25
      blurRef.current = isBlur ? Math.min(2, Math.max(0, blurRef.current) + 1) : Math.max(-2, Math.min(0, blurRef.current) - 1)
      if (blurRef.current >= 2) setBlurry(true)
      else if (blurRef.current <= -2) setBlurry(false)
      if (!list.length) { setLive(null); return }
      const m = bestMatchMultiWindow(frame.data, GRAB_W, GRAB_H, WIN_W, WIN_H, list, MIN_SCORE)
      setLive(m ? { score: m.score, name: m.name } : null)
      // 剛登錄的卡片：須先離場一次，之後對回來才觸發自動辨識
      // （否則登錄當下卡片還在框內 → 0.9 秒內必彈成功 sheet，蓋掉「先移開再對回來」的引導）
      if (m?.ok && m.ref.id === pendingRef.current) return
      if (!m?.ok || m.ref.id !== pendingRef.current) pendingRef.current = null
      // 連續命中 → 確認（防單幀誤判）
      const h = hitsRef.current
      if (m?.ok) {
        h.n = h.id === m.ref.id ? h.n + 1 : 1; h.id = m.ref.id
        if (h.n >= HITS_NEEDED) {
          setFound({ name: m.ref.name, score: m.score, thumb: m.ref.thumb })
          h.id = null; h.n = 0
        }
      } else { h.id = null; h.n = 0 }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [status])

  // ---- 登錄目前畫面為明信片 ----
  const register = () => {
    const frame = grabFrame()
    if (!frame) { setToast('鏡頭尚未就緒'); return }
    if (refs.length >= MAX_REFS) { setToast(`最多登錄 ${MAX_REFS} 張，請先刪除舊的`); return }
    // 中央視窗簽名作為參考
    const cx = (GRAB_W - WIN_W) >> 1, cy = (GRAB_H - WIN_H) >> 1
    const sig = makeSignature(cropRgba(frame.data, GRAB_W, GRAB_H, cx, cy, WIN_W, WIN_H), WIN_W, WIN_H)
    if (sig.sharp < 25) { setToast('畫面太模糊，請對穩後再登錄'); return }
    // 避免重複登錄同一張
    const dup = refs.find(r => matchScore(sig, r) >= 90)
    if (dup) { setToast(`這張看起來已登錄過（${dup.name}）`); return }
    // 縮圖（120×90 JPEG，只存本機）
    const tv = document.createElement('canvas')
    tv.width = 120; tv.height = 90
    tv.getContext('2d').drawImage(videoRef.current, 0, 0, 120, 90)
    const thumb = tv.toDataURL('image/jpeg', 0.6)
    // 流水號取現存名稱最大值 +1（刪除舊卡後不會重名）
    const serial = refs.reduce((mx, r) => Math.max(mx, Number((r.name.match(/(\d+)\s*$/) || [])[1]) || 0), 0) + 1
    const ref = { id: `pc-${Date.now()}`, name: `明信片 ${serial}`, thumb, hash: sig.hash, hist: sig.hist }
    const next = [...refs, ref]
    if (!saveRefs(next)) { setToast('儲存空間不足，請刪除舊明信片'); return }
    setRefs(next)
    // 剛登錄的卡片還在框內：重置命中並要求先離場，避免立刻自動彈出成功 sheet
    hitsRef.current = { id: null, n: 0 }
    pendingRef.current = ref.id
    // 原地確認：新 chip 閃爍＋捲入視野
    setLastAdded(ref.id)
    setTimeout(() => setLastAdded(v => (v === ref.id ? null : v)), 1400)
    requestAnimationFrame(() => document.getElementById(ref.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    setToast(`已登錄「${ref.name}」，移開再對回來就會自動辨識`)
  }

  // 兩段式刪除：第一次點 ✕ 武裝（變朱紅），2.5 秒內再點一次才真的刪
  const askRemove = (r) => {
    if (armId === r.id) {
      clearTimeout(armTimer.current)
      setArmId(null)
      if (pendingRef.current === r.id) pendingRef.current = null
      const next = refs.filter(x => x.id !== r.id)
      setRefs(next); saveRefs(next)
      setToast(`已刪除「${r.name}」`)
    } else {
      setArmId(r.id)
      setToast('再按一次 ✕ 確認刪除')
      clearTimeout(armTimer.current)
      armTimer.current = setTimeout(() => setArmId(null), 2500)
    }
  }
  useEffect(() => () => clearTimeout(armTimer.current), [])

  const resume = () => { setFound(null); setLive(null) }

  // 辨識成功 sheet：dialog 焦點管理 + Esc 關閉
  useEffect(() => {
    if (!found) return
    prevFocus.current = document.activeElement
    sheetRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') resume() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prevFocus.current?.focus?.()
    }
  }, [found])

  const d = dayFor(0)   // 辨識成功 → 帶出今日曆頁內容（示範 payload）
  const tracking = live && live.score >= MIN_SCORE

  // 離散階段（aria-live 只在階段/名稱變化時播報；分數本身 aria-hidden 防 300ms 播報轟炸）
  const phaseText = status !== 'ready' ? '　'
    : !refs.length ? (blurry
        ? '尚未登錄明信片——畫面有點模糊，請對穩、靠近一點再登錄'
        : '尚未登錄明信片——把明信片放進框內，按下方「登錄這張明信片」')
    : blurry ? '畫面有點模糊，請對穩、靠近一點'
    : tracking ? `已對準：${live.name}`
    : live ? '比對中…'
    : '掃描中——把登錄過的明信片放進框內'

  return (
    <>
      <TopBar title="掃描明信片" onBack />
      <div className="body scan-body">
        <div className="scan-stage">
          {status === 'ready' && <video ref={videoRef} className="scan-video" autoPlay playsInline muted />}
          {status !== 'ready' && (
            <div className="scan-fallback">
              <Icon name="camera" style={{ width: 46, height: 46, stroke: 'var(--pfg)' }} />
              <p>
                {status === 'loading' && '正在開啟鏡頭…'}
                {status === 'denied' && '尚未允許使用相機。請在瀏覽器允許相機權限後再試。'}
                {status === 'unsupported' && '此裝置或環境無法使用相機（需 HTTPS 與相機硬體）。'}
              </p>
            </div>
          )}
          <div className={`scan-frame ${tracking ? 'hit' : ''}`} aria-hidden="true">
            <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
            {status === 'ready' && !found && <div className="scan-line" />}
          </div>
        </div>

        {/* 即時狀態列 */}
        <div className="scan-status">
          <span aria-live="polite">{phaseText}</span>
          {live && !blurry && refs.length > 0 && (
            <span aria-hidden="true">　最高相似 <b>{live.score}%</b></span>
          )}
        </div>

        <div className="scan-acts">
          <button className="btn-primary tap" onClick={register} disabled={status !== 'ready' || !!found}
            style={status !== 'ready' ? { opacity: .55 } : null}>
            <Icon name="scan" style={{ width: 18, height: 18, stroke: 'var(--pfg)', verticalAlign: '-3px', marginRight: 6 }} />登錄這張明信片
          </button>
          <p className="muted scan-soon">
            辨識引擎為自研演算（感知雜湊＋色彩直方圖），全程在你的裝置上運算、影像不上傳。
            先「登錄」一張明信片，之後鏡頭一對到它就會自動辨識；正式版將以登錄檔庫直接內建官方明信片。
          </p>
        </div>

        {/* 已登錄明信片（放在按鈕之後：登錄時按鈕不跳位） */}
        {refs.length > 0 && (
          <div className="scan-refs">
            {refs.map(r => (
              <div key={r.id} id={r.id} className={`scan-refchip ${r.id === lastAdded ? 'just-added' : ''}`}>
                <img src={r.thumb} alt={r.name} />
                <div className="nm">{r.name}</div>
                <button className={`del tap ${armId === r.id ? 'arm' : ''}`}
                  aria-label={armId === r.id ? `再按一次確認刪除 ${r.name}` : `刪除 ${r.name}`}
                  onClick={() => askRemove(r)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 辨識成功 */}
      {/* ⚠️ .sheet 不可用 inline maxHeight/paddingBottom 覆寫——會蓋掉樣式表的
          min(82dvh, 100dvh-48px) 與 env(safe-area-inset-bottom)：手機橫向
          （390px 視窗）時貼底會超出，iOS home indicator 也會壓住最後一列。 */}
      {found && (
        <div className="sheet-mask" onClick={resume}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={`已辨識 ${found.name}`}
            tabIndex={-1} ref={sheetRef}
            onClick={e => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="scanres">
              <div className="okmark">✓</div>
              <h3>已辨識：{found.name}</h3>
              <div className="muted" style={{ fontSize: 12 }}>匹配度 {found.score}%（自研辨識）</div>
              {found.thumb && <img src={found.thumb} alt={found.name} />}
              <div className="scanres-day">
                <b>{d.solar}・{d.term}・{d.ganzhi}</b>
                <div className="yj">
                  <span>宜</span>{d.yi.slice(0, 3).map(t => <i key={t} className="ty">{t}</i>)}
                  <span className="jj">忌</span>{d.ji.slice(0, 2).map(t => <i key={t} className="tn">{t}</i>)}
                </div>
              </div>
              <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.7 }}>🔮 AR 節氣動畫與語音祝福即將推出——屆時掃描這張明信片就會在畫面上播放。</p>
              <button className="btn-primary tap" onClick={resume}>再掃一次</button>
              <button className="btn-ghost tap" style={{ marginTop: 8 }} onClick={pop}>完成</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
