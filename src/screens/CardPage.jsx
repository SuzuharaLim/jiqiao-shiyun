import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { TopBar, SectionHead, Link, Breadcrumb, Disclaimer } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import AnimatedText from '../components/AnimatedText.jsx'
import { useNav } from '../store/nav.jsx'
import { cardBySlug, objectForHotspot } from '../data/arCards.js'
import { cachedPoster } from '../lib/arCardRegistry.js'
import { earnBadge, hasBadge, BADGES } from '../lib/arBadges.js'
import SpeakButton from '../components/SpeakButton.jsx'

// ============================================================================
// /ar/card/:slug —— 不用相機也能走完整條動線
//
// 三個用途，一頁兼顧：
//   ① **降級路徑**：桌機、拒絕相機權限、getUserMedia 失敗時的去處（改版文件 §5.4）
//   ② **可索引的內容頁**：`/AR` 是 noindex，這頁允許索引才吃得到搜尋流量
//   ③ **熱區校對工具**：熱區框直接畫在卡面上，用眼睛就能看出有沒有對齊
//      （rect 是人工標註的，標錯不會拋錯，只會讓使用者點不到東西）
//
// ⚠️ 熱區一定要是真的 `<button>`：改版文件 §8 #14 要求 fallback 模式全鍵盤可操作。
//    用 div + onClick 的話 Tab 走不到、螢幕閱讀器也唸不出來。
//
// ⚠️ 3D 舞台走 React.lazy：three 有 ~137KB gzip，不點就不該下載。
// ============================================================================
const ProduceStage = lazy(() => import('../components/ProduceStage.jsx'))

export default function CardPage({ slug }) {
  const { user } = useNav()
  const card = cardBySlug(slug)
  const [hotId, setHotId] = useState(null)
  const [poster, setPoster] = useState(null)
  const [showBox, setShowBox] = useState(false)   // 校對模式：把 rect 數值標出來
  const [want3d, setWant3d] = useState(false)

  // 卡面圖：優先用官方目標圖的靜態路徑，其次才是 localStorage 的縮圖快取。
  //
  // ⚠️ 原本只讀 `cachedPoster()`，而那份快取是**進過 /AR 才會產生**的。
  //    於是目標圖明明已經裝在 public/ar/targets/ 底下、瀏覽器一個 GET 就拿得到，
  //    這一頁卻顯示「卡面圖尚未上傳」——而這頁有三個用途都需要那張圖：
  //    ①桌機／拒絕相機權限的降級路徑 ②可被索引的內容頁 ③**熱區校對工具**。
  //    校對頁看不到卡面，等於最需要它的那個用途直接失效。
  //    （從搜尋結果直接進來的人更是永遠不會有那份快取。）
  //
  // ⚠️ 順序不可顛倒：快取是 900px 縮圖，靜態檔是原尺寸。校對要看得清楚。
  //    但快取仍要留著——美術用 `bindLocalTarget` 指定本機圖時只有快取有那一版。
  useEffect(() => {
    if (!card) return
    setPoster(null)
    let cancelled = false
    // 先確認靜態檔真的是圖片：檔案不存在時 SPA fallback 會回 200 + index.html
    // （這個坑在 arCardRegistry 記過：「檔案不存在」會偽裝成「圖片壞掉」）
    fetch(card.target, { method: 'GET' })
      .then(r => (r.ok && (r.headers.get('content-type') || '').startsWith('image/')
        ? card.target : null))
      .catch(() => null)
      .then(url => { if (!cancelled) setPoster(url || cachedPoster(card.id)) })
    return () => { cancelled = true }
  }, [card])

  // 預設選中主物件——進頁就有東西看，不必先猜要點哪裡
  useEffect(() => {
    if (card && !hotId) setHotId(card.hotspots.find(h => h.primary)?.id ?? null)
  }, [card, hotId])

  if (!card) {
    return (
      <>
        <TopBar title="找不到這張卡片" />
        <div className="body">
          <div className="empty">
            <p>沒有這張節氣卡片。</p>
            <Link screen="scan" className="btn-primary tap">回 AR 掃描</Link>
          </div>
        </div>
      </>
    )
  }

  const hot = card.hotspots.find(h => h.id === hotId) ?? null
  const obj = objectForHotspot(hot)

  return (
    <>
      <TopBar title={card.title} />
      <div className="body">
        <Breadcrumb items={[
          { label: 'AR 掃描', screen: 'scan' },
          { label: card.title },
        ]} />

        <h1 className="cardp-h1">{card.title}　<small>{card.subtitle}</small></h1>
        <p className="muted cardp-lead">
          沒有實體卡片也能看：點卡面上任一個標記，就會跳出那個物件的內容。
          有卡片的話到 <Link screen="scan">AR 掃描</Link> 用鏡頭對著它。
        </p>

        {/* ── 卡面 ＋ 熱區 ── */}
        <div className={`cardp-stage${showBox ? ' calib' : ''}`}
          style={{ aspectRatio: `${card.sizeMM[0]} / ${card.sizeMM[1]}` }}>
          {poster
            ? <img className="cardp-img" src={poster} alt={`${card.title} 節氣明信片卡面`} />
            : (
              // ⚠️ 沒有卡面圖時不可假裝有：畫一個空的比例框並說明原因，
              //    熱區位置仍然標得出來（校對比例還是有用的）。
              <div className="cardp-noimg">
                <p>卡面圖尚未安裝</p>
                <p className="muted">
                  把付印的那一版跑 <code>npm run card:install -- 稿.png</code>，
                  圖會裝進 <code>public{card.target}</code>，這裡與 AR 掃描就都有卡面了。
                  在那之前熱區位置仍可校對（下方的框是按比例畫的）。
                </p>
              </div>
            )}
          {card.hotspots.map(h => (
            <button
              key={h.id}
              className={`cardp-hot${h.id === hotId ? ' on' : ''}${h.primary ? ' primary' : ''}`}
              style={{
                left: `${h.rect.x * 100}%`, top: `${h.rect.y * 100}%`,
                width: `${h.rect.w * 100}%`, height: `${h.rect.h * 100}%`,
              }}
              onClick={() => { setHotId(h.id); setWant3d(false) }}
              aria-pressed={h.id === hotId}
              aria-label={`${h.label}${h.hint ? '——' + h.hint : ''}`}
            >
              <span className="cardp-dot" aria-hidden="true" />
              <span className="cardp-tag">{h.label}</span>
              {showBox && (
                <span className="cardp-num" aria-hidden="true">
                  {h.rect.x.toFixed(3)}, {h.rect.y.toFixed(3)}<br />
                  {h.rect.w.toFixed(3)} × {h.rect.h.toFixed(3)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="cardp-tools">
          <button className="btn-ghost tap" onClick={() => setShowBox(v => !v)}>
            {showBox ? '關閉' : '開啟'}熱區校對（顯示座標）
          </button>
        </div>

        {/* ── 命中的物件 ── */}
        {obj && (
          <div className="cardp-obj" key={obj.id}>
            <SectionHead title={obj.name} />
            {/* 吉祥物對話框：打字機。⚠️ AnimatedText 的 typewriter 自己讀
                reduce-motion（CSS 的全域 animation 覆寫碰不到 setInterval）。 */}
            {obj.line && (
              <p className="ps-say cardp-line">
                <AnimatedText text={obj.line} fx="typewriter" />
              </p>
            )}

            {/* 有 3D 模型的物件才給按鈕。⚠️ 不點不下載 three。 */}
            {obj.model && (
              want3d
                ? (
                  <Suspense fallback={<div className="ui-skeleton" style={{ height: 320 }} />}>
                    {/* 標籤用**已經查證過的** facts 標題（品種／產地／節氣俗語），
                        ⚠️ 不是營養素——那要等食藥署核對（見 arCards.js 的說明）。 */}
                    <ProduceStage
                      action="present" height={320}
                      labels={(obj.facts ?? []).map(f => ({ key: f.label, label: f.label }))}
                    />
                  </Suspense>
                )
                : (
                  <button className="btn-primary tap" onClick={() => setWant3d(true)}>
                    <Icon name="sparkle" style={{ width: 18, height: 18, stroke: 'var(--pfg)', verticalAlign: '-3px', marginRight: 6 }} />
                    看 3D 的{obj.name}
                  </button>
                )
            )}

            {obj.facts?.length > 0 && (
              <dl className="cardp-facts">
                {obj.facts.map(f => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}{f.source && <i>（{f.source}）</i>}</dd>
                  </div>
                ))}
              </dl>
            )}
            {obj.warn && <p className="cardp-warn">{obj.warn}</p>}

            {/* 語音導覽：拿著實體卡的時候低頭讀螢幕很彆扭，用聽的比較順。
                ⚠️ 這是**輔助**不是替代——上面該有的字一個都沒少。 */}
            <SpeakButton obj={obj} />
            {obj.quiz && (
              <Quiz quiz={obj.quiz} loggedIn={!!user && !user.guest}
                term={card.term}
                // 圖卡上那句話用**有出處**的 fact，不用 quiz 的解說
                fact={obj.facts?.find(f => f.source) ?? obj.facts?.[0]} />
            )}
            {obj.link && (
              <Link screen={obj.link.screen} props={obj.link.props} className="btn-ghost tap cardp-more">
                {obj.link.label} ›
              </Link>
            )}
          </div>
        )}

        <Disclaimer>
          卡面的節氣、農曆與交節日期由站內天文演算逐日產生；品種與產地引用農業部開放資料。
          本頁不提供營養素數值與健康宣稱。
        </Disclaimer>
      </div>
    </>
  )
}

/**
 * 小挑戰（多選）。
 * ⚠️ 答錯不扣分、不鎖、不記次數（改版文件 §5.3 第 7 點）——這是教育內容不是考試，
 *    鎖住重試只會讓人關掉頁面。
 */
function Quiz({ quiz, loggedIn, term, fact }) {
  const [picked, setPicked] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [fresh, setFresh] = useState(false)
  const liveRef = useRef(null)

  const correctKeys = useMemo(
    () => quiz.options.filter(o => o.correct).map(o => o.key).sort().join(','), [quiz])
  const allRight = submitted && [...picked].sort().join(',') === correctKeys

  const toggle = (k) => {
    if (submitted) { setSubmitted(false) }
    setPicked(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]))
  }
  const submit = () => {
    setSubmitted(true)
    const ok = [...picked].sort().join(',') === correctKeys
    if (ok && quiz.badge) setFresh(earnBadge(quiz.badge, { loggedIn }))
  }

  const owned = quiz.badge ? hasBadge(quiz.badge) : false

  return (
    <div className="cardp-quiz">
      <SectionHead title="小挑戰" />
      <p className="cardp-q">{quiz.question}</p>
      <div className="cardp-opts">
        {quiz.options.map(o => {
          const on = picked.includes(o.key)
          // 送出後才標對錯：作答中就標紅等於直接給答案
          const mark = submitted
            ? (o.correct && on ? ' right' : (!o.correct && on ? ' wrong' : (o.correct ? ' missed' : '')))
            : ''
          return (
            <button key={o.key} className={`cardp-opt${on ? ' on' : ''}${mark}`}
              onClick={() => toggle(o.key)} aria-pressed={on}>
              {o.label}
            </button>
          )
        })}
      </div>
      <button className="btn-primary tap" onClick={submit} disabled={!picked.length}
        style={!picked.length ? { opacity: .55 } : null}>
        送出答案
      </button>
      <div aria-live="polite" ref={liveRef}>
        {submitted && allRight && (
          <div className="cardp-win">
            <b>答對了！</b>
            {quiz.badge && (
              <p>
                {fresh ? '獲得節氣徽章：' : '你已經有這枚徽章：'}
                <b>{BADGES[quiz.badge]?.name ?? quiz.badge}</b>
              </p>
            )}
            {quiz.note && <p className="muted">{quiz.note}</p>}
            {/* 分享圖卡：純 canvas 產生，零外部素材。
                ⚠️ 放在徽章與解說**之後**——先講結果再給動作，順序反過來的話
                   讀起來會變成「答對了！存成圖片獲得節氣徽章」。
                ⚠️ 圖要先畫好再呼叫 saveOrShare：Web Share 必須在使用者手勢
                   附近呼叫，在那裡才 await 繪製會被瀏覽器擋掉。 */}
            <ShareButton badgeName={BADGES[quiz.badge]?.name ?? quiz.badge}
              term={term} fact={fact?.value} source={fact?.source} />
          </div>
        )}
        {submitted && !allRight && (
          <div className="cardp-again">
            <p>還沒全對——綠色是漏掉的、紅色是多選的。再試一次就好，不會扣分。</p>
          </div>
        )}
        {!submitted && owned && (
          <p className="muted" style={{ fontSize: 'var(--text-2xs)' }}>
            你已經有這一枚徽章了。
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 「存成圖片／分享」按鈕。
 *
 * ⚠️ 三段式回饋：產生中 → 結果。使用者按取消（Web Share 的 AbortError）
 *    **不可**顯示失敗——那是正常操作。
 * ⚠️ shareCard.js 走 lazy import：canvas 繪製那一段只有答對的人會用到。
 */
function ShareButton({ badgeName, term, fact, source }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const go = async () => {
    setBusy(true); setMsg(null)
    try {
      const m = await import('../lib/shareCard.js')
      const blob = await m.renderShareCard({
        badgeName, term, fact, source,
        dateText: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
      })
      const r = await m.saveOrShare(blob, `機巧時運-${badgeName}.png`)
      setMsg({
        shared: '已開啟分享選單',
        downloaded: '已存成圖片',
        opened: '已在新分頁開啟——長按圖片即可儲存',
        cancelled: null,
        failed: '這台裝置無法產生圖片，換個瀏覽器再試',
      }[r] ?? null)
    } catch {
      setMsg('圖片產生失敗，請稍後再試')
    } finally { setBusy(false) }
  }
  return (
    <>
      <button className="btn-ghost tap cardp-share" onClick={go} disabled={busy}>
        {busy ? '產生中…' : '存成圖片／分享'}
      </button>
      {msg && <p className="muted" style={{ fontSize: 'var(--text-2xs)', margin: '6px 0 0' }}>{msg}</p>}
    </>
  )
}
