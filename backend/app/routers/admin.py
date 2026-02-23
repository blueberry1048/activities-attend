# ============================================================
# 管理員路由模組
# ============================================================
# 處理報到驗證與管理員專用功能
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.database import get_db
from app.models import User, Event, EventAttendance
from app.schemas import CheckInRequest, CheckInResponse
from app.routers.auth import get_current_admin

# 建立路由器
router = APIRouter(prefix="/admin", tags=["管理員"])


@router.post("/checkin", response_model=CheckInResponse)
async def check_in(
    check_in_data: CheckInRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    報到驗證
    
    管理員掃描參加者的 QR Code 後呼叫此 API 進行驗證
    
    驗證流程：
    1. 解析 QR Code 中的 JWT Token
    2. 檢查 Token 是否有效且未過期
    3. 檢查活動 ID 是否匹配
    4. 檢查參加者是否已報到
    5. 記錄報到時間
    
    Args:
        check_in_data: 包含 QR Code 與活動 ID
        current_admin: 目前登入的管理員
        db: 資料庫會話
    
    Returns:
        CheckInResponse: 報到結果
    
    Raises:
        HTTPException: QR Code 無效或活動不存在
    """
    # ----------------------------------------
    # 步驟 1: 檢查活動是否存在
    # ----------------------------------------
    # 將 UUID 轉為字串進行查詢
    event_id_str = str(check_in_data.event_id)
    
    result = await db.execute(
        select(Event).where(Event.id == event_id_str)
    )
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="活動不存在"
        )
    
    # ----------------------------------------
    # 步驟 2: 驗證 QR Code Token
    # ----------------------------------------
    # 現在使用靜態 Token，直接從資料庫查詢
    result = await db.execute(
        select(EventAttendance, User, Event).join(
            User, EventAttendance.user_id == User.id
        ).join(
            Event, EventAttendance.event_id == Event.id
        ).where(
            EventAttendance.qr_token == check_in_data.qr_code,
            EventAttendance.event_id == event_id_str
        )
    )
    record = result.first()
    
    if not record:
        # Token 無效
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無效的 QR Code，請確認是否正確"
        )
    
    attendance, user, event = record
    
    # 檢查活動是否已過期，自動停用
    if event.is_active and event.is_expired():
        event.is_active = False
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="活動已結束，無法報到"
        )
    
    # 檢查活動是否啟用
    if not event.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="活動已停用，無法報到"
        )
    
    user_id = user.id
    user_name = user.full_name or user.username
    
    # ----------------------------------------
    # 步驟 3: 檢查是否已報到
    # ----------------------------------------
    # attendance 已經從前面的查詢取得了
    
    if attendance.is_checked_in:
        # 已經報到過了
        return CheckInResponse(
            success=False,
            message="此參加者已完成報到",
            user_id=str(user_id),
            user_name=user.full_name or user.username,
            user_email=user.email,
            event_name=event.name,
            checked_in_at=attendance.checked_in_at
        )
    
    # ----------------------------------------
    # 步驟 4: 記錄報到
    # ----------------------------------------
    now = datetime.now()
    
    # 更新現有記錄
    attendance.is_checked_in = True
    attendance.checked_in_at = now
    
    await db.flush()
    
    return CheckInResponse(
        success=True,
        message="報到成功",
        user_id=str(user_id),
        user_name=user.full_name or user.username,
        user_email=user.email,
        event_name=event.name,
        checked_in_at=now
    )
