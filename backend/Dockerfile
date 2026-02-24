# ============================================================
# 後端 Dockerfile - FastAPI 應用
# ============================================================
# 用途：部署到 Railway 的後端服務
# 
# 注意：此檔案放置於 backend/ 目錄下
# Railway 請設定 Root Directory 為 backend

FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 複製依賴檔案（相對於 build context，即 backend/ 目錄）
COPY requirements.txt .

# 安裝依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式碼（從 backend/app 到容器的 /app）
COPY app ./app

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# 暴露連接埠
EXPOSE 8000

# 啟動命令
# 移除方括號與 sh -c，直接寫指令
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}