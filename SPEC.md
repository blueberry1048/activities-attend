# 活動報到系統 - 專案規格書

## 1. 系統概述

### 專案名稱
活動報到系統 (Event Check-in System)

### 類型
全端 Web 應用程式 (SPA + BaaS)

### 核心功能
- 管理員可建立/編輯/刪除活動
- 管理員可透過手機相機掃描參加者 QR Code 進行報到
- Helper 可透過手機掃描參加者 QR Code 進行報到
- 參加者可查看活動資訊並顯示專屬動態 QR Code

### 目標使用者
- 活動主辦單位（管理員）
- 活動工作人員（Helper）
- 活動參加者

---

## 2. 技術架構

### 前端
- **框架**: React 18 + Vite
- **樣式**: Tailwind CSS 3.x
- **QR Code 掃描**: html5-qrcode
- **QR Code 生成**: qrcode.react
- **HTTP Client**: Supabase JS Client
- **路由**: React Router DOM v6

### 後端
- **BaaS**: Supabase
- **認證**: Supabase Auth
- **資料庫**: Supabase PostgreSQL
- **即時訂閱**: Supabase Realtime

### 資料庫
- **類型**: PostgreSQL (Supabase)
- **ORM**: Supabase JS Client

### 部署
- **前端**: Vercel
- **後端**: Supabase (托管)

---

## 3. 資料庫 Schema

### Tables

#### users (使用者)
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| username | VARCHAR(50) | 使用者名稱 (唯一) |
| email | VARCHAR(255) | 電子郵件 (唯一) |
| password_hash | VARCHAR(255) | 雜湊後密碼 |
| full_name | VARCHAR(100) | 顯示名稱 |
| is_admin | BOOLEAN | 是否為管理員 |
| is_helper | BOOLEAN | 是否為工作人員 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

#### events (活動)
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | VARCHAR(200) | 活動名稱 |
| description | TEXT | 活動詳情 |
| location | VARCHAR(255) | 活動地點 |
| event_date | DATE | 活動日期 |
| start_time | TIME | 開始時間 |
| end_time | TIME | 結束時間 |
| created_by | UUID | 建立者 (外鍵 → users.id) |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |
| is_active | BOOLEAN | 是否啟用 |

#### event_attendances (活動報到記錄)
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| event_id | UUID | 活動 ID (外鍵 → events.id) |
| user_id | UUID | 參加者 ID (外鍵 → users.id) |
| qr_token | VARCHAR(500) | QR Code Token |
| checked_in_at | TIMESTAMP | 報到時間 |
| is_checked_in | BOOLEAN | 是否已報到 |
| created_at | TIMESTAMP | 建立時間 |

---

## 4. RLS 政策

### users 表
- 使用者可讀取自己的資料
- 管理員可讀取所有使用者

### events 表
- 所有認證使用者可讀取活動
- 管理員可建立、編輯、刪除活動

### event_attendances 表
- 使用者可讀取自己的報到記錄
- 管理員可讀取所有報到記錄
- Helper 可讀取所有報到記錄
- 使用者可更新自己的報到狀態
- 管理員和 Helper 可更新報到狀態

---

## 5. 前端路由設計

### 管理員端 (/admin)
1. **儀表板** (`/admin`)
   - 活動列表卡片
   - 新建活動按鈕

2. **活動管理** (`/admin/events/new`, `/admin/events/:id/edit`)
   - 活動表單 (名稱、日期、時間、地點、詳情)
   - 儲存/取消按鈕

3. **參加者管理** (`/admin/participants/:eventId`)
   - 參加者列表
   - 新增/刪除參加者
   - CSV 匯入
   - 下載參加者連結
   - 刪除全部參加者

4. **掃描模式** (`/admin/scan/:eventId`)
   - 全螢幕相機預覽
   - 掃描結果顯示 (成功/已報到/無效)
   - 返回按鈕

### Helper 端 (/helper)
1. **活動列表** (`/helper/events`)
   - 顯示可選擇的活動
   - 選擇後進入掃描

2. **掃描模式** (`/helper/scan/:eventId`)
   - 手機優化相機預覽
   - 掃描結果顯示
   - 底部導航欄

### 參加者端
1. **登入頁** (`/login`)
   - 電子郵件/密碼登入
   - PWA 安裝按鈕

2. **活動列表** (`/`)
   - 顯示可参加的活動卡片
   - 點擊進入活動詳情

3. **活動詳情** (`/event/:id`)
   - 活動資訊區塊
   - 個人 QR Code 顯示區
   - 60 秒倒數計時器
   - 報到狀態顯示
   - PWA 安裝按鈕

4. **參加者檢視** (`/participants/:token`)
   - 顯示個人 QR Code
   - 60 秒自動刷新
   - 報到成功顯示綠色勾選圖示
   - PWA 安裝按鈕

---

## 6. 安全考量

1. **密碼雜湊**: 使用 Supabase Auth
2. **認證**: Supabase JWT
3. **RLS**: Row Level Security 政策
4. **QR Code 時效性**: 60 秒過期機制

---

## 7. 部署架構

```
                    [Internet]
                        |
                        v
                  [Vercel CDN]
                  (React Frontend)
                        |
                        v
                  [Supabase]
            (Auth + PostgreSQL + Realtime)
```

---

## 8. 環境變數

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 9. 功能清單

### 管理員功能
- [x] 建立、編輯、刪除活動
- [x] 新增、刪除參加者
- [x] CSV 匯入參加者
- [x] 下載全部參加者連結
- [x] 刪除全部參加者
- [x] 掃描 QR Code 報到
- [x] 即時報到統計
- [x] PWA 安裝

### Helper 功能
- [x] 選擇活動
- [x] 掃描 QR Code 報到
- [x] 即時報到結果
- [x] 手機優化介面
- [x] PWA 安裝

### 參加者功能
- [x] 登入系統
- [x] 查看活動資訊
- [x] 顯示個人 QR Code
- [x] 60 秒自動刷新
- [x] 報到成功顯示
- [x] PWA 安裝
