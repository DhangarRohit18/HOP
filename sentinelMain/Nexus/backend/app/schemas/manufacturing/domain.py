from decimal import Decimal
from pydantic import BaseModel, Field, model_validator


class InventoryPositionValidationSchema(BaseModel):
    quantity_on_hand: Decimal = Field(ge=0)
    quantity_reserved: Decimal = Field(ge=0)
    safety_stock_level: Decimal = Field(ge=0)
    reorder_point: Decimal = Field(ge=0)
    average_daily_demand: Decimal = Field(ge=0)

    @model_validator(mode="after")
    def validate_reserved_le_on_hand(self) -> "InventoryPositionValidationSchema":
        if self.quantity_reserved > self.quantity_on_hand:
            raise ValueError(
                f"quantity_reserved ({self.quantity_reserved}) cannot exceed quantity_on_hand ({self.quantity_on_hand})"
            )
        return self


class SupplierCapacityValidationSchema(BaseModel):
    monthly_capacity_units: Decimal = Field(gt=0)
    allocated_capacity_units: Decimal = Field(ge=0)

    @model_validator(mode="after")
    def validate_allocated_le_monthly(self) -> "SupplierCapacityValidationSchema":
        if self.allocated_capacity_units > self.monthly_capacity_units:
            raise ValueError(
                f"allocated_capacity_units ({self.allocated_capacity_units}) cannot exceed monthly_capacity_units ({self.monthly_capacity_units})"
            )
        return self
