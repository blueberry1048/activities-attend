# ============================================================
# 使用者 Pydantic Schema
# ============================================================
# 定義使用者的資料驗證與序列化結構
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ----------------------------------------
# 使用者 - 請求 Schema
# ----------------------------------------

class UserCreate(BaseModel):
    """
    使用者註冊請求結構
    """
    username: str = Field(..., min_length=3, max_length=50, description="使用者名稱")
    email: EmailStr = Field(..., description="電子郵件")
    password: str = Field(..., min_length=6, description="密碼")
    full_name: Optional[str] = Field(None, max_length=100, description="顯示名稱")
    is_admin: bool = Field(False, description="是否為管理員")


class UserLogin(BaseModel):
    """
    使用者登入請求結構
    """
    username: str = Field(..., description="使用者名稱")
    password: str = Field(..., description="密碼")


class UserUpdate(BaseModel):
    """
    使用者更新請求結構
    """
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=6)


# ----------------------------------------
# 使用者 - 回應 Schema
# ----------------------------------------

class UserResponse(BaseModel):
    """
    使用者回應結構 (不含密碼)
    """
    id: UUID
    username: str
    email: str
    full_name: Optional[str]
    is_admin: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """
    JWT Token 回應結構
    """
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """
    JWT Token 資料結構
    """
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = False
