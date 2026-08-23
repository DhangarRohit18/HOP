import React from 'react';
import { AgentEvent } from '../types/supplyChain';
import { Activity, AlertCircle, CheckCircle2, Radio, Brain, Lock, RefreshCw, Cpu, Layers } from 'lucide-react';

interface ActivityStreamProps {
  events: AgentEvent[];
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({ events }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col h-full overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Real-Time Telemetry &amp; Agent Stream
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Live Autonomous Disruption Event Bus
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
          {events.length} EVENTS
        </span>
      </div>

      {/* Activity Log Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-300">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-10 space-y-2">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-700 mb-1" />
            <p className="text-xs text-slate-600 font-sans">Telemetry agent standing by...</p>
            <p className="text-[10px] text-slate-400 font-sans">Simulate clock or inject disruption scenario</p>
          </div>
        ) : (
          events.map((event) => {
            let icon = <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />;
            let badgeStyle = 'bg-slate-50 text-slate-800 border-slate-200';

            if (event.type === 'DISRUPTION_DETECTED' || event.severity === 'CRITICAL') {
              icon = <AlertCircle className="w-3.5 h-3.5 text-blue-700" />;
              badgeStyle = 'bg-blue-50/70 text-slate-900 border-blue-200 font-medium';
            } else if (event.type === 'TRACKING_VERIFIED') {
              icon = <Radio className="w-3.5 h-3.5 text-blue-700" />;
              badgeStyle = 'bg-slate-50 text-slate-800 border-slate-200';
            } else if (event.type === 'RECOVERY_SIMULATION_STARTED') {
              icon = <Brain className="w-3.5 h-3.5 text-blue-700" />;
              badgeStyle = 'bg-slate-50 text-slate-800 border-slate-200';
            } else if (event.type === 'APPROVAL_REQUESTED') {
              icon = <Lock className="w-3.5 h-3.5 text-blue-700" />;
              badgeStyle = 'bg-blue-50 text-blue-900 border-blue-200';
            } else if (event.type === 'PART_RECOVERED') {
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />;
              badgeStyle = 'bg-blue-50/50 text-slate-900 border-blue-200';
            } else if (event.type === 'PO_CREATED') {
              icon = <Cpu className="w-3.5 h-3.5 text-blue-700" />;
              badgeStyle = 'bg-slate-50 text-slate-900 border-slate-200';
            }

            return (
              <div
                key={event.id}
                className={`p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 ${badgeStyle}`}
              >
                <span className="text-[10px] text-slate-500 shrink-0 font-mono pt-0.5">
                  {event.time_formatted}
                </span>
                <div className="shrink-0 pt-0.5">{icon}</div>
                <div className="flex-1 leading-snug">
                  <p className="text-slate-800 text-xs font-sans">{event.message}</p>
                  {event.part_id && (
                    <span className="text-[10px] text-blue-700 font-mono mt-1 inline-block font-bold">
                      Target: {event.part_id}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
