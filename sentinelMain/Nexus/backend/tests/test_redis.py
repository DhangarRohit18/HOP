from unittest.mock import patch, MagicMock
from app.db.redis import check_redis_health


def test_check_redis_health_success():
    mock_client = MagicMock()
    mock_client.ping.return_value = True

    with patch("redis.from_url", return_value=mock_client):
        is_healthy, status = check_redis_health()
        assert is_healthy is True
        assert status == "healthy"


def test_check_redis_health_failure():
    with patch("redis.from_url", side_effect=Exception("Redis connection failed")):
        is_healthy, status = check_redis_health()
        assert is_healthy is False
        assert "unhealthy" in status
