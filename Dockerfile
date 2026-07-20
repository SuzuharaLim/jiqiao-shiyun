# syntax=docker/dockerfile:1
# 全端單一容器：Node 同時提供認證 API 與打包好的前端（Cloud Run）

# ---------- 1) 建置：安裝依賴 + 打包前端 ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build \
 && npm prune --omit=dev   # 移除 vite 等 dev 依賴，保留已編譯的 better-sqlite3 原生模組

# ---------- 2) 執行：只帶 prod 依賴 + dist + server ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/tmp/authdata
# APP_URL 於部署時以環境變數帶入正式網址（給驗證/重設信連結用）
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/server       ./server
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
USER node                            # 非 root 執行（最小權限）
CMD ["node", "server/index.js"]
