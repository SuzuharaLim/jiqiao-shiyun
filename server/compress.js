// 回應壓縮（Brotli / gzip）—— 零第三方相依，只用 node:zlib
//
// ⚠️ 為什麼需要這支：實測 index.js 475KB、react.js 138KB、index.css 115KB 的
//    encodedBodySize 與 decodedBodySize **完全相同**，代表傳輸時沒有任何壓縮。
//    Cloud Run 不會自動幫你壓，Express 也沒有內建。Brotli 對這批資源約省 70%
//    （728KB → 約 200KB），直接改善 LCP，而 Core Web Vitals 是排名訊號。
//
// 為什麼不用 compression 套件：它只做 gzip/deflate 不支援 Brotli，
// 而 Brotli 對文字資源比 gzip 再省 15–20%。Node 內建 zlib 就有 Brotli。
//
// ⚠️ 實作上踩過的坑：第一版用「攔截 res.write 轉送到壓縮 stream」的串流作法，
//    結果整個卡死。原因是 express.static 會把檔案 pipe 到 res，遇到 backpressure
//    時等待 res 發出 'drain'——但資料其實被我轉去壓縮 stream 了，res 永遠不會 drain。
//    改成「先緩衝完整回應、再一次壓縮送出」：文字資源最大不過幾百 KB，
//    緩衝的記憶體成本微不足道，卻完全避開串流的背壓問題。
import { brotliCompressSync, gzipSync, constants } from 'node:zlib'

// 只壓文字類。圖片、字型、影片本身已是壓縮格式，再壓一次浪費 CPU 又可能變大。
const TEXT_RE = /^(?:text\/|application\/(?:json|javascript|xml|rss\+xml|manifest\+json|ld\+json))|image\/svg\+xml/i

// 小回應不壓：壓縮標頭與 CPU 成本會超過省下的位元組。
const MIN_BYTES = 1024

export function compression() {
  return function compressionMiddleware(req, res, next) {
    const accept = String(req.headers['accept-encoding'] || '')
    // ⚠️ 順序有意義：br 比 gzip 省，但要客戶端支援才用。
    const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null
    if (!encoding) return next()

    const _write = res.write.bind(res)
    const _end = res.end.bind(res)
    const chunks = []
    let bypass = false

    const shouldSkip = () => {
      const type = String(res.getHeader('Content-Type') || '')
      // 已經壓過（例如預壓檔或 SSE）就不要再動
      if (res.getHeader('Content-Encoding')) return true
      // ⚠️ SSE 必須放行：它是長連線逐塊送出的，緩衝起來等於整個功能壞掉
      //    （AI 對話就是走 SSE）。
      if (/text\/event-stream/i.test(type)) return true
      return !TEXT_RE.test(type)
    }

    res.write = function (chunk, enc, cb) {
      if (bypass) return _write(chunk, enc, cb)
      if (!chunks.length && shouldSkip()) { bypass = true; return _write(chunk, enc, cb) }
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof enc === 'string' ? enc : 'utf8'))
      if (typeof enc === 'function') enc()
      else if (typeof cb === 'function') cb()
      return true
    }

    res.end = function (chunk, enc, cb) {
      if (bypass) return _end(chunk, enc, cb)
      if (!chunks.length && chunk && shouldSkip()) { bypass = true; return _end(chunk, enc, cb) }
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof enc === 'string' ? enc : 'utf8'))
      }
      const body = Buffer.concat(chunks)
      if (body.length < MIN_BYTES) { bypass = true; return _end(body) }

      let out
      try {
        out = encoding === 'br'
          // 品質 5 是延遲與壓縮率的平衡點：11（預設）對即時回應太慢，
          // 5 已經勝過 gzip 最高品質，CPU 成本卻低一個數量級。
          ? brotliCompressSync(body, {
            params: {
              [constants.BROTLI_PARAM_QUALITY]: 5,
              [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
            },
          })
          : gzipSync(body, { level: 6 })
      } catch {
        bypass = true
        return _end(body)   // 壓縮失敗就送原文，不要讓使用者拿到壞掉的回應
      }

      res.setHeader('Content-Encoding', encoding)
      // ⚠️ 壓縮後長度改變，Content-Length 一定要跟著改，
      //    否則客戶端會等一個永遠不會到的位元組數。
      res.setHeader('Content-Length', String(out.length))
      // ⚠️ 沒有 Vary 的話，CDN 或代理可能把壓縮版本回給不支援的客戶端。
      const vary = String(res.getHeader('Vary') || '')
      if (!/\bAccept-Encoding\b/i.test(vary)) {
        res.setHeader('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding')
      }
      return _end(out, typeof cb === 'function' ? cb : undefined)
    }
    next()
  }
}
