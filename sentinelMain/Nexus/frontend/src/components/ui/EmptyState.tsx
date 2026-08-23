import React from 'react';
import { Card } from './Card';

export interface EmptyStateProps {
  title?: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  description,
  action,
}) => {
  return (
    <Card className="text-center py-12 border border-dashed border-blue-800">
      <div className="text-nexus-blue-60 mb-3 text-2xl font-mono">Ø</div>
      <h3 className="text-base font-semibold text-nexus-blue-42">{title}</h3>
      <p className="text-sm text-nexus-blue-60 mt-1 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
};
