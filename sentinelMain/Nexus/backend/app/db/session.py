import logging
from typing import Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy Async Engine & Session Local
async_engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def check_db_health() -> Tuple[bool, str]:
    """
    Executes an asynchronous 'SELECT 1' query using asyncpg to verify PostgreSQL connectivity.
    Returns (is_healthy, status_message).
    """
    try:
        async with async_engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            val = result.scalar()
            if val == 1:
                return True, "healthy"
            return False, "unexpected_result"
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return False, f"unhealthy: {str(exc)}"


async def get_db_session():
    """FastAPI AsyncSession dependency generator."""
    async with AsyncSessionLocal() as session:
        yield session

