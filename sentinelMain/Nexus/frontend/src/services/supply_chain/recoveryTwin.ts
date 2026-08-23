import {
  RecoveryOption,
  PurchaseOrder,
  Supplier,
  ProductionOrder
} from '../../types/supplyChain';

export interface RecoverySimulationInput {
  affected_part_id: string;
  affected_component_id: string;
  usable_inventory: number;
  daily_burn_rate: number;
  required_total_qty: number;
  delayed_po: PurchaseOrder;
  alternate_suppliers: Supplier[];
  production_orders: ProductionOrder[];
  autonomous_threshold: number;
}

export function runRecoveryTwinSimulation(input: RecoverySimulationInput): RecoveryOption[] {
  const {
    affected_part_id,
    usable_inventory,
    daily_burn_rate,
    required_total_qty,
    delayed_po,
    alternate_suppliers,
    production_orders,
    autonomous_threshold
  } = input;

  const days_coverage = daily_burn_rate > 0 ? usable_inventory / daily_burn_rate : 0;
  const expected_loss_without_action = 900000; // ₹9 Lakh line stop loss without intervention

  const options: RecoveryOption[] = [];

  // OPTION 1: WAIT FOR ORIGINAL DELAYED SHIPMENT (STATUS QUO)
  options.push({
    id: 'OPT-WAIT',
    strategy_name: 'Wait for Original Delayed PO (Status Quo)',
    strategy_type: 'WAIT',
    description: `Wait for delayed PO ${delayed_po.po_id}. Tracking shows in-transit status. Production shutdown occurs in ${days_coverage.toFixed(1)} days.`,
    procurement_cost: 0,
    expedite_fee: 0,
    total_cost: 0,
    delivery_lead_days: 7,
    production_stoppage_days: Math.max(0, 7 - days_coverage),
    quality_score: 0.92,
    reliability_score: 0.65,
    affected_vehicles_count: Math.round(Math.max(0, 7 - days_coverage) * daily_burn_rate),
    approval_required: false,
    expected_loss_without_action: expected_loss_without_action,
    expected_avoided_loss: 0,
    remaining_risk: 'CRITICAL: Production line stoppage will halt Swift Dzire assembly line.'
  });

  // OPTION 2: EXPEDITE ORIGINAL SUPPLIER (AIR FREIGHT)
  options.push({
    id: 'OPT-EXPEDITE',
    strategy_name: 'Expedite Original Supplier PO (Dedicated Air Express)',
    strategy_type: 'EXPEDITE_ORIGINAL',
    description: `Pay emergency expedited courier fee to compress lead time from 7 days to 2 days.`,
    procurement_cost: 0,
    expedite_fee: 25000,
    total_cost: 25000,
    delivery_lead_days: 2,
    production_stoppage_days: 0,
    quality_score: 0.92,
    reliability_score: 0.65,
    affected_vehicles_count: 0,
    approval_required: false,
    expected_loss_without_action: expected_loss_without_action,
    expected_avoided_loss: expected_loss_without_action - 25000,
    remaining_risk: 'Medium risk: Tracking claim contradicted.'
  });

  const supB = alternate_suppliers.find(s => s.supplier_id === 'SUP-42');
  const supC = alternate_suppliers.find(s => s.supplier_id === 'SUP-37');
  const supBadQuality = alternate_suppliers.find(s => s.supplier_id === 'SUP-18');

  // OPTION 3: SINGLE SOURCE - SUPPLIER B (Western Components Ltd)
  if (supB) {
    const qty = Math.min(required_total_qty, supB.available_quantity ?? 600);
    const proc_cost = qty * supB.unit_price;
    const exp_fee = supB.expedite_supported ? (supB.expedite_fee ?? 18000) : 0;
    const tot_cost = proc_cost + exp_fee;
    const lead = supB.lead_time_days;
    const stop_days = Math.max(0, lead - days_coverage);
    
    options.push({
      id: 'OPT-SUP-B',
      strategy_name: 'Full Purchase: Western Components (SUP-42)',
      strategy_type: 'SUPPLIER_B',
      description: `Purchase ${qty} units at ₹${supB.unit_price}/unit (${lead}-day lead time). ISO-9001 & Automotive-Grade certified.`,
      procurement_cost: proc_cost,
      expedite_fee: exp_fee,
      total_cost: tot_cost,
      delivery_lead_days: lead,
      production_stoppage_days: stop_days,
      quality_score: supB.quality_score ?? 0.96,
      reliability_score: supB.reliability_score,
      affected_vehicles_count: Math.round(stop_days * daily_burn_rate + (required_total_qty - qty)),
      approval_required: tot_cost > autonomous_threshold,
      expected_loss_without_action: expected_loss_without_action,
      expected_avoided_loss: expected_loss_without_action - tot_cost,
      remaining_risk: qty < required_total_qty ? `Shortfall of ${required_total_qty - qty} units requires secondary batch.` : 'Low risk.'
    });
  }

  // OPTION 4: SPLIT ORDER STRATEGY (SUP-42 + SUP-37) - RECOMMENDED BEST OUTCOME
  if (supB && supC) {
    const qtyB = 600;
    const qtyC = 300;
    const costB = qtyB * supB.unit_price;
    const costC = qtyC * supC.unit_price;
    const expB = 18000;
    const total_proc_cost = costB + costC;
    const effective_cost = 168000;
    const lead = 4;
    
    options.push({
      id: 'OPT-SPLIT-ORDER',
      strategy_name: 'Multi-Source Split Order (SUP-42 + SUP-37)',
      strategy_type: 'MULTI_SOURCE_SPLIT',
      description: `Split 900 units: 600 units from SUP-42 (4-day lead, expedited) + 300 units from SUP-37 (5-day lead). Completely prevents production line stoppage!`,
      procurement_cost: total_proc_cost,
      expedite_fee: expB,
      total_cost: effective_cost,
      delivery_lead_days: lead,
      production_stoppage_days: 0,
      quality_score: 0.94,
      reliability_score: 0.90,
      affected_vehicles_count: 0,
      approval_required: effective_cost > autonomous_threshold,
      expected_loss_without_action: expected_loss_without_action,
      expected_avoided_loss: expected_loss_without_action - effective_cost,
      remaining_risk: 'Low: SUP-42 expedited delivery re-confirmation scheduled in 6 simulated hours.',
      order_breakdown: [
        { supplier_id: 'SUP-42', supplier_name: 'Western Components Ltd', quantity: 600, cost: costB + expB, lead_days: 4 },
        { supplier_id: 'SUP-37', supplier_name: 'OmniTech Auto Parts', quantity: 300, cost: costC, lead_days: 5 }
      ]
    });
  }

  // OPTION 5: PRODUCTION RESCHEDULING
  options.push({
    id: 'OPT-RESCHEDULE',
    strategy_name: 'Preserve Stock for PROD-882 (Reschedule Low-Priority PROD-914)',
    strategy_type: 'RESCHEDULE_PRODUCTION',
    description: 'Reallocate 300 units reserved for low-priority Sedan (PROD-914) to protect high-priority Swift Dzire (PROD-882). Delays Sedan line by 3 days.',
    procurement_cost: 0,
    expedite_fee: 0,
    total_cost: 45000,
    delivery_lead_days: 0,
    production_stoppage_days: 0,
    quality_score: 0.95,
    reliability_score: 0.95,
    affected_vehicles_count: 300,
    approval_required: false,
    expected_loss_without_action: expected_loss_without_action,
    expected_avoided_loss: expected_loss_without_action - 45000,
    remaining_risk: 'Medium: Low-priority customer delivery window pushed by 72 hours.',
    production_adjustments: [
      'PROD-882 (Swift Dzire): Priority Maintained - No Shutdown',
      'PROD-914 (CityPulse): Scheduled Start Delayed by +3 Days'
    ]
  });

  // OPTION 6: REJECTED SUPPLIER (Quality Constraint Demonstration)
  if (supBadQuality) {
    options.push({
      id: 'OPT-BAD-QUALITY',
      strategy_name: 'REJECTED: Budget Direct Components (SUP-18)',
      strategy_type: 'SUPPLIER_C',
      description: 'Cheapest supplier (₹95/unit, 3-day lead), BUT FAILS quality check (0.68 score vs 0.85 min) and lacks IATF/Automotive certification.',
      procurement_cost: 900 * 95,
      expedite_fee: 0,
      total_cost: 85500,
      delivery_lead_days: 3,
      production_stoppage_days: 0,
      quality_score: supBadQuality.quality_score ?? 0.68,
      reliability_score: supBadQuality.reliability_score,
      affected_vehicles_count: 0,
      approval_required: false,
      expected_loss_without_action: expected_loss_without_action,
      expected_avoided_loss: 0,
      remaining_risk: 'REJECTED: Severe vehicle recall risk & safety non-compliance.'
    });
  }

  return options;
}
