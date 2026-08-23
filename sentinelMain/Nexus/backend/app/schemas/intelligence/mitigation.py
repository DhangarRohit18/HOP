from enum import Enum
from typing import List, Dict, Optional, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class MitigationCategory(str, Enum):
    INVENTORY_REALLOCATION = "INVENTORY_REALLOCATION"
    SHIPMENT_EXPEDITION = "SHIPMENT_EXPEDITION"
    PRODUCTION_PRIORITIZATION = "PRODUCTION_PRIORITIZATION"
    SUPPLIER_SUBSTITUTION = "SUPPLIER_SUBSTITUTION"
    SLA_ACCEPTANCE = "SLA_ACCEPTANCE"


class FeasibilityStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    UNAVAILABLE = "UNAVAILABLE"
    BLOCKED = "BLOCKED"


class MitigationAction(BaseModel):
    action_id: str = Field(..., description="Unique deterministic identifier (e.g. ACT-EXP-SHP001)")
    category: MitigationCategory
    title: str = Field(..., description="Human-readable action title")
    description: str = Field(..., description="Detailed description of hypothetical operational action")
    target_node_id: str = Field(..., description="Primary graph node ID targeted by this action")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters and operational inputs")


class MitigationConstraint(BaseModel):
    constraint_code: str = Field(..., description="Structured code (e.g. SINGLE_SOURCE_RESTRICTION)")
    is_violated: bool
    reason: str = Field(..., description="Human-readable rule explanation")


class WhyThisExplanation(BaseModel):
    headline: str
    key_drivers: List[str]
    saved_delay_days: float
    avoided_financial_exposure: Decimal
    net_value: Decimal
    risk_reduction_points: float
    decision_score: float


class WhyNotExplanation(BaseModel):
    action_id: str
    category: MitigationCategory
    feasibility: FeasibilityStatus
    primary_reason: str
    constraint_codes: List[str] = Field(default_factory=list)


class MitigationOutcome(BaseModel):
    action_id: str
    category: MitigationCategory
    feasibility: FeasibilityStatus
    constraints: List[MitigationConstraint] = Field(default_factory=list)

    # Ground Truth Inputs
    baseline_sla_exposure: Decimal
    mitigation_cost: Decimal

    # Derived Output Metrics
    delay_reduction_days: float
    resulting_delivery_date: str
    avoided_sla_exposure: Decimal
    residual_sla_exposure: Decimal
    net_value: Decimal
    residual_risk_score: float
    affected_nodes_after: List[str] = Field(default_factory=list)

    # Ranking & Explanation
    ranking_score: float
    score_breakdown: Dict[str, float] = Field(default_factory=dict)
    why_this: Optional[WhyThisExplanation] = None
    why_not: Optional[WhyNotExplanation] = None


class Recommendation(BaseModel):
    recommended_action_id: Optional[str] = None
    headline: str
    rationale: str
    why_this: Optional[WhyThisExplanation] = None
    rejected_alternatives_why_not: List[WhyNotExplanation] = Field(default_factory=list)
    execution_safety_notice: str = Field(
        default="Simulation only — no operational state is modified in database."
    )


class MitigationSimulationRequest(BaseModel):
    disruption_id: str = Field(..., min_length=1)
    target_type: str = Field(..., min_length=1)
    target_id: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)
    severity: str = Field(..., min_length=1)
    effective_at: datetime
    duration_hours: float = Field(..., ge=0.0)
    selected_action_id: Optional[str] = None
    action_parameters: Dict[str, Any] = Field(default_factory=dict)


class MitigationSimulationResponse(BaseModel):
    simulation_id: str
    disruption_id: str
    baseline_financial_exposure: Decimal
    baseline_risk_score: float
    candidate_options: List[MitigationOutcome]
    top_recommendation: Optional[Recommendation] = None
    execution_time_ms: float
