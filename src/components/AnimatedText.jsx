import { useEffect, useRef, useState } from 'react'

// 動態文字 —— 每種字體綁定專屬動態：打字機 / 卡拉OK / 霓虹彈跳 / 經典。純 CSS/JS。
function Typewriter({ text }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => setN(x => { if (x >= text.length) { clearInterval(id); return x } return x + 1 }), 95)
    return () => clearInterval(id)
  }, [text])
  return <span className="atx typewriter">{text.slice(0, n)}<i className="tw-cursor">|</i></span>
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
