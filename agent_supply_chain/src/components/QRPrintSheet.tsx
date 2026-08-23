import React from 'react';
import { Part, InventoryItem, Supplier } from '../types/supplyChain';
import { QRCodeSVG } from 'qrcode.react';
import { getComponentQRUrl } from '../services/networkConfig';
import { Printer, ArrowLeft, Download, ShieldCheck } from 'lucide-react';

interface QRPrintSheetProps {
  parts: Part[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  onBack: () => void;
}

export const QRPrintSheet: React.FC<QRPrintSheetProps> = ({
  parts,
  inventory,
  suppliers,
  onBack
}) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 p-4 sm:p-8 font-sans space-y-6">
      
      {/* Top Controls Bar (Hidden during printing via CSS) */}
      <div className="print:hidden flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-700 hover:text-blue-700 font-mono text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 text-blue-700" />
          <span>BACK TO DASHBOARD</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm text-xs font-mono transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT ALL 27 QR CODES (A4 SHEET)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Header */}
      <div className="text-center space-y-1 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black tracking-wider text-slate-900 font-heading">SUPPLYSHIELD 3D</h1>
        <p className="text-xs font-mono text-blue-700 font-bold">CANONICAL AUTOMOTIVE COMPONENT IDENTIFICATION SHEET (27 PARTS)</p>
        <p className="text-[10px] text-slate-500 font-mono">
          High-Contrast Level H Error Correction | Scan with any mobile device for live real-time inventory &amp; procurement intelligence.
        </p>
      </div>

      {/* 27 Components Grid (Print Optimized) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
        {parts.map((part) => {
          const qrUrl = getComponentQRUrl(part.part_id);
          const inv = inventory.find((i) => i.part_id === part.part_id);
          const sup = suppliers.find((s) => s.part_id === part.part_id);

          return (
            <div
              key={part.part_id}
              className="bg-white text-slate-900 p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-between space-y-2 text-center break-inside-avoid"
            >
              {/* Header Label */}
              <div className="w-full border-b border-slate-100 pb-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  SUPPLYSHIELD 3D
                </span>
                <h3 className="text-xs font-bold text-slate-900 truncate" title={part.display_name}>
                  {part.display_name}
                </h3>
              </div>

              {/* QR Code */}
              <div className="py-1">
                <QRCodeSVG
                  value={qrUrl}
                  size={125}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Part ID & Category */}
              <div className="w-full border-t border-slate-100 pt-1 space-y-0.5 font-mono">
                <p className="text-xs font-black text-blue-700 tracking-wide">{part.part_id}</p>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>{part.category}</span>
                  <span className="font-bold">{part.criticality}</span>
                </div>
                <p className="text-[8px] text-slate-400 truncate">{qrUrl}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
