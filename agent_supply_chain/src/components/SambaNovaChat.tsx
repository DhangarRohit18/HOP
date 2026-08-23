import React, { useState } from 'react';
import { Part, InventoryItem, PurchaseOrder, Supplier, ProductionOrder } from '../types/supplyChain';
import { askSambaNovaAI } from '../services/sambanova';
import { Bot, Send, Sparkles, Loader2, ArrowUpRight, MessageSquare, ShieldAlert, Cpu } from 'lucide-react';

interface SambaNovaChatProps {
  parts: Part[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  productionOrders: ProductionOrder[];
  onSelectPart: (partId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  referencedPartId?: string;
}

export const SambaNovaChat: React.FC<SambaNovaChatProps> = ({
  parts,
  inventory,
  purchaseOrders,
  suppliers,
  productionOrders,
  onSelectPart
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Hello, I am SupplyShield Automotive AI. Ask me anything regarding component inventory (available, on-order, incoming), supplier reliability, production stoppages, or procurement recommendations.',
      timestamp: '19:41:00'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'How many batteries do we have (available vs on-order)?',
    'Which components can stop production in 3 days?',
    'How many headlights have we ordered?',
    'tell details of Integrated Rear Diffuser Bumper'
  ];

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    // Build rich database grounding context
    const dbContext = {
      parts_full: parts.map((p) => {
        const sup = suppliers.find((s) => s.supplier_id === p.supplier_id || s.part_id === p.part_id);
        const inv = inventory.find((i) => i.part_id === p.part_id);
        return {
          part_id: p.part_id,
          display_name: p.display_name,
          category: p.category,
          criticality: p.criticality,
          status: p.status,
          supplier_name: sup?.supplier_name || 'Primary Supplier',
          lead_time_days: sup?.lead_time_days || 7,
          unit_cost: inv?.unit_cost || sup?.unit_price || 2400
        };
      }),
      inventory_summary: inventory.map((i) => {
        const sup = suppliers.find((s) => s.part_id === i.part_id);
        const partMeta = parts.find((p) => p.part_id === i.part_id);
        const avail = i.available_stock ?? i.usable_stock ?? 0;
        return {
          part_id: i.part_id,
          name: i.name || partMeta?.display_name || i.part_id,
          available: avail,
          reserved: i.reserved_stock ?? 30,
          incoming: i.incoming_stock ?? 0,
          on_order: i.on_order_stock ?? 0,
          daily_burn: i.daily_usage ?? 30,
          coverage_days: i.coverage_days ?? Number((avail / Math.max(1, i.daily_usage || 30)).toFixed(1)),
          safety_stock: i.safety_stock ?? 90,
          unit_cost: i.unit_cost ?? sup?.unit_price ?? 2400,
          supplier_name: sup?.supplier_name || 'Primary Supplier',
          lead_time_days: sup?.lead_time_days || 7
        };
      }),
      open_purchase_orders: purchaseOrders.map((po) => ({
        po_id: po.po_id,
        part_id: po.part_id,
        supplier: po.supplier_name,
        quantity: po.quantity,
        status: po.status,
        expected_delivery: po.expected_delivery
      }))
    };

    const aiPrompt = `
You are SupplyShield's Automotive Digital Twin AI Agent. Answer the following supply chain and inventory inquiry accurately using ONLY the live grounded database context below.

CURRENT QUERY: "${q}"

GROUNDED DATABASE METRICS:
- Total Canonical 3D Components: ${parts.length}
- Inventory Records: ${inventory.length}
- Open Purchase Orders: ${purchaseOrders.length}
- Live Suppliers: ${suppliers.length}
- Database Dump:
${JSON.stringify(dbContext, null, 2)}

INSTRUCTIONS:
1. Provide precise numbers (available units, daily burn, coverage days, suppliers, on-order stock).
2. If asked about a specific component, include its Part ID in brackets like [PART:BATTERY_PACK] or [PART:LEFT_HEADLIGHT].
3. Be professional, direct, and concise.
`;

    try {
      const responseText = await askSambaNovaAI(aiPrompt, dbContext);

      // Extract referenced part ID if present in format [PART:XYZ] or matching canonical part list
      let referencedPartId: string | undefined = undefined;
      const partTagMatch = responseText.match(/\[PART:([A-Z0-9_]+)\]/);
      if (partTagMatch && partTagMatch[1]) {
        referencedPartId = partTagMatch[1];
      } else {
        const found = parts.find(
          (p) =>
            responseText.includes(p.part_id) ||
            q.toLowerCase().includes(p.part_id.toLowerCase()) ||
            q.toLowerCase().includes(p.display_name.toLowerCase())
        );
        if (found) referencedPartId = found.part_id;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        referencedPartId: referencedPartId
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'Error contacting SambaNova AI engine. Please verify connection.',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden text-xs font-sans">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
              SupplyShield Automotive AI Assistant
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold">
                SambaNova Llama-3.1
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Grounded Supply-Chain Intelligence &amp; Procurement Engine
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto scrollbar-none font-mono">
        <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-blue-700 text-[10px] whitespace-nowrap transition-all flex items-center gap-1 shadow-sm"
          >
            <span>{prompt}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-700 text-white font-medium rounded-br-none shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-line">{m.text}</p>

              {/* 3D Focus Action Button if Part Mentioned */}
              {m.referencedPartId && (
                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between font-mono">
                  <span className="text-[10px] text-blue-700 font-bold">
                    Referenced Component: {m.referencedPartId}
                  </span>
                  <button
                    onClick={() => onSelectPart(m.referencedPartId!)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 text-[10px] font-bold transition-all shadow-sm"
                  >
                    View in 3D →
                  </button>
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
              {m.sender === 'user' ? 'SC Operator' : 'SambaNova AI'} • {m.timestamp}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-blue-700 font-mono p-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
            <span>SambaNova AI Grounding &amp; Reasoning...</span>
          </div>
        )}
      </div>

      {/* Query Input Bar */}
      <div className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2 font-mono">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI about 27 parts, delivery ETAs, suppliers, or disruption recovery..."
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !inputQuery.trim()}
          className="p-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
