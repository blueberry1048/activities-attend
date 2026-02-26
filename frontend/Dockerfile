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

# 安裝 envsubst (用於環境變數替換)
RUN apk add --no-cache openssl

# 複製 Nginx 配置模板
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# 使用 envsubst 替換環境變數並啟動 Nginx
CMD /bin/sh -c "envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
