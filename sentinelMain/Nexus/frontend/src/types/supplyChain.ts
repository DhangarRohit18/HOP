export type VisualStatus = 'GREEN' | 'YELLOW' | 'RED' | 'BLUE' | 'PURPLE';

export type Category =
  | 'POWERTRAIN'
  | 'ENERGY'
  | 'BRAKING_AND_SAFETY'
  | 'STEERING'
  | 'ELECTRONICS'
  | 'ADAS_AND_SENSORS'
  | 'LIGHTING'
  | 'WHEELS'
  | 'TIRES'
  | 'THERMAL'
  | 'BODY'
  | 'INTERIOR'
  | 'INFOTAINMENT';

export type CriticalityLevel = 'CRITICAL' | 'IMPORTANT' | 'NON_CRITICAL';

export interface Part {
  part_id: string;
  mesh_name: string;
  display_name: string;
  aliases?: string[];
  category: Category;
  criticality: CriticalityLevel;
  position_3d: [number, number, number];
  scale_3d?: [number, number, number];
  mesh_type: 'box' | 'cylinder' | 'sphere' | 'torus' | 'complex';
  color_default: string;
  status: VisualStatus;
  severity: number;
  reason?: string;
  inventory_id: string;
  supplier_id: string;
  ml_risk_score?: number;
  ml_risk_drivers?: string[];
}

export interface InventoryItem {
  component_id: string;
  part_id: string;
  name: string;
  total_stock?: number;
  current_stock?: number;
  available_stock?: number;
  usable_stock: number;
  reserved_stock?: number;
  damaged_stock?: number;
  incoming_stock?: number;
  on_order_stock?: number;
  daily_usage: number;
  safety_stock: number;
  reorder_point?: number;
  coverage_days: number;
  projected_coverage_days?: number;
  warehouse: string;
  last_updated: string;
  unit_cost: number;
}

export interface PurchaseOrder {
  po_id: string;
  component_id: string;
  part_id: string;
  supplier_id: string;
  supplier_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  currency?: string;
  order_date?: string;
  expected_delivery: string;
  actual_delivery?: string;
  status:
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'ORDERED'
    | 'CONFIRMED'
    | 'in_transit'
    | 'PARTIALLY_RECEIVED'
    | 'completed'
    | 'delayed'
    | 'cancelled'
    | 'dispatched'
    | 'PLACED';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  shipping_method?: 'AIR_EXPRESS' | 'ROAD_FREIGHT' | 'SEA_CARGO' | 'DEDICATED_COURIER';
  approval_required_above: number;
  created_by?: string;
  created_at?: string;
  expedite_available?: boolean;
  expedite_fee?: number;
  expedite_delivery_days?: number;
}

export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  component_id: string;
  part_id?: string;
  component_name?: string;
  reliability_score: number;
  quality_score?: number;
  lead_time_days: number;
  unit_price: number;
  currency?: string;
  min_order_quantity: number;
  max_capacity_per_week?: number;
  capacity_per_month?: number;
  available_quantity?: number;
  country?: string;
  location?: string;
  historical_delay_rate?: number;
  single_source?: boolean;
  contract_active?: boolean;
  pack_size?: number;
  share_percentage?: number;
  expedite_supported?: boolean;
  expedite_fee?: number;
  historical_reliability?: number;
  certifications?: string[];
  contact_email?: string;
}

export interface ProductionOrder {
  production_order_id: string;
  product: string;
  part_id: string;
  units_planned: number;
  priority: 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW' | 'high' | 'low';
  scheduled_start?: string;
  scheduled_end?: string;
  deadline?: string;
  status: 'PENDING' | 'RUNNING' | 'HALTED' | 'COMPLETED' | 'RESCHEDULED' | 'scheduled';
  affected_by_disruption?: boolean;
  required_component?: string;
  revenue_impact?: number;
  component_required_per_unit?: number;
}

export interface SupplierMessage {
  id: string;
  supplier_id: string;
  po_id?: string;
  from?: string;
  timestamp: string;
  subject: string;
  body: string;
  claimed_status?: string;
  supplier_claim?: string;
  contradiction_detected?: boolean;
  is_verified?: boolean;
}

export interface ShipmentTracking {
  tracking_id?: string;
  po_id: string;
  carrier?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  current_location?: string;
  location?: string;
  status?: 'ON_SCHEDULE' | 'DELAYED' | 'HELD_AT_CUSTOMS' | 'WEATHER_HOLD' | 'DELIVERED';
  speed_kmh?: number;
  distance_remaining_km?: number;
  estimated_arrival?: string;
  last_movement?: string | null;
  supplier_claim?: string;
  tracking_status?: string;
  confidence_score?: number;
}

export interface SmartOrderRecommendation {
  part_id?: string;
  component_name?: string;
  recommended_quantity: number;
  forecast_7d?: number;
  safety_stock?: number;
  lead_time_demand?: number;
  available_pipeline?: number;
  estimated_cost?: number;
  preferred_supplier?: Supplier;
  estimated_unit_cost?: number;
  estimated_total_cost?: number;
  estimated_lead_days?: number;
  estimated_delivery_date?: string;
  approval_required?: boolean;
  reason?: string;
  formula_breakdown?: {
    forecast_demand: number;
    safety_stock: number;
    production_commitment?: number;
    lead_time_demand: number;
    risk_buffer?: number;
    available_stock: number;
    incoming_stock: number;
    recommended_raw?: number;
    moq_applied?: number;
  };
}

export interface RecoveryOption {
  id: string;
  strategy_name: string;
  strategy_type:
    | 'WAIT'
    | 'EXPEDITE_ORIGINAL'
    | 'SUPPLIER_B'
    | 'SUPPLIER_C'
    | 'MULTI_SOURCE_SPLIT'
    | 'SPLIT_ORDER'
    | 'RESCHEDULE_PRODUCTION'
    | 'PARTIAL_AIR_SHIPMENT';
  description: string;
  procurement_cost: number;
  expedite_fee: number;
  total_cost: number;
  delivery_lead_days: number;
  production_stoppage_days: number;
  quality_score: number;
  reliability_score: number;
  affected_vehicles_count: number;
  approval_required: boolean;
  expected_loss_without_action: number;
  expected_avoided_loss: number;
  remaining_risk: string;
  order_breakdown?: Array<{
    supplier_id: string;
    supplier_name: string;
    quantity: number;
    lead_days: number;
    cost: number;
  }>;
  production_adjustments?: string[];
}

export interface ApprovalBrief {
  id?: string;
  disruption_id: string;
  disruption_title?: string;
  affected_component?: string;
  part_id: string;
  criticality?: CriticalityLevel;
  production_impact_summary?: string;
  recommended_option?: RecoveryOption;
  rejected_options?: RecoveryOption[];
  selected_strategy: string;
  procurement_cost: number;
  threshold_exceeded_by: number;
  autonomous_threshold?: number;
  cost_exceeded_by?: number;
  expected_avoided_loss?: number;
  reason_for_recommendation?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  supplier_name: string;
  lead_time_days: number;
  line_stop_loss_avoided: number;
  roi_ratio: number;
  total_cost?: number;
  summary: string;
  remaining_risk?: string;
}

export interface BlastRadius {
  affected_component?: string;
  part_id?: string;
  criticality?: CriticalityLevel;
  affected_parts_count?: number;
  affected_models?: string[];
  affected_lines?: number;
  affected_orders?: number;
  line_stop_estimated_days?: number;
  total_vehicles_at_risk?: number;
  affected_vehicles?: number;
  affected_customer_commitments?: number;
  estimated_financial_impact?: number;
  financial_exposure_rupees?: number;
  expected_delay_days?: number;
}

export interface SupplierConcentration {
  primary_supplier_id?: string;
  primary_supplier_name?: string;
  share_percentage?: number;
  secondary_supplier_name?: string;
  secondary_share_percentage?: number;
  risk_level?: string;
  recommendation?: string;
  total_single_source_parts?: number;
  high_risk_suppliers_count?: number;
  dominant_supplier_share_pct?: number;
  concentration_score?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AgentEvent {
  id: string;
  timestamp: string;
  time_formatted: string;
  type:
    | 'DISRUPTION_DETECTED'
    | 'SUPPLIER_CONTACTED'
    | 'TRACKING_VERIFIED'
    | 'BLAST_RADIUS_CALCULATED'
    | 'RECOVERY_SIMULATION_STARTED'
    | 'RECOVERY_PLAN_SELECTED'
    | 'PO_CREATED'
    | 'PO_APPROVED'
    | 'PART_RISK_UPDATE'
    | 'PART_RECOVERING'
    | 'PART_RECOVERED'
    | 'APPROVAL_REQUESTED'
    | 'ERP_UPDATED'
    | 'REPLANNING_TRIGGERED'
    | 'PRODUCTION_PLAN_CREATED'
    | 'BOTTLENECK_DETECTED'
    | 'PRODUCTION_CAPACITY_UPDATED';
  part_id?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: VisualStatus;
  message: string;
  details?: any;
}

export interface DisruptionState {
  is_active: boolean;
  disruption_id?: string;
  part_id?: string;
  component_id?: string;
  criticality?: CriticalityLevel;
  affected_supplier_id?: string;
  description?: string;
  usable_stock?: number;
  daily_usage?: number;
  days_coverage?: number;
  affected_vehicles?: number;
  blast_radius?: BlastRadius;
  supplier_concentration?: SupplierConcentration;
  supplier_claim_verification?: {
    claim: string;
    verification: 'verified' | 'contradicted' | 'unverified';
    confidence: number;
    tracking_status: string;
  };
  selected_plan?: RecoveryOption;
  approval_brief?: ApprovalBrief;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  disruption_id: string;
  part_id: string;
  category: Category;
  criticality: CriticalityLevel;
  event_name: string;
  action_by: 'SUPPLYSHIELD_AGENT' | 'HUMAN_OPERATOR';
  data_checked: string;
  supplier_communications: string;
  verification_result: string;
  alternatives_considered_count: number;
  selected_strategy: string;
  decision_reason: string;
  cost: number;
  avoided_loss: number;
  erp_changes: string[];
  remaining_risk: string;
}

export interface SupplierMemoryItem {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  on_time_deliveries: number;
  delayed_deliveries: number;
  contradiction_count: number;
  historical_reliability: number;
  quality_rating: number;
  last_disruption_notes: string;
}

// ─── PRODUCTION CAPACITY & BOTTLENECK DOMAIN MODEL ───

export interface ProductionComponentRequirement {
  part_id: string;
  display_name: string;
  category: Category;
  criticality: CriticalityLevel;
  quantity_per_vehicle: number;
  min_quantity: number;
  max_quantity: number;
  required_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  on_order_quantity: number;
  effective_quantity: number;
  producible_units: number;
  shortage_quantity: number;
  status: VisualStatus;
  production_impact_vehicles: number;
  is_bottleneck: boolean;
}

export interface ProductionBottleneck {
  part_id: string;
  display_name: string;
  category: Category;
  criticality: CriticalityLevel;
  producible_units: number;
  shortage_quantity: number;
  production_impact_vehicles: number;
  supplier_name: string;
  lead_time_days: number;
  supplier_reliability: number;
  unit_cost: number;
  total_shortage_cost: number;
  severity: 'PRIMARY' | 'SECONDARY';
}

export interface ProductionPlan {
  id: string;
  product: string;
  variant: string;
  target_quantity: number;
  deadline_days: number;
  priority: 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW';
  created_at: string;
  components: ProductionComponentRequirement[];
  maximum_producible: number;
  target_shortfall: number;
  primary_bottleneck: ProductionBottleneck | null;
  secondary_bottlenecks: ProductionBottleneck[];
  production_status: 'PRODUCTION_READY' | 'PRODUCTION_AT_RISK' | 'RECOVERY_IN_PROGRESS' | 'HALTED';
  recovery_status: 'NOT_REQUIRED' | 'RECOVERY_NEEDED' | 'RECOVERY_IN_PROGRESS' | 'RECOVERED';
  total_avoided_loss_rupees: number;
}
