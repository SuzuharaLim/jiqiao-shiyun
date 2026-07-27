// 前端推播：註冊 service worker、要權限、建立訂閱。
//
// ⚠️ 推播權限只能在「使用者明確操作」時要求——瀏覽器會封鎖自動彈出的權限請求，
// 而且被拒絕後很難再要回來。所以這裡不做自動訂閱，一律由設定頁的開關觸發。

import { api } from '../api.js'

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export const pushPermission = () =>
  pushSupported() ? Notification.permission : 'unsupported'   // granted | denied | default

// base64url → Uint8Array（applicationServerKey 需要位元組陣列）
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getRegistration() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  // 等到真的 active 才能用 pushManager（剛註冊時可能還在 installing）
  if (reg.active) return reg
  await new Promise(resolve => {
    const sw = reg.installing || reg.waiting
    if (!sw) return resolve()
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve() })
    setTimeout(resolve, 3000)   // 保險：不要無限等
  })
  return navigator.serviceWorker.ready
}

// 開啟推播。回傳 { ok, reason }
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: '這個瀏覽器不支援推播通知' }

  const { publicKey, enabled } = await api.pushKey().catch(() => ({}))
  if (!enabled || !publicKey) return { ok: false, reason: '伺服器尚未設定推播金鑰' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return { ok: false, reason: perm === 'denied'
      ? '你已封鎖通知權限，請到瀏覽器的網站設定裡重新允許'
      : '需要允許通知權限才能開啟' }
  }

  try {
    const reg = await getRegistration()
    // 已有訂閱就直接沿用（重複 subscribe 會拋錯）
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,   // 規格要求：不可做靜默推播
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await api.pushSubscribe(sub.toJSON())
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || '訂閱失敗，請稍後再試' }
  }
}

export async function disablePush() {
  if (!pushSupported()) return { ok: true }
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await api.pushUnsubscribe({ endpoint: sub.endpoint }).catch(() => {})
      await sub.unsubscribe()
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message }
  }
}

// 目前這個裝置是否已訂閱
export async function isSubscribed() {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    return !!(await reg?.pushManager.getSubscription())
  } catch { return false }
}
