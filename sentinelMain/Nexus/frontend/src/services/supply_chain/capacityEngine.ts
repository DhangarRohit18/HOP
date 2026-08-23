import {
  Part,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  ProductionPlan,
  ProductionComponentRequirement,
  ProductionBottleneck
} from '../../types/supplyChain';

export const DEFAULT_BOM_MAP: Record<string, number> = {
  MOTOR_DRIVE: 1,
  INVERTER: 1,
  BATTERY: 1,
  BMS: 1,
  BRAKE_FRONT_LEFT: 1,
  BRAKE_FRONT_RIGHT: 1,
  ABS_CONTROLLER: 1,
  STEERING_SYSTEM: 1,
  VCU: 1,
  ECU: 1,
  SENSOR_FRONT: 2,
  CAMERA_FRONT: 1,
  LEFT_HEADLIGHT: 1,
  RIGHT_HEADLIGHT: 1,
  WHEEL_FL: 1,
  WHEEL_FR: 1,
  WHEEL_RL: 1,
  WHEEL_RR: 1,
  TIRE_FL: 1,
  TIRE_FR: 1,
  BATTERY_COOLING: 1,
  HVAC_COMPRESSOR: 1,
  FRONT_BUMPER: 1,
  REAR_BUMPER: 1,
  HOOD: 1,
  DOORS: 1,
  SEATS: 1
};

export function calculateProductionPlan(
  targetQuantity: number,
  parts: Part[],
  inventory: InventoryItem[],
  suppliers: Supplier[],
  purchaseOrders: PurchaseOrder[],
  planId: string = 'PLAN-2026-AWD',
  productName: string = 'Swift Dzire Petrol/CNG Sedan',
  variant: string = 'Dual-Motor Performance (85 kWh)',
  deadlineDays: number = 7,
  customBomMap?: Record<string, number>
): ProductionPlan {
  const bomMap = customBomMap || DEFAULT_BOM_MAP;

  const componentRequirements: ProductionComponentRequirement[] = parts.map((part) => {
    const inv = inventory.find((i) => i.part_id === part.part_id);
    const qtyPerVehicle = bomMap[part.part_id] || 1;
    const requiredQty = targetQuantity * qtyPerVehicle;

    const availableStock = inv?.available_stock ?? inv?.usable_stock ?? 0;
    const reservedStock = inv?.reserved_stock ?? 0;
    const usableStock = Math.max(0, availableStock - reservedStock);
    const incomingStock = inv?.incoming_stock ?? 0;
    const onOrderStock = inv?.on_order_stock ?? 0;
    const effectiveStock = usableStock + incomingStock + onOrderStock;

    const producibleUnits = Math.floor(usableStock / qtyPerVehicle);
    const shortageQty = Math.max(0, requiredQty - usableStock);
    const productionImpact = Math.max(0, targetQuantity - producibleUnits);

    let status = part.status;
    if (shortageQty > 0) {
      status = onOrderStock > 0 ? 'BLUE' : 'RED';
    } else if (producibleUnits < targetQuantity * 1.1) {
      status = 'YELLOW';
    } else {
      status = 'GREEN';
    }

    return {
      part_id: part.part_id,
      display_name: part.display_name,
      category: part.category,
      criticality: part.criticality,
      quantity_per_vehicle: qtyPerVehicle,
      min_quantity: 1,
      max_quantity: 4,
      required_quantity: requiredQty,
      available_quantity: availableStock,
      reserved_quantity: reservedStock,
      incoming_quantity: incomingStock,
      on_order_quantity: onOrderStock,
      effective_quantity: effectiveStock,
      producible_units: producibleUnits,
      shortage_quantity: shortageQty,
      status,
      production_impact_vehicles: productionImpact,
      is_bottleneck: false
    };
  });

  // Calculate maximum production
  const maxProducible = Math.min(...componentRequirements.map((c) => c.producible_units));
  const targetShortfall = Math.max(0, targetQuantity - maxProducible);

  // Identify Bottlenecks
  let primaryBottleneck: ProductionBottleneck | null = null;
  const secondaryBottlenecks: ProductionBottleneck[] = [];

  const bottleneckComponents = componentRequirements
    .filter((c) => c.producible_units < targetQuantity)
    .sort((a, b) => a.producible_units - b.producible_units);

  bottleneckComponents.forEach((c, idx) => {
    c.is_bottleneck = true;
    const sup = suppliers.find((s) => s.part_id === c.part_id || s.supplier_id === parts.find((p) => p.part_id === c.part_id)?.supplier_id);
    const inv = inventory.find((i) => i.part_id === c.part_id);
    const unitCost = inv?.unit_cost ?? sup?.unit_price ?? 2400;

    const bottleneckObj: ProductionBottleneck = {
      part_id: c.part_id,
      display_name: c.display_name,
      category: c.category,
      criticality: c.criticality,
      producible_units: c.producible_units,
      shortage_quantity: c.shortage_quantity,
      production_impact_vehicles: c.production_impact_vehicles,
      supplier_name: sup?.supplier_name || 'Primary Supplier',
      lead_time_days: sup?.lead_time_days || 7,
      supplier_reliability: sup?.reliability_score || 0.85,
      unit_cost: unitCost,
      total_shortage_cost: c.shortage_quantity * unitCost,
      severity: idx === 0 ? 'PRIMARY' : 'SECONDARY'
    };

    if (idx === 0) {
      primaryBottleneck = bottleneckObj;
    } else {
      secondaryBottlenecks.push(bottleneckObj);
    }
  });

  let productionStatus: ProductionPlan['production_status'] = 'PRODUCTION_READY';
  let recoveryStatus: ProductionPlan['recovery_status'] = 'NOT_REQUIRED';

  if (targetShortfall > 0) {
    const hasActiveRecovery = bottleneckComponents.some((b) => b.on_order_quantity > 0 || b.incoming_quantity > 0);
    productionStatus = hasActiveRecovery ? 'RECOVERY_IN_PROGRESS' : 'PRODUCTION_AT_RISK';
    recoveryStatus = hasActiveRecovery ? 'RECOVERY_IN_PROGRESS' : 'RECOVERY_NEEDED';
  }

  return {
    id: planId,
    product: productName,
    variant,
    target_quantity: targetQuantity,
    deadline_days: deadlineDays,
    priority: 'CRITICAL',
    created_at: new Date().toISOString(),
    components: componentRequirements,
    maximum_producible: maxProducible,
    target_shortfall: targetShortfall,
    primary_bottleneck: primaryBottleneck,
    secondary_bottlenecks: secondaryBottlenecks,
    production_status: productionStatus,
    recovery_status: recoveryStatus,
    total_avoided_loss_rupees: targetShortfall * 8880 // ₹13.32 Lakh for 150 vehicles
  };
}
