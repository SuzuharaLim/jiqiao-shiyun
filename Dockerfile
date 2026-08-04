# syntax=docker/dockerfile:1
# 全端單一容器：Node 同時提供 API 與打包好的前端（Cloud Run）。
# 正式資料庫＝Cloud SQL PostgreSQL（pg，純 JS）。better-sqlite3 只是本機開發後備。

# ---------- 1) 建置：安裝依賴 + 打包前端 ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
# 原生模組編譯工具（保險：better-sqlite3 若無預建二進位可編譯）
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# 完整安裝（含 esbuild 平台二進位）。★勿用 --omit=optional：會拔掉 esbuild 導致 vite build 失敗。
RUN npm ci
COPY . .
# 打包前端後，prune 掉 dev(vite/esbuild) 與 optional(better-sqlite3)，讓 runtime 只留正式依賴。
RUN npm run build \
 && npm prune --omit=dev --omit=optional

# ---------- 2) 執行：只帶 prod 依賴 + dist + server（+ 種子資料）----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
# ⚠️ TZ 一定要設。Cloud Run 的預設時區是 UTC，比台北慢 8 小時——曆算層已經改成
#    一律取台北的日曆日（almanac.js 的 taipeiToday），所以功能上不依賴這一行，
#    但 log 時間戳與 audit_log 的可讀性仍然需要它，也少一層「為什麼時間對不上」的困惑。
ENV NODE_ENV=production \
    TZ=Asia/Taipei \
    PORT=8080
# 連線資訊（Cloud SQL）於部署時以環境變數/Secret 帶入：
#   INSTANCE_CONNECTION_NAME, DB_USER, DB_PASS, DB_NAME, APP_URL
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/server       ./server
# src/data 供容器內 `npm run seed` 使用（mock.js 種子來源）
COPY --from=build /app/src/data     ./src/data
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]
