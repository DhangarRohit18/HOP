import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = Field(..., description="ADMIN, OPERATOR, EXECUTIVE, SUPPLIER")
    supplier_id: Optional[uuid.UUID] = None
    is_active: bool = True


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    supplier_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    last_active_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- APPROVAL RULE SCHEMAS ---
class ApprovalRuleRead(BaseModel):
    id: uuid.UUID
    rule_code: str
    name: str
    emergency_procurement_threshold: Decimal
    min_supplier_quality_pct: Decimal
    max_acceptable_delay_days: int
    require_approval_above_threshold: bool
    updated_by: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalRuleUpdate(BaseModel):
    emergency_procurement_threshold: Optional[Decimal] = None
    min_supplier_quality_pct: Optional[Decimal] = None
    max_acceptable_delay_days: Optional[int] = None
    require_approval_above_threshold: Optional[bool] = None


# --- APPROVAL REQUEST SCHEMAS ---
class ApprovalRequestRead(BaseModel):
    id: uuid.UUID
    disruption_id: str
    action_id: str
    category: str
    requested_action: str
    reason: str
    financial_value: Decimal
    production_impact: str
    supplier_id: Optional[uuid.UUID] = None
    component_id: Optional[uuid.UUID] = None
    status: str  # PENDING, APPROVED, REJECTED
    created_at: datetime
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED or REJECTED")
    operator_notes: Optional[str] = None


# --- SUPPLIER & RFQ SCHEMAS ---
class SupplierDelayReportRequest(BaseModel):
    purchase_order_id: uuid.UUID
    delay_days: float = Field(..., gt=0, description="Estimated delay in days")
    new_eta: datetime
    reason_code: str = Field(..., description="CAPACITY_ISSUE, QUALITY_ISSUE, LOGISTICS_HOLD, FAB_OUTAGE")
    notes: Optional[str] = None


class RFQRead(BaseModel):
    id: uuid.UUID
    rfq_code: str
    component_id: uuid.UUID
    supplier_id: uuid.UUID
    quantity: int
    required_by_date: datetime
    response_deadline: datetime
    status: str  # OPEN, QUOTED, ACCEPTED, EXPIRED
    quoted_price: Optional[Decimal] = None
    quoted_lead_time_days: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RFQQuoteRequest(BaseModel):
    quoted_price: Decimal = Field(..., gt=0)
    quoted_lead_time_days: int = Field(..., gt=0)
    notes: Optional[str] = None


# --- AUDIT LOG & AGENT RUN SCHEMAS ---
class AuditLogRead(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    actor_id: str
    actor_name: str
    role: str
    event_type: str
    entity_type: str
    entity_id: str
    action: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    result: str

    model_config = ConfigDict(from_attributes=True)


class AgentRunRead(BaseModel):
    id: uuid.UUID
    event_id: Optional[str] = None
    incident_id: str
    timeline_steps: List[Dict[str, Any]]
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- EVENT BUS SCHEMA ---
class EventBusMessage(BaseModel):
    event_id: str
    event_type: str
    timestamp: datetime
    source_entity: str
    source_id: str
    payload: Dict[str, Any]
    status: str = "PROCESSED"
