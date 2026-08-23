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
} from './data/initialState';
import { SupplyShieldAgent } from './services/agentEngine';
import { createNewPurchaseOrder } from './services/orderEngine';
import {
  Part,
  InventoryItem,
  Supplier,
  RecoveryOption,
  Category,
  PurchaseOrder,
  ProductionOrder
} from './types/supplyChain';

import { Header } from './components/Header';
import { DigitalTwinToolbar } from './components/DigitalTwin/DigitalTwinToolbar';
import { Vehicle3DViewer } from './components/DigitalTwin/Vehicle3DViewer';
import { ComponentInfoPanel } from './components/ComponentInfoPanel';
import { AutomotiveComponentsDashboard } from './components/AutomotiveComponentsDashboard';
import { AllQRCodesCatalog } from './components/AllQRCodesCatalog';
import { QRPrintSheet } from './components/QRPrintSheet';
import { LiveQRComponentView } from './components/LiveQRComponentView';
import { AddComponentModal } from './components/AddComponentModal';
import { CreatePOModal } from './components/CreatePOModal';
import { SambaNovaChat } from './components/SambaNovaChat';
import { DisruptionSummary } from './components/DisruptionSummary';
import { ActivityStream } from './components/ActivityStream';
import { BlastRadiusPanel } from './components/BlastRadiusPanel';
import { RecoveryTwinMatrix } from './components/RecoveryTwinMatrix';
import { ApprovalModal } from './components/ApprovalModal';
import { ScenarioInjector } from './components/ScenarioInjector';
import { ERPExplorer } from './components/ERPExplorer';
import { DecisionReport } from './components/DecisionReport';
import { ProductionCockpit } from './components/ProductionCockpit';
import { ProductionPlanModal } from './components/ProductionPlanModal';
import { BeforeAfterRecoveryComparison } from './components/BeforeAfterRecoveryComparison';
import {
  Car,
  Table,
  Layers,
  Database,
  ShieldAlert,
  Sparkles,
  QrCode,
  Printer,
  Zap
} from 'lucide-react';

type DashboardView =
  | '3D_TWIN'
  | 'COMPONENTS_MATRIX'
  | 'QR_CATALOG'
  | 'QR_PRINT_SHEET'
  | 'RECOVERY_MATRIX'
  | 'ERP_AUDIT'
  | 'LIVE_QR_VIEW';

export const App: React.FC = () => {
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <Header
        simulating={simulating}
        onToggleSimulate={() => setSimulating(!simulating)}
        onStepSimulation={() => setAgentState({ ...agent.getState() })}
        onResetSimulation={() => window.location.reload()}
        autonomousMode={autonomousMode}
        onToggleAutonomous={() => setAutonomousMode(!autonomousMode)}
        activeDisruptionCount={activeDisruptionCount()}
        totalAvoidedLoss={totalAvoidedLoss}
        executiveMode={executiveMode}
        onToggleExecutiveMode={() => setExecutiveMode(!executiveMode)}
      />

      {/* 2-Column Responsive Layout: Vertical Navigation Sidebar (Left) + Main Workspace (Right) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Vertical Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between flex-shrink-0 space-y-4 shadow-sm md:sticky md:top-[61px] md:h-[calc(100vh-61px)]">
          <div className="space-y-1.5 font-mono text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-3 uppercase tracking-wider block mb-2 font-sans">
              Control Tower Views
            </span>

            <button
              onClick={() => setCurrentView('3D_TWIN')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                currentView === '3D_TWIN'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Car className="w-4 h-4 text-inherit" />
              <span>3D DIGITAL TWIN</span>
            </button>

            <button
              onClick={() => setCurrentView('COMPONENTS_MATRIX')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                currentView === 'COMPONENTS_MATRIX'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Table className="w-4 h-4 text-inherit" />
              <span>COMPONENTS</span>
            </button>

            <button
              onClick={() => setCurrentView('QR_CATALOG')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                currentView === 'QR_CATALOG'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4 text-inherit" />
              <span>QR CATALOG</span>
            </button>

            <button
              onClick={() => setCurrentView('QR_PRINT_SHEET')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                currentView === 'QR_PRINT_SHEET'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Printer className="w-4 h-4 text-inherit" />
              <span>QR PRINT SHEET</span>
            </button>

            <button
              onClick={() => setCurrentView('RECOVERY_MATRIX')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                currentView === 'RECOVERY_MATRIX'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-inherit" />
              <span>RECOVERY TWIN</span>
            </button>

            <button
              onClick={() => setCurrentView('ERP_AUDIT')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                currentView === 'ERP_AUDIT'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Database className="w-4 h-4 text-inherit" />
              <span>ERP &amp; AUDIT LOG</span>
            </button>
          </div>

          {/* Sidebar Status Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="font-bold">SambaNova AI Active</span>
            </div>
            <div className="text-slate-500 text-[10px] leading-tight">
              Continuous Disruption Monitoring &amp; 3D Assembly Capacity
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 max-w-[1650px] mx-auto w-full overflow-y-auto">
          
          {/* Scenario Injector Sandbox */}
          <ScenarioInjector onInjectScenario={handleInjectScenario} />

        {/* ─── EXECUTIVE SUMMARY MODE DASHBOARD (NON-TECHNICAL EXECUTIVE VIEW) ─── */}
        {executiveMode && (
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-sky-950/80 border border-purple-800/60 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    Executive Supply Chain Cockpit &amp; Plant Impact Summary
                  </h3>
                  <p className="text-xs text-purple-300 font-mono">
                    High-Level Plant Status • Single-Pane Operations Visibility • Financial Risk Avoidance
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-900/40 text-purple-300 border border-purple-700/60 rounded-lg text-xs font-mono font-bold">
                EXECUTIVE MODE ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">VEHICLES AT RISK</span>
                <span className="text-xl font-bold text-red-400">120 Units</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Production Line Alpha</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">AVOIDED FINANCIAL LOSS</span>
                <span className="text-xl font-bold text-emerald-400">₹13.32 Lakh</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Autonomous Shield</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">PRIMARY AUTONOMOUS ACTION</span>
                <span className="text-sm font-bold text-sky-400 truncate block mt-1">Multi-Source Split PO</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Recovery Time: 2.5d</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">CONFIDENCE RATING</span>
                <span className="text-xl font-bold text-purple-400">94.8%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">SambaNova Verified</span>
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  RECOVERY SIMULATOR
                </span>
                <span className="text-slate-600 font-sans text-xs">
                  Simulate 1,000 Vehicle Target, Bottlenecks, and Multi-Source Split PO execution.
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunGoldenDemo}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 font-mono text-xs"
                  title="Trigger ECU Bottleneck"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-700" />
                  <span>1. Trigger Shortage</span>
                </button>
                <button
                  onClick={handleExecuteBottleneckRecovery}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 font-mono text-xs"
                  title="Execute Split PO & Restore Capacity"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
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

      </main>
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
      description: 'Shift stock to high-priority CyberSUV (PROD-882).',
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
