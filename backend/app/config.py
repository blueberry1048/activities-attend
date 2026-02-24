# ============================================================
# 應用程式配置模組
# ============================================================
# 管理環境變數與應用程式設定

import os
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
    # 生產環境應該設置為實際的網域
    # Railway 部署時自動讀取 RAILWAY_STATIC_URL
    @property
    def BACKEND_CORS_ORIGINS(self) -> list:
        """動態生成 CORS 允許的來源"""
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3001",
        ]
        # 如果有 Railway 提供的靜態 URL，自動加入
        railway_url = os.getenv("RAILWAY_STATIC_URL")
        if railway_url:
            origins.append(f"https://{railway_url}")
            origins.append(railway_url)  # 支援不帶協議的格式
        
        # 允許所有 Railway 生成的域名
        if os.getenv("RAILWAY_PROJECT_NAME"):
            # Railway 域名格式: your-project-name.up.railway.app
            project_name = os.getenv("RAILWAY_PROJECT_NAME")
            service_name = os.getenv("RAILWAY_SERVICE_NAME", project_name)
            origins.append(f"https://{service_name}.up.railway.app")
        
        return origins
    
    # Railway 部署時的網域（會自動從環境變數讀取）
    # 格式: https://your-app-name.railway.app
    
    # QR Code Token 有效期限 (秒)
    QR_CODE_TOKEN_EXPIRE_SECONDS: int = 60
    
    # 管理員創建密鑰（用於首次創建管理員帳號）
    ADMIN_SECRET_KEY: str = "change-this-to-a-secure-random-key"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 建立全域設定實例
settings = Settings()
