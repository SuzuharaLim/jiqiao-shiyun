// ============================================================================
// AR 小挑戰 —— 「知識卡 → 答題 → 徽章」的那一段
//
// ★ 這支原本是 `CardPage.jsx` 裡的區域元件。2026-08-11 抽出來共用，因為
//   **掃到卡片之後跳去的 `/ar/model/:slug` 也要有同一段動線**：
//   辨識成功 → 看 3D 角色 → 讀知識卡 → 答題 → 拿徽章。
//   那才是這條 AR 動線的「成了！」時刻，而先前它只存在於不用相機的卡片頁。
//
// ⚠️ class 名稱刻意維持 `cardp-*`：那些樣式已經在 `styles.css` 裡了，
//    改名要同步改樣式表，而重新命名不會讓任何一個使用者受益。
//
// ⚠️ **答錯不扣分、不鎖、不記次數**（改版文件 §5.3 第 7 點）——這是教育內容
//    不是考試，鎖住重試只會讓人關掉頁面。
//
// ⚠️ 徽章走「本機優先＋登入後雙向合併」（`src/lib/arBadges.js`）：
//    訪客也拿得到，否則站上的訪客模式（純前端狀態、寫入 API 一律 401）
//    會讓訪客答對了什麼都拿不到——而那是這條動線唯一的獎勵。
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import { SectionHead } from './ui.jsx'
import { earnBadge, hasBadge, BADGES } from '../lib/arBadges.js'

/**
 * 小挑戰（多選）。
 * ⚠️ 答錯不扣分、不鎖、不記次數（改版文件 §5.3 第 7 點）——這是教育內容不是考試，
 *    鎖住重試只會讓人關掉頁面。
 */
export default function ArQuiz({ quiz, loggedIn, term, fact }) {
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
      {/* ★★ 「已經有這枚徽章」要放在**題目之前**，而且要寫成邀請。
          原本它掛在送出鈕底下、作答之前就出現——使用者還沒答題就被告知
          「你已經有這一枚徽章了」，讀起來像「你做這題也沒用」。
          徽章狀態應該在**作答之後**才是重點；作答之前只需要讓他知道可以再玩一次。 */}
      {!submitted && owned && (
        <p className="muted" style={{ fontSize: 'var(--text-2xs)', margin: '0 0 6px' }}>
          這枚徽章你已經有了，要不要再玩一次？
        </p>
      )}
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
