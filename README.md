# 活動報到系統 (Event Check-in System)

一個基於 Web 的活動 QR Code 點名/報到系統。

## 功能特色

### 管理員功能
- ✅ 建立、編輯、刪除活動
- ✅ 透過手機相機掃描參加者 QR Code 進行報到
- ✅ 即時顯示報到結果（成功/已報到/無效）
- ✅ 匯入/匯出參加者資料 (CSV)
- ✅ 手機優化介面

###  Helper 功能
- ✅ 掃描參加者 QR Code 進行報到
- ✅ 即時顯示報到結果
- ✅ 手機優化介面

### 參加者功能
- ✅ 查看活動資訊（日期、時間、地點、詳情）
- ✅ 顯示個人專屬 QR Code
- ✅ QR Code 每 60 秒自動刷新，防止截圖作弊
- ✅ 報到成功後顯示狀態

## 技術棧

- **前端**: React 18 + Vite + Tailwind CSS
- **後端**: Supabase (PostgreSQL + Auth)
- **部署**: Vercel

## 快速開始

### 環境需求

- Node.js 18+
- Supabase 帳號

### 本地開發

1. **建立 Supabase 專案**
   - 前往 [supabase.com](https://supabase.com) 建立免費專案
   - 取得 URL 和 Anon Key

2. **設定環境變數**
   ```bash
   cd frontend
   cp .env.example .env
   # 編輯 .env 檔案，設定 Supabase URL 和 Key
   ```

3. **安裝前端依賴**
   ```bash
   cd frontend
   npm install
   ```

4. **啟動開發伺服器**
   ```bash
   cd frontend
   npm run dev
   ```

5. **開啟瀏覽器**
   - 前端: http://localhost:5173

### 部署到 Vercel

1. **推送程式碼到 GitHub**

2. **在 Vercel 匯入專案**
   - 前往 [vercel.com](https://vercel.com)
   - 匯入 GitHub 儲存庫

3. **設定環境變數**
   - `VITE_SUPABASE_URL`: 你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: 你的 Supabase Anon Key

4. **部署**

## 資料庫設定

建立以下資料表和 RLS 政策：

### 資料表
- `users` - 使用者帳號
- `events` - 活動資訊
- `event_attendances` - 參加者報到記錄

### RLS 政策
- 所有認證使用者可讀取活動
- 管理員可建立/編輯/刪除活動
- 參加者可讀取自己的報到記錄
- 掃描者可更新報到狀態

## 預設帳號

系統管理員需直接在 Supabase 後台建立。

## 授權

MIT License
