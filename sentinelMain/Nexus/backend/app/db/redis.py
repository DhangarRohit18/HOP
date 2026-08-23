import logging
from typing import Tuple
import redis
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)


def check_redis_health() -> Tuple[bool, str]:
    """
    Executes a simple 'PING' command to verify Redis connectivity.
    Returns (is_healthy, status_message).
    """
    try:
        client = redis.from_url(
            settings.REDIS_URL,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
        is_alive = client.ping()
        client.close()
        if is_alive:
            return True, "healthy"
        return False, "unexpected_result"
    except Exception as exc:
        logger.warning(f"Redis health check failed: {exc}")
        return False, f"unhealthy: {str(exc)}"


def get_redis_client() -> aioredis.Redis:
    """Returns an async Redis client instance with text decoding enabled."""
    return aioredis.from_url(
        settings.REDIS_URL,
        socket_timeout=2.0,
        socket_connect_timeout=2.0,
        decode_responses=True,
    )


