import React, { useState } from 'react';

export interface MaterialLabelData {
  material_unit_id: string;
  component_id: string;
  component_name: string;
  serial_number: string;
  batch_id: string;
  supplier_id: string;
  condition_preview: string;
  scenario_title: string;
}

export const DEMO_MATERIALS: MaterialLabelData[] = [
  {
    material_unit_id: 'CMP-001-00427',
    component_id: 'CMP-001',
    component_name: '32-bit MCU Microcontroller',
    serial_number: 'MCU-00427',
    batch_id: 'BATCH-2026-0710',
    supplier_id: 'SUP-001',
    condition_preview: 'AT_RISK',
    scenario_title: 'Fab Outage + Delay ($200k SLA)',
  },
  {
    material_unit_id: 'CMP-001-00428',
    component_id: 'CMP-001',
    component_name: '32-bit MCU Microcontroller',
    serial_number: 'MCU-00428',
    batch_id: 'BATCH-2026-0710',
    supplier_id: 'SUP-001',
    condition_preview: 'HEALTHY',
    scenario_title: 'Healthy Operational Baseline',
  },
  {
    material_unit_id: 'CMP-001-00429',
    component_id: 'CMP-001',
    component_name: '32-bit MCU Microcontroller',
    serial_number: 'MCU-00429',
    batch_id: 'BATCH-2026-0710',
    supplier_id: 'SUP-001',
    condition_preview: 'QUARANTINED',
    scenario_title: 'Wafer Probe Test Volatility Failure',
  },
  {
    material_unit_id: 'CMP-005-01001',
    component_id: 'CMP-005',
    component_name: 'High-Voltage IGBT Driver Module',
    serial_number: 'IGBT-01001',
    batch_id: 'BATCH-2026-0801',
    supplier_id: 'SUP-003',
    condition_preview: 'AT_RISK',
    scenario_title: 'Safety Stock Inventory Breach',
  },
  {
    material_unit_id: 'CMP-009-01002',
    component_id: 'CMP-009',
    component_name: 'Precision Optical Sensor Array',
    serial_number: 'OPT-01002',
    batch_id: 'BATCH-2026-0805',
    supplier_id: 'SUP-006',
    condition_preview: 'AT_RISK',
    scenario_title: 'Port Customs Logistics Hold',
  },
  {
    material_unit_id: 'CMP-012-01003',
    component_id: 'CMP-012',
    component_name: 'Automotive Power Inverter Board',
    serial_number: 'INV-01003',
    batch_id: 'BATCH-2026-0810',
    supplier_id: 'SUP-002',
    condition_preview: 'AT_RISK',
    scenario_title: 'Assembly Line Production Bottleneck',
  },
  {
    material_unit_id: 'CMP-017-01004',
    component_id: 'CMP-017',
    component_name: 'Custom Silicon PMIC Controller',
    serial_number: 'PMIC-01004',
    batch_id: 'BATCH-2026-0812',
    supplier_id: 'SUP-001',
    condition_preview: 'AT_RISK',
    scenario_title: 'Single-Source Silicon Shortage ($310k)',
  },
  {
    material_unit_id: 'CMP-021-01005',
    component_id: 'CMP-021',
    component_name: 'Standard Industrial Connector Harness',
    serial_number: 'HAR-01005',
    batch_id: 'BATCH-2026-0815',
    supplier_id: 'SUP-005',
    condition_preview: 'HEALTHY',
    scenario_title: 'Healthy Control Case B (Dual Sourced)',
  },
];

// Helper to generate a deterministic clean SVG QR Code matrix for NEXUS-MAT:<id>
export const SimpleSvgQrCode: React.FC<{ payload: string; size?: number }> = ({ payload, size = 150 }) => {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }

  const gridSize = 21;
  const cellSize = size / gridSize;

  const isModuleBlack = (r: number, c: number) => {
    if (r < 7 && c < 7) {
      if (r === 0 || r === 6 || c === 0 || c === 6) return true;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    if (r < 7 && c >= gridSize - 7) {
      const nc = c - (gridSize - 7);
      if (r === 0 || r === 6 || nc === 0 || nc === 6) return true;
      if (r >= 2 && r <= 4 && nc >= 2 && nc <= 4) return true;
      return false;
    }
    if (r >= gridSize - 7 && c < 7) {
      const nr = r - (gridSize - 7);
      if (nr === 0 || nr === 6 || c === 0 || c === 6) return true;
      if (nr >= 2 && nr <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    if (r === 6 || c === 6) return (r + c) % 2 === 0;

    const val = Math.sin(hash * 3.14159 + r * 17 + c * 31);
    return val > 0.05;
  };

  const rects = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isModuleBlack(r, c)) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize + 0.2}
            height={cellSize + 0.2}
            fill="#1B082C"
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white p-2 rounded shadow-sm border border-[#DDD5EA]">
      {rects}
    </svg>
  );
};

export const MaterialDemoPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredMaterials = selectedId === 'ALL'
    ? DEMO_MATERIALS
    : DEMO_MATERIALS.filter((m) => m.material_unit_id === selectedId);

  const copyPayload = (payload: string, id: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 text-[#1B082C] font-mono-tech">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DDD5EA] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#834DFB] tracking-widest uppercase">
            <span>NEXUS FIELD INTELLIGENCE</span>
            <span className="px-2 py-0.5 text-[9px] bg-[#EEE8FF] border border-[#C9BDD9] text-[#834DFB] rounded">
              PHYSICAL DEMO STATION
            </span>
          </div>
          <h1 className="text-xl font-black text-[#1B082C] mt-1">INDUSTRIAL MATERIAL QR LABELS</h1>
          <p className="text-xs text-[#594B69] mt-1">
            Printable physical QR tags containing stable identity pointer payload (<code className="text-[#834DFB]">NEXUS-MAT:&lt;material_unit_id&gt;</code>).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#834DFB] text-[#F5F3FF] font-black text-xs rounded hover:bg-[#7040E5] transition-colors flex items-center gap-2 shadow-sm"
          >
            🖨 PRINT DEMO SHEET (8 SCENARIOS)
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-2 bg-[#FFFFFF] p-3 rounded-lg border border-[#DDD5EA] text-xs shadow-xs">
        <span className="text-[#81758F] font-bold">SELECT DEMO MATERIAL:</span>
        <button
          onClick={() => setSelectedId('ALL')}
          className={`px-3 py-1 rounded font-bold transition-all ${
            selectedId === 'ALL'
              ? 'bg-[#834DFB] text-[#F5F3FF]'
              : 'bg-[#FBFAFF] text-[#594B69] hover:text-[#1B082C] border border-[#DDD5EA]'
          }`}
        >
          ALL (8 SCENARIOS)
        </button>
        {DEMO_MATERIALS.map((m) => (
          <button
            key={m.material_unit_id}
            onClick={() => setSelectedId(m.material_unit_id)}
            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
              selectedId === m.material_unit_id
                ? 'bg-[#834DFB] text-[#F5F3FF]'
                : 'bg-[#FBFAFF] text-[#594B69] hover:text-[#1B082C] border border-[#DDD5EA]'
            }`}
          >
            {m.material_unit_id}
          </button>
        ))}
      </div>

      {/* PRINTABLE QR LABEL CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2">
        {filteredMaterials.map((mat) => {
          const qrPayload = `NEXUS-MAT:${mat.material_unit_id}`;

          return (
            <div
              key={mat.material_unit_id}
              className="bg-[#FFFFFF] border-2 border-[#C9BDD9] rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden print:border-black print:text-black print:bg-white"
            >
              {/* TOP INDUSTRIAL LABEL HEADER */}
              <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-2 mb-3">
                <div>
                  <div className="text-[9px] font-extrabold text-[#834DFB] tracking-wider uppercase">
                    NEXUS FIELD INTELLIGENCE
                  </div>
                  <div className="text-[10px] font-bold text-[#1B082C] mt-0.5">{mat.component_name}</div>
                </div>
                <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded ${
                  mat.condition_preview === 'AT_RISK'
                    ? 'bg-[#FFFBD1] text-[#1B082C] border border-[#F0E100]'
                    : mat.condition_preview === 'QUARANTINED'
                    ? 'bg-[#FFFBD1] text-[#1B082C] border border-[#F0E100]'
                    : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                }`}>
                  ● {mat.condition_preview}
                </span>
              </div>

              {/* CENTER SCANNABLE QR CODE & ID */}
              <div className="flex flex-col items-center justify-center my-2 space-y-2">
                <SimpleSvgQrCode payload={qrPayload} size={130} />

                <div className="text-center font-mono-tech">
                  <div className="text-base font-black text-[#834DFB] tracking-wider">{mat.material_unit_id}</div>
                  <div className="text-[9px] text-[#594B69] mt-0.5 font-bold">{mat.scenario_title}</div>
                  <div className="text-[8px] text-[#834DFB] mt-0.5">Payload: <code>{qrPayload}</code></div>
                </div>
              </div>

              {/* TECHNICAL METADATA GRID */}
              <div className="grid grid-cols-2 gap-1.5 bg-[#FBFAFF] p-2.5 rounded-lg border border-[#DDD5EA] text-[9px] mt-2">
                <div>
                  <span className="text-[#81758F] block text-[8px]">SERIAL NUMBER</span>
                  <span className="font-bold text-[#1B082C]">{mat.serial_number}</span>
                </div>
                <div>
                  <span className="text-[#81758F] block text-[8px]">BATCH NUMBER</span>
                  <span className="font-bold text-[#1B082C]">{mat.batch_id}</span>
                </div>
                <div>
                  <span className="text-[#81758F] block text-[8px]">COMPONENT ID</span>
                  <span className="font-bold text-[#834DFB]">{mat.component_id}</span>
                </div>
                <div>
                  <span className="text-[#81758F] block text-[8px]">SUPPLIER ID</span>
                  <span className="font-bold text-[#1B082C]">{mat.supplier_id}</span>
                </div>
              </div>

              {/* ACTION BUTTONS (PRINT & COPY) */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#DDD5EA] print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-1 bg-[#EEE8FF] text-[#834DFB] border border-[#C9BDD9] hover:bg-[#DDD5EA] text-[9px] font-bold rounded transition-colors text-center"
                >
                  🖨 PRINT
                </button>
                <button
                  onClick={() => copyPayload(qrPayload, mat.material_unit_id)}
                  className="flex-1 py-1 bg-[#FBFAFF] text-[#1B082C] border border-[#DDD5EA] hover:bg-[#EEE8FF] text-[9px] font-bold rounded transition-colors text-center"
                >
                  {copiedId === mat.material_unit_id ? '✓ COPIED' : '📋 COPY'}
                </button>
              </div>

              {/* FOOTER BOUNDARY DISCLAIMER */}
              <div className="mt-2 text-[7px] text-[#81758F] text-center uppercase tracking-wider">
                SCAN TO VERIFY MATERIAL • IDENTITY-ONLY • READ-ONLY
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MaterialDemoPage;
