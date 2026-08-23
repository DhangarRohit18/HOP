from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ComponentSchema(BaseModel):
    part_id: str = Field(..., example="LEFT_HEADLIGHT")
    mesh_name: str
    display_name: str
    category: str
    criticality: str
    position_3d: List[float]
    unit_cost: float
    supplier_id: str
    status: str = "GREEN"
    severity: float = 0.0

class InventorySchema(BaseModel):
    component_id: str
    part_id: str
    name: str
    total_stock: int
    available_stock: int
    usable_stock: int
    reserved_stock: int
    damaged_stock: int = 0
    incoming_stock: int
    on_order_stock: int
    daily_usage: int
    safety_stock: int
    reorder_point: int
    coverage_days: float
    projected_coverage_days: float
    warehouse: str
    unit_cost: float

class PurchaseOrderSchema(BaseModel):
    po_id: str
    component_id: str
    part_id: str
    supplier_id: str
    supplier_name: str
    quantity: int
    unit_price: float
    total_value: float
    currency: str = "INR"
    order_date: str
    expected_delivery: str
    status: str
    priority: str = "HIGH"
    shipping_method: str = "AIR_EXPRESS"
    approval_required_above: float = 150000.0

class SupplierSchema(BaseModel):
    supplier_id: str
    supplier_name: str
    component_id: str
    part_id: str
    country: str = "India"
    unit_price: float
    lead_time_days: int
    available_quantity: int
    capacity_per_month: int
    quality_score: float
    reliability_score: float
    min_order_quantity: int
    pack_size: int
    certifications: List[str]
    expedite_supported: bool = True
    expedite_fee: float = 0.0

class RecoveryOptionSchema(BaseModel):
    id: str
    strategy_name: str
    strategy_type: str
    description: str
    procurement_cost: float
    expedite_fee: float
    total_cost: float
    delivery_lead_days: int
    production_stoppage_days: int
    quality_score: float
    reliability_score: float
    affected_vehicles_count: int
    approval_required: bool
    expected_loss_without_action: float
    expected_avoided_loss: float
    remaining_risk: str
