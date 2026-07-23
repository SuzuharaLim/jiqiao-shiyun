import { useNav, hrefForScreen, hrefForTab } from '../../store/nav.jsx'

// ═══════════════════════════════════════════════════════════════════════
// Link —— SPA 內部連結
//
// ★ 為什麼要這個元件：本專案原本全用 <button onClick={push(...)}> 導覽，
//   那不是連結——無法 Cmd/Ctrl+click 開新分頁、無法右鍵複製網址、
//   無法中鍵開啟、螢幕閱讀器不會宣告為連結、爬蟲也看不到。
//
// ★ 最容易寫壞的地方（DESIGN_BRIEF 特別點名）：
//   一律 preventDefault() 會把上述原生行為全部吃掉。所以下列情況必須「放行」，
//   讓瀏覽器用自己的方式處理：
//     · Cmd(⌘)/Ctrl + click → 背景開新分頁
//     · Shift + click       → 開新視窗
//     · Alt + click         → 下載
//     · 中鍵/右鍵（button !== 0）
//     · target="_blank"
//     · 事件已被其他處理器取消
//
// 用法：
//   <Link screen="postDetail" props={{ id }}>看貼文</Link>
//   <Link tab={1}>探索</Link>
//   <Link href="https://外部連結" external>官網</Link>
// ═══════════════════════════════════════════════════════════════════════
export default function Link({
  screen, props: screenProps, tab, href: hrefProp,
  external = false,
  children, onClick, className = '', ...rest
}) {
  const { push, setTab } = useNav()

  // 外部連結：純 <a>，補上安全屬性後直接交給瀏覽器
  if (external || (hrefProp && /^https?:\/\//.test(hrefProp))) {
    return (
      <a href={hrefProp} target={rest.target || '_blank'} rel="noopener noreferrer"
        className={className} onClick={onClick} {...rest}>{children}</a>
    )
  }

  const href = hrefProp
    ?? (screen ? hrefForScreen(screen, screenProps) : null)
    ?? (typeof tab === 'number' ? hrefForTab(tab) : null)
    ?? '#'

  const handleClick = (e) => {
    onClick?.(e)
    // 保留瀏覽器原生行為（見上方說明）——這幾種情況不攔截
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      (rest.target && rest.target !== '_self')
    ) return

    e.preventDefault()
    if (screen) push(screen, screenProps)
    else if (typeof tab === 'number') setTab(tab)
  }

  return <a href={href} className={className} onClick={handleClick} {...rest}>{children}</a>
}
