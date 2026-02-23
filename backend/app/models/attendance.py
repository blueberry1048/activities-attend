# ============================================================
# 活動報到記錄資料庫模型
# ============================================================
# 定義 EventAttendances 表格的結構
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from app.database import Base


class EventAttendance(Base):
    """
    活動報到記錄資料庫模型
    對應資料庫中的 event_attendances 表格
    記錄每位參加者對每個活動的報到狀態
    """
    __tablename__ = "event_attendances"
    
    # UUID 主鍵 - 使用 String 相容 SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 活動 ID (外鍵)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    
    # 參加者 ID (外鍵)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # QR Code 的 JWT Token
    # 用於記錄最後一次有效的 QR Code
    qr_token = Column(String(500), nullable=True)
    
    # 是否已報到
    is_checked_in = Column(Boolean, default=False, nullable=False)
    
    # 報到時間 (若已報到)
    checked_in_at = Column(DateTime, nullable=True)
    
    # 建立時間
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<EventAttendance(event_id={self.event_id}, user_id={self.user_id}, is_checked_in={self.is_checked_in})>"
