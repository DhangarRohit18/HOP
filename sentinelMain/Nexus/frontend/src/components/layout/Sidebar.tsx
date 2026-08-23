import React, { useState } from 'react';
import { UserRole } from './Header';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  category: string;
  icon: string;
  badge?: string;
  signal?: 'CRITICAL' | 'AT_RISK' | 'NORMAL';
}

export interface SidebarProps {
  activePath: string;
  activeRole: UserRole;
  onNavigate: (path: string) => void;
}

const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  OPERATOR: [
    { id: 'control-tower', path: '/operator/control-tower', label: 'Control Tower', category: 'COMMAND', icon: '⚡', signal: 'CRITICAL' },
    { id: 'disruptions', path: '/operator/disruptions', label: 'Disruption Radar', category: 'COMMAND', icon: '🎯' },
    { id: 'inventory', path: '/operator/inventory', label: 'Inventory Telemetry', category: 'COMMAND', icon: '📦' },
    { id: 'purchase-orders', path: '/operator/purchase-orders', label: 'Purchase Orders', category: 'NETWORK', icon: '📑' },
    { id: 'suppliers', path: '/operator/suppliers', label: 'Suppliers 360', category: 'NETWORK', icon: '🏭' },
    { id: 'production', path: '/operator/production', label: 'Production Continuity', category: 'NETWORK', icon: '⚙️' },
    { id: 'approvals', path: '/operator/approvals', label: 'Approvals Queue', category: 'AUTOMATION', icon: '✅' },
    { id: 'agent-activity', path: '/operator/agent', label: 'Agent Timeline', category: 'AUTOMATION', icon: '🤖' },
    { id: 'material-demo', path: '/material-demo', label: 'Material QR Trace', category: 'TRACEABILITY', icon: '🏷️', badge: 'MATRIX' },
  ],
  ADMIN: [
    { id: 'admin-system', path: '/admin', label: 'System Telemetry', category: 'ADMINISTRATION', icon: '🖥️' },
    { id: 'admin-users', path: '/admin', label: 'Users & Operators', category: 'ADMINISTRATION', icon: '👥' },
    { id: 'admin-rules', path: '/admin', label: 'Approval Rules', category: 'CONFIGURATION', icon: '⚙️' },
    { id: 'admin-audit', path: '/admin', label: 'Platform Audit Log', category: 'CONFIGURATION', icon: '📜' },
  ],
  EXECUTIVE: [
    { id: 'exec-overview', path: '/executive/overview', label: 'Business Overview', category: 'EXECUTIVE HUB', icon: '📈' },
    { id: 'exec-incidents', path: '/executive/overview', label: 'Incident Reports', category: 'EXECUTIVE HUB', icon: '🛡️' },
  ],
  SUPPLIER: [
    { id: 'supplier-dash', path: '/supplier/portal', label: 'Supplier Dashboard', category: 'SUPPLIER PORTAL', icon: '🏭' },
    { id: 'supplier-pos', path: '/supplier/portal', label: 'Purchase Orders', category: 'SUPPLIER PORTAL', icon: '📑' },
    { id: 'supplier-delay', path: '/supplier/portal', label: 'Report Delay Signal', category: 'COLLABORATION', icon: '⚠️' },
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({ activePath, activeRole, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = ROLE_NAV_ITEMS[activeRole] || ROLE_NAV_ITEMS.OPERATOR;
  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  return (
    <aside
      className={`border-r border-[#DDD5EA] bg-[#FFFFFF] flex flex-col justify-between transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-4 px-2">
          {!collapsed && (
            <span className="text-[10px] font-bold text-[#1B082C] font-mono-tech uppercase tracking-widest">
              {activeRole} NAVIGATION
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1 rounded text-[#81758F] hover:text-[#1B082C] hover:bg-[#F5F3FF] border border-transparent hover:border-[#DDD5EA] transition-colors font-mono-tech text-xs"
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="space-y-4" aria-label="Main Navigation">
          {categories.map((cat) => {
            const items = navItems.filter((item) => item.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-1">
                {!collapsed && (
                  <div className="px-2 text-[9px] font-extrabold text-[#81758F] font-mono-tech uppercase tracking-wider mb-1">
                    {cat}
                  </div>
                )}
                {items.map((item) => {
                  const isActive = activePath === item.path;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.path)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-mono-tech transition-all relative rounded ${
                        isActive
                          ? 'bg-[#EEE8FF] text-[#1B082C] font-bold border-l-4 border-[#834DFB]'
                          : 'text-[#594B69] hover:text-[#1B082C] hover:bg-[#F5F3FF]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{item.icon}</span>
                        <span className="truncate">{collapsed ? item.label.slice(0, 3) : item.label}</span>
                      </div>

                      {!collapsed && (
                        <div className="flex items-center gap-1.5">
                          {item.signal === 'CRITICAL' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D94B5B]"></span>
                          )}
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono-tech bg-[#EEE8FF] text-[#834DFB] border border-[#C9BDD9] rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-[#DDD5EA] bg-[#FBFAFF]">
        {!collapsed && (
          <div className="text-[10px] text-[#81758F] font-mono-tech space-y-0.5">
            <div className="text-[#1B082C] font-bold">NEXUS FOUR-INTERFACE</div>
            <div>ROLE: {activeRole}</div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
