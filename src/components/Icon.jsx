// 內嵌 SVG 圖示系統（線條風，對應 IG 介面稿）
const P = {
  home: <><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V20h13V9.5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  plus: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><path d="M12 8.3v7.4M8.3 12h7.4" /></>,
  fortune: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5 13.2 10.8 16.5 12 13.2 13.2 12 16.5 10.8 13.2 7.5 12 10.8 10.8Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.6 20.5c1.2-4 4.3-6 7.4-6s6.2 2 7.4 6" /></>,
  heart: <path d="M12 20C6 15 3.2 11.2 3.2 7.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8.8 1.8C20.8 11.2 18 15 12 20Z" />,
  cmt: <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20l1-4.8A8.5 8.5 0 1 1 21 11.5Z" />,
  share: <><path d="M22 3 11 14" /><path d="M22 3l-7 18-4-7-7-4Z" /></>,
  book: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4Z" />,
  back: <path d="M15 4.5 8 12l7 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  dots: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  grid: <><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M3.5 9.5h17M3.5 14.5h17M9 3.5v17M15 3.5v17" /></>,
  bag: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  chev: <path d="M9 5l7 7-7 7" />,
  send: <path d="M22 3 11 14M22 3l-7 18-4-7-7-4Z" />,
  bookmark: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4Z" />,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M4.2 7l1.9 1.1M17.9 15.9 19.8 17M4.2 17l1.9-1.1M17.9 8.1 19.8 7M3 12h2.2M18.8 12H21" /></>,
  wallet: <><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M3.5 10h17M16 14h1.5" /></>,
  store: <><path d="M4 9l1-4h14l1 4M4 9v10h16V9M4 9h16" /></>,
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20l1-4.8A8.5 8.5 0 1 1 21 11.5Z" />,
  scan: <><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M4 12h16" /></>,
  camera: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-1.8h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.2" /></>,
}

export default function Icon({ name, className = '', fill = false, style }) {
  const path = P[name] || P.dots
  return (
    <svg className={`ic ${fill ? 'fill' : ''} ${className}`} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {path}
    </svg>
  )
}
