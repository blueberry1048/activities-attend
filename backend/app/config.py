# ============================================================
# 應用程式配置模組
# ============================================================
# 管理環境變數與應用程式設定

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    應用程式設定類別
    使用 Pydantic Settings 自動載入環境變數
    """
    
    # 資料庫連線字串
    # Railway 會自動提供 DATABASE_URL 環境變數
    # 本地開發使用 SQLite
    DATABASE_URL: str = "sqlite+aiosqlite:///./activities_attend.db"
    
    # JWT 認證設定
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 天
    
    # 應用程式設定
    APP_NAME: str = "活動報到系統"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"
    
    # CORS 設定
    # 生產環境應該設置為實際的網域，這裡預設支援本地和 Railway
    BACKEND_CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"]
    
    # Railway 部署時的網域（會自動從環境變數讀取）
    # 格式: https://your-app-name.railway.app
    
    # QR Code Token 有效期限 (秒)
    QR_CODE_TOKEN_EXPIRE_SECONDS: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 建立全域設定實例
settings = Settings()
