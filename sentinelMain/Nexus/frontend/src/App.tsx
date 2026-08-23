import { useEffect, useState, useCallback } from 'react';
import { fetchHealthStatus } from './services/api';
import { HealthFetchState } from './types/health';
import { AppLayout } from './components/layout/AppLayout';
import { UserRole } from './components/layout/Header';

import { DashboardPage } from './pages/DashboardPage';
import { ImpactWorkspacePage } from './pages/ImpactWorkspacePage';
import { GraphViewerPage } from './pages/GraphViewerPage';
import { BottlenecksPage } from './pages/BottlenecksPage';
import { InventoryRiskPage } from './pages/InventoryRiskPage';
import { SLAExposurePage } from './pages/SLAExposurePage';
import { MitigationsPage } from './pages/MitigationsPage';
import { MaterialDemoPage } from './pages/MaterialDemoPage';
import { SupplyChainPage } from './pages/supply_chain/SupplyChainPage';

// NEW PORTALS
import { OperatorControlTowerPage } from './pages/OperatorControlTowerPage';
import { DisruptionsPage } from './pages/DisruptionsPage';
import { OperatorInventoryPage } from './pages/OperatorInventoryPage';
import { OperatorPurchaseOrdersPage } from './pages/OperatorPurchaseOrdersPage';
import { OperatorSuppliersPage } from './pages/OperatorSuppliersPage';
import { OperatorProductionPage } from './pages/OperatorProductionPage';
import { OperatorAgentActivityPage } from './pages/OperatorAgentActivityPage';
import { OperatorApprovalsPage } from './pages/OperatorApprovalsPage';
import { AdminPage } from './pages/AdminPage';
import { ExecutiveOverviewPage } from './pages/ExecutiveOverviewPage';
import { SupplierPortalPage } from './pages/SupplierPortalPage';

export function App() {
  const [activePath, setActivePath] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/component/') || path === '/components/qr' || path === '/qr-sheet' || path.startsWith('/supply-chain')) {
      return '/supply-chain';
    }
    return path === '/' ? '/dashboard' : path;
  });
  const [activeRole, setActiveRole] = useState<UserRole>('OPERATOR');
  const [healthState, setHealthState] = useState<HealthFetchState>({
    data: null,
    loading: true,
    error: null,
    lastChecked: null,
  });

  const checkHealth = useCallback(async () => {
    setHealthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchHealthStatus();
      setHealthState({
        data,
        loading: false,
        error: null,
        lastChecked: new Date(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend connection error';
      setHealthState({
        data: null,
        loading: false,
        error: msg,
        lastChecked: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const renderActivePage = () => {
    switch (activePath) {
      case '/operator/control-tower':
        return <OperatorControlTowerPage />;
      case '/operator/disruptions':
        return <DisruptionsPage />;
      case '/operator/inventory':
        return <OperatorInventoryPage />;
      case '/operator/purchase-orders':
        return <OperatorPurchaseOrdersPage />;
      case '/operator/suppliers':
        return <OperatorSuppliersPage />;
      case '/operator/production':
        return <OperatorProductionPage />;
      case '/operator/agent':
        return <OperatorAgentActivityPage />;
      case '/operator/approvals':
        return <OperatorApprovalsPage />;
      case '/admin':
        return <AdminPage />;
      case '/executive/overview':
        return <ExecutiveOverviewPage />;
      case '/supplier/portal':
        return <SupplierPortalPage />;
      case '/dashboard':
        return <DashboardPage onNavigate={(path) => setActivePath(path)} />;
      case '/impact-workspace':
        return <ImpactWorkspacePage onNavigate={(path) => setActivePath(path)} />;
      case '/graph-viewer':
        return <GraphViewerPage />;
      case '/bottlenecks':
        return <BottlenecksPage onNavigate={(path) => setActivePath(path)} />;
      case '/inventory-risk':
        return <InventoryRiskPage onNavigate={(path) => setActivePath(path)} />;
      case '/sla-exposure':
        return <SLAExposurePage onNavigate={(path) => setActivePath(path)} />;
      case '/mitigations':
        return <MitigationsPage onNavigate={(path) => setActivePath(path)} />;
      case '/material-demo':
        return <MaterialDemoPage />;
      case '/supply-chain':
        return <SupplyChainPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppLayout
      healthData={healthState.data}
      healthLoading={healthState.loading}
      healthError={healthState.error}
      onRefreshHealth={checkHealth}
      activeRole={activeRole}
      onRoleChange={setActiveRole}
      activePath={activePath}
      onNavigate={(path) => setActivePath(path)}
    >
      {renderActivePage()}
    </AppLayout>
  );
}

export default App;
