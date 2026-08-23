import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.health import router as health_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.traceability import router as traceability_router
from app.api.v1.supply_chain.router import router as supply_chain_router

# Configure Structured Logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexus")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NEXUS Autonomous Disruption Control Platform API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)


# Configure CORS Middleware for Development & Enterprise Demonstration
cors_origins = list(settings.CORS_ORIGINS) if settings.CORS_ORIGINS else []
for default_origin in [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]:
    if default_origin not in cors_origins:
        cors_origins.append(default_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(intelligence_router, prefix="/api/v1", tags=["Intelligence"])
app.include_router(traceability_router, prefix="/api/v1/traceability", tags=["Traceability"])
app.include_router(supply_chain_router, prefix="", tags=["Supply Chain"])

from app.api.v1.admin import router as admin_router
from app.api.v1.events_sse import router as events_router
from app.api.v1.executive import router as executive_router
from app.api.v1.operator import router as operator_router
from app.api.v1.supplier_portal import router as supplier_router

app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(events_router, prefix="/api/v1/events", tags=["Events SSE"])
app.include_router(executive_router, prefix="/api/v1/executive", tags=["Executive"])
app.include_router(operator_router, prefix="/api/v1/operator", tags=["Operator"])
app.include_router(supplier_router, prefix="/api/v1/supplier", tags=["Supplier Portal"])


@app.get("/", tags=["Root"])
def read_root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
