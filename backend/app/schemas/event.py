# ============================================================
# 活動 Pydantic Schema
# ============================================================
# 定義活動的資料驗證與序列化結構
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, date, time


# ----------------------------------------
# 活動 - 請求 Schema
# ----------------------------------------

class EventCreate(BaseModel):
    """
    建立活動請求結構
    """
    name: str = Field(..., min_length=1, max_length=200, description="活動名稱")
    description: Optional[str] = Field(None, description="活動詳情")
    location: Optional[str] = Field(None, max_length=255, description="活動地點")
    event_date: date = Field(..., description="活動日期")
    start_time: Optional[time] = Field(None, description="開始時間")
    end_time: Optional[time] = Field(None, description="結束時間")
    is_active: bool = Field(True, description="是否啟用")


class EventUpdate(BaseModel):
    """
    更新活動請求結構
    """
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    event_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_active: Optional[bool] = None


# ----------------------------------------
# 活動 - 回應 Schema
# ----------------------------------------

class EventResponse(BaseModel):
    """
    活動回應結構
    """
    id: UUID
    name: str
    description: Optional[str]
    location: Optional[str]
    event_date: date
    start_time: Optional[time]
    end_time: Optional[time]
    created_by: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    """
    活動列表回應結構
    """
    id: UUID
    name: str
    event_date: date
    location: Optional[str]
    start_time: Optional[time]
    is_active: bool
    attendee_count: Optional[int] = 0
    checked_in_count: Optional[int] = 0
    
    class Config:
        from_attributes = True
