# 活動報到系統 (Event Check-in System)

一個基於 Web 的活動 QR Code 點名/報到系統。

## 功能特色

### 管理員功能
- ✅ 建立、編輯、刪除活動
- ✅ 透過手機相機掃描參加者 QR Code 進行報到
- ✅ 即時顯示報到結果（成功/已報到/無效）

### 參加者功能
- ✅ 查看活動資訊（日期、時間、地點、詳情）
- ✅ 顯示個人專屬 QR Code
- ✅ QR Code 每 30 秒自動刷新，防止截圖作弊

## 技術棧

- **前端**: React 18 + Vite + Tailwind CSS
- **後端**: Python FastAPI
- **資料庫**: PostgreSQL
- **部署**: Docker + Railway

## 快速開始

### 環境需求

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Docker & Docker Compose (可選)

### 本地開發

1. **安裝後端依賴**
```bash
cd backend
pip install -r requirements.txt
```

2. **設定環境變數**
```bash
cp backend/.env.example backend/.env
# 編輯 .env 檔案，設定資料庫連線
```

3. **安裝前端依賴**
```bash
cd frontend
npm install
```

4. **啟動開發伺服器**

後端:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

前端:
```bash
cd frontend
npm run dev
```

5. **開啟瀏覽器**
- 前端: http://localhost:5173
- API 文件: http://localhost:8000/docs

### 使用 Docker Compose 啟動

```bash
docker-compose up -d
```

## 部署到 Railway

### 步驟

1. **建立 Railway 專案**
```bash
npm i -g @railway/cli
railway login
railway init
```

2. **新增 PostgreSQL 資料庫**
```bash
railway add database
```

3. **設定環境變數**
```bash
railway env set SECRET_KEY=<your-secret-key>
```

4. **部署**
```bash
railway up
```

## 預設管理員帳號

系統啟動後，請透過 API 建立管理員帳號：

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "full_name": "系統管理員",
    "is_admin": true
  }'
```

## API 文件

啟動後端後，存取 http://localhost:8000/docs 查看互動式 API 文件。

## 授權

MIT License
