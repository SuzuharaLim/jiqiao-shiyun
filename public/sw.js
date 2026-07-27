// Service Worker —— 只負責推播（不做離線快取，避免與 Vite 的資產雜湊衝突）。
//
// 收到推播 → 顯示系統通知；點通知 → 聚焦既有分頁並導到指定畫面。
// ⚠️ 這支檔案不可用 import／ESM——service worker 的傳統 script 模式沒有模組系統。

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: '機巧時運', body: event.data.text() }
  }
  const title = data.title || '機巧時運'
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'jiqiao',          // 同 tag 會取代舊通知，不堆積
    renotify: false,
    data: { to: data.to || '/' },
    // 節氣提醒屬於「可稍後看」，不要用高優先度打擾
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.to) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // 已經有開著的分頁 → 聚焦它並導頁（不要每次點都開新分頁）
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          if ('navigate' in client) return client.navigate(target)
          return
        }
      }
      return self.clients.openWindow(target)
    })
  )
})

// 訂閱過期時瀏覽器會觸發這個事件；重新訂閱並回報給伺服器
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const res = await fetch('/api/push/key')
      const { publicKey } = await res.json()
      if (!publicKey) return
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sub.toJSON()),
      })
    } catch (e) {
      // 靜默失敗：使用者下次進站時前端會重新嘗試訂閱
    }
  })())
})
