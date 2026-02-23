# ============================================================
# Schema 套件初始化檔案
# ============================================================
# 匯出所有 Schema 供外部使用

from app.schemas.user import UserCreate, UserLogin, UserUpdate, UserResponse, Token, TokenData
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventListResponse
from app.schemas.attendance import (
    CheckInRequest, CheckInResponse, AttendanceStatusResponse, QrCodeResponse,
    GenerateQrCodeRequest, CreateParticipantRequest, CreateParticipantsBulkRequest,
    ParticipantResponse, ParticipantsListResponse, ParticipantLinkResponse
)

__all__ = [
    "UserCreate", "UserLogin", "UserUpdate", "UserResponse", "Token", "TokenData",
    "EventCreate", "EventUpdate", "EventResponse", "EventListResponse",
    "CheckInRequest", "CheckInResponse", "AttendanceStatusResponse", "QrCodeResponse",
    "GenerateQrCodeRequest", "CreateParticipantRequest", "CreateParticipantsBulkRequest",
    "ParticipantResponse", "ParticipantsListResponse", "ParticipantLinkResponse"
]
