import { useEffect, useState } from 'react'

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

export default function AnimatedText({ text = '', fx = 'classic' }) {
  const chars = [...text]
  if (fx === 'typewriter') return <Typewriter text={text} />
  if (fx === 'karaoke')
    return <span className="atx karaoke">{chars.map((c, i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>{c === ' ' ? ' ' : c}</span>)}</span>
  if (fx === 'neon')
    return <span className="atx neon">{chars.map((c, i) => <span key={i} style={{ animationDelay: `${i * 0.06}s` }}>{c === ' ' ? ' ' : c}</span>)}</span>
  return <span className="atx classic">{text}</span>
}
