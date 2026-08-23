import React from 'react';

interface HealthStatusCardProps {
  label: string;
  sublabel?: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'checking' | string;
  detailMessage?: string;
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({
  label,
  sublabel,
  status,
  detailMessage,
}) => {
  const getBadgeStyle = () => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          pulse: true,
          text: 'Healthy',
        };
      case 'degraded':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          pulse: false,
          text: 'Degraded',
        };
      case 'unhealthy':
      case 'failed':
      case 'error':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          pulse: false,
          text: 'Unavailable',
        };
      default:
        return {
          bg: 'bg-white0/10 border-slate-500/30 text-nexus-blue-60',
          dot: 'bg-nexus-blue-42',
          pulse: true,
          text: 'Checking...',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className="bg-nexus-card border border-nexus-border rounded-[8px] p-5 shadow-lg flex flex-col justify-between transition-all duration-200 hover:border-nexus-blue">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{label}</h3>
          {sublabel && <p className="text-xs text-nexus-blue-60 mt-0.5">{sublabel}</p>}
        </div>
        <div className={`px-2.5 py-1 rounded-[4px] text-xs font-medium border flex items-center gap-1.5 ${style.bg}`}>
          <span className={`w-2 h-2 rounded-[4px] ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`}></span>
          {style.text}
        </div>
      </div>

      {detailMessage && (
        <div className="mt-4 pt-3 border-t border-blue-800 text-xs font-mono text-nexus-blue-60 truncate">
          {detailMessage}
        </div>
      )}
    </div>
  );
};
