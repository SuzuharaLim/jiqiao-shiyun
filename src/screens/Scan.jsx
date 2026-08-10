import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead, Link } from '../components/ui.jsx'
import { pickMainCameraId } from '../lib/arCamera.js'
import { OFFICIAL_CARDS, objectForHotspot } from '../data/arCards.js'
import SpeakButton from '../components/SpeakButton.jsx'

// ============================================================================
// AR 掃描 —— MindAR 官方 three.js 整合（MindARThree）
//
// 依 https://hiukim.github.io/mind-ar-js-doc/more-examples/threejs-image。
// 這一頁**不再自己開相機、不自己抓影格、不自己算姿態**：
// video／renderer／camera／anchor 變換全部由 MindARThree 管，我們只負責
// 「把角色掛到 anchor 上」與「把命中的熱區變成畫面上的內容」。
//
// ⚠️ 因此這裡**不可以再出現 getUserMedia**。MindARThree 自己會開一路相機，
//    再開第二路在部分 Android 上會直接失敗，而且白吃一份電。
//
// 先前那套（自研四角偵測＋dHash＋CSS matrix3d 疊加＋另一個 WebGL canvas 放角色）
// 已經停用。相關模組（arTracker／quadDetect／homography／features／ARScene／
// ARCharacter）仍在 repo 裡沒有刪除，但**這一頁不再引用它們**。
// ============================================================================

const CARD = OFFICIAL_CARDS[0] ?? null

/**
 * 目標檔是否真的存在。
 * ⚠️ 只看 `res.ok` 不夠：檔案不存在時 SPA fallback 會回 **200 + index.html**，
 *    MindAR 拿到那份 HTML 只會丟一個看起來像「檔案壞掉」的錯，而真正的原因是
 *    「路徑不對／沒放檔案」。要檢查 content-type。
 * ⚠️ 也不可用 `cache:'force-cache'`：那會把那份 HTML 存起來，之後補上圖也永遠拿到 HTML。
 */
async function mindFileExists(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    return !ct.includes('text/html')
  } catch { return false }
}

/**
 * 盡力挑出「主鏡頭」的 deviceId，避開超廣角。
 *
 * ⚠️ 這是**盡力而為**：`enumerateDevices()` 在還沒拿到相機權限時 label 是空字串，
 *    猜不出來就回 null 讓 MindARThree 走 facingMode。
 * ⚠️ 刻意**不**為了讀 label 而先開一次相機再關掉：那會多一次開關相機的循環
 *    （數百毫秒，且部分 Android 快速重開會失敗），代價比收益大。
 *    第二次以後進這一頁時權限已在，label 讀得到，自然就避開超廣角了。
 * 理由：主鏡頭的 ISP 會先做畸變校正、殘留很小；超廣角不會（k1 常在 −0.25~−0.4），
 *      而實測 k1 −0.07 之後辨識率直接掉到 0。
 */
async function guessMainCameraId() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return null
    const devices = await navigator.mediaDevices.enumerateDevices()
    return pickMainCameraId(devices)
  } catch { return null }
}

export default function Scan() {
  const stageRef = useRef(null)
  const sceneRef = useRef(null)
  // loading | ready | denied | unsupported | nofile
  const [status, setStatus] = useState('loading')
  const [tracking, setTracking] = useState(false)
  const [hotspot, setHotspot] = useState(null)
  const [showDiag, setShowDiag] = useState(false)
  const [diag, setDiag] = useState(null)
  // ★★ 「相機開了但比對根本沒在跑」的偵測。null＝正常；'csp'＝抓到 CSP 擋掉；
  //    'quiet'＝沒抓到明確原因，但心跳是 0。
  const [stall, setStall] = useState(null)
  // 有沒有看到「blob worker 被 CSP 擋掉」。⚠️ 這**本身不代表壞了**——見下方說明。
  const cspBlockedRef = useRef(false)

  // ── ★★★ 把靜默失敗變成看得見的診斷 ──
  //
  // 2026-08-10 實測踩到：CSP 沒放行 `blob:` 的 Web Worker 時，MindAR 的比對
  // 永遠不會執行——而**畫面上完全看不出來**（相機正常、掃描線在動、.mind 載入了、
  // 診斷面板每一欄都正常）。使用者只會一直換角度重試，而那永遠不會成功。
  // ⚠️ 而且這個問題**只在正式站出現**（dev server 不送 CSP），所以不能指望
  //    開發時會發現。頁面必須自己講出來。
  useEffect(() => {
    // `securitypolicyviolation` 是**確定性**訊號（不是推論）：直接說出哪一條被擋。
    const onViolation = (e) => {
      const uri = e.blockedURI || ''
      const dir = e.violatedDirective || ''
      // ⚠️ `blockedURI` 是 **`'blob'`（沒有冒號）**，不是完整的 `blob:` 網址——
      //    Chrome 對不透明來源只回報 scheme。我第一版寫 `startsWith('blob:')`，
      //    於是實測時看門狗只跳出泛用的那一則，抓不到真正的原因。
      //    （這也說明「診斷本身一定要實際觸發過一次」。）
      // ⚠️ 只認 worker/child 那組。同一頁還會出現 `wasm-eval` 被 script-src 擋下的
      //    事件，但那個**不致命**（TFJS 會退回 WebGL），拿它跳「AR 壞了」是誤報。
      // ★★★ 只**記下來**，不直接判定失敗。
      // ⚠️ 這一版把比對 worker 換成同源的（見 mindarThree 的 _useSameOriginWorker），
      //    所以「內建的 blob worker 被擋」已經**不代表 AR 壞了**——實測 CSP 完全
      //    拿掉時仍然追得到（狀態列「已對準」）。若照舊直接跳「AR 壞了」就是**誤報**，
      //    而誤報比不報更糟：使用者會去追一個根本不存在的問題。
      //    真正的判準只有一個：**心跳是不是 0**。這個旗標只用來在真的壞掉時
      //    把原因講得更精確。
      if (/^blob/.test(uri) && /worker-src|child-src/.test(dir)) cspBlockedRef.current = true
    }
    document.addEventListener('securitypolicyviolation', onViolation)
    return () => document.removeEventListener('securitypolicyviolation', onViolation)
  }, [])

  useEffect(() => {
    if (status !== 'ready') return
    // 心跳看門狗：追蹤開始後心跳仍是 0 → 比對沒在跑（原因未必是 CSP，但一定不是「沒對準」）。
    // ⚠️ 要給足暖機時間：dummyRun 約 1.2 秒，再加第一批影格。
    const t = setTimeout(() => {
      // ★ 唯一的失敗判準是「心跳是 0」。CSP 違規只用來**分類原因**，不用來判定失敗。
      if ((sceneRef.current?.ticks?.() ?? 0) > 0) return
      setStall(cspBlockedRef.current ? 'csp' : 'quiet')
    }, 8000)
    return () => clearTimeout(t)
  }, [status])

  // ⚠️ getUserMedia 在某些環境**既不 resolve 也不 reject**（權限提示一直開著、
  //    或裝置被別的程式佔用），這一頁就會永遠停在「正在開啟鏡頭…」。
  //    不改 status（那會在使用者正要按「允許」時謊報失敗），只在等太久之後多給一條出路。
  const [slowCamera, setSlowCamera] = useState(false)
  useEffect(() => {
    if (status !== 'loading') { setSlowCamera(false); return }
    const t = setTimeout(() => setSlowCamera(true), 4000)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    const host = stageRef.current
    if (!host || !CARD?.mindTarget) { setStatus('nofile'); return }

    let cancelled = false
    let scene = null

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return }

      // ⚠️ 先確認目標檔在不在。少了這一步，缺檔的症狀會是「相機開了、掃了沒反應」
      //    ——與「沒對準／光線不夠」一模一樣，使用者會一直換角度重試。
      if (!(await mindFileExists(CARD.mindTarget))) {
        if (!cancelled) setStatus('nofile')
        return
      }
      if (cancelled) return

      const deviceId = await guessMainCameraId()
      if (cancelled) return

      try {
        // ⚠️ 動態 import：mindScene 會連帶拉進 three ＋ MindAR 的 TFJS controller
        //    （約 2 MB）。靜態 import 會把它打進主 bundle，首頁就得為一個
        //    多數人不會點的功能背這個重量。
        const { createMindScene } = await import('../lib/mindScene.js')
        if (cancelled) return
        scene = await createMindScene({
          container: host,
          mindUrl: CARD.mindTarget,
          card: CARD,
          deviceId,
          // AR 要與追蹤共用 CPU/GPU：lod 0.6 ＋ 只描一層邊 ＝ draw call 87、三角形 75,274
          lod: 0.6, outlineLayers: 1,
          onFound: () => { if (!cancelled) setTracking(true) },
          onLost: () => { if (!cancelled) { setTracking(false); setHotspot(null) } },
          onHotspot: (hs) => { if (!cancelled) setHotspot(hs) },
        })
        if (cancelled) { scene.dispose(); return }
        sceneRef.current = scene
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        // ⚠️ 載入失敗要留下紀錄：靜默退回會讓人完全查不到原因。
        console.error('[AR] MindAR 啟動失敗', err)
        const name = err?.name || ''
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
          : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'unsupported'
            : 'denied')
      }
    })()

    return () => {
      cancelled = true
      // ⚠️ 一定要 dispose：它會關掉相機軌道（否則離開這一頁指示燈還亮著）
      //    並釋放 WebGL context（否則反覆進出會「第 N 次打開變成空白」）。
      try { (sceneRef.current ?? scene)?.dispose() } catch { /* ignore */ }
      sceneRef.current = null
    }
  }, [])

  // 診斷資料：只在打開面板時取樣，而且只放**量得準**的觀測值。
  // ⚠️ 這一版刻意不再顯示「比對分數」與「找到四邊形」——MindAR 是 inlier 式判定，
  //    沒有相似度可言，也不走四角偵測。留著舊欄位等於顯示一個永遠是「—」的表，
  //    比不顯示更讓人以為壞了。
  useEffect(() => {
    if (!showDiag) return
    const tick = () => {
      const s = sceneRef.current
      if (!s) { setDiag(null); return }
      const v = s.mindar.video
      const trackEl = v?.srcObject?.getVideoTracks?.()[0]
      setDiag({
        camera: trackEl?.label || '（未授權時看不到名稱）',
        res: v ? `${v.videoWidth}×${v.videoHeight}` : '—',
        target: s.mindar.imageTargetDimensions?.[0]?.join(' × ') ?? '—',
        hw: s.hw?.toFixed(3) ?? '—',
        visible: s.anchor?.visible ? '是' : '否',
        hotspot: hotspot?.label ?? '—',
      })
    }
    tick()
    const t = setInterval(tick, 700)
    return () => clearInterval(t)
  }, [showDiag, hotspot])

  // 點卡面上的物件就選它。
  // ⚠️ 不能只靠「畫面中心瞄準」：白菜在卡片最左（x 0.058~0.214），
  //    要讓它落在畫面中心就得把整張卡擺到畫面右側又不能出框——做不到。
  // ⚠️ 用 onPointerDown 不用 onClick：手持時手指會微移，click 需要 down/up
  //    落在同一點附近，容易漏掉。
  const onStageTap = (e) => {
    const s = sceneRef.current
    if (!s) return
    const hs = s.pick(e.clientX, e.clientY)
    // ⚠️ 點到卡片以外時**不清掉現有選擇**：手持會抖，誤觸空白處就把內容關掉
    //    會讓人以為壞了。
    if (hs) s.forceHotspot(hs)
  }

  const phaseText = status === 'nofile'
    ? '目標檔尚未安裝——這一頁目前掃不到任何卡片'
    : status !== 'ready' ? '　'
      : tracking ? `已對準：${CARD.title}——點卡面上的物件可以換內容`
        : '掃描中——把卡片放進框內（不必對齊四個角）'

  return (
    <>
      <TopBar title="AR 掃描｜卡片一入鏡就跳出內容" onBack />
      <div className="body scan-body">
        {/* ⚠️ MindARThree 會把 <video> 與 <canvas> 直接塞進這個容器（position:absolute），
            所以它必須是 position:relative、overflow:hidden 且有明確大小
            ——`.scan-stage` 本來就是。 */}
        <div className="scan-stage" ref={stageRef} onPointerDown={tracking ? onStageTap : undefined}>
          {status !== 'ready' && (
            <div className="scan-fallback">
              <Icon name="camera" style={{ width: 46, height: 46, stroke: 'var(--pfg)' }} />
              <p>
                {status === 'loading' && '正在開啟鏡頭…'}
                {status === 'denied' && '尚未允許使用相機。請在瀏覽器允許相機權限後再試。'}
                {status === 'unsupported' && '這台裝置沒有相機，或這個環境不允許使用（需 HTTPS）。'}
                {status === 'nofile' && '目標檔尚未安裝，掃描不會有任何反應。'}
              </p>
              {/* ── 不要讓這裡變成死路 ──
                  ⚠️ 桌機、拒絕權限、或 getUserMedia 一直不回應時，這一頁原本
                     只有一行字：沒有相機的人到這裡就走不下去了。
                  ⚠️ 但也**不自動導走**：`denied` 常常只是還沒按「允許」，
                     把人直接送去別的頁面等於替他放棄那條路。給出路、讓他選。
                  ⚠️ `loading` 要等一下才顯示：一開就跳出「沒有相機？」會讓正在
                     看權限提示的人以為已經失敗了。 */}
              {(status !== 'loading' || slowCamera) && CARD && (
                <div className="scan-fallback-out">
                  {status === 'loading' && <p className="muted">還在等相機權限。沒有相機的話：</p>}
                  <Link screen="arCard" params={{ slug: CARD.slug }} className="btn-primary tap">
                    沒有相機？看示範內容 ›
                  </Link>
                  <p className="muted">
                    那一頁不用相機也能走完：卡面、六個物件、3D 白菜、小挑戰、徽章都在。
                  </p>
                </div>
              )}
            </div>
          )}
          <div className={`scan-frame ${tracking ? 'hit' : ''}`} aria-hidden="true">
            <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
            {status === 'ready' && !tracking && <div className="scan-line" />}
          </div>
        </div>

        <div className="scan-status">
          <span aria-live="polite">{phaseText}</span>
        </div>

        {/* ── 命中卡面熱區：跳出那個物件的內容 ── */}
        {hotspot && (() => {
          const obj = objectForHotspot(hotspot)
          if (!obj) return null
          return (
            <div className="scan-hit ui-enter">
              <div className="scan-hit-hd">
                <b>{obj.name}</b>
                <span className="muted">{CARD?.title}</span>
              </div>
              {obj.line && <p className="scan-hit-line">{obj.line}</p>}
              {obj.facts?.length > 0 && (
                <dl className="scan-hit-facts">
                  {obj.facts.map(f => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}{f.source && <i className="muted">（{f.source}）</i>}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {obj.warn && <p className="scan-hit-warn">{obj.warn}</p>}
              {/* 語音導覽：這裡才是它真正的使用情境——手上拿著卡、眼睛盯著卡面。
                  ⚠️ 換熱區時上一段一定要停（SpeakButton 依 obj.id 自己處理），
                     否則使用者瞄準白菜卻聽到臘八粥。 */}
              <SpeakButton obj={obj} className="scan-hit-speak" />
              {obj.link && (
                <Link screen={obj.link.screen} params={obj.link.props} className="btn-ghost tap">
                  {obj.link.label} ›
                </Link>
              )}
            </div>
          )
        })()}

        {/* ── ★★★ 比對根本沒在跑：這是最惡毒的一種失敗，畫面上完全看不出來 ── */}
        {stall && status === 'ready' && (
          <div className="scan-nofile">
            <b>相機開起來了，但比對程序沒有在執行——這不是沒對準。</b>
            {stall === 'csp' ? (
              <>
                <p>
                  瀏覽器回報：本站的<b>內容安全政策（CSP）</b>擋掉了從
                  <code>blob:</code> 建立的 Web Worker。AR 的比對就跑在那個 worker 裡，
                  被擋掉之後它<b>永遠不會回應</b>，所以再怎麼喬角度都不會認出卡片。
                </p>
                <p>
                  <b>解法（伺服器設定，不是使用者能處理的）：</b>
                  <code>server/index.js</code> 的 helmet CSP 要有
                  <code>workerSrc: ["'self'", 'blob:']</code> 與同值的 <code>childSrc</code>，
                  然後<b>重新部署</b>。⚠️ 只改程式碼不重新部署不會生效——CSP 是伺服器送的標頭。
                </p>
              </>
            ) : (
              <p>
                追蹤的處理迴圈啟動後<b>一輪都沒有跑完</b>。常見原因是瀏覽器擋掉了
                Web Worker 或 WebGL，或這台裝置的資源不足。
                請打開下方「掃描診斷」把畫面截給我們，那比描述症狀有用得多。
              </p>
            )}
            <p className="muted">
              這個提示存在的理由：這種失敗<b>看起來完全正常</b>——相機在動、掃描線在跑、
              目標檔也載入了。不主動講出來的話，只會讓人以為是自己沒對準。
            </p>
          </div>
        )}

        {/* ── 目標檔沒裝：這種失敗是靜默的，一定要主動講出來 ── */}
        {status === 'nofile' && (
          <div className="scan-nofile">
            <b>目標檔尚未安裝，所以掃描不會有任何反應。</b>
            <p>
              追蹤器需要一份 <code>.mind</code>（從卡面圖編譯出來的特徵資料）才能比對。
              目前 <code>{CARD?.mindTarget}</code> 取不到，等於沒有可比對的目標——
              相機會開，但永遠不會認出卡片，也不會跳出白菜。
            </p>
            <p>
              <b>解法：</b>用 <code>npm run card:mind -- 卡面稿.png</code> 編譯，
              產出的檔案會自動放到 <code>public/ar/targets/</code>，重新整理即可。
            </p>
          </div>
        )}

        {/* ── 現場診斷 ── */}
        <div className="scan-diag">
          <button className="btn-ghost tap" onClick={() => setShowDiag(v => !v)} aria-expanded={showDiag}>
            {showDiag ? '關閉' : '打開'}掃描診斷
          </button>
          {showDiag && (
            <div className="scan-diag-box">
              {!diag && <p className="muted">尚未啟動追蹤。</p>}
              {diag && (
                <dl className="scan-diag-kv">
                  <div><dt>鏡頭</dt><dd>{diag.camera}</dd></div>
                  <div><dt>解析度</dt><dd>{diag.res}</dd></div>
                  <div><dt>目標圖尺寸</dt><dd>{diag.target}</dd></div>
                  <div><dt>卡片高寬比</dt><dd>{diag.hw}</dd></div>
                  <div><dt>目前追到</dt><dd>{diag.visible}</dd></div>
                  <div><dt>命中熱區</dt><dd>{diag.hotspot}</dd></div>
                </dl>
              )}
              <p className="muted" style={{ fontSize: 'var(--text-2xs)' }}>
                追蹤由 MindAR 的特徵點比對負責，沒有「相似度分數」可以顯示
                （它是 inlier 式判定：追到就是追到）。
              </p>
            </div>
          )}
        </div>

        {/* ── 官方卡片 ── */}
        <div className="scan-official">
          <SectionHead title="官方節氣卡片" />
          {OFFICIAL_CARDS.map(c => (
            <div key={c.id} className={`scan-card${tracking && c.id === CARD?.id ? ' on' : ''}`}>
              <div className="scan-card-hd">
                <b>{c.title}</b>
                <span className="muted">{c.subtitle}</span>
                {tracking && c.id === CARD?.id && <span className="scan-card-live">正在掃描中</span>}
              </div>
              <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                拿這張卡對著鏡頭就會跳出內容；點卡面上的物件可以換內容。
              </p>
              <div className="scan-card-spots">
                {c.hotspots.map(h => (
                  <span key={h.id} className={`chip${hotspot?.id === h.id ? ' on' : ''}`}>{h.label}</span>
                ))}
              </div>
              <Link screen="arCard" params={{ slug: c.slug }} className="btn-ghost tap">
                沒有實體卡？看這張卡的完整內容 ›
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
