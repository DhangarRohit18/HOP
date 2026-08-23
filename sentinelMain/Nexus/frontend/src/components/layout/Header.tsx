import React from 'react';
import { HealthResponse } from '../../types/health';
import { StatusBadge } from '../ui/StatusBadge';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'EXECUTIVE' | 'SUPPLIER';

export interface HeaderProps {
  healthData: HealthResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  onRefreshHealth: () => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  healthData,
  healthLoading,
  healthError: _healthError,
  onRefreshHealth,
  activeRole,
  onRoleChange,
}) => {
  const isConnected = healthData && healthData.status === 'healthy';

  return (
    <header className="h-14 border-b border-[#DDD5EA] bg-[#FFFFFF] px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Brand & Platform Identifiers */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#834DFB] text-[#F5F3FF] flex items-center justify-center font-mono-tech font-extrabold text-xs tracking-tighter shadow-xs">
            NX
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-[#1B082C] font-mono-tech uppercase">
              NEXUS
            </span>
            <span className="text-[10px] text-[#81758F] font-mono-tech uppercase tracking-tight">
              FIELD INTELLIGENCE PLATFORM
            </span>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono-tech bg-[#EEE8FF] border border-[#C9BDD9] text-[#1B082C] rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#834DFB] animate-pulse"></span>
          LIVE SYSTEM ● {isConnected ? 'CONNECTED' : 'STANDBY'}
        </span>

        {/* ROLE SWITCHER DROPDOWN */}
        <div className="flex items-center gap-2 bg-[#FBFAFF] border border-[#DDD5EA] px-2.5 py-1 rounded">
          <span className="text-[10px] font-mono-tech text-[#81758F] font-bold uppercase">ROLE:</span>
          <select
            value={activeRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-xs font-mono-tech font-bold text-[#834DFB] focus:outline-none cursor-pointer"
          >
            <option value="OPERATOR">OPERATOR (CONTROL TOWER)</option>
            <option value="ADMIN">ADMINISTRATOR</option>
            <option value="EXECUTIVE">EXECUTIVE (READ-ONLY)</option>
            <option value="SUPPLIER">SUPPLIER PORTAL</option>
          </select>
        </div>
      </div>

      {/* System Telemetry & Refresh Action */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-4 bg-[#FBFAFF] border border-[#DDD5EA] px-3 py-1 rounded text-[11px] font-mono-tech">
          <div className="flex items-center gap-1.5">
            <span className="text-[#81758F]">GRAPH SYNC:</span>
            <StatusBadge status="healthy" size="sm" />
          </div>

          <span className="text-[#DDD5EA]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[#81758F]">EVENT BUS:</span>
            <span className="text-[#3A9B68] font-bold">ACTIVE</span>
          </div>

          <span className="text-[#DDD5EA]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[#81758F]">AGENT:</span>
            <span className="text-[#834DFB] font-bold">READY</span>
          </div>
        </div>

        <button
          onClick={onRefreshHealth}
          disabled={healthLoading}
          aria-label="Refresh Infrastructure Health Status"
          className="px-3 py-1 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] text-xs font-mono-tech rounded font-bold transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 shadow-xs"
        >
          {healthLoading ? 'CHECKING...' : '🔄 REFRESH'}
        </button>
      </div>
    </header>
  );
};

export default Header;
