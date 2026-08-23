import React from 'react';
import { Header, HeaderProps } from './Header';
import { Sidebar } from './Sidebar';

export interface AppLayoutProps extends HeaderProps {
  activePath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  healthData,
  healthLoading,
  healthError,
  onRefreshHealth,
  activePath,
  onNavigate,
  children,
}) => {
  return (
    <div className="min-h-screen bg-white text-blue-950 flex flex-col font-sans">

      <div className="flex-1 flex overflow-hidden bg-white">
        <Sidebar activePath={activePath} onNavigate={onNavigate} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};
