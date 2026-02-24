# ============================================================
# 前端 Dockerfile - React + Vite + Nginx
# ============================================================
# 用途：部署到 Railway 的前端服務

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

# 1. 覆蓋主設定檔 (解決 worker 過多的問題)
COPY nginx.conf /etc/nginx/nginx.conf

# 2. 把模板放入官方指定的特殊目錄 (會自動執行 envsubst)
COPY default.conf.template /etc/nginx/templates/default.conf.template

# 3. 複製 Vite 構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
