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

# 複製 Nginx 配置（固定端口 8080）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]
