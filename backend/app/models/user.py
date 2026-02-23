# ============================================================
# 使用者資料庫模型
# ============================================================
# 定義 Users 表格的結構
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    """
    使用者資料庫模型
    對應資料庫中的 users 表格
    """
    __tablename__ = "users"
    
    # UUID 主鍵 - 使用 String 相容 SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 使用者名稱 (唯一)
    username = Column(String(50), unique=True, nullable=False, index=True)
    
    # 電子郵件 (唯一)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # 雜湊後的密碼
    hashed_password = Column(String(255), nullable=False)
    
    # 顯示名稱
    full_name = Column(String(100), nullable=True)
    
    # 是否為管理員
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # 建立時間
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 更新時間
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, is_admin={self.is_admin})>"
