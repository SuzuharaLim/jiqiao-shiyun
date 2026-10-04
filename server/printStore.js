// ============================================================================
// 印刷用原圖的儲存（桌曆客製洽詢，2026-10-04）
//
// 為什麼不放資料庫：一本 24 頁的高解析桌曆約 25–50 MB。現在的 images 表是 base64
// 存在 Cloud SQL 裡，放原圖會讓資料庫快速膨脹（費用、備份都變重）。
//
// 兩種後端，**零新相依**：
//   · 設了 PRINT_BUCKET → Google Cloud Storage（JSON API ＋ Cloud Run 的 metadata
//     server 發的服務帳號 token；不需要 @google-cloud/storage 套件，也不需要金鑰檔）
//   · 沒設 → 本機磁碟 `${DATA_DIR}/print`（開發用）
//
// ★★★ 這些檔案**不公開**：bucket 不可設成 public，讀取只走管理後台的端點
//   （requireRole('moderator')）。「使用者不能把設計存回自己的電腦」靠的就是這一層——
//   前台拿到的永遠只有低解析預覽。
//
// ⚠️ Cloud Run 的服務帳號需要對該 bucket 有 Storage Object Admin（roles/storage.objectAdmin）。
//   設定指令寫在 docs/部署-CloudRun-PostgreSQL.md 的「桌曆原圖儲存」一節。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BUCKET = process.env.PRINT_BUCKET || ''
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'print')

// key 一律由伺服器組出來（inq/<uuid>/p3.jpg），這裡再擋一次路徑穿越
const safeKey = (key) => {
  const k = String(key || '')
  if (!/^[a-z0-9][a-z0-9/_.-]{0,200}$/i.test(k) || k.includes('..')) throw new Error('bad key')
  return k
}

export const printStoreKind = BUCKET ? 'gcs' : 'local'

// ── GCS：metadata server 發的 token（Cloud Run 上自動有，快取到過期前一分鐘）──
let tok = null
async function gcsToken() {
  if (tok && tok.exp > Date.now() + 60_000) return tok.value
  const r = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } })
  if (!r.ok) throw new Error(`metadata token ${r.status}`)
  const j = await r.json()
  tok = { value: j.access_token, exp: Date.now() + (j.expires_in || 300) * 1000 }
  return tok.value
}
const gcsObj = (key) => `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(key)}`

// ★★★ 正式環境沒設 PRINT_BUCKET 時**拒絕寫入**，不可退回本機磁碟：
//   Cloud Run 的容器磁碟在重啟、縮到 0、換版時就會清空 ⇒ 原圖「看起來存好了」，
//   幾天後後台點下去才發現 404，而客人早就關掉頁面了。寧可當下失敗，讓那一頁被標成
//   「缺原圖（只有預覽）」——後台至少知道要跟客人要原檔。
export const printStoreReady = !!BUCKET || process.env.NODE_ENV !== 'production'

export async function putPrint(key, buf, type = 'image/jpeg') {
  if (!printStoreReady) throw Object.assign(new Error('原圖儲存尚未設定（PRINT_BUCKET）'), { status: 503 })
  const k = safeKey(key)
  if (BUCKET) {
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(BUCKET)}/o?uploadType=media&name=${encodeURIComponent(k)}`
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await gcsToken()}`, 'Content-Type': type }, body: buf })
    if (!r.ok) throw new Error(`gcs put ${r.status}`)
    return
  }
  const p = path.join(LOCAL_DIR, k)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, buf)
}

export async function getPrint(key) {
  const k = safeKey(key)
  if (BUCKET) {
    const r = await fetch(gcsObj(k) + '?alt=media', { headers: { Authorization: `Bearer ${await gcsToken()}` } })
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`gcs get ${r.status}`)
    return Buffer.from(await r.arrayBuffer())
  }
  const p = path.join(LOCAL_DIR, k)
  return fs.existsSync(p) ? fs.readFileSync(p) : null
}

// 列出某前綴底下的物件 [{ key, bytes }]
async function list(prefix) {
  const pre = prefix ? safeKey(prefix) : ''
  if (BUCKET) {
    const out = []
    let pageToken = ''
    do {
      const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o?fields=items(name,size),nextPageToken`
        + (pre ? `&prefix=${encodeURIComponent(pre)}` : '') + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')
      const r = await fetch(url, { headers: { Authorization: `Bearer ${await gcsToken()}` } })
      if (!r.ok) throw new Error(`gcs list ${r.status}`)
      const j = await r.json()
      for (const it of j.items || []) out.push({ key: it.name, bytes: Number(it.size) || 0 })
      pageToken = j.nextPageToken || ''
    } while (pageToken)
    return out
  }
  const root = path.join(LOCAL_DIR, pre)
  if (!fs.existsSync(root)) return []
  const out = []
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name)
      if (f.isDirectory()) walk(p)
      else out.push({ key: path.relative(LOCAL_DIR, p).split(path.sep).join('/'), bytes: fs.statSync(p).size })
    }
  }
  fs.statSync(root).isDirectory() ? walk(root) : out.push({ key: pre, bytes: fs.statSync(root).size })
  return out
}

export async function deletePrefix(prefix) {
  const items = await list(prefix)
  for (const it of items) {
    if (BUCKET) {
      const r = await fetch(gcsObj(it.key), { method: 'DELETE', headers: { Authorization: `Bearer ${await gcsToken()}` } })
      if (!r.ok && r.status !== 404) throw new Error(`gcs delete ${r.status}`)
    } else {
      try { fs.unlinkSync(path.join(LOCAL_DIR, it.key)) } catch { /* 已不在 */ }
    }
  }
  return items.length
}

export async function printUsage() {
  const items = await list('')
  return { kind: printStoreKind, objects: items.length, bytes: items.reduce((a, b) => a + b.bytes, 0) }
}
