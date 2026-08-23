import React from 'react';

export interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  height = 'h-12',
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} rounded-[8px] nexus-skeleton`}
        />
      ))}
    </div>
  );
};
