# API 端點總表

> 後端 `server/index.js` 全部 `/api` 端點一覽（共 42 支）。同源呼叫、Cookie 帶 session；
> 變更類請求需在 header 帶 `x-csrf-token`（值由登入/`/api/me` 回傳）。前端用戶端見 `src/api.js`。

## 權限標記

| 標記 | 意義 |
| --- | --- |
| 🔓 | 公開，免登入 |
| 🔒 | 需登入（有效 session） |
| 🛡️ | 需登入 **＋ CSRF header**（所有變更資料的請求） |
| 👑moderator / 👑admin | 需達該角色（`user < creator < moderator < admin`） |
| ⏱️ | 有速率限制（authLimiter 12/15分；aiLimiter 15/分） |

---

## 認證與帳號

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/handle-available?handle=` | 🔓 | 即時檢查帳號 handle 是否可用（格式＋唯一） |
| POST | `/api/register` | 🔓⏱️ | 註冊（暱稱/handle/email/密碼；honeypot 防機器人）→ 建帳號＋寄驗證信＋自動登入 |
| POST | `/api/login` | 🔓⏱️ | 登入（統一錯誤訊息防列舉、失敗鎖定、constant-time 比對） |
| GET | `/api/me` | 🔒 | 目前登入者＋csrfToken（前端啟動還原登入態） |
| PATCH | `/api/me` | 🛡️ | 更新暱稱／簡介 |
| POST | `/api/logout` | 🛡️ | 登出（刪本裝置 session） |
| POST | `/api/logout-all` | 🛡️ | 登出所有裝置 |
| GET | `/api/sessions` | 🔒 | 我的登入裝置列表 |
| POST | `/api/password/forgot` | 🔓⏱️ | 忘記密碼（回應一致防列舉；dev 回連結） |
| POST | `/api/password/reset` | 🔓⏱️ | 以一次性 token 重設密碼（成功登出所有裝置） |
| POST | `/api/password/change` | 🛡️ | 已登入改密碼（踢除其他裝置） |
| POST | `/api/verify-email` | 🔓 | 以 token 驗證 Email |
| POST | `/api/email/resend` | 🛡️⏱️ | 重寄驗證信 |
| DELETE | `/api/account` | 🛡️ | 刪除帳號（GDPR；需密碼確認，連帶清 sessions/tokens/內容） |
| GET | `/api/account/export` | 🔒 | 匯出我的資料（GDPR：profile＋近期稽核） |

## 訂單

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| POST | `/api/orders` | 🛡️ | 建立訂單（伺服器算金額、產生單號 `JQ-YYMMDD-NN`、寄確認信） |
| GET | `/api/orders` | 🔒 | 我的訂單列表 |

## 社群內容（貼文／作品／留言／讚／追蹤）

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/posts?term=` | 🔓 | 貼文列表（可依節氣篩） |
| GET | `/api/posts/:id` | 🔓 | 單一貼文＋留言＋（登入時）是否已讚/已追蹤 |
| POST | `/api/posts` | 🛡️ | 發佈貼文 |
| POST | `/api/posts/:id/like` | 🛡️ | 按讚／取消（回傳最新狀態與計數） |
| POST | `/api/posts/:id/comments` | 🛡️ | 留言 |
| GET | `/api/works?term=` | 🔓 | 市集作品列表 |
| POST | `/api/follow` | 🛡️ | 追蹤／取消（by userId 或 handle） |
| GET | `/api/badges` | 🔒 | 我的節氣徽章（AR 小挑戰） |
| POST | `/api/badges` | 🔒 | 取得徽章／登入後合併本機那份（`{ids:[…]}`，重複自動忽略） |
| GET | `/api/notifications` | 🔒 | 我的通知 |

## 參考／編輯內容

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/content/:kind` | 🔓 | 清單型內容（proverbs/deities/festivals/flowers/ingredients/zodiacs/solarTerms/challenges/leaderboard/plans/feedFilters/storyFilters/effects/gradients/textFx…） |

## 地點（新增地點）

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/places/search?q=` | 🔓 | 地點搜尋（後端代理 OSM Nominatim） |
| GET | `/api/places/reverse?lat=&lon=` | 🔓 | 反向地理編碼（座標→地名） |
| GET | `/api/map/tile/:z/:x/:y` | 🔓 | 地圖圖磚代理（OSM；讓前端只連同源符合 CSP） |
| GET | `/api/places` | 🔒 | 我的常用位置 |
| POST | `/api/places` | 🛡️ | 新增／更新常用位置 |
| DELETE | `/api/places/:id` | 🛡️ | 刪除常用位置 |

## 管理後台（RBAC）

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/admin/audit` | 👑admin | 稽核日誌 |
| GET | `/api/admin/users` | 👑admin | 使用者列表 |
| PATCH | `/api/admin/users/:id/role` | 👑admin🛡️ | 變更使用者角色（不能改自己） |
| GET | `/api/admin/content/:kind` | 👑moderator | 讀某類 ref_items（含 id/sort/data） |
| PUT | `/api/admin/content/:kind/:id` | 👑moderator🛡️ | 新增／更新內容（改濾鏡/特效/清單…） |
| DELETE | `/api/admin/content/:kind/:id` | 👑moderator🛡️ | 刪除內容 |

## 金流（scaffold，見 docs/金流-付款串接.md）

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| POST | `/api/payments/intent` | 🛡️ | 建立付款意圖（伺服器算金額＋建「待付款」訂單，回 provider 下一步資料） |
| POST | `/api/payments/webhook` | 🔓* | 金流商付款結果回呼（*正式須驗 provider 簽章；demo 驗共享密鑰） |

## AI 時光顧問

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| POST | `/api/ai/chat` | 🛡️⏱️ | 對話（後端代呼叫 OpenAI／相容 API；未設金鑰回 `{fallback:true}`，前端改用示範腳本） |

## 系統

| 方法 | 路徑 | 權限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/health` | 🔓 | 健康檢查：`{ok, db:"pg"\|"sqlite", pay, ai:"on"\|"off"}`（含真 DB round-trip） |

---

## 慣例

- **回應**：成功 `2xx` JSON；錯誤 `{ error: "友善中文訊息" }`，正式環境不洩漏堆疊。
- **時間**：一律 ISO-8601 字串（字典序＝時間序，pg/sqlite 一致）。
- **金額**：伺服器計算，不信任前端傳來的價格。
- **資料層**：所有查詢走 `db.get/all/run`（見 `server/db.js`，pg/sqlite 雙驅動，`?`→`$n`）。
