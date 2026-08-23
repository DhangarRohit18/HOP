import React, { useEffect } from 'react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div
        className="w-full max-w-md bg-blue-950 border-l border-nexus-border h-full shadow-2xl flex flex-col p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex justify-between items-start pb-4 border-b border-nexus-border mb-6">
          <div>
            <h2 id="drawer-title" className="text-xl font-bold text-nexus-white tracking-tight">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-nexus-blue-60 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Drawer"
            className="p-1 rounded-[8px] text-nexus-blue-60 hover:text-nexus-white hover:bg-nexus-blue-dark transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};
