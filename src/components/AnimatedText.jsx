import { useEffect, useRef, useState } from 'react'

// 動態文字 —— 每種字體綁定專屬動態：打字機 / 卡拉OK / 霓虹彈跳 / 經典。純 CSS/JS。
// ⚠️ 打字機是 JS 的 setInterval 驅動的，**CSS 的全域 reduce-motion 覆寫碰不到它**。
//    使用者明明開了「減少動態」，文字還是一個字一個字慢慢跳出來。
//    （karaoke / neon 走的是 CSS animation，會被全域覆寫接住，只有這條漏網。）
// ⚠️ 速度：95ms/字對中文偏慢，20 字要跑 1.9 秒。改成依長度自動調整，
//    長句子加速，短句子維持節奏感。
function Typewriter({ text }) {
  const reduce = typeof document !== 'undefined' && (
    document.documentElement.dataset.reduceMotion === 'on'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce) { setN(text.length); return }     // 直接顯示完整文字
    setN(0)
    const step = Math.max(35, Math.min(70, Math.round(1400 / Math.max(1, text.length))))
    const id = setInterval(() => setN(x => { if (x >= text.length) { clearInterval(id); return x } return x + 1 }), step)
    return () => clearInterval(id)
  }, [text, reduce])
  return (
    <span className="atx typewriter">
      {text.slice(0, n)}
      {!reduce && <i className="tw-cursor">|</i>}
    </span>
  )
}

// ⚠️ 卡拉OK／霓虹是「每個字一條無限動畫」——一行 20 字就是 20 條同時在跑，
// 而 neonpop 動的是 text-shadow（純 paint，最貴的一種）。畫面捲走之後還在燒 CPU。
// 用 IntersectionObserver 在離開視野時暫停（CSS 預設 paused，可見才 .atx-play）。
function useVisible() {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVis(true); return }
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, vis]
}

export default function AnimatedText({ text = '', fx = 'classic' }) {
  const chars = [...text]
  const [ref, vis] = useVisible()
  const play = vis ? ' atx-play' : ''
  if (fx === 'typewriter') return <Typewriter text={text} />
  if (fx === 'karaoke')
    return <span ref={ref} className={`atx karaoke${play}`}>{chars.map((c, i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>{c === ' ' ? ' ' : c}</span>)}</span>
  if (fx === 'neon')
    return <span ref={ref} className={`atx neon${play}`}>{chars.map((c, i) => <span key={i} style={{ animationDelay: `${i * 0.06}s` }}>{c === ' ' ? ' ' : c}</span>)}</span>
  return <span className="atx classic">{text}</span>
}
