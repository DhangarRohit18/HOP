from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.db.session import check_db_health
from app.db.redis import check_redis_health
from app.schemas.health import HealthResponse, DependencyStatus

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System & Infrastructure Health Check",
    description="Returns API service health and infrastructure dependency connectivity status (PostgreSQL & Redis).",
)
async def get_health(response: Response) -> HealthResponse:
    db_ok, db_msg = await check_db_health()
    redis_ok, redis_msg = check_redis_health()

    if db_ok and redis_ok:
        overall_status = "healthy"
    elif db_ok or redis_ok:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status=overall_status,
        service="nexus-api",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        dependencies=DependencyStatus(
            database=db_msg,
            redis=redis_msg,
        ),
    )
