export type EntityType =
  | 'SUPPLIER'
  | 'PURCHASE_ORDER'
  | 'SHIPMENT'
  | 'COMPONENT'
  | 'PRODUCTION_ORDER'
  | 'CUSTOMER_ORDER'
  | 'ENTITY'
  | 'RESOURCE';

export interface DetectedEntity {
  rawValue: string;
  entityType: EntityType;
  identifier: string;
  foundAt?: string;
}

export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'UNKNOWN';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentEventType =
  | 'SUPPLIER_OUTAGE'
  | 'SHIPMENT_DELAY'
  | 'COMPONENT_SHORTAGE'
  | 'PRODUCTION_DELAY'
  | 'CUSTOMER_SLA_RISK';

export interface IncidentContext {
  incidentId: string;
  entityId: string;
  eventType: IncidentEventType | string;
  severity: IncidentSeverity;
  durationHours: number;
  status: IncidentStatus;
  detectedAt?: string;
  source?: string;
}

export type ExplainabilityViewMode = 'EXECUTIVE' | 'ANALYST';

export type ExtensionMessageType =
  | 'PING'
  | 'GET_STATUS'
  | 'ACTIVATE_SCANNER'
  | 'ENTITY_SELECTED'
  | 'GET_SELECTED_ENTITY'
  | 'GET_CURRENT_CONTEXT'
  | 'FETCH_CONTEXT'
  | 'REFRESH_CONTEXT'
  | 'ENTITY_CONTEXT_UPDATED'
  | 'ENTITY_CONTEXT_CHANGED'
  | 'INCIDENT_DETECTED'
  | 'INCIDENT_CONTEXT_UPDATED'
  | 'RUN_IMPACT_ANALYSIS'
  | 'RUN_MITIGATION_SIMULATION'
  | 'IMPACT_ANALYSIS_RESULT'
  | 'MITIGATION_SIMULATION_RESULT'
  | 'RESOLVE_MATERIAL_QR'
  | 'MATERIAL_PASSPORT_UPDATED';

export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: {
    entity?: DetectedEntity;
    incident?: IncidentContext;
    source?: string;
    disruption?: DisruptionInput;
    mitigationRequest?: MitigationSimulationRequest;
    qrPayload?: string;
    materialId?: string;
    forceRefresh?: boolean;
    tabId?: number;
    url?: string;
    [key: string]: unknown;
  };
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  type: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface NodeGraphResponse {
  node: {
    node_id: string;
    business_code: string;
    primitive_type: string;
    domain: string;
    status: string;
    attributes: Record<string, unknown>;
  };
  outgoing_neighbors: string[];
  incoming_neighbors: string[];
}

export interface DependencyEdge {
  edge_id: string;
  target_node_id: string;
  dependency_type: string;
  criticality: string;
  lead_time_hours: string;
}

export interface NodeDependenciesResponse {
  node_id: string;
  business_code: string;
  outgoing_dependencies: DependencyEdge[];
}

export interface BottleneckItem {
  node_id: string;
  business_code: string;
  bottleneck_type: string;
  severity: string;
  capacity_utilization: number;
  description: string;
}

export interface InventoryRiskItem {
  resource_id: string;
  business_code: string;
  part_number: string;
  current_stock: number;
  reserved_stock: number;
  usable_stock: number;
  is_single_sourced: boolean;
  risk_level: string;
}

export interface CriticalPathItem {
  path_id: string;
  source_node_id: string;
  target_node_id: string;
  path_nodes: string[];
  total_lead_time_hours: number;
}

export type BackendConnectionStatus = 'CONNECTED' | 'DEGRADED' | 'UNAVAILABLE';

export interface EntityContext {
  entity: DetectedEntity;
  backendStatus: BackendConnectionStatus;
  nodeGraph?: NodeGraphResponse | null;
  dependencies?: NodeDependenciesResponse | null;
  bottlenecks?: BottleneckItem[] | null;
  inventoryRisk?: InventoryRiskItem[] | null;
  criticalPaths?: CriticalPathItem[] | null;
  incident?: IncidentContext | null;
  fetchedAt: string;
  errorDetails?: string;
  source?: string;
}

// TRACEABILITY PASSPORT SCHEMAS
export interface StructuredEvidence {
  source_type: string;
  source_id: string;
  reason_code: string;
  evidence_type?: string;
  severity?: string;
  source_entity?: string;
  description?: string;
  verified?: boolean;
}

export interface MaterialRiskInfo {
  is_at_risk: boolean;
  active_disruption_id?: string | null;
  severity?: string | null;
  estimated_delay_days: number;
  sla_exposure: number;
  evidence: StructuredEvidence[];
}

export interface MaterialPassportData {
  material_unit_id: string;
  identity: {
    component_id: string;
    component_name: string;
    batch_id: string;
    serial_number: string;
  };
  provenance: {
    supplier_id: string;
    purchase_order_id: string;
    shipment_id: string;
  };
  current_state: {
    warehouse_id: string;
    condition: string;
    quality_status: string;
    inspection_status: string;
    operational_status: string;
  };
  production: {
    production_order_id?: string | null;
  };
  customer: {
    customer_order_id?: string | null;
  };
  traceability: {
    upstream_entities: string[];
    downstream_entities: string[];
  };
  risk: MaterialRiskInfo;
}

export interface MaterialHistoryEventData {
  event_id: string;
  material_unit_id: string;
  event_type: string;
  timestamp: string;
  source: string;
  status: string;
  description: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
}

export interface MaterialImpactData {
  material_unit_id: string;
  component_id: string;
  upstream_chain: Array<{ entity_type: string; entity_id: string; code: string }>;
  downstream_chain: Array<{ entity_type: string; entity_id: string; code: string }>;
  affected_production_orders: string[];
  affected_customer_orders: string[];
  estimated_sla_exposure: number;
  evidence: StructuredEvidence[];
}

export interface FullMaterialTraceabilityAggregate {
  passport: MaterialPassportData;
  history: MaterialHistoryEventData[];
  impact: MaterialImpactData;
  resolvedAt: string;
}

export interface RecentMaterialItem {
  material_unit_id: string;
  serial_number: string;
  condition: string;
  component_id: string;
  resolvedAt: string;
}

// PHASE 4 DISRUPTION & IMPACT SCHEMAS
export type DisruptionSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type PrimitiveType = 'ENTITY' | 'RESOURCE';

export interface DisruptionInput {
  disruption_id: string;
  target_type: PrimitiveType;
  target_id: string;
  event_type: string;
  severity: DisruptionSeverity;
  effective_at: string;
  duration_hours: number;
}

export interface NodeImpactDetail {
  node_id: string;
  business_code?: string;
  primitive_type: string;
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
  bottlenecks_detected: string[];
  composite_risk_score: number;
  score_breakdown: Record<string, number>;
  execution_time_ms: number;
}

// PHASE 4 MITIGATION INTELLIGENCE SCHEMAS
export type MitigationCategory =
  | 'SHIPMENT_EXPEDITION'
  | 'INVENTORY_REALLOCATION'
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
}

export interface MitigationSimulationRequest extends DisruptionInput {}

export interface MitigationSimulationResponse {
  simulation_id: string;
  disruption_id: string;
  baseline_financial_exposure: number;
  baseline_risk_score: number;
  candidate_options: MitigationOutcome[];
  top_recommendation: Recommendation | null;
  execution_time_ms: number;
}

export type SidePanelStateMode =
  | 'IDLE'
  | 'ANALYZING_IMPACT'
  | 'IMPACT_READY'
  | 'EVALUATING_MITIGATION'
  | 'MITIGATION_READY'
  | 'ERROR';

export type IncidentUIStage =
  | 'NO_INCIDENT'
  | 'INCIDENT_DETECTED'
  | 'CONTEXT_RESOLVED'
  | 'IMPACT_READY'
  | 'IMPACT_ANALYZED'
  | 'MITIGATION_READY'
  | 'MITIGATIONS_ANALYZED'
  | 'DECISION_READY';
