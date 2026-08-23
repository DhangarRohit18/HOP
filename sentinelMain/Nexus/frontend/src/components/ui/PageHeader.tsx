import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, action, actions }) => {
  const actionContent = action || actions;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-nexus-blue-20 pb-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-nexus-blue font-mono uppercase tracking-wide">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-xs text-nexus-blue-60 mt-1 font-sans font-medium">{subtitle}</p>
        )}
      </div>
      {actionContent && <div className="flex items-center gap-2">{actionContent}</div>}
    </div>
  );
};
