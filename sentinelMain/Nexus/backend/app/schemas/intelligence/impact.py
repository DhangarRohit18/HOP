from decimal import Decimal
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class NodeImpactDetail(BaseModel):
    node_id: str
    business_code: str
    primitive_type: str
    impact_type: str
    description: str


class SLAExposureDetail(BaseModel):
    customer_order_number: str
    customer_name: str
    requested_delivery_date: str
    estimated_delivery_date: str
    delay_days: float
    liquidated_damages_per_day: Decimal  # Ground Truth Rate
    total_financial_exposure: Decimal     # Derived Exposure


class ImpactAnalysisResult(BaseModel):
    analysis_id: str
    disruption_id: str
    target_node_id: str
    propagation_depth: int
    total_affected_nodes: int
    affected_nodes: List[NodeImpactDetail]
    causal_paths: List[List[str]]
    inventory_stockout_nodes: List[str]
    delayed_production_orders: List[str]
    sla_exposures: List[SLAExposureDetail]
    total_financial_exposure: Decimal
    bottlenecks_detected: List[Dict[str, Any]]
    composite_risk_score: float
    score_breakdown: Dict[str, float]
    execution_time_ms: float


class InventoryRiskItem(BaseModel):
    warehouse_code: str
    part_number: str
    component_name: str
    quantity_on_hand: Decimal
    quantity_reserved: Decimal
    available_inventory: Decimal
    average_daily_demand: Decimal
    coverage_days: float
    estimated_stockout_timestamp: Optional[str] = None
    risk_classification: str


class InventoryRiskResponse(BaseModel):
    total_positions_evaluated: int
    critical_risk_count: int
    items: List[InventoryRiskItem]


class BottleneckItem(BaseModel):
    bottleneck_id: str
    node_id: str
    business_code: str
    bottleneck_type: str
    severity: str
    description: str


class CriticalPathItem(BaseModel):
    source_node_id: str
    target_node_id: str
    path: List[str]
    total_lead_time_hours: Decimal
