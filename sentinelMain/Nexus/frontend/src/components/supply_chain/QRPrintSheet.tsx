import React from "react";

export interface QRPrintSheetProps {
  components?: any[];
  onClose?: () => void;
  parts?: any[];
  inventory?: any[];
  suppliers?: any[];
  onBack?: () => void;
}

export const QRPrintSheet: React.FC<QRPrintSheetProps> = ({ components = [], parts = [], onClose, onBack }) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono-tech font-bold text-[#1B082C]">QR PRINT SHEET</h2>
        <div className="flex gap-2">
          {onBack && <button onClick={onBack} className="text-xs text-[#834DFB]">BACK</button>}
          {onClose && <button onClick={onClose} className="text-[#81758F]">✕</button>}
        </div>
      </div>
      <p className="font-mono-tech text-sm text-[#594B69]">{parts.length > 0 ? parts.length : components.length} QR codes ready to print.</p>
    </div>
  );
};

export default QRPrintSheet;
