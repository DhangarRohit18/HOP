import React from 'react';
import { Card } from './Card';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operational Error Encountered',
  message,
  onRetry,
}) => {
  return (
    <Card className="border border-rose-500/30 bg-rose-500/10 text-rose-300">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-[8px] bg-rose-500/20 text-rose-400 font-mono font-bold text-lg">!</div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-rose-200">{title}</h3>
          <p className="text-sm font-mono mt-1 text-rose-300/90">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-nexus-white text-xs font-semibold rounded-[8px] transition-colors duration-150"
            >
              Retry Operation
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
