# ============================================================
# 前端 Dockerfile - React + Vite + Nginx
# ============================================================
# 用途：部署到 Railway 的前端服務
# 
# 建構指令：
#   docker build -t frontend ./frontend

# 階段 1: 構建 React 應用
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和依賴
COPY package.json package-lock.json* ./

# 安裝依賴
RUN npm ci --legacy-peer-deps

# 複製源碼
COPY . .

# 構建生產版本
RUN npm run build

# 階段 2: 使用 Nginx 伺服靜態檔案
FROM nginx:alpine

# 複製自定義 Nginx 配置（會透過 envsubst 替換 ${PORT}）
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 使用 envsubst 替換環境變數，然後啟動 Nginx
# Railway 會傳入 $PORT 環境變數
CMD ["sh", "-c", "envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
