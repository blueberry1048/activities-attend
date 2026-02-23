# ============================================================
# Dockerfile - 活動報到系統 (前端 + 後端 + Nginx)
# ============================================================
# 多階段構建：
# 1. 前端階段：構建 React 應用
# 2. 後端階段：準備 Python 環境
# 3. 生產階段：運行 Nginx

# ============================================================
# 階段 1: 構建前端
# ============================================================
FROM node:20-alpine AS frontend-builder

# 設定工作目錄
WORKDIR /app/frontend

# 複製 package.json 和依賴
COPY frontend/package.json frontend/package-lock.json* ./

# 安裝依賴
RUN npm ci --legacy-peer-deps

# 複製前端源碼
COPY frontend/ ./

# 構建生產版本
RUN npm run build

# ============================================================
# 階段 2: 準備後端
# ============================================================
FROM python:3.11-slim AS backend-builder

# 設定工作目錄
WORKDIR /app

# 複製依賴檔案
COPY backend/requirements.txt .

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製後端源碼
COPY backend/app ./app

# ============================================================
# 階段 3: 生產階段 - Nginx
# ============================================================
FROM nginx:alpine

# 複製前端構建產物
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# 複製自定義 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製後端應用（作為獨立的 FastAPI 服務運行在容器內）
COPY --from=backend-builder /app /app
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# 安裝 Python 和 Uvicorn（如果 Alpine 沒有）
RUN apk add --no-cache python3 py3-pip openssl

# 安裝後端依賴（重複安裝因為 Alpine 是不同的基礎映像）
RUN pip install --no-cache-dir --break-system-packages -r /app/requirements.txt

# 暴露連接埠
EXPOSE 80

# 建立啟動腳本
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting uvicorn..."' >> /start.sh && \
    echo 'python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &' >> /start.sh && \
    echo 'echo "Waiting for uvicorn to start..."' >> /start.sh && \
    echo 'sleep 5' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# 啟動腳本
CMD ["/start.sh"]
