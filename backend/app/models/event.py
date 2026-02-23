# ============================================================
# 活動資料庫模型
# ============================================================
# 定義 Events 表格的結構
import uuid
from datetime import datetime, date, time
from sqlalchemy import Column, String, Text, Date, Time, Boolean, DateTime, ForeignKey
from app.database import Base


class Event(Base):
    """
    活動資料庫模型
    對應資料庫中的 events 表格
    """
    __tablename__ = "events"
    
    # UUID 主鍵 - 使用 String 相容 SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 活動名稱
    name = Column(String(200), nullable=False, index=True)
    
    # 活動詳情 (可為 NULL)
    description = Column(Text, nullable=True)
    
    # 活動地點
    location = Column(String(255), nullable=True)
    
    # 活動日期
    event_date = Column(Date, nullable=False)
    
    # 開始時間
    start_time = Column(Time, nullable=True)
    
    # 結束時間
    end_time = Column(Time, nullable=True)
    
    # 建立者 ID (外鍵)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # 是否啟用
    is_active = Column(Boolean, default=True, nullable=False)
    
    # 建立時間
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 更新時間
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def is_expired(self) -> bool:
        """
        檢查活動是否已過期
        
        活動過期條件：
        - 活動日期 < 今天日期
        - 或 活動日期 = 今天 且 結束時間 < 現在時間
        
        Returns:
            bool: 活動是否已過期
        """
        today = date.today()
        now = datetime.now().time()
        
        # 如果活動日期還沒到，則未過期
        if self.event_date > today:
            return False
        
        # 如果活動日期已經過了，則已過期
        if self.event_date < today:
            return True
        
        # 活動日期是今天
        # 如果沒有結束時間，視為未過期
        if not self.end_time:
            return False
        
        # 如果結束時間還沒到，則未過期
        if self.end_time > now:
            return False
        
        # 結束時間已過，則已過期
        return True
    
    def __repr__(self):
        return f"<Event(id={self.id}, name={self.name}, event_date={self.event_date})>"
