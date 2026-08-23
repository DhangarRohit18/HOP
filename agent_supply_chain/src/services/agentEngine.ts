import {
  Part,
  InventoryItem,
  PurchaseOrder,
  Supplier,
  ProductionOrder,
  SupplierMessage,
  ShipmentTracking,
  RecoveryOption,
  ApprovalBrief,
  AgentEvent,
  AuditLogEntry,
  DisruptionState,
  VisualStatus,
  SupplierMemoryItem,
  BlastRadius,
  SupplierConcentration,
  ProductionPlan
} from '../types/supplyChain';

import { verifySupplierClaim, VerificationResult } from './verificationEngine';
import { runRecoveryTwinSimulation } from './recoveryTwin';
import { calculateProductionPlan } from './capacityEngine';

export interface AgentCoreState {
  parts: Part[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  productionOrders: ProductionOrder[];
  messages: SupplierMessage[];
  tracking: ShipmentTracking[];
  supplierMemory: SupplierMemoryItem[];
  disruptionState: DisruptionState;
  events: AgentEvent[];
  auditTrail: AuditLogEntry[];
  approvalBrief: ApprovalBrief | null;
  autonomousThreshold: number;
  simulatedTime: string;
  activePlan?: ProductionPlan;
}

export class SupplyShieldAgent {
  private state: AgentCoreState;

  constructor(initialState: AgentCoreState) {
    this.state = initialState;
    this.recalculateProductionCapacity(1000);
  }

  public getState(): AgentCoreState {
    return this.state;
  }

  public setState(partialState: Partial<AgentCoreState>): void {
    this.state = { ...this.state, ...partialState };
  }

  private getFormattedTime(): string {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  }

  public addEvent(
    type: AgentEvent['type'],
    message: string,
    part_id?: string,
    status?: VisualStatus,
    severity?: AgentEvent['severity'],
    details?: any
  ): AgentEvent {
    const event: AgentEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      time_formatted: this.getFormattedTime(),
      type,
      part_id,
      status,
      severity,
      message,
      details
    };
    this.state.events = [event, ...this.state.events];
    return event;
  }

  // Recalculate Capacity and Synchronize 3D Digital Twin State
  public recalculateProductionCapacity(
    targetQuantity: number = 1000,
    customBomMap?: Record<string, number>
  ): ProductionPlan {
    const plan = calculateProductionPlan(
      targetQuantity,
      this.state.parts,
      this.state.inventory,
      this.state.suppliers,
      this.state.purchaseOrders,
      this.state.activePlan?.id || 'PLAN-2026-AWD',
      this.state.activePlan?.product || 'CyberSUV AWD Electric Vehicle',
      this.state.activePlan?.variant || 'Dual-Motor Performance (85 kWh)',
      this.state.activePlan?.deadline_days || 7,
      customBomMap
    );

    // Sync each part's status with capacity requirement
    plan.components.forEach((comp) => {
      const part = this.state.parts.find((p) => p.part_id === comp.part_id);
      if (part) {
        if (comp.is_bottleneck && comp.on_order_quantity === 0) {
          part.status = 'RED';
          part.severity = 0.98;
          part.reason = `Primary Bottleneck: limits production to ${comp.producible_units} of ${targetQuantity} vehicles.`;
        } else if (comp.on_order_quantity > 0 && comp.shortage_quantity > 0) {
          part.status = 'BLUE';
          part.severity = 0.5;
          part.reason = `Recovery PO active: ${comp.on_order_quantity} units in transit.`;
        } else if (comp.producible_units < targetQuantity * 1.1) {
          part.status = 'YELLOW';
          part.severity = 0.4;
          part.reason = `Tight safety stock runway (${comp.producible_units} units available).`;
        } else {
          part.status = 'GREEN';
          part.severity = 0.0;
          part.reason = `Sufficient inventory (${comp.available_quantity} units) for target.`;
        }
      }
    });

    this.state.activePlan = plan;
    return plan;
  }

  // Calculate Supply-Chain Blast Radius
  public calculateBlastRadius(partId: string): BlastRadius {
    const part = this.state.parts.find(p => p.part_id === partId);
    const criticality = part?.criticality || 'IMPORTANT';

    return {
      affected_parts_count: 1,
      affected_models: ['CyberSUV AWD', 'CyberSedan Performance'],
      line_stop_estimated_days: 6,
      total_vehicles_at_risk: criticality === 'CRITICAL' ? 250 : 120,
      financial_exposure_rupees: criticality === 'CRITICAL' ? 1800000 : 900000
    };
  }

  // Calculate Supplier Concentration Risk
  public calculateSupplierConcentration(supplierId: string = 'SUP-21'): SupplierConcentration {
    return {
      total_single_source_parts: 3,
      high_risk_suppliers_count: 1,
      dominant_supplier_share_pct: 85,
      concentration_score: 'HIGH'
    };
  }

  // 1. MONITOR & DETECT DISRUPTION
  public runDisruptionScan(targetPartId: string = 'LEFT_HEADLIGHT'): DisruptionState {
    const part = this.state.parts.find(p => p.part_id === targetPartId);
    const inv = this.state.inventory.find(i => i.part_id === targetPartId);
    const po = this.state.purchaseOrders.find(p => p.part_id === targetPartId && p.status !== 'completed');
    const msg = this.state.messages.find(m => m.supplier_id === po?.supplier_id);
    const tracking = this.state.tracking.find(t => t.po_id === po?.po_id);

    this.addEvent(
      'DISRUPTION_DETECTED',
      `⚠ Disruption detected on ${part?.display_name || targetPartId} [${part?.criticality || 'IMPORTANT'}]`,
      targetPartId,
      'RED',
      'CRITICAL'
    );

    if (part) {
      part.status = 'RED';
      part.severity = part.criticality === 'CRITICAL' ? 0.98 : 0.94;
      part.reason = `Supplier delay on PO ${po?.po_id || 'PO-7712'}. Usable stock: 0 units.`;
    }

    const blastRadius = this.calculateBlastRadius(targetPartId);
    const concentration = this.calculateSupplierConcentration(po?.supplier_id || 'SUP-21');

    this.addEvent(
      'BLAST_RADIUS_CALCULATED',
      `🎯 Calculated Blast Radius: ${blastRadius.total_vehicles_at_risk ?? 120} Vehicles at risk • ₹${((blastRadius.financial_exposure_rupees ?? 900000) / 100000).toFixed(2)} Lakh Financial Exposure.`,
      targetPartId
    );

    const verification: VerificationResult = verifySupplierClaim(msg, tracking);
    this.addEvent(
      'TRACKING_VERIFIED',
      `📡 Verification result for PO ${po?.po_id}: Claim = "${verification.claim}", Tracking = "${verification.tracking_status}". Confidence = ${(verification.confidence * 100).toFixed(0)}%. (${verification.reason})`,
      targetPartId
    );

    this.addEvent('RECOVERY_SIMULATION_STARTED', `🧠 Simulating recovery strategies in Digital Twin...`, targetPartId, 'PURPLE');

    const options: RecoveryOption[] = runRecoveryTwinSimulation({
      affected_part_id: targetPartId,
      affected_component_id: inv?.component_id || 'COMP-104',
      usable_inventory: inv?.usable_stock || 0,
      daily_burn_rate: inv?.daily_usage || 90,
      required_total_qty: 900,
      delayed_po: po || this.state.purchaseOrders[0],
      alternate_suppliers: this.state.suppliers,
      production_orders: this.state.productionOrders,
      autonomous_threshold: this.state.autonomousThreshold
    });

    const validOptions = options.filter(o => o.quality_score >= 0.85);
    const selectedOption = validOptions.find(o => o.id === 'OPT-SPLIT-ORDER') || validOptions[0];

    this.addEvent(
      'RECOVERY_PLAN_SELECTED',
      `⭐ Selected Strategy: "${selectedOption.strategy_name}". Avoids ₹${(selectedOption.expected_avoided_loss / 100000).toFixed(2)} Lakh disruption loss with 0 stoppage.`,
      targetPartId,
      'BLUE'
    );

    if (part) {
      part.status = 'BLUE';
      part.reason = 'Recovery plan active: Multi-source split order placement.';
    }

    let approvalBrief: ApprovalBrief | null = null;
    if (selectedOption.total_cost > this.state.autonomousThreshold) {
      approvalBrief = {
        disruption_id: `DIS-${Date.now()}`,
        part_id: targetPartId,
        selected_strategy: selectedOption.strategy_name,
        procurement_cost: selectedOption.total_cost,
        threshold_exceeded_by: selectedOption.total_cost - this.state.autonomousThreshold,
        supplier_name: 'Apex Photonics Ltd / Western Components',
        lead_time_days: selectedOption.delivery_lead_days,
        line_stop_loss_avoided: selectedOption.expected_avoided_loss,
        roi_ratio: Number((selectedOption.expected_avoided_loss / selectedOption.total_cost).toFixed(2)),
        summary: `Emergency order of ₹${selectedOption.total_cost.toLocaleString()} exceeds autonomous threshold by ₹${(selectedOption.total_cost - this.state.autonomousThreshold).toLocaleString()}. Avoids ₹${(selectedOption.expected_avoided_loss / 100000).toFixed(2)} Lakh line stoppage loss.`
      };

      this.state.approvalBrief = approvalBrief;

      this.addEvent(
        'APPROVAL_REQUESTED',
        `🔐 APPROVAL REQUIRED: Total emergency cost (₹${selectedOption.total_cost.toLocaleString()}) exceeds autonomous limit (₹${this.state.autonomousThreshold.toLocaleString()}).`,
        targetPartId,
        'BLUE',
        'HIGH'
      );
    } else {
      this.executePlan(selectedOption, targetPartId);
    }

    const disruptionState: DisruptionState = {
      is_active: true,
      disruption_id: `DIS-${Date.now()}`,
      part_id: targetPartId,
      component_id: inv?.component_id || 'COMP-104',
      criticality: part?.criticality || 'IMPORTANT',
      affected_supplier_id: po?.supplier_id,
      description: `PO ${po?.po_id} delay on ${part?.display_name}. Usable stock: 0 units.`,
      usable_stock: 0,
      daily_usage: inv?.daily_usage || 90,
      days_coverage: 0,
      affected_vehicles: blastRadius.total_vehicles_at_risk,
      blast_radius: blastRadius,
      supplier_concentration: concentration,
      supplier_claim_verification: {
        claim: verification.claim,
        verification: verification.verification,
        confidence: verification.confidence,
        tracking_status: verification.tracking_status
      },
      selected_plan: selectedOption,
      approval_brief: approvalBrief || undefined
    };

    this.state.disruptionState = disruptionState;
    this.recalculateProductionCapacity(1000);
    return disruptionState;
  }

  // 2. DETERMINISTIC GOLDEN DEMO FLOW (3-MINUTE CAPACITY & RECOVERY RESTORATION)
  public runGoldenDemo(): void {
    // 1. Initial State: Target 1000 vehicles, ECU available stock = 850
    const ecuInv = this.state.inventory.find(i => i.part_id === 'ECU');
    if (ecuInv) {
      ecuInv.available_stock = 850;
      ecuInv.usable_stock = 850;
      ecuInv.reserved_stock = 0;
      ecuInv.on_order_stock = 0;
      ecuInv.incoming_stock = 0;
    }

    const ecuPart = this.state.parts.find(p => p.part_id === 'ECU');
    if (ecuPart) {
      ecuPart.status = 'RED';
      ecuPart.severity = 0.98;
      ecuPart.reason = 'Primary Bottleneck: 850 units available (Shortfall: 150 vehicles against 1,000 target).';
    }

    this.addEvent(
      'BOTTLENECK_DETECTED',
      '🔴 PRIMARY BOTTLENECK: Autonomous Drive Controller (ECU) limits CyberSUV assembly to 850 / 1,000 vehicles.',
      'ECU',
      'RED',
      'CRITICAL'
    );

    // Recalculate capacity
    this.recalculateProductionCapacity(1000);
  }

  // 3. COMPLETE RECOVERY & RESTORE CAPACITY
  public executeBottleneckRecovery(partId: string = 'ECU'): void {
    const inv = this.state.inventory.find(i => i.part_id === partId);
    if (inv) {
      // Step 1: PO Placed
      inv.on_order_stock = 200;
      const part = this.state.parts.find(p => p.part_id === partId);
      if (part) {
        part.status = 'BLUE';
        part.reason = 'Emergency Multi-Source Split PO dispatched (200 units in transit).';
      }

      this.addEvent(
        'PO_CREATED',
        `📦 Emergency Purchase Order PO-ECU-SPLIT created: 200 units dispatched via Air Express.`,
        partId,
        'BLUE'
      );

      // Step 2: Auto-receive shipment to restore stock to 1050
      setTimeout(() => {
        inv.available_stock = 1050;
        inv.usable_stock = 1050;
        inv.on_order_stock = 0;
        inv.incoming_stock = 0;

        if (part) {
          part.status = 'GREEN';
          part.severity = 0.0;
          part.reason = 'Recovered: 1,050 units available. 100% Target Met.';
        }

        this.addEvent(
          'PART_RECOVERED',
          `✅ PRODUCTION RESTORED: ECU inventory updated to 1,050 units. Maximum production restored to 1,050 / 1,000 vehicles.`,
          partId,
          'GREEN'
        );

        this.recalculateProductionCapacity(1000);
      }, 1500);
    }
  }

  public handleApprovalDecision(approved: boolean): void {
    if (!this.state.approvalBrief) return;

    if (approved) {
      const plan = this.state.approvalBrief.selected_strategy;
      const partId = this.state.approvalBrief.part_id;

      this.addEvent('ERP_UPDATED', `👤 Human Approval Granted. Synchronizing ERP and placing POs...`, partId, 'BLUE');
      this.executeBottleneckRecovery(partId);
      this.state.approvalBrief = null;
    } else {
      const partId = this.state.approvalBrief.part_id;
      this.addEvent('REPLANNING_TRIGGERED', `❌ Human Approval Rejected. Autonomous Replanning initiated...`, partId, 'PURPLE');
      this.state.approvalBrief = null;
    }
  }

  private executePlan(plan: RecoveryOption, partId: string): void {
    const newPO: PurchaseOrder = {
      po_id: `PO-EMERGENCY-${Date.now()}`,
      component_id: 'COMP-104',
      part_id: partId,
      supplier_id: 'SUP-42',
      supplier_name: 'Apex Photonics Ltd / Western Sourcing',
      quantity: 300,
      expected_delivery: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      status: 'dispatched',
      unit_price: 1200,
      total_value: plan.total_cost,
      approval_required_above: this.state.autonomousThreshold
    };
    this.state.purchaseOrders.push(newPO);

    const part = this.state.parts.find(p => p.part_id === partId);
    if (part) {
      part.status = 'GREEN';
      part.severity = 0.0;
      part.reason = 'Recovered: Emergency split order active. Production lines secured.';
    }

    this.addEvent('PART_RECOVERED', `✅ PART RECOVERED: ${part?.display_name || partId} returned to GREEN status. Production lines safe.`, partId, 'GREEN');
    this.addEvent('ERP_UPDATED', `💾 ERP Synchronized: Emergency purchase orders placed.`, partId, 'GREEN');

    const auditEntry: AuditLogEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      disruption_id: this.state.disruptionState.disruption_id || 'DIS-001',
      part_id: partId,
      category: part?.category || 'LIGHTING',
      criticality: part?.criticality || 'IMPORTANT',
      event_name: 'SUPPLY_CHAIN_DISRUPTION_RESOLVED',
      action_by: this.state.approvalBrief?.summary ? 'HUMAN_OPERATOR' : 'SUPPLYSHIELD_AGENT',
      data_checked: 'Inventory, PO delivery dates, tracking GPS logs, alternate vendor catalog, production deadlines.',
      supplier_communications: 'Contacted SUP-21 (delayed), SUP-42 (expedited RFQ), SUP-37 (split lot RFQ).',
      verification_result: 'SUP-21 dispatch claim contradicted by tracking.',
      alternatives_considered_count: 6,
      selected_strategy: plan.strategy_name,
      decision_reason: plan.description,
      cost: plan.total_cost,
      avoided_loss: plan.expected_avoided_loss,
      erp_changes: [
        `Created Emergency PO (SUP-42, 300 units)`,
        `Updated 3D Digital Twin visual state to GREEN`,
        `Production Capacity Restored to 100% Target`
      ],
      remaining_risk: plan.remaining_risk
    };

    this.state.auditTrail.unshift(auditEntry);
  }
}
