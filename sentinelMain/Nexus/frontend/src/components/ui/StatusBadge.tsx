import React from 'react';

export type StatusVariant = 'healthy' | 'degraded' | 'critical' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  pulse = false,
}) => {
  const normStatus = status.toLowerCase();

  let bg = 'bg-white border-blue-950/20 text-blue-950';
  let dot = 'bg-[#81758F]';
  let textLabel = label || status.toUpperCase();

  if (normStatus.includes('healthy') || normStatus === 'active' || normStatus === 'operational') {
    bg = 'bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]';
    dot = 'bg-[#3A9B68]';
    if (!label) textLabel = 'HEALTHY';
  } else if (normStatus.includes('degraded') || normStatus === 'warning' || normStatus === 'low' || normStatus === 'at_risk') {
    bg = 'bg-[#FFFBD1] border-[#F0E100] text-blue-950 font-extrabold';
    dot = 'bg-[#F0E100]';
    if (!label) textLabel = 'AT RISK';
  } else if (normStatus.includes('critical') || normStatus === 'unhealthy' || normStatus === 'error') {
    bg = 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828] font-extrabold';
    dot = 'bg-[#D94B5B]';
    if (!label) textLabel = 'CRITICAL';
  } else if (normStatus === 'info') {
    bg = 'bg-[#EEE8FF] border-[#C9BDD9] text-blue-950';
    dot = 'bg-blue-950';
  }

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs font-bold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded font-mono uppercase tracking-wider ${bg} ${sizeStyles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{textLabel}</span>
    </span>
  );
};
