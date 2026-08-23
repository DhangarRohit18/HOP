import React, { useState, useEffect } from 'react';
import {
  INITIAL_PARTS,
  INITIAL_INVENTORY,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SUPPLIER_CATALOG,
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_MESSAGES,
  INITIAL_TRACKING,
  INITIAL_SUPPLIER_MEMORY
} from '../../data/initialState';
import { SupplyShieldAgent } from '../../services/supply_chain/agentEngine';
import { createNewPurchaseOrder } from '../../services/supply_chain/orderEngine';
import {
  Part,
  InventoryItem,
  Supplier,
  RecoveryOption,
  Category,
  PurchaseOrder,
  ProductionOrder
} from '../../types/supplyChain';

import { Header } from '../../components/supply_chain/Header';
import { DigitalTwinToolbar } from '../../components/supply_chain/DigitalTwin/DigitalTwinToolbar';
import { Vehicle3DViewer } from '../../components/supply_chain/DigitalTwin/Vehicle3DViewer';
import { ComponentInfoPanel } from '../../components/supply_chain/ComponentInfoPanel';
import { AutomotiveComponentsDashboard } from '../../components/supply_chain/AutomotiveComponentsDashboard';
import { AllQRCodesCatalog } from '../../components/supply_chain/AllQRCodesCatalog';
import { QRPrintSheet } from '../../components/supply_chain/QRPrintSheet';
import { LiveQRComponentView } from '../../components/supply_chain/LiveQRComponentView';
import { AddComponentModal } from '../../components/supply_chain/AddComponentModal';
import { CreatePOModal } from '../../components/supply_chain/CreatePOModal';
import { SambaNovaChat } from '../../components/supply_chain/SambaNovaChat';
import { DisruptionSummary } from '../../components/supply_chain/DisruptionSummary';
import { ActivityStream } from '../../components/supply_chain/ActivityStream';
import { BlastRadiusPanel } from '../../components/supply_chain/BlastRadiusPanel';
import { RecoveryTwinMatrix } from '../../components/supply_chain/RecoveryTwinMatrix';
import { ApprovalModal } from '../../components/supply_chain/ApprovalModal';
import { ScenarioInjector } from '../../components/supply_chain/ScenarioInjector';
import { ERPExplorer } from '../../components/supply_chain/ERPExplorer';
import { DecisionReport } from '../../components/supply_chain/DecisionReport';
import { ProductionCockpit } from '../../components/supply_chain/ProductionCockpit';
import { ProductionPlanModal } from '../../components/supply_chain/ProductionPlanModal';
import { BeforeAfterRecoveryComparison } from '../../components/supply_chain/BeforeAfterRecoveryComparison';
import {
  Car,
  Table,
  Layers,
  Database,
  ShieldAlert,
  Sparkles,
  QrCode,
  Printer,
  Zap,
  Shield,
  SlidersHorizontal,
  Pause,
  Play,
  FastForward,
  RefreshCw,
  Clock,
  TrendingUp
} from 'lucide-react';

type DashboardView =
  | '3D_TWIN'
  | 'COMPONENTS_MATRIX'
  | 'QR_CATALOG'
  | 'QR_PRINT_SHEET'
  | 'RECOVERY_MATRIX'
  | 'ERP_AUDIT'
  | 'LIVE_QR_VIEW';

export const SupplyChainPage: React.FC = () => {
  // Initialize Autonomous Agent & Supply Chain State
  const [agent] = useState<SupplyShieldAgent>(() => {
    return new SupplyShieldAgent({
      parts: [...INITIAL_PARTS],
      inventory: [...INITIAL_INVENTORY],
      purchaseOrders: [...INITIAL_PURCHASE_ORDERS],
      suppliers: [...INITIAL_SUPPLIER_CATALOG],
      productionOrders: [...INITIAL_PRODUCTION_ORDERS],
      messages: [...INITIAL_MESSAGES],
      tracking: [...INITIAL_TRACKING],
      supplierMemory: [...INITIAL_SUPPLIER_MEMORY],
      disruptionState: { is_active: false },
      events: [],
      auditTrail: [],
      approvalBrief: null,
      autonomousThreshold: 150000,
      simulatedTime: new Date().toISOString()
    });
  });

  const [agentState, setAgentState] = useState(() => agent.getState());
  const [currentView, setCurrentView] = useState<DashboardView>('3D_TWIN');
  const [selectedPartId, setSelectedPartId] = useState<string | null>('LEFT_HEADLIGHT');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState<boolean>(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState<boolean>(false);
  const [explodedView, setExplodedView] = useState<boolean>(false);
  const [simulating, setSimulating] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [executiveMode, setExecutiveMode] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Active Production Plan
  const activePlan = agentState.activePlan || agent.recalculateProductionCapacity(1000);

  const handleUpdatePlan = (
    targetQuantity: number,
    productName: string,
    variant: string,
    deadlineDays: number,
    bomMap: Record<string, number>
  ) => {
    agent.setState({
      activePlan: {
        ...activePlan,
        target_quantity: targetQuantity,
        product: productName,
        variant,
        deadline_days: deadlineDays
      }
    });
    agent.recalculateProductionCapacity(targetQuantity, bomMap);
    setAgentState({ ...agent.getState() });
  };

  const handleRunGoldenDemo = () => {
    agent.runGoldenDemo();
    setSelectedPartId('ECU');
    setAgentState({ ...agent.getState() });
  };

  const handleExecuteBottleneckRecovery = () => {
    agent.executeBottleneckRecovery('ECU');
    setAgentState({ ...agent.getState() });
  };

  // Check URL pathname for /component/:partId, /components/qr, /qr-sheet
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/component/')) {
      const pId = path.replace('/component/', '').toUpperCase();
      if (pId) {
        setSelectedPartId(pId);
        setCurrentView('LIVE_QR_VIEW');
      }
    } else if (path === '/components/qr') {
      setCurrentView('QR_CATALOG');
    } else if (path === '/qr-sheet') {
      setCurrentView('QR_PRINT_SHEET');
    }
  }, []);

  // Auto scan on initial mount
  useEffect(() => {
    agent.runDisruptionScan('LEFT_HEADLIGHT');
    setAgentState({ ...agent.getState() });
  }, [agent]);

  // Simulation Clock Tick
  useEffect(() => {
    if (!simulating) return;
    const interval = setInterval(() => {
      setAgentState({ ...agent.getState() });
    }, 2000);
    return () => clearInterval(interval);
  }, [simulating, agent]);

  // Component Selection Handler
  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
    if (partId) {
      setIsPanelOpen(true);
      agent.calculateBlastRadius(partId);
    }
    setAgentState({ ...agent.getState() });
  };

  const handleSelectCategory = (cat: Category | 'ALL') => {
    setSelectedCategory(cat);
    if (cat !== 'ALL') {
      const firstMatch = agentState.parts.find((p) => p.category === cat);
      if (firstMatch) {
        setSelectedPartId(firstMatch.part_id);
        setIsPanelOpen(true);
      }
    }
  };

  const handleInjectScenario = (scenarioId: string) => {
    if (scenarioId === 'SCENARIO_1_DELAY' || scenarioId === 'SCENARIO_6_LINE_STOP' || scenarioId === 'SCENARIO_5_BUDGET') {
      agent.runDisruptionScan('LEFT_HEADLIGHT');
      setSelectedPartId('LEFT_HEADLIGHT');
    } else if (scenarioId === 'SCENARIO_2_STALE_STOCK' || scenarioId === 'SCENARIO_3_ADVERSARIAL') {
      agent.runDisruptionScan('ECU');
      setSelectedPartId('ECU');
    } else if (scenarioId === 'SCENARIO_4_QUALITY') {
      agent.runDisruptionScan('BRAKE_FRONT_LEFT');
      setSelectedPartId('BRAKE_FRONT_LEFT');
    }
    setIsPanelOpen(true);
    setAgentState({ ...agent.getState() });
  };

  const handleApproveBrief = () => {
    agent.handleApprovalDecision(true);
    setAgentState({ ...agent.getState() });
  };

  const handleRejectBrief = () => {
    agent.handleApprovalDecision(false);
    setAgentState({ ...agent.getState() });
  };

  // Add Custom Component Handler
  const handleAddComponent = (newPart: Part, newInventory: InventoryItem, newSupplier: Supplier) => {
    agent.setState({
      parts: [newPart, ...agentState.parts],
      inventory: [newInventory, ...agentState.inventory],
      suppliers: [newSupplier, ...agentState.suppliers],
      events: [
        {
          id: `EVT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          time_formatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'PART_RISK_UPDATE',
          part_id: newPart.part_id,
          severity: 'LOW',
          status: 'GREEN',
          message: `Custom component registered: ${newPart.display_name} (Category: ${newPart.category}).`
        },
        ...agentState.events
      ]
    });
    setSelectedPartId(newPart.part_id);
    setIsPanelOpen(true);
    setAgentState({ ...agent.getState() });
  };

  // Real-time Purchase Order Confirmation & Inventory Synchronization
  const handleConfirmOrder = (orderData: {
    partId: string;
    componentId: string;
    supplier: Supplier;
    quantity: number;
    shippingMethod: PurchaseOrder['shipping_method'];
    totalCost: number;
  }) => {
    const newPO = createNewPurchaseOrder(
      orderData.partId,
      orderData.componentId,
      orderData.supplier,
      orderData.quantity,
      orderData.shippingMethod,
      agentState.autonomousThreshold
    );

    // 1. Update purchase orders
    const updatedPOs = [newPO, ...agentState.purchaseOrders];

    // 2. Update inventory record (increase on_order and incoming)
    const updatedInventory = agentState.inventory.map((item) => {
      if (item.part_id === orderData.partId) {
        return {
          ...item,
          on_order_stock: (item.on_order_stock || 0) + orderData.quantity,
          incoming_stock: (item.incoming_stock || 0) + orderData.quantity,
          last_updated: new Date().toISOString()
        };
      }
      return item;
    });

    // 3. Update 3D visual status to BLUE (Recovery In Progress)
    const updatedParts = agentState.parts.map((p) => {
      if (p.part_id === orderData.partId) {
        return {
          ...p,
          status: 'BLUE' as const,
          reason: `PO ${newPO.po_id} confirmed for ${orderData.quantity} units with ${orderData.supplier.supplier_name}.`
        };
      }
      return p;
    });

    // 4. Log real-time Agent Event
    const newEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      time_formatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'PO_CREATED' as const,
      part_id: orderData.partId,
      severity: 'HIGH' as const,
      status: 'BLUE' as const,
      message: `Purchase Order ${newPO.po_id} confirmed for ${orderData.quantity} units of ${orderData.partId} with ${orderData.supplier.supplier_name} (₹${orderData.totalCost.toLocaleString()}). Digital Twin updated to BLUE.`
    };

    const newAudit = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      disruption_id: 'DISRUPT-104',
      part_id: orderData.partId,
      category: selectedPart?.category || 'LIGHTING',
      criticality: selectedPart?.criticality || 'IMPORTANT',
      event_name: 'PURCHASE_ORDER_EXECUTED',
      action_by: 'SUPPLYSHIELD_AGENT' as const,
      data_checked: `Available: 0, Required: ${orderData.quantity}`,
      supplier_communications: `Placed order with ${orderData.supplier.supplier_name} (${orderData.supplier.supplier_id})`,
      verification_result: 'Verified against MOQ, budget and supplier capacity.',
      alternatives_considered_count: 4,
      selected_strategy: 'AUTONOMOUS_PURCHASE_ORDER',
      decision_reason: `Reorder point triggered for ${orderData.partId}.`,
      cost: orderData.totalCost,
      avoided_loss: 875000,
      erp_changes: [`Created ${newPO.po_id}`, `Updated On-Order: +${orderData.quantity}`],
      remaining_risk: 'LOW: Shipment tracked in transit.'
    };

    agent.setState({
      purchaseOrders: updatedPOs,
      inventory: updatedInventory,
      parts: updatedParts,
      events: [newEvent, ...agentState.events],
      auditTrail: [newAudit, ...agentState.auditTrail]
    });

    setAgentState({ ...agent.getState() });
  };

  const selectedPart = agentState.parts.find((p) => p.part_id === selectedPartId) || null;
  const selectedInv = agentState.inventory.find((i) => i.part_id === selectedPartId);
  const selectedSup = agentState.suppliers.find((s) => s.supplier_id === selectedPart?.supplier_id);
  const activeDisruptions = agentState.parts.filter((p) => p.status === 'RED' || p.status === 'YELLOW').length;
  const totalAvoidedLoss = agentState.disruptionState.selected_plan?.expected_avoided_loss || 732000;

  // Filter parts by category
  const filteredParts = agentState.parts.filter(
    (p) => selectedCategory === 'ALL' || p.category === selectedCategory
  );

  // If user navigated to direct QR link
  if (currentView === 'LIVE_QR_VIEW' && selectedPartId) {
    return (
      <LiveQRComponentView
        partId={selectedPartId}
        parts={agentState.parts}
        inventory={agentState.inventory}
        suppliers={agentState.suppliers}
        onBackToCockpit={() => {
          window.history.pushState({}, '', '/');
          setCurrentView('3D_TWIN');
        }}
        onCreatePO={(pId) => {
          setSelectedPartId(pId);
          setIsCreatePOOpen(true);
        }}
      />
    );
  }

  return (
    <div className="bg-nexus-white text-nexus-blue flex flex-col font-sans p-6 md:p-8 rounded-[12px] border border-nexus-blue-12 shadow-sm space-y-8">
      
      {/* ─── Integrated Sub-Header & Controls Toolbar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-nexus-blue-12 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="p-1 rounded-[8px] border border-nexus-blue-20 overflow-hidden bg-nexus-white">
            <img src="/logo.jpg" alt="AeroChain Logo" className="w-8 h-8 object-contain rounded-[8px]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-nexus-blue tracking-tight">
              AeroChain <span className="text-nexus-blue font-mono text-[10px] px-2 py-0.5 rounded-md bg-nexus-white border border-nexus-blue-20 font-bold">3D AUTONOMOUS</span>
            </h1>
          </div>
        </div>


      </div>

      {/* ─── Integrated Sub-Navigation Tabs ─── */}
      <div className="flex border-b border-nexus-blue-12 overflow-x-auto space-x-2 select-none pb-px scrollbar-none font-sans">
        {[
          { id: '3D_TWIN', label: '3D DIGITAL TWIN', icon: Car },
          { id: 'COMPONENTS_MATRIX', label: 'COMPONENTS MATRIX', icon: Table },
          { id: 'QR_CATALOG', label: 'QR CATALOG', icon: QrCode },
          { id: 'QR_PRINT_SHEET', label: 'QR PRINT SHEET', icon: Printer },
          { id: 'RECOVERY_MATRIX', label: 'RECOVERY TWIN', icon: Layers },
          { id: 'ERP_AUDIT', label: 'ERP & AUDIT LOG', icon: Database },
        ].map((tab) => {
          const isActive = currentView === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as any)}
              className={`flex items-center space-x-2.5 px-6 py-3.5 text-[11px] uppercase tracking-widest font-mono transition-all border-b-2 font-bold ${
                isActive
                  ? 'border-nexus-blue text-nexus-blue bg-nexus-blue-04/50'
                  : 'border-transparent text-nexus-blue-60 hover:text-nexus-blue hover:bg-white'
              } rounded-t-xl`}
            >
              <Icon className="w-4 h-4 text-inherit" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        
        {/* Scenario Injector Sandbox */}
        <ScenarioInjector onInjectScenario={handleInjectScenario} />

        {/* ─── EXECUTIVE SUMMARY MODE DASHBOARD (NON-TECHNICAL EXECUTIVE VIEW) ─── */}
        {executiveMode && (
          <div className="bg-[#002147] border border-nexus-blue/40 rounded-[8px] p-5 shadow-sm backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-900/30 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-nexus-blue-20 text-nexus-blue rounded-[8px] border border-nexus-blue/30">
                  <Sparkles className="w-5 h-5 text-nexus-blue" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-nexus-white font-sans tracking-tight">
                    Executive Supply Chain Cockpit &amp; Plant Summary
                  </h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-950/40 text-nexus-blue-42 border border-blue-700/60 rounded-[8px] text-xs font-mono font-bold">
                EXECUTIVE MODE ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-blue-950/80 p-3.5 rounded-[8px] border border-blue-800">
                <span className="text-[10px] text-nexus-blue-60 block font-semibold">VEHICLES AT RISK</span>
                <span className="text-xl font-bold text-red-400">120 Units</span>
                <span className="text-[10px] text-nexus-blue-60 block mt-0.5">Production Line Alpha</span>
              </div>
              <div className="bg-blue-950/80 p-3.5 rounded-[8px] border border-blue-800">
                <span className="text-[10px] text-nexus-blue-60 block font-semibold">AVOIDED FINANCIAL LOSS</span>
                <span className="text-xl font-bold text-emerald-400">₹13.32 Lakh</span>
                <span className="text-[10px] text-nexus-blue-60 block mt-0.5">Autonomous Shield</span>
              </div>
              <div className="bg-blue-950/80 p-3.5 rounded-[8px] border border-blue-800">
                <span className="text-[10px] text-nexus-blue-60 block font-semibold">PRIMARY AUTONOMOUS ACTION</span>
                <span className="text-sm font-bold text-sky-400 truncate block mt-1">Multi-Source Split PO</span>
                <span className="text-[10px] text-nexus-blue-60 block mt-0.5">Recovery Time: 2.5d</span>
              </div>
              <div className="bg-blue-950/80 p-3.5 rounded-[8px] border border-blue-800">
                <span className="text-[10px] text-nexus-blue-60 block font-semibold">CONFIDENCE RATING</span>
                <span className="text-xl font-bold text-nexus-blue-60">94.8%</span>
                <span className="text-[10px] text-nexus-blue-60 block mt-0.5">SambaNova Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── VIEW 1: 3D DIGITAL TWIN & COCKPIT ─── */}
        {currentView === '3D_TWIN' && (
          <div className="space-y-5">
            
            {/* 1. Production Cockpit & Capacity Engine Telemetry */}
            <ProductionCockpit
              plan={activePlan}
              onFocusBottleneck={(pId) => {
                setSelectedPartId(pId);
                setIsPanelOpen(true);
              }}
              onOpenRecoveryTwin={() => setCurrentView('RECOVERY_MATRIX')}
              onOpenPlanConfig={() => setIsPlanModalOpen(true)}
            />

            {/* 2. Digital Twin Control Toolbar */}
            <DigitalTwinToolbar
              parts={agentState.parts}
              selectedPartId={selectedPartId}
              onSelectPart={handleSelectPart}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              isPanelOpen={isPanelOpen}
              onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
            />

            {/* 3. Side-by-Side Two Column Layout: 3D Digital Twin + Component Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: 3D Vehicle Viewport (65-70%) */}
              <div className={isPanelOpen ? 'lg:col-span-8' : 'lg:col-span-12'}>
                <Vehicle3DViewer
                  parts={filteredParts}
                  selectedPartId={selectedPartId}
                  onSelectPart={handleSelectPart}
                  disruptionPartId={agentState.disruptionState.part_id}
                  explodedView={explodedView}
                  onToggleExplodedView={() => setExplodedView(!explodedView)}
                />
              </div>

              {/* Right Column: Upgraded Component Intelligence Panel (30-35%) */}
              {isPanelOpen && (
                <div className="lg:col-span-4 h-[520px] lg:h-[580px]">
                  <ComponentInfoPanel
                    part={selectedPart}
                    allParts={agentState.parts}
                    inventory={selectedInv}
                    supplier={selectedSup}
                    openPOs={agentState.purchaseOrders.filter((p) => p.part_id === selectedPartId)}
                    productionOrders={agentState.productionOrders.filter((p) => p.part_id === selectedPartId)}
                    onClose={() => setIsPanelOpen(false)}
                    onSelectPart={handleSelectPart}
                    onCreatePO={() => setIsCreatePOOpen(true)}
                    onFocus3D={handleSelectPart}
                  />
                </div>
              )}

            </div>

            {/* 4. AI Assistant Chat & Activity Stream Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 h-[460px]">
                <SambaNovaChat
                  parts={agentState.parts}
                  inventory={agentState.inventory}
                  purchaseOrders={agentState.purchaseOrders}
                  suppliers={agentState.suppliers}
                  productionOrders={agentState.productionOrders}
                  onSelectPart={handleSelectPart}
                />
              </div>

              <div className="lg:col-span-5 h-[460px]">
                <ActivityStream events={agentState.events} />
              </div>
            </div>

          </div>
        )}

        {/* ─── VIEW 2: ALL 27 AUTOMOTIVE COMPONENTS MATRIX ─── */}
        {currentView === 'COMPONENTS_MATRIX' && (
          <div className="space-y-6">
            <AutomotiveComponentsDashboard
              parts={agentState.parts}
              inventory={agentState.inventory}
              suppliers={agentState.suppliers}
              purchaseOrders={agentState.purchaseOrders}
              selectedPartId={selectedPartId}
              onSelectPart={(partId) => {
                handleSelectPart(partId);
                setCurrentView('3D_TWIN');
              }}
              onOpenCreatePO={(partId) => {
                setSelectedPartId(partId);
                setIsCreatePOOpen(true);
              }}
              onOpenAddComponent={() => setIsAddComponentOpen(true)}
            />
          </div>
        )}

        {/* ─── VIEW 3: 27 QR CODES CATALOG ─── */}
        {currentView === 'QR_CATALOG' && (
          <div className="space-y-6">
            <AllQRCodesCatalog
              parts={agentState.parts}
              inventory={agentState.inventory}
              suppliers={agentState.suppliers}
              onSelectPart={(partId) => {
                handleSelectPart(partId);
                setCurrentView('3D_TWIN');
              }}
            />
          </div>
        )}

        {/* ─── VIEW 3B: ALL 27 QR PRINT SHEET ─── */}
        {currentView === 'QR_PRINT_SHEET' && (
          <div className="space-y-6">
            <QRPrintSheet
              parts={agentState.parts}
              inventory={agentState.inventory}
              suppliers={agentState.suppliers}
              onBack={() => setCurrentView('3D_TWIN')}
            />
          </div>
        )}

        {/* ─── VIEW 4: RECOVERY TWIN SIMULATION MATRIX ─── */}
        {currentView === 'RECOVERY_MATRIX' && (
          <div className="space-y-6">
            {/* Quick Demo Trigger Actions */}
            <div className="bg-nexus-white p-4 rounded-[8px] border border-nexus-blue-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20 font-bold">
                  RECOVERY SIMULATOR
                </span>
                <span className="text-blue-950 font-sans text-xs">
                  Simulate 1,000 Vehicle Target, Bottlenecks, and Multi-Source Split PO execution.
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunGoldenDemo}
                  className="px-3.5 py-1.5 bg-nexus-white hover:bg-slate-100 text-nexus-blue font-bold rounded-[8px] transition-all border border-nexus-blue-20 flex items-center gap-1.5 font-mono text-xs"
                  title="Trigger ECU Bottleneck"
                >
                  <Zap className="w-3.5 h-3.5 text-nexus-blue" />
                  <span>1. Trigger Shortage</span>
                </button>
                <button
                  onClick={handleExecuteBottleneckRecovery}
                  className="px-3.5 py-1.5 bg-nexus-blue hover:bg-nexus-blue/90 text-nexus-white font-bold rounded-[8px] transition-all shadow-sm flex items-center gap-1.5 font-mono text-xs"
                  title="Execute Split PO & Restore Capacity"
                >
                  <Sparkles className="w-3.5 h-3.5 text-nexus-white" />
                  <span>2. Restore Production</span>
                </button>
              </div>
            </div>

            {/* Before vs After Recovery Comparison */}
            <BeforeAfterRecoveryComparison
              plan={activePlan}
              isRecovered={activePlan.maximum_producible >= activePlan.target_quantity}
              recoveredCapacity={activePlan.maximum_producible}
            />

            {/* Digital Twin Recovery Strategy Evaluation Table */}
            <RecoveryTwinMatrix
              options={[
                agentState.disruptionState.selected_plan || runRecoverySimsFallback(agentState)[0],
                ...runRecoverySimsFallback(agentState)
              ]}
              selectedOptionId={agentState.disruptionState.selected_plan?.id || 'OPT-EXPEDITE'}
            />

            {/* Blast Radius & Risk Concentration */}
            <BlastRadiusPanel
              blastRadius={agentState.disruptionState.blast_radius || agent.calculateBlastRadius(selectedPartId || 'LEFT_HEADLIGHT')}
              concentration={agentState.disruptionState.supplier_concentration || agent.calculateSupplierConcentration()}
            />

            {/* Executive Disruption Summary */}
            <DisruptionSummary
              disruptionState={agentState.disruptionState}
              part={selectedPart || undefined}
            />

            {/* AI Decision Report */}
            <DecisionReport
              disruptionState={agentState.disruptionState}
              part={selectedPart || undefined}
            />
          </div>
        )}

        {/* ─── VIEW 5: ERP EXPLORER & AUDIT TRAIL ─── */}
        {currentView === 'ERP_AUDIT' && (
          <div className="space-y-6">
            <ERPExplorer
              inventory={agentState.inventory}
              purchaseOrders={agentState.purchaseOrders}
              productionOrders={agentState.productionOrders}
              supplierMemory={agentState.supplierMemory}
              auditTrail={agentState.auditTrail}
            />
          </div>
        )}
      </div>

      {/* Interactive Create Purchase Order Modal */}
      <CreatePOModal
        isOpen={isCreatePOOpen}
        onClose={() => setIsCreatePOOpen(false)}
        inventoryItem={selectedInv}
        suppliers={agentState.suppliers}
        autonomousThreshold={agentState.autonomousThreshold}
        onConfirmOrder={handleConfirmOrder}
      />

      {/* Add Custom Component Modal */}
      <AddComponentModal
        isOpen={isAddComponentOpen}
        onClose={() => setIsAddComponentOpen(false)}
        onAddComponent={handleAddComponent}
      />

      {/* Human-In-The-Loop Approval Brief Modal */}
      <ApprovalModal
        brief={agentState.approvalBrief}
        onApprove={handleApproveBrief}
        onReject={handleRejectBrief}
      />

      {/* Interactive Production Target & BOM Configuration Modal */}
      <ProductionPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        plan={activePlan}
        onUpdatePlan={handleUpdatePlan}
      />

    </div>
  );

  function activeDisruptionCount() {
    return agentState.parts.filter((p) => p.status === 'RED' || p.status === 'YELLOW').length;
  }
};

function runRecoverySimsFallback(state: any): RecoveryOption[] {
  return [
    {
      id: 'OPT-WAIT',
      strategy_name: 'Wait for Original Supplier SUP-21',
      strategy_type: 'WAIT',
      description: 'Wait for delayed shipment PO-7712. Line halts after 4.3 days.',
      procurement_cost: 0,
      expedite_fee: 0,
      total_cost: 0,
      delivery_lead_days: 7,
      production_stoppage_days: 3,
      quality_score: 0.92,
      reliability_score: 0.65,
      affected_vehicles_count: 120,
      approval_required: false,
      expected_loss_without_action: 900000,
      expected_avoided_loss: 0,
      remaining_risk: 'CRITICAL: Severe production line stoppage.'
    },
    {
      id: 'OPT-EXPEDITE',
      strategy_name: 'Expedite Original Supplier SUP-21',
      strategy_type: 'EXPEDITE_ORIGINAL',
      description: 'Pay ₹25,000 expedite fee for priority air freight transport.',
      procurement_cost: 0,
      expedite_fee: 25000,
      total_cost: 25000,
      delivery_lead_days: 2,
      production_stoppage_days: 0,
      quality_score: 0.92,
      reliability_score: 0.65,
      affected_vehicles_count: 0,
      approval_required: false,
      expected_loss_without_action: 900000,
      expected_avoided_loss: 875000,
      remaining_risk: 'Medium risk: Tracking claim contradicted.'
    },
    {
      id: 'OPT-RESCHEDULE',
      strategy_name: 'Reschedule Low-Priority PROD-914',
      strategy_type: 'RESCHEDULE_PRODUCTION',
      description: 'Shift stock to high-priority Swift Dzire (PROD-882).',
      procurement_cost: 0,
      expedite_fee: 0,
      total_cost: 45000,
      delivery_lead_days: 0,
      production_stoppage_days: 0,
      quality_score: 0.95,
      reliability_score: 0.95,
      affected_vehicles_count: 300,
      approval_required: false,
      expected_loss_without_action: 900000,
      expected_avoided_loss: 855000,
      remaining_risk: 'Low priority customer delivery window delayed by 3 days.'
    },
    {
      id: 'OPT-BAD-QUALITY',
      strategy_name: 'Budget Direct Components (SUP-18)',
      strategy_type: 'SUPPLIER_C',
      description: 'Cheapest price but FAILS quality requirement (0.68 vs 0.85).',
      procurement_cost: 85500,
      expedite_fee: 0,
      total_cost: 85500,
      delivery_lead_days: 3,
      production_stoppage_days: 0,
      quality_score: 0.68,
      reliability_score: 0.55,
      affected_vehicles_count: 0,
      approval_required: false,
      expected_loss_without_action: 900000,
      expected_avoided_loss: 0,
      remaining_risk: 'REJECTED: Vehicle recall & safety risk.'
    }
  ];
}

export default SupplyChainPage;
