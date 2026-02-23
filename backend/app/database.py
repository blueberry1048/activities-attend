# ============================================================
# 資料庫連線模組
# ============================================================
# 提供非同步資料庫連線與 SQLAlchemy 會話管理

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# 判斷是否為 SQLite
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# 建立非同步引擎
if is_sqlite:
    # SQLite 不支援連線池參數
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
    )
else:
    # PostgreSQL 使用連線池
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

# 建立非同步會話工廠
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# 建立 ORM 基底類別
Base = declarative_base()


async def get_db():
    """
    取得資料庫會話的依賴注入函式
    FastAPI 會自動呼叫這個函式來取得資料庫會話
    
    Yields:
        AsyncSession: 資料庫會話
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    初始化資料庫
    建立所有表格
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
