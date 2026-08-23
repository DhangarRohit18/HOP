import React from 'react';
import { VisualStatus } from '../../../types/supplyChain';

interface InventoryDonutProps {
  available: number;
  reserved: number;
  incoming: number;
  onOrder: number;
  size?: number;
}

export const InventoryDonut: React.FC<InventoryDonutProps> = ({
  available,
  reserved,
  incoming,
  onOrder,
  size = 170
}) => {
  const total = Math.max(1, available + reserved + incoming + onOrder);
  const radius = 62;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const pctAvailable = available / total;
  const pctReserved = reserved / total;
  const pctIncoming = incoming / total;
  const pctOnOrder = onOrder / total;

  const strokeAvailable = circumference * pctAvailable;
  const strokeReserved = circumference * pctReserved;
  const strokeIncoming = circumference * pctIncoming;
  const strokeOnOrder = circumference * pctOnOrder;

  const offsetReserved = -strokeAvailable;
  const offsetIncoming = -(strokeAvailable + strokeReserved);
  const offsetOnOrder = -(strokeAvailable + strokeReserved + strokeIncoming);

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {/* Available Segment (Emerald) */}
          {available > 0 && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeAvailable} ${circumference}`}
              strokeDashoffset={0}
              className="transition-all duration-700"
            />
          )}
          {/* Reserved Segment (Amber) */}
          {reserved > 0 && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeReserved} ${circumference}`}
              strokeDashoffset={offsetReserved}
              className="transition-all duration-700"
            />
          )}
          {/* Incoming Segment (Sky) */}
          {incoming > 0 && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#38bdf8"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeIncoming} ${circumference}`}
              strokeDashoffset={offsetIncoming}
              className="transition-all duration-700"
            />
          )}
          {/* On Order Segment (Purple) */}
          {onOrder > 0 && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#a855f7"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeOnOrder} ${circumference}`}
              strokeDashoffset={offsetOnOrder}
              className="transition-all duration-700"
            />
          )}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-2xl font-bold font-mono text-nexus-white tracking-tight leading-none">
            {available}
          </span>
          <span className="text-[10px] text-nexus-blue-60 font-mono mt-0.5">AVAIL UNITS</span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[11px] text-nexus-blue-42">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[4px] bg-emerald-500"></span>
          <span>Avail: <strong className="text-nexus-white">{available}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[4px] bg-amber-500"></span>
          <span>Res: <strong className="text-nexus-white">{reserved}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[4px] bg-sky-400"></span>
          <span>Inc: <strong className="text-nexus-white">{incoming}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[4px] bg-purple-400"></span>
          <span>Order: <strong className="text-nexus-white">{onOrder}</strong></span>
        </div>
      </div>
    </div>
  );
};

interface CoverageRadialGaugeProps {
  coverageDays: number;
  size?: number;
}

export const CoverageRadialGauge: React.FC<CoverageRadialGaugeProps> = ({
  coverageDays,
  size = 170
}) => {
  const maxDays = 14;
  const clamped = Math.max(0, Math.min(maxDays, coverageDays));
  const pct = clamped / maxDays;
  const radius = 62;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // 180 degree semi-circle

  const strokeDash = circumference * pct;

  let strokeColor = '#10b981';
  let statusText = 'HEALTHY';
  if (coverageDays < 1.0) {
    strokeColor = '#ef4444';
    statusText = 'CRITICAL SHORTAGE';
  } else if (coverageDays < 3.0) {
    strokeColor = '#f97316';
    statusText = 'HIGH RISK';
  } else if (coverageDays < 7.0) {
    strokeColor = '#f59e0b';
    statusText = 'WARNING';
  }

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        <svg className="w-full h-full" viewBox="0 0 160 100">
          {/* Background Semi-circle Arc */}
          <path
            d="M 18 90 A 62 62 0 0 1 142 90"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Value Arc */}
          <path
            d="M 18 90 A 62 62 0 0 1 142 90"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-700"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold font-mono text-nexus-white leading-none">
            {coverageDays.toFixed(1)}
          </span>
          <span className="text-[10px] text-nexus-blue-60 font-mono mt-0.5">DAYS COVERAGE</span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span
          className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold"
          style={{
            backgroundColor: `${strokeColor}20`,
            color: strokeColor,
            border: `1px solid ${strokeColor}60`
          }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
};

interface RequiredVsAvailableRadialProps {
  required: number;
  available: number;
  size?: number;
}

export const RequiredVsAvailableRadial: React.FC<RequiredVsAvailableRadialProps> = ({
  required,
  available,
  size = 170
}) => {
  const shortfall = Math.max(0, required - available);
  const surplus = Math.max(0, available - required);
  const radius = 62;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const total = Math.max(1, required);
  const pctAvail = Math.min(1, available / total);
  const strokeAvail = circumference * pctAvail;

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Total Required Track (Dark Sky) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={shortfall > 0 ? '#ef444420' : '#1e293b'}
            strokeWidth={strokeWidth}
          />
          {/* Available Filled Portion (Emerald / Amber) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={available >= required ? '#10b981' : available > 0 ? '#f59e0b' : '#ef4444'}
            strokeWidth={strokeWidth}
            strokeDasharray={`${strokeAvail} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-xl font-bold font-mono text-nexus-white leading-none">
            {required}
          </span>
          <span className="text-[10px] text-nexus-blue-60 font-mono mt-0.5">REQUIRED</span>
        </div>
      </div>

      <div className="mt-2 text-center text-xs">
        {shortfall > 0 ? (
          <span className="text-red-400 font-bold">{shortfall} Units Shortfall</span>
        ) : (
          <span className="text-emerald-400 font-bold">+{surplus} Units Surplus</span>
        )}
      </div>
    </div>
  );
};

interface RiskRingProps {
  riskScore: number; // 0.0 - 1.0
  status: VisualStatus;
  size?: number;
}

export const RiskRing: React.FC<RiskRingProps> = ({
  riskScore,
  status,
  size = 170
}) => {
  const radius = 62;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * riskScore;

  let color = '#10b981';
  if (riskScore > 0.7) color = '#ef4444';
  else if (riskScore > 0.4) color = '#f59e0b';
  else if (riskScore > 0.25) color = '#38bdf8';

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-2xl font-bold font-mono text-nexus-white leading-none">
            {(riskScore * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] text-nexus-blue-60 font-mono mt-0.5">SUPPLY RISK</span>
        </div>
      </div>

      <div className="mt-2 text-center text-xs">
        <span className="text-nexus-blue-42 font-medium">Status: </span>
        <span className="font-bold" style={{ color }}>{status}</span>
      </div>
    </div>
  );
};
