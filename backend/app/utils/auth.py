# ============================================================
# 認證工具模組
# ============================================================
# 處理密碼雜湊與 JWT Token 的創建與驗證
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from uuid import UUID
from app.config import settings

# ----------------------------------------
# 密碼雜湊設定
# ----------------------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    驗證密碼是否正確
    
    Args:
        plain_password: 原始密碼
        hashed_password: 雜湊後的密碼
    
    Returns:
        bool: 密碼是否正確
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """
    將密碼雜湊
    
    Args:
        password: 原始密碼
    
    Returns:
        str: 雜湊後的密碼
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


# ----------------------------------------
# JWT Token 工具
# ----------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    建立 JWT Access Token
    
    Args:
        data: 要編碼的資料 (payload)
        expires_delta: 過期時間增量
    
    Returns:
        str: JWT Token 字串
    """
    to_encode = data.copy()
    
    # 設定過期時間
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 加入過期時間聲明
    to_encode.update({"exp": expire})
    
    # 建立 JWT Token
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_qr_code_token(user_id: str, event_id: str, user_name: str) -> str:
    """
    建立 QR Code 專用的 JWT Token
    
    此 Token 有效期較短 (預設 60 秒)，用於報到驗證
    
    Args:
        user_id: 使用者 ID
        event_id: 活動 ID
        user_name: 使用者名稱
    
    Returns:
        str: JWT Token 字串
    """
    # QR Code Token 的有效期限較短
    expire_delta = timedelta(seconds=settings.QR_CODE_TOKEN_EXPIRE_SECONDS)
    
    # 建立 Token 資料
    to_encode = {
        "sub": str(user_id),  # subject: 使用者 ID
        "event_id": str(event_id),  # 活動 ID
        "user_name": user_name,  # 使用者名稱
        "type": "qr_code"  # Token 類型標記
    }
    
    return create_access_token(to_encode, expires_delta=expire_delta)


def decode_token(token: str) -> Optional[dict]:
    """
    解碼 JWT Token
    
    Args:
        token: JWT Token 字串
    
    Returns:
        Optional[dict]: 解碼後的資料，若無效則回傳 None
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_qr_code_token(token: str, event_id: str) -> Optional[dict]:
    """
    驗證 QR Code Token 是否有效
    
    檢查以下條件：
    1. Token 是否有效且未過期
    2. Token 中的 event_id 是否與傳入的 event_id 匹配
    3. Token 是否為 QR Code 類型
    
    Args:
        token: QR Code 的 JWT Token
        event_id: 活動 ID
    
    Returns:
        Optional[dict]: 解碼後的資料，若無效則回傳 None
    """
    payload = decode_token(token)
    
    if not payload:
        return None
    
    # 檢查 Token 類型
    if payload.get("type") != "qr_code":
        return None
    
    # 檢查活動 ID 是否匹配 (如果提供了 event_id)
    if event_id:
        token_event_id = payload.get("event_id")
        if not token_event_id or str(token_event_id) != str(event_id):
            return None
    
    return payload
