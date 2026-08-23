from enum import Enum
from typing import Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class DisruptionSeverity(str, Enum):
    MINOR = "MINOR"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"


class DisruptionInput(BaseModel):
    disruption_id: str = Field(..., json_schema_extra={"example": "DIS-2026-001"})
    target_type: str = Field(..., json_schema_extra={"example": "ENTITY"})
    target_id: str = Field(..., json_schema_extra={"example": "ENTITY:SUP-001-UUID"})
    event_type: str = Field(..., json_schema_extra={"example": "SUPPLIER_OUTAGE"})
    severity: DisruptionSeverity
    effective_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Reference timestamp from which inventory consumption is evaluated"
    )
    duration_hours: float = Field(..., ge=0.0, json_schema_extra={"example": 72.0})
    metadata: Dict[str, Any] = Field(default_factory=dict)
