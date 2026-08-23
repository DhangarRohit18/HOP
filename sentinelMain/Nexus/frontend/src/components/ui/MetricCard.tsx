import React from 'react';
import { Card } from './Card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlightColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'neutral';
  indexTag?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  highlightColor = 'indigo',
  indexTag,
}) => {
  const signalMap = {
    indigo: 'sky' as const,
    emerald: 'emerald' as const,
    amber: 'amber' as const,
    rose: 'rose' as const,
    neutral: 'none' as const,
  };

  const textStyles = {
    indigo: 'text-blue-950',
    emerald: 'text-[#3A9B68]',
    amber: 'text-blue-950',
    rose: 'text-[#D94B5B]',
    neutral: 'text-blue-950',
  };

  return (
    <Card signalBorder={signalMap[highlightColor]} className="bg-[#FFFFFF] border border-blue-950/20">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          {indexTag && (
            <span className="text-[10px] font-mono font-extrabold text-blue-950">
              {indexTag}
            </span>
          )}
          <span className="text-[10px] font-bold text-blue-950 font-mono uppercase tracking-wider">{title}</span>
        </div>
        {icon && <div className="text-[#81758F] text-sm">{icon}</div>}
      </div>

      <div className={`text-2xl font-black tracking-tight my-1 font-mono ${textStyles[highlightColor]}`}>
        {value}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-blue-950">
          {trend && (
            <span
              className={`font-bold ${
                trend.isPositive ? 'text-[#3A9B68]' : 'text-[#D94B5B]'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </Card>
  );
};
