# 活動報到系統 - 專案規格書

## 1. 系統概述

### 專案名稱
活動報到系統 (Event Check-in System)

### 類型
全端 Web 應用程式 (SPA + REST API)

### 核心功能
- 管理員可建立/編輯/刪除活動
- 管理員可透過手機相機掃描參加者 QR Code 進行報到
- 參加者可查看活動資訊並顯示專屬動態 QR Code

### 目標使用者
- 活動主辦單位（管理員）
- 活動參加者

---

## 2. 技術架構

### 前端
- **框架**: React 18 + Vite
- **樣式**: Tailwind CSS 3.x
- **QR Code 掃描**: html5-qrcode
- **QR Code 生成**: qrcode.react
- **HTTP Client**: Axios
- **路由**: React Router DOM v6

### 後端
- **框架**: Python FastAPI
- **ORM**: SQLAlchemy 2.x
- **認證**: Python-Jose (JWT)
- **密碼雜湊**: Passlib
- **驗證**: Pydantic v2
- **資料庫**: PostgreSQL (async with asyncpg)

### 資料庫
- **類型**: PostgreSQL 15+
- **連接方式**: Async (asyncpg)

### 部署
- **Web Server**: Nginx
- **容器化**: Docker + Docker Compose
- **平台**: Railway.app

---

## 3. 資料庫 Schema

### Tables

#### users (使用者)
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| username | VARCHAR(50) | 使用者名稱 (唯一) |
| email | VARCHAR(255) | 電子郵件 (唯一) |
| hashed_password | VARCHAR(255) | 雜湊後密碼 |
| full_name | VARCHAR(100) | 顯示名稱 |
| is_admin | BOOLEAN | 是否為管理員 |
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
| qr_token | VARCHAR(500) | QR Code 的 JWT Token |
| checked_in_at | TIMESTAMP | 報到時間 |
| is_checked_in | BOOLEAN | 是否已報到 |
| created_at | TIMESTAMP | 建立時間 |

---

## 4. API 端點設計

### 認證 API
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/auth/register | 註冊新使用者 |
| POST | /api/auth/login | 使用者登入 (取得 JWT) |
| GET | /api/auth/me | 取得目前使用者資訊 |

### 活動管理 API (需管理員權限)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/events | 取得所有活動列表 |
| POST | /api/admin/events | 建立新活動 |
| GET | /api/admin/events/{id} | 取得活動詳情 |
| PUT | /api/admin/events/{id} | 更新活動 |
| DELETE | /api/admin/events/{id} | 刪除活動 |

### 報到 API (需管理員權限)
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/admin/checkin | 驗證 QR Code 並記錄報到 |

### 參加者 API (公開)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/events/{id} | 取得活動資訊 (公開) |
| GET | /api/events/{id}/qr | 取得個人專屬 QR Code 內容 (需登入) |
| GET | /api/events/{id}/status | 取得個人報到狀態 (需登入) |

---

## 5. JWT Token 設計

### QR Code Token 結構
```json
{
  "sub": "user_id",
  "event_id": "event_id",
  "user_name": "使用者名稱",
  "iat": 1710000000,
  "exp": 1710000060
}
```
- **有效期限**: 60 秒 (1 分鐘)
- **用途**: QR Code 掃描驗證

### Access Token 結構
```json
{
  "sub": "user_id",
  "username": "username",
  "is_admin": true,
  "iat": 1710000000,
  "exp": 1713600000
}
```
- **有效期限**: 7 天

---

## 6. 前端頁面設計

### 管理員端 (/1admin)
. **登入頁**/login`)
   - 使用者名稱 (`/admin/密碼輸入登入按
   - 鈕

2. **儀表板** (`/admin/dashboard`)
   - 活動列表卡片
   - 新建活動按鈕
   - 快速掃描按鈕

3. **活動管理** (`/admin/events/new`, `/admin/events/:id/edit`)
   - 活動表單 (名稱、日期、時間、地點、詳情)
   - 儲存/取消按鈕

4. **掃描模式** (`/admin/scan/:eventId`)
   - 全螢幕相機預覽
   - 掃描結果彈窗 (成功/已報到/無效)
   - 返回按鈕

### 參加者端 (/participant)
1. **登入頁** (`/login`)
   - 與管理員相同

2. **活動列表** (`/`)
   - 顯示可参加的活動卡片
   - 點擊進入活動詳情

3. **活動詳情** (`/event/:id`)
   - 活動資訊區塊 (名稱、日期、時間、地點、詳情)
   - 個人 QR Code 顯示區
   - 30 秒倒數計時器
   - 報到狀態顯示

---

## 7. 安全考量

1. **密碼雜湊**: 使用 bcrypt 演算法
2. **JWT 驗證**: RS256 非對稱加密
3. **CORS**: 限制允許的來源
4. **API 速率限制**: 防止濫用
5. **QR Code 時效性**: 60 秒過期機制

---

## 8. 部署架構

```
                    [Internet]
                        |
                        v
                   [Nginx :80]
                        |
          +-------------+-------------+
          |                           |
          v                           v
   [React Frontend]          [FastAPI Backend]
   (Static Files)            (localhost:8000)
                                  |
                                  v
                           [PostgreSQL]
                           (Railway DB)
```

---

## 9. 環境變數

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

---

## 10. 驗收標準

- [ ] 管理員可成功建立/編輯/刪除活動
- [ ] 參加者可查看活動資訊
- [ ] 參加者可顯示個人 QR Code
- [ ] QR Code 每 30 秒自動刷新
- [ ] 管理員可掃描 QR Code 並完成報到
- [ ] 系統正確處理無效/過期 QR Code
- [ ] 系統可部署至 Railway
