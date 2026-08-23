import React, { useState } from "react";

export interface SambaNovaMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SambaNovaChatProps {
  context?: string;
  onClose?: () => void;
  parts?: any[];
  inventory?: any[];
  purchaseOrders?: any[];
  suppliers?: any[];
  productionOrders?: any[];
  onSelectPart?: (partId: string) => void;
}

export const SambaNovaChat: React.FC<SambaNovaChatProps> = ({ context, onClose }) => {
  const [messages, setMessages] = useState<SambaNovaMessage[]>([
    { role: "assistant", content: "Hello! I am the Sentinel AI assistant. How can I help you analyze the supply chain disruption?", timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: SambaNovaMessage = { role: "user", content: input, timestamp: new Date().toISOString() };
    const aiMsg: SambaNovaMessage = { role: "assistant", content: "Based on current supply chain data, I recommend escalating to the Control Tower for immediate review.", timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-[#DDD5EA]">
        <span className="font-mono-tech font-bold text-sm text-[#1B082C]">🤖 SENTINEL AI ASSISTANT</span>
        {onClose && <button onClick={onClose} className="text-[#81758F]">✕</button>}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded text-xs font-mono-tech ${msg.role === "user" ? "bg-[#EEE8FF] text-[#1B082C] ml-4" : "bg-[#FBFAFF] text-[#594B69] mr-4"}`}>
            <span className="font-bold text-[#834DFB]">{msg.role === "user" ? "YOU" : "SENTINEL"}: </span>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 border-t border-[#DDD5EA]">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Ask about the disruption..." className="flex-1 px-3 py-1.5 border border-[#DDD5EA] rounded text-xs font-mono-tech focus:outline-none focus:border-[#834DFB]" />
        <button onClick={handleSend} className="px-3 py-1.5 bg-[#834DFB] text-white rounded text-xs font-bold">SEND</button>
      </div>
    </div>
  );
};

export default SambaNovaChat;
