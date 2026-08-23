from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class MaterialCondition(str, Enum):
    GOOD = "GOOD"
    HEALTHY = "HEALTHY"
    AT_RISK = "AT_RISK"
    QUARANTINED = "QUARANTINED"
    DAMAGED = "DAMAGED"
    CRITICAL = "CRITICAL"


class MaterialQualityStatus(str, Enum):
    VERIFIED = "VERIFIED"
    PENDING = "PENDING"
    FAILED = "FAILED"
    HELD = "HELD"


class MaterialInspectionStatus(str, Enum):
    PASSED = "PASSED"
    INSPECTION_REQUIRED = "INSPECTION_REQUIRED"
    FAILED = "FAILED"


class MaterialOperationalStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    IN_TRANSIT = "IN_TRANSIT"
    BLOCKED = "BLOCKED"
    QUARANTINED = "QUARANTINED"
    CONSUMED = "CONSUMED"


class MaterialEventType(str, Enum):
    MATERIAL_CREATED = "MATERIAL_CREATED"
    QUALITY_INSPECTED = "QUALITY_INSPECTED"
    QUALITY_INSPECTION_FAILED = "QUALITY_INSPECTION_FAILED"
    PACKED = "PACKED"
    SHIPPED = "SHIPPED"
    RECEIVED = "RECEIVED"
    STORED = "STORED"
    RESERVED = "RESERVED"
    ALLOCATED = "ALLOCATED"
    DISRUPTION_DETECTED = "DISRUPTION_DETECTED"
    QUARANTINED = "QUARANTINED"
    IMPACT_ANALYZED = "IMPACT_ANALYZED"


class MaterialHistoryEvent(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    material_unit_id: str = Field(..., description="Target material unit ID")
    event_type: MaterialEventType = Field(..., description="Event classification")
    timestamp: str = Field(..., description="ISO 8601 UTC event timestamp")
    source: str = Field(..., description="Originating system or facility")
    status: str = Field(..., description="Status at event execution")
    description: str = Field(..., description="Structured event summary")
    related_entity_type: Optional[str] = Field(None, description="Linked entity classification")
    related_entity_id: Optional[str] = Field(None, description="Linked entity ID")


class MaterialUnit(BaseModel):
    material_unit_id: str = Field(..., description="Unique material unit ID")
    component_id: str = Field(..., description="Parent component ID")
    component_name: str = Field(..., description="Part description")
    batch_id: str = Field(..., description="Manufacturing batch ID")
    serial_number: str = Field(..., description="Unit serial number")
    supplier_id: str = Field(..., description="Originating supplier ID")
    purchase_order_id: str = Field(..., description="Procurement PO ID")
    shipment_id: str = Field(..., description="Freight shipment ID")
    warehouse_id: str = Field(..., description="Storage warehouse ID")
    production_order_id: Optional[str] = Field(None, description="Assigned production order ID")
    customer_order_id: Optional[str] = Field(None, description="Linked customer order contract ID")
    condition: MaterialCondition = Field(..., description="Physical condition status")
    quality_status: MaterialQualityStatus = Field(..., description="Quality verification status")
    inspection_status: MaterialInspectionStatus = Field(..., description="Quality inspection status")
    status: MaterialOperationalStatus = Field(..., description="Operational allocation status")


class StructuredEvidence(BaseModel):
    # Enhanced explicit fields
    evidence_type: str = Field(..., description="Evidence classification identifier")
    source_entity: str = Field(..., description="Source entity ID or code")
    severity: str = Field("HIGH", description="Evidence severity level")
    description: str = Field(..., description="Human and machine readable evidence description")
    verified: bool = Field(True, description="Ground truth verification flag")

    # Backward compatible field aliases
    source_type: Optional[str] = Field(None, description="Legacy source type")
    source_id: Optional[str] = Field(None, description="Legacy source ID")
    reason_code: Optional[str] = Field(None, description="Legacy reason code")


class MaterialRiskInfo(BaseModel):
    is_at_risk: bool = Field(..., description="Risk presence flag")
    active_disruption_id: Optional[str] = Field(None, description="Active disruption ID if present")
    severity: Optional[str] = Field(None, description="Disruption severity")
    estimated_delay_days: float = Field(0.0, description="Estimated delay in days")
    sla_exposure: float = Field(0.0, description="Linked SLA financial exposure")
    evidence: List[StructuredEvidence] = Field(default_factory=list, description="Structured risk evidence")


class MaterialPassport(BaseModel):
    material_unit_id: str = Field(..., description="Unique material unit ID")
    identity: Dict[str, str] = Field(..., description="Material identity attributes")
    provenance: Dict[str, str] = Field(..., description="Supplier and procurement origin")
    current_state: Dict[str, str] = Field(..., description="Warehouse, condition, quality, and operational status")
    production: Dict[str, Optional[str]] = Field(..., description="Production line allocation")
    customer: Dict[str, Optional[str]] = Field(..., description="Customer contract linkage")
    traceability: Dict[str, List[str]] = Field(..., description="Upstream and downstream entity relationships")
    risk: MaterialRiskInfo = Field(..., description="Linked risk and evidence analysis")


class MaterialImpactResponse(BaseModel):
    material_unit_id: str = Field(..., description="Material unit ID")
    component_id: str = Field(..., description="Component ID")
    upstream_chain: List[Dict[str, str]] = Field(..., description="Upstream provenance nodes")
    downstream_chain: List[Dict[str, str]] = Field(..., description="Downstream fulfillment nodes")
    affected_production_orders: List[str] = Field(default_factory=list, description="Impacted production order IDs")
    affected_customer_orders: List[str] = Field(default_factory=list, description="Impacted customer order IDs")
    estimated_sla_exposure: float = Field(0.0, description="Total SLA financial exposure derived from downstream contracts")
    evidence: List[StructuredEvidence] = Field(default_factory=list, description="Supporting evidence references")
