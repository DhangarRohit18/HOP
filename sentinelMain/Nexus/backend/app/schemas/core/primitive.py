import uuid
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.services.validation.registry import AllowedDependencyEndpointType


class DependencyCreate(BaseModel):
    source_type: str = Field(..., json_schema_extra={"example": "ENTITY"})
    source_id: uuid.UUID
    target_type: str = Field(..., json_schema_extra={"example": "RESOURCE"})
    target_id: uuid.UUID
    dependency_type: str = Field(..., json_schema_extra={"example": "STOCKED_AT"})
    criticality: str = Field(default="MEDIUM", json_schema_extra={"example": "HIGH"})
    lead_time_hours: Decimal = Field(default=Decimal("0.00"), ge=0)

    @field_validator("source_type", "target_type", mode="before")
    @classmethod
    def validate_endpoint_type(cls, value: str) -> str:
        val_upper = value.upper()
        if val_upper not in [e.value for e in AllowedDependencyEndpointType]:
            raise ValueError(
                f"Endpoint type '{value}' is not an allowed primitive type. Must be one of {[e.value for e in AllowedDependencyEndpointType]}"
            )
        return val_upper
