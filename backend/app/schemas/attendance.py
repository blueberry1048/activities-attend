# ============================================================
# 活動報到 Pydantic Schema
# ============================================================
# 定義活動報到的資料驗證與序列化結構
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ----------------------------------------
# 報到 - 請求 Schema
# ----------------------------------------

class CheckInRequest(BaseModel):
    """
    報到請求結構
    由管理員掃描 QR Code 後發送
    """
    qr_code: str = Field(..., description="掃描到的 QR Code 內容 (JWT Token)")
    event_id: UUID = Field(..., description="活動 ID")


# ----------------------------------------
# 報到 - 回應 Schema
# ----------------------------------------

class CheckInResponse(BaseModel):
    """
    報到回應結構
    """
    success: bool
    message: str
    user_id: Optional[str] = None  # 用於前端記錄已報到狀態
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    event_name: Optional[str] = None
    checked_in_at: Optional[datetime] = None


class AttendanceStatusResponse(BaseModel):
    """
    報到狀態回應結構
    """
    event_id: UUID
    is_checked_in: bool
    checked_in_at: Optional[datetime] = None
    qr_code: Optional[str] = None  # 用於前端顯示 QR Code


class QrCodeResponse(BaseModel):
    """
    QR Code 回應結構
    """
    qr_code: str  # JWT Token
    expires_in: int  # 過期秒數
    generated_at: datetime


class GenerateQrCodeRequest(BaseModel):
    """
    產生 QR Code 的請求結構
    """
    name: str = Field(..., min_length=1, max_length=100, description="參加者姓名")
    email: Optional[str] = Field(None, max_length=255, description="參加者電子郵件")


class CreateParticipantRequest(BaseModel):
    """
    建立參加者並產生 QR Code 的請求結構
    """
    name: str = Field(..., min_length=1, max_length=100, description="參加者姓名")
    email: Optional[str] = Field(None, max_length=255, description="參加者電子郵件")
    phone: Optional[str] = Field(None, max_length=20, description="參加者電話")


class CreateParticipantsBulkRequest(BaseModel):
    """
    批量建立參加者請求結構
    """
    participants: list[CreateParticipantRequest] = Field(..., min_length=1, max_length=100, description="參加者列表")


class ParticipantResponse(BaseModel):
    """
    參加者回應結構
    """
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    qr_code: str  # QR Code Token
    event_id: str
    # 產生分享連結 (完整 URL)
    share_link: Optional[str] = None


class ParticipantLinkResponse(BaseModel):
    """
    參加者連結回應結構
    用於 /api/participants/verify/{token} 端點
    """
    valid: bool
    participant_name: Optional[str] = None
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    event_location: Optional[str] = None
    event_description: Optional[str] = None
    message: Optional[str] = None


class ParticipantsListResponse(BaseModel):
    """
    參加者列表回應結構
    """
    participants: list[ParticipantResponse]
    total: int
