import { Seal } from './ui.jsx'
import { Component } from 'react'

// 錯誤邊界：任一畫面元件在 render 中丟例外時，顯示友善備援畫面而非整頁白屏。
// 正式環境可在 componentDidCatch 接 Sentry 等錯誤追蹤服務。
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 開發時輸出到 console；正式環境改送錯誤追蹤服務（Sentry 等）
    if (import.meta.env?.DEV) console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ error: null })
    // 回到乾淨的首頁狀態
    try { history.replaceState(null, '', '/') } catch { /* ignore */ }
    location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="err-boundary">
          <Seal className="eb-seal" />
          <h2 className="eb-title">畫面暫時出了點狀況</h2>
          <p className="eb-sub">已為你保留帳號與資料，重新載入即可繼續。</p>
          <button className="btn-primary tap" style={{ maxWidth: 220 }} onClick={this.reset}>重新載入</button>
        </div>
      )
    }
    return this.props.children
  }
}
