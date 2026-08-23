from typing import Dict
from pydantic import BaseModel, Field


class DependencyStatus(BaseModel):
    database: str = Field(..., json_schema_extra={"example": "healthy"})
    redis: str = Field(..., json_schema_extra={"example": "healthy"})


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    service: str = Field(default="nexus-api")
    version: str = Field(default="0.1.0")
    environment: str = Field(default="development")
    dependencies: DependencyStatus

