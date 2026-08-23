export type PrimitiveType = 'ENTITY' | 'RESOURCE' | 'EVENT' | 'CONSTRAINT' | 'ACTION' | 'METRIC';
export type DisruptionSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface DisruptionInput {
  disruption_id: string;
  target_type: PrimitiveType;
  target_id: string;
  event_type: string;
  severity: DisruptionSeverity;
  effective_at: string;
  duration_hours: number;
  metadata?: Record<string, unknown>;
}

export interface NodeImpactDetail {
  node_id: string;
  business_code: string;
  primitive_type: PrimitiveType;
  impact_type: string;
  description: string;
}

export interface SLAExposureDetail {
  customer_order_number: string;
  customer_name: string;
  requested_delivery_date: string;
  estimated_delivery_date: string;
  delay_days: number;
  liquidated_damages_per_day: number;
  total_financial_exposure: number;
}

export interface ImpactAnalysisResult {
  analysis_id: string;
  disruption_id: string;
  target_node_id: string;
  propagation_depth: number;
  total_affected_nodes: number;
  affected_nodes: NodeImpactDetail[];
  causal_paths: string[][];
  inventory_stockout_nodes: string[];
  delayed_production_orders: string[];
  sla_exposures: SLAExposureDetail[];
  total_financial_exposure: number;
  bottlenecks_detected: Record<string, unknown>[];
  composite_risk_score: number;
  score_breakdown: Record<string, number>;
  execution_time_ms: number;
}

export interface InventoryRiskItem {
  warehouse_code: string;
  part_number: string;
  component_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_inventory: number;
  average_daily_demand: number;
  coverage_days: number;
  estimated_stockout_timestamp: string | null;
  risk_classification: 'CRITICAL' | 'LOW' | 'MODERATE' | 'HEALTHY';
}

export interface InventoryRiskResponse {
  total_positions_evaluated: number;
  critical_risk_count: number;
  items: InventoryRiskItem[];
}

export interface BottleneckItem {
  bottleneck_id: string;
  node_id: string;
  business_code: string;
  bottleneck_type: string;
  severity: string;
  description: string;
}

export interface CriticalPathItem {
  source_node_id: string;
  target_node_id: string;
  path: string[];
  total_lead_time_hours: number;
}

export interface NodeGraphDetail {
  node_id: string;
  business_code: string;
  primitive_type: PrimitiveType;
  domain: string;
  status: string;
  attributes: Record<string, unknown>;
}

export interface NodeGraphResponse {
  node: NodeGraphDetail;
  outgoing_neighbors: string[];
  incoming_neighbors: string[];
}

export interface DependencyEdgeDetail {
  edge_id: string;
  target_node_id: string;
  dependency_type: string;
  criticality: string;
  lead_time_hours: string;
}

export interface NodeDependenciesResponse {
  node_id: string;
  business_code: string;
  outgoing_dependencies: DependencyEdgeDetail[];
}

export type MitigationCategory =
  | 'INVENTORY_REALLOCATION'
  | 'SHIPMENT_EXPEDITION'
  | 'PRODUCTION_PRIORITIZATION'
  | 'SUPPLIER_SUBSTITUTION'
  | 'SLA_ACCEPTANCE';

export type FeasibilityStatus = 'FEASIBLE' | 'UNAVAILABLE' | 'BLOCKED';

export interface MitigationConstraint {
  constraint_code: string;
  is_violated: boolean;
  reason: string;
}

export interface WhyThisExplanation {
  headline: string;
  key_drivers: string[];
  saved_delay_days: number;
  avoided_financial_exposure: number;
  net_value: number;
  risk_reduction_points: number;
  decision_score: number;
}

export interface WhyNotExplanation {
  action_id: string;
  category: MitigationCategory;
  feasibility: FeasibilityStatus;
  primary_reason: string;
  constraint_codes: string[];
}

export interface ScoreBreakdown {
  financial_benefit_score: number;
  delay_reduction_score: number;
  risk_reduction_score: number;
  mitigation_cost_penalty: number;
  constraint_penalty: number;
  final_decision_score: number;
}

export interface MitigationOutcome {
  action_id: string;
  category: MitigationCategory;
  feasibility: FeasibilityStatus;
  constraints: MitigationConstraint[];
  baseline_sla_exposure: number;
  mitigation_cost: number;
  delay_reduction_days: number;
  resulting_delivery_date: string;
  avoided_sla_exposure: number;
  residual_sla_exposure: number;
  net_value: number;
  residual_risk_score: number;
  affected_nodes_after?: string[];
  ranking_score: number;
  score_breakdown: ScoreBreakdown;
  why_this?: WhyThisExplanation;
  why_not?: WhyNotExplanation;
}

export interface Recommendation {
  recommended_action_id: string;
  headline: string;
  rationale: string;
  execution_safety_notice: string;
  why_this?: WhyThisExplanation;
}

export interface MitigationSimulationRequest {
  disruption_id: string;
  target_type: PrimitiveType;
  target_id: string;
  event_type: string;
  severity: DisruptionSeverity;
  effective_at: string;
  duration_hours: number;
  selected_action_id?: string;
  action_parameters?: Record<string, unknown>;
}

export interface MitigationSimulationResponse {
  simulation_id: string;
  disruption_id: string;
  baseline_financial_exposure: number;
  baseline_risk_score: number;
  candidate_options: MitigationOutcome[];
  top_recommendation: Recommendation | null;
  execution_time_ms: number;
}

