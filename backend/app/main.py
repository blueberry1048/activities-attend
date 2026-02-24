# ============================================================
# FastAPI 應用程式主入口
# ============================================================
# 活動報到系統 - 後端 API 伺服器
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.routers import auth, events, admin, participants


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    應用程式生命週期管理
    
    啟動時初始化資料庫連線
    關閉時執行清理工作
    """
    # 啟動時執行
    print("正在初始化資料庫...")
    await init_db()
    print("資料庫初始化完成")
    
    yield
    
    # 關閉時執行
    print("應用程式關閉")


# 建立 FastAPI 應用程式實例
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## 活動報到系統 API

這是一個提供活動管理與報到功能的 RESTful API。

### 主要功能：

- **使用者認證**：註冊、登入、JWT Token 驗證
- **活動管理** (管理員)：建立、編輯、刪除活動
- **QR Code 報到**：掃描 QR Code 進行報到驗證
- **活動查詢** (參加者)：查看活動資訊、取得個人 QR Code

### 認證方式：

大部分 API 端點需要 Bearer Token 認證。
請在請求的 Header 中加入：
```
Authorization: Bearer <your_access_token>
```
    """,
    version="1.0.0",
    lifespan=lifespan
)


# ----------------------------------------
# CORS 中間件設定
# ----------------------------------------
# 允許跨域請求
# 生產環境 (DEBUG=False) 時，由於 Nginx 反向代理，前端和後端是同源，不需要 CORS
# 只有開發環境 (DEBUG=True) 才需要 CORS
if settings.DEBUG:
    cors_origins = settings.BACKEND_CORS_ORIGINS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # 生產環境：不通過 CORS，因為 Nginx 已將前端和後端設為同源
    pass


# ----------------------------------------
# 註冊路由
# ----------------------------------------

# 認證路由
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)

# 活動路由
app.include_router(events.router, prefix=settings.API_V1_PREFIX)

# 管理員路由
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

# 參加者管理路由
app.include_router(participants.router, prefix=settings.API_V1_PREFIX)


# ----------------------------------------
# 根端點
# ----------------------------------------

@app.get("/")
async def root():
    """
    API 根端點
    
    回應歡迎訊息與 API 基本資訊
    """
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "message": "活動報到系統 API 正在運行中",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ----------------------------------------
# 錯誤處理
# ----------------------------------------

from fastapi import Request
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    全域例外處理
    
    捕捉未處理的例外並回應適當的錯誤訊息
    """
    import traceback
    error_detail = traceback.format_exc()
    print(f"ERROR: {error_detail}")  # 輸出到終端
    return JSONResponse(
        status_code=500,
        content={
            "detail": "伺服器發生錯誤，請稍後再試",
            "path": str(request.url),
            "error": str(exc)  # 包含錯誤訊息
        }
    )
