import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.db.session import check_db_health


@pytest.mark.asyncio
async def test_check_db_health_success():
    mock_result = MagicMock()
    mock_result.scalar.return_value = 1

    mock_conn = AsyncMock()
    mock_conn.execute.return_value = mock_result

    mock_engine = MagicMock()
    mock_engine.connect.return_value.__aenter__.return_value = mock_conn

    with patch("app.db.session.async_engine", mock_engine):
        is_healthy, status = await check_db_health()
        assert is_healthy is True
        assert status == "healthy"


@pytest.mark.asyncio
async def test_check_db_health_failure():
    mock_engine = MagicMock()
    mock_engine.connect.side_effect = Exception("Connection refused")

    with patch("app.db.session.async_engine", mock_engine):
        is_healthy, status = await check_db_health()
        assert is_healthy is False
        assert "unhealthy" in status
