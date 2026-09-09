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
  /* 2026-09 全站禁用 emoji 後補的線條圖示：主題切換、定位、盾、圖片佔位、時鐘 */
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />,
  pin: <><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  shield: <><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6L12 3Z" /><path d="M9 12l2 2 4-4.5" /></>,
  image: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M20 16.5l-4.5-4.5-6 6" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
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

  // ── 以下為取代 emoji 而擴充（2026-07）──
  // 原本工具列／空狀態用彩色 emoji（…），在 Windows 上渲染成 Segoe UI
  // 彩色卡通圖，與宣紙／墨線／朱紅的文人氣質斷層。這裡補上對應語意的線條圖示。
  // 造型取向：直線與方折優先（呼應雕版與印章），少用圓潤曲線。

  scroll: <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,                    // 卷／曆書
  book2: <><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" /></>,  // 手帳／書冊
  coin: <><circle cx="12" cy="12" r="8" /><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5" /></>,        // 錢／分潤
  gift: <><path d="M4 10h16v10H4z" /><path d="M4 10V8h16v2M12 8v12" /><path d="M12 8c-1.5-3-5-3-5-.8 0 .5.4.8 1 .8h4Zm0 0c1.5-3 5-3 5-.8 0 .5-.4.8-1 .8h-4Z" /></>,  // 禮／客製
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>,            // 訂單／發票
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="1.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,  // 安全／私密
  ruler: <><path d="M3 14.5 14.5 3l6 6L9 20.5Z" /><path d="M7 11l2 2M10 8l2 2M13 5l2 2" /></>,   // 度量衡
  sparkle: <><path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8Z" /></>,          // AI／精選
  bell2: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,  // 提醒
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></>,   // 訊息／客服
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 20v-6M12 20v-10M16 20v-4" /></>, // 收益／統計
  palette: <><circle cx="12" cy="12" r="8.5" /><circle cx="9" cy="10" r="1.2" /><circle cx="15" cy="10" r="1.2" /><circle cx="10.5" cy="15" r="1.2" /></>,  // 創作者／色
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6H5.5v1.5A3 3 0 0 0 8 10.4M16 6h2.5v1.5A3 3 0 0 1 16 10.4" /><path d="M12 13v4M9 20h6" /></>,   // 排行／挑戰
  branch: <><path d="M12 21V8" /><path d="M12 12 7.5 7.5M12 14l4.5-4.5" /><path d="M12 8c0-2.8 1.6-5 4-5" /></>,  // 節氣／植物
  seal2: <><rect x="4.5" y="4.5" width="15" height="15" rx="1" /><path d="M8.5 8.5h7v7h-7z" /></>,  // 印／曆頁
  dragon: <><path d="M4 16c2-6 6-9 10-9 3 0 5 1.5 6 4-2.5-.8-4 .3-4 2 0 1.6 1.3 2.5 3 2.5-2 2.4-5 3.5-8 3.5-3.5 0-6-1.2-7-3Z" /><circle cx="14.5" cy="10.5" r=".8" /></>,  // 神佛／傳說
  heartPair: <><path d="M9.5 17c-3-2.5-4.5-4.4-4.5-6.1A2.6 2.6 0 0 1 9.5 9a2.6 2.6 0 0 1 4.5 1.9c0 1.7-1.5 3.6-4.5 6.1Z" /><path d="M16 14.5c2.2-2 3.3-3.4 3.3-4.7A2 2 0 0 0 16 8.3" /></>,  // 婚配
  basket: <><path d="M4 9h16l-1.5 10.5h-13Z" /><path d="M8.5 9 10 4.5M15.5 9 14 4.5" /></>,      // 購物車
  photo2: <><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="M3.5 15l4.5-4 3.5 3 3.5-4 5.5 6" /><circle cx="8" cy="9.5" r="1.3" /></>,  // 照片／作品
  clipboard: <><rect x="5.5" y="4.5" width="13" height="15.5" rx="1.5" /><path d="M9 4.5V3h6v1.5" /><path d="M9 10h6M9 14h4" /></>,  // 紀錄／日誌
  wave: <><path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>,  // 海／漁獲
  sound: <><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" /><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" /><path d="M18 7a7 7 0 0 1 0 10" /></>,  // 朗讀／語音導覽
}

export default function Icon({ name, className = '', fill = false, style }) {
  const path = P[name] || P.dots
  return (
    <svg className={`ic ${fill ? 'fill' : ''} ${className}`} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {path}
    </svg>
  )
}
