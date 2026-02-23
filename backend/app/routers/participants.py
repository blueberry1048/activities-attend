# ============================================================
# 參加者路由器模組
# ============================================================
# 處理參加者管理與 QR Code 生成
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import uuid4
from datetime import datetime
from typing import List
from app.database import get_db
from app.models import User, Event, EventAttendance
from app.schemas import (
    CreateParticipantRequest, CreateParticipantsBulkRequest,
    ParticipantResponse, ParticipantsListResponse, ParticipantLinkResponse
)
from app.routers.auth import get_current_admin
from app.utils import create_qr_code_token, verify_qr_code_token, decode_token, get_password_hash
from app.config import settings

# 建立路由器
router = APIRouter(prefix="/participants", tags=["參加者管理"])


# ----------------------------------------
# 建立參加者並產生 QR Code
# ----------------------------------------

@router.post("/events/{event_id}", response_model=ParticipantResponse)
async def create_participant(
    event_id: str,
    request: CreateParticipantRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    建立參加者並產生 QR Code
    
    管理員為活動建立參加者帳號，系統會自動產生專屬的 QR Code Token
    同時會建立 User 資料庫記錄和 EventAttendance 關聯記錄
    
    Args:
        event_id: 活動 ID
        request: 參加者資料 (姓名、電郵、電話)
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Returns:
        ParticipantResponse: 參加者資料與 QR Code
    
    Raises:
        HTTPException: 活動不存在
    """
    # 檢查活動是否存在
    event_id_str = str(event_id)
    result = await db.execute(
        select(Event).where(Event.id == event_id_str)
    )
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="活動不存在"
        )
    
    # 產生唯一的參加者 ID
    participant_id = str(uuid4())
    
    # 產生唯一的 email (使用 UUID 避免重複)
    unique_email = f"participant_{participant_id[:8]}@local"
    
    # 產生隨機密碼 (參加者不需要密碼登入，只用 QR Code)
    temp_password = str(uuid4())[:16]
    
    # 建立參加者用戶資料 (非管理員)
    new_participant = User(
        id=participant_id,
        username=f"participant_{participant_id[:8]}",
        email=unique_email,
        hashed_password=get_password_hash(temp_password),
        full_name=request.name,
        is_admin=False
    )
    db.add(new_participant)
    
    # 產生靜態 Token（用於參加者頁面訪問和 QR Code）
    # 這個 Token 長期有效，不會過期
    qr_code = str(uuid4())
    
    # 建立活動參加記錄
    attendance = EventAttendance(
        id=str(uuid4()),
        event_id=event_id_str,
        user_id=participant_id,
        qr_token=qr_code,
        is_checked_in=False
    )
    db.add(attendance)
    
    # 提交到資料庫
    await db.commit()
    
    # 產生分享連結 (需要前端配置 base URL)
    share_link = f"/participants/{qr_code}"
    
    return ParticipantResponse(
        id=participant_id,
        name=request.name,
        email=request.email,
        phone=request.phone,
        qr_code=qr_code,
        event_id=event_id_str,
        share_link=share_link
    )


# ----------------------------------------
# 批量建立參加者
# ----------------------------------------

@router.post("/events/{event_id}/bulk", response_model=ParticipantsListResponse)
async def create_participants_bulk(
    event_id: str,
    request: CreateParticipantsBulkRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    批量建立參加者並產生 QR Code
    
    一次建立多位參加者，適用於大量報名情況
    
    Args:
        event_id: 活動 ID
        request: 參加者列表
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Returns:
        ParticipantsListResponse: 所有建立參加者與 QR Code
    """
    # 檢查活動是否存在
    event_id_str = str(event_id)
    result = await db.execute(
        select(Event).where(Event.id == event_id_str)
    )
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="活動不存在"
        )
    
    # 建立所有參加者
    participants = []
    for p in request.participants:
        participant_id = str(uuid4())
        
        # 產生隨機密碼
        temp_password = str(uuid4())[:16]
        
        # 產生唯一的 email
        unique_email = f"participant_{participant_id[:8]}@local"
        
        # 建立參加者用戶資料
        new_participant = User(
            id=participant_id,
            username=f"participant_{participant_id[:8]}",
            email=unique_email,
            hashed_password=get_password_hash(temp_password),
            full_name=p.name,
            is_admin=False
        )
        db.add(new_participant)
        
        # 產生靜態 Token（用於參加者頁面訪問和 QR Code）
        qr_code = str(uuid4())
        
        # 建立活動參加記錄
        attendance = EventAttendance(
            id=str(uuid4()),
            event_id=event_id_str,
            user_id=participant_id,
            qr_token=qr_code,
            is_checked_in=False
        )
        db.add(attendance)
        
        share_link = f"/participants/{qr_code}"
        
        participants.append(ParticipantResponse(
            id=participant_id,
            name=p.name,
            email=p.email,
            phone=p.phone,
            qr_code=qr_code,
            event_id=event_id_str,
            share_link=share_link
        ))
    
    # 提交到資料庫
    await db.commit()
    
    return ParticipantsListResponse(
        participants=participants,
        total=len(participants)
    )


# ----------------------------------------
# 取得活動的參加者列表
# ----------------------------------------

@router.get("/events/{event_id}", response_model=ParticipantsListResponse)
async def list_participants(
    event_id: str,
    skip: int = Query(0, ge=0, description="跳過記錄數"),
    limit: int = Query(100, ge=1, le=500, description="回傳記錄數"),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    取得活動的參加者列表
    
    顯示所有已建立 QR Code 的參加者
    
    Note:
        從 EventAttendance 資料表查詢該活動的所有參加者
    """
    event_id_str = str(event_id)
    
    # 查詢該活動的所有參加者記錄
    result = await db.execute(
        select(EventAttendance, User).join(
            User, EventAttendance.user_id == User.id
        ).where(
            EventAttendance.event_id == event_id_str
        ).offset(skip).limit(limit)
    )
    records = result.all()
    
    participants = []
    for attendance, user in records:
        participants.append(ParticipantResponse(
            id=user.id,
            name=user.full_name or "未知姓名",
            email=user.email,
            phone="",  # User 模型沒有 phone 欄位
            qr_code=attendance.qr_token or "",
            event_id=event_id_str,
            share_link=f"/participants/{attendance.qr_token}" if attendance.qr_token else ""
        ))
    
    # 取得總數
    count_result = await db.execute(
        select(func.count(EventAttendance.id)).where(
            EventAttendance.event_id == event_id_str
        )
    )
    total = count_result.scalar() or 0
    
    return ParticipantsListResponse(
        participants=participants,
        total=total
    )


# ----------------------------------------
# 驗證參加者 Token 並取得活動資訊
# ----------------------------------------

@router.get("/verify/{token}", response_model=ParticipantLinkResponse)
async def verify_participant_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    驗證參加者 Token 並取得活動資訊
    
    參加者透過連結訪問時，驗證 token 是否有效，
    並回傳活動資訊供前端顯示
    
    注意：這裡不驗證 JWT 過期時間，因為存儲的是靜態 Token
    只有當管理員掃描 QR Code 時才會驗證動態 JWT
    
    Args:
        token: QR Code Token (靜態 Token)
        db: 資料庫會話
    
    Returns:
        ParticipantLinkResponse: 活動資訊或錯誤訊息
    """
    # 先從資料庫查詢是否存在這個 token
    result = await db.execute(
        select(EventAttendance, User, Event).join(
            User, EventAttendance.user_id == User.id
        ).join(
            Event, EventAttendance.event_id == Event.id
        ).where(
            EventAttendance.qr_token == token
        )
    )
    record = result.first()
    
    if not record:
        return ParticipantLinkResponse(
            valid=False,
            message="無效的 QR Code，請確認是否正確"
        )
    
    attendance, user, event = record
    
    # 檢查活動是否已過期，自動停用
    if event.is_active and event.is_expired():
        event.is_active = False
        await db.commit()
        return ParticipantLinkResponse(
            valid=False,
            message="活動已結束"
        )
    
    # 檢查活動是否啟用
    if not event.is_active:
        return ParticipantLinkResponse(
            valid=False,
            message="活動已停用"
        )
    
    # 取得用戶名稱
    user_name = user.full_name or "參加者"
    
    return ParticipantLinkResponse(
        valid=True,
        participant_name=user_name,
        event_id=event.id,
        event_name=event.name,
        event_date=event.event_date.isoformat() if event.event_date else None,
        event_time=event.start_time.strftime("%H:%M") if event.start_time else None,
        event_location=event.location,
        event_description=event.description,
        message="驗證成功"
    )
