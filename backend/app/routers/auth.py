# ============================================================
# 認證路由模組
# ============================================================
# 處理使用者註冊、登入與權杖驗證
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, Token
from app.utils import verify_password, get_password_hash, create_access_token
from app.config import settings

# 建立路由器
router = APIRouter(prefix="/auth", tags=["認證"])

# OAuth2 密碼 Bearer 設定
# 從 Authorization header 中提取 Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


# ----------------------------------------
# 依賴項：取得目前使用者
# ----------------------------------------

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    取得目前已認證的使用者
    
    從 JWT token 中解析使用者 ID，然後從資料庫取得使用者資料
    
    Args:
        token: JWT access token
        db: 資料庫會話
    
    Returns:
        User: 使用者物件
    
    Raises:
        HTTPException: token 無效或使用者不存在
    """
    from app.utils import decode_token
    
    # 解碼 token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="無法驗證憑證",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    # 取得使用者 ID
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # 從資料庫取得使用者 (使用 String ID)
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    取得目前管理員權限的使用者
    
    用於需要管理員權限的 API 端點
    
    Args:
        current_user: 目前已認證的使用者
    
    Returns:
        User: 管理員使用者物件
    
    Raises:
        HTTPException: 使用者不是管理員
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )
    return current_user


# ----------------------------------------
# API 端點
# ----------------------------------------

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    註冊新使用者
    
    Args:
        user_data: 使用者註冊資料
        db: 資料庫會話
    
    Returns:
        UserResponse: 新建立的使用者資料
    
    Raises:
        HTTPException: 使用者名稱或 email 已存在
    """
    # 檢查使用者名稱是否已存在
    result = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="使用者名稱已被使用"
        )
    
    # 檢查 email 是否已存在
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="電子郵件已被使用"
        )
    
    # 建立新使用者
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_admin=user_data.is_admin
    )
    
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    使用者登入
    
    使用 OAuth2 Password Bearer 格式驗證
    
    Args:
        form_data: 使用者名稱與密碼
        db: 資料庫會話
    
    Returns:
        Token: JWT access token
    
    Raises:
        HTTPException: 登入失敗
    """
    # 取得使用者
    result = await db.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    # 驗證密碼
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="使用者名稱或密碼錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 建立 access token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "username": user.username,
            "is_admin": user.is_admin
        }
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    取得目前登入的使用者資訊
    
    Args:
        current_user: 目前已認證的使用者
    
    Returns:
        UserResponse: 使用者資料
    """
    return current_user


# ----------------------------------------
# 管理員創建端點（首次部署時使用）
# ----------------------------------------

@router.post("/create-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    username: str,
    password: str,
    secret_key: str,
    db: AsyncSession = Depends(get_db)
):
    """
    創建管理員帳號（需要密鑰）
    
    用於首次部署時創建管理員帳號
    
    Args:
        username: 管理員用戶名
        password: 管理員密碼
        secret_key: 管理員密鑰（環境變數 ADMIN_SECRET_KEY）
        db: 資料庫會話
    
    Returns:
        UserResponse: 新建立的管理員資料
    """
    # 驗證密鑰
    if secret_key != settings.ADMIN_SECRET_KEY:
        # 調試用：返回實際的比對資訊（生產環境應移除）
        return {
            "received": secret_key,
            "expected": settings.ADMIN_SECRET_KEY,
            "match": secret_key == settings.ADMIN_SECRET_KEY
        }
    
    # 檢查是否已有管理員
    result = await db.execute(
        select(User).where(User.is_admin == True)
    )
    existing_admin = result.scalar_one_or_none()
    
    # 如果已有管理員且密鑰不正確，則不允許創建
    # 這裡允許更新現有密碼
    
    # 建立管理員
    hashed_password = get_password_hash(password)
    new_admin = User(
        username=username,
        email=f"{username}@admin.local",
        hashed_password=hashed_password,
        full_name="管理員",
        is_admin=True
    )
    
    if existing_admin:
        # 更新現有管理員
        existing_admin.username = username
        existing_admin.hashed_password = hashed_password
        await db.flush()
        await db.refresh(existing_admin)
        return existing_admin
    
    db.add(new_admin)
    await db.flush()
    await db.refresh(new_admin)
    
    return new_admin
