# ============================================================
# 前端 Dockerfile - React + Vite + Nginx
# ============================================================
# 用途：部署到 Railway 的前端服務

# 階段 1: 構建 React 應用
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# 階段 2: 使用 Nginx 伺服靜態檔案
FROM nginx:alpine

# 複製模板檔案並使用 envsubst 處理環境變數
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 啟動 Nginx（模板會自動被處理）
CMD ["nginx", "-g", "daemon off;"]
