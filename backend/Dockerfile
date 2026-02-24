# ============================================================
# 後端 Dockerfile - FastAPI 應用
# ============================================================
# 用途：部署到 Railway 的後端服務
# 
# 建構指令：
#   docker build -t backend ./backend
#
# 運行指令：
#   docker run -p 8000:8000 -e DATABASE_URL=xxx backend

FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 複製依賴檔案
COPY requirements.txt .

# 安裝依賴（使用阿里雲鏡像加速）
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 複製應用程式碼
COPY app ./app

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# 暴露連接埠（Railway 會透過 $PORT 環境變數覆蓋）
EXPOSE 8000

# 啟動命令（動態綁定 Railway 的 $PORT）
# 如果 $PORT 未設定，預設為 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
