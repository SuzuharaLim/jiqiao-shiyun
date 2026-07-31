import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { NavProvider } from './store/nav.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
// 載入順序有意義：tokens（變數）→ reset（基礎）→ styles（既有樣式，可覆蓋前兩者）。
// 階段 2 刻意讓既有 styles.css 保持最後，確保現有畫面外觀完全不變。
import './styles/tokens.css'
import './styles/reset.css'
import './styles.css'
import './styles/components.css'   // 元件層＋既有 class 的代幣收斂，需在 styles.css 之後

// 移除伺服器注入的首屏靜態內容（server/seo.js 的 seo-fallback）。
// ⚠️ 那份內容是給不執行 JS 的爬蟲與社群預覽看的；React 一旦接手就必須拿掉，
//    否則使用者會看到同樣的宜忌出現兩次。
document.getElementById('seo-fallback')?.remove()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NavProvider>
        <App />
      </NavProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
