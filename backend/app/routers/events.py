# ============================================================
# 活動路由模組
# ============================================================
# 處理活動的 CRUD 操作與參加者視圖
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List
from app.database import get_db
from app.models import User, Event, EventAttendance
from app.schemas import (
    EventCreate, EventUpdate, EventResponse, EventListResponse,
    AttendanceStatusResponse, QrCodeResponse, GenerateQrCodeRequest
)
from app.routers.auth import get_current_user, get_current_admin
from app.utils import create_qr_code_token
from datetime import datetime

# 建立路由器
router = APIRouter(prefix="/events", tags=["活動"])


# ----------------------------------------
# 公開 API 端點 (參加者)
# ----------------------------------------

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    取得活動詳情 (公開)
    
    任何人都可以查看活動資訊
    
    Args:
        event_id: 活動 ID
        db: 資料庫會話
    
    Returns:
        EventResponse: 活動詳情
    
    Raises:
        HTTPException: 活動不存在
    """
    # 將 UUID 轉為字串進行查詢
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
    
    # 檢查活動是否已過期，自動停用
    if event.is_active and event.is_expired():
        event.is_active = False
        await db.commit()
    
    # 取得總參加人數
    attendee_result = await db.execute(
        select(func.count(EventAttendance.id)).where(
            EventAttendance.event_id == event_id_str
        )
    )
    attendee_count = attendee_result.scalar() or 0
    
    # 取得已報到人數
    checked_in_result = await db.execute(
        select(func.count(EventAttendance.id)).where(
            EventAttendance.event_id == event_id_str,
            EventAttendance.is_checked_in == True
        )
    )
    checked_in_count = checked_in_result.scalar() or 0
    
    # 回傳活動詳情（含統計）
    return {
        **event.__dict__,
        "attendee_count": attendee_count,
        "checked_in_count": checked_in_count
    }


@router.get("/{event_id}/qr", response_model=QrCodeResponse)
async def get_event_qr_code(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    取得個人專屬 QR Code (需要登入)
    
    產生包含時效性 JWT 的 QR Code Token
    
    Args:
        event_id: 活動 ID
        current_user: 目前登入的使用者
        db: 資料庫會話
    
    Returns:
        QrCodeResponse: QR Code Token 與過期時間
    
    Raises:
        HTTPException: 活動不存在
    """
    # 將 UUID 轉為字串進行查詢
    event_id_str = str(event_id)
    
    # 檢查活動是否存在
    result = await db.execute(
        select(Event).where(Event.id == event_id_str)
    )
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="活動不存在"
        )
    
    # 檢查活動是否啟用
    if not event.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="活動已停用"
        )
    
    # 檢查活動日期是否已過
    if event.event_date < datetime.now().date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="活動已結束"
        )
    
    # 建立 QR Code Token
    user_name = current_user.full_name or current_user.username
    qr_code = create_qr_code_token(
        user_id=current_user.id,
        event_id=event_id,
        user_name=user_name
    )
    
    return QrCodeResponse(
        qr_code=qr_code,
        expires_in=60,  # 60 秒過期
        generated_at=datetime.now()
    )


# ----------------------------------------
# 公開端點：使用姓名電郵產生 QR Code
# ----------------------------------------

@router.post("/{event_id}/qr/generate", response_model=QrCodeResponse)
async def generate_qr_code_with_info(
    event_id: UUID,
    request: GenerateQrCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    使用姓名和電郵產生 QR Code (無需登入)
    
    參加者輸入姓名和電郵後，產生專屬的 QR Code Token
    
    Args:
        event_id: 活動 ID
        request: 參加者姓名和電郵
        db: 資料庫會話
    
    Returns:
        QrCodeResponse: QR Code Token 與過期時間
    
    Raises:
        HTTPException: 活動不存在或已結束
    """
    # 將 UUID 轉為字串進行查詢
    event_id_str = str(event_id)
    
    # 檢查活動是否存在
    result = await db.execute(
        select(Event).where(Event.id == event_id_str)
    )
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="活動不存在"
        )
    
    # 檢查活動是否啟用
    if not event.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="活動已停用"
        )
    
    # 檢查活動日期是否已過
    if event.event_date < datetime.now().date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="活動已結束"
        )
    
    # 建立 QR Code Token (使用匿名 ID)
    qr_code = create_qr_code_token(
        user_id=f"guest_{request.email or request.name}",
        event_id=str(event_id),
        user_name=request.name
    )
    
    return QrCodeResponse(
        qr_code=qr_code,
        expires_in=60,  # 60 秒過期
        generated_at=datetime.now()
    )


@router.get("/{event_id}/status", response_model=AttendanceStatusResponse)
async def get_attendance_status(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    取得個人報到狀態 (需要登入)
    
    Args:
        event_id: 活動 ID
        current_user: 目前登入的使用者
        db: 資料庫會話
    
    Returns:
        AttendanceStatusResponse: 報到狀態與 QR Code
    
    Raises:
        HTTPException: 活動不存在
    """
    # 將 UUID 轉為字串進行查詢
    event_id_str = str(event_id)
    
    # 檢查活動是否存在
    result = await db.execute(
        select(Event).where(Event.id == event_id_str)
    )
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="活動不存在"
        )
    
    # 取得或建立報到記錄
    result = await db.execute(
        select(EventAttendance).where(
            EventAttendance.event_id == event_id_str,
            EventAttendance.user_id == current_user.id
        )
    )
    attendance = result.scalar_one_or_none()
    
    # 如果沒有記錄，建立新的
    if not attendance:
        attendance = EventAttendance(
            event_id=event_id,
            user_id=current_user.id,
            is_checked_in=False
        )
        db.add(attendance)
        await db.flush()
    
    return AttendanceStatusResponse(
        event_id=event_id,
        is_checked_in=attendance.is_checked_in,
        checked_in_at=attendance.checked_in_at,
        qr_code=None  # QR Code 需另外透過 /qr 端點取得
    )


# ----------------------------------------
# 管理員 API 端點
# ----------------------------------------

@router.get("/", response_model=List[EventListResponse])
async def list_events(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    取得所有活動列表 (管理員)
    
    包括報到統計資訊
    
    Args:
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Returns:
        List[EventListResponse]: 活動列表
    """
    # 查詢活動與統計資料
    result = await db.execute(
        select(Event).order_by(Event.event_date.desc())
    )
    events = result.scalars().all()
    
    # 計算每個活動的參加人數與報到人數
    event_list = []
    for event in events:
        # 檢查活動是否已過期，自動停用
        if event.is_active and event.is_expired():
            event.is_active = False
        
        # 取得參加人數
        attendee_result = await db.execute(
            select(func.count(EventAttendance.id)).where(
                EventAttendance.event_id == event.id
            )
        )
        attendee_count = attendee_result.scalar() or 0
        
        # 取得已報到人數
        checked_in_result = await db.execute(
            select(func.count(EventAttendance.id)).where(
                EventAttendance.event_id == event.id,
                EventAttendance.is_checked_in == True
            )
        )
        checked_in_count = checked_in_result.scalar() or 0
        
        event_list.append(EventListResponse(
            id=event.id,
            name=event.name,
            event_date=event.event_date,
            location=event.location,
            start_time=event.start_time,
            is_active=event.is_active,
            attendee_count=attendee_count,
            checked_in_count=checked_in_count
        ))
    
    # 提交過期活動的停用更改
    await db.commit()
    
    return event_list


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    建立新活動 (管理員)
    
    Args:
        event_data: 活動資料
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Returns:
        EventResponse: 新建立的活動
    """
    new_event = Event(
        name=event_data.name,
        description=event_data.description,
        location=event_data.location,
        event_date=event_data.event_date,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        created_by=current_admin.id,
        is_active=event_data.is_active
    )
    
    db.add(new_event)
    await db.flush()
    await db.refresh(new_event)
    
    return new_event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    event_data: EventUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    更新活動 (管理員)
    
    Args:
        event_id: 活動 ID
        event_data: 更新的資料
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Returns:
        EventResponse: 更新後的活動
    
    Raises:
        HTTPException: 活動不存在
    """
    # 將 UUID 轉為字串進行查詢
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
    
    # 更新欄位 (只更新有提供的欄位)
    update_data = event_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    await db.flush()
    await db.refresh(event)
    
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    刪除活動 (管理員)
    
    注意：這會同時刪除所有相關的報到記錄
    
    Args:
        event_id: 活動 ID
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Raises:
        HTTPException: 活動不存在
    """
    # 將 UUID 轉為字串進行查詢
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
    
    # 刪除相關的報到記錄
    await db.execute(
        EventAttendance.__table__.delete().where(
            EventAttendance.event_id == event_id
        )
    )
    
    # 刪除活動
    await db.delete(event)
    
    return None
