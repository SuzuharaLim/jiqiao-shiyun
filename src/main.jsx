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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NavProvider>
        <App />
      </NavProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
