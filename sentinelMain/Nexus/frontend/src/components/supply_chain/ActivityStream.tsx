import React from 'react';
import { AgentEvent } from '../../types/supplyChain';
import { Activity, AlertCircle, CheckCircle2, Radio, Brain, Lock, RefreshCw, Cpu, Layers } from 'lucide-react';

interface ActivityStreamProps {
  events: AgentEvent[];
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({ events }) => {
  return (
    <div className="bg-nexus-white rounded-[8px] border border-nexus-blue-20 p-4 shadow-sm flex flex-col h-full overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nexus-blue-12 pb-3 mb-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-nexus-blue-04 text-nexus-blue rounded-[8px] border border-nexus-blue-20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-nexus-blue font-sans tracking-tight">
              Real-Time Telemetry &amp; Agent Stream
            </h3>
            <p className="text-[10px] text-nexus-blue-60 font-mono">
              Live Autonomous Disruption Event Bus
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-[8px] bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20 font-bold">
          {events.length} EVENTS
        </span>
      </div>

      {/* Activity Log Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-300">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nexus-blue-60 text-center py-10 space-y-2">
            <RefreshCw className="w-7 h-7 animate-spin text-nexus-blue mb-1" />
            <p className="text-xs text-nexus-blue font-sans">Telemetry agent standing by...</p>
            <p className="text-[10px] text-nexus-blue-60 font-sans">Simulate clock or inject disruption scenario</p>
          </div>
        ) : (
          events.map((event) => {
            let icon = <CheckCircle2 className="w-3.5 h-3.5 text-nexus-blue" />;
            let badgeStyle = 'bg-nexus-white text-nexus-blue border-nexus-blue-20';

            if (event.type === 'DISRUPTION_DETECTED' || event.severity === 'CRITICAL') {
              icon = <AlertCircle className="w-3.5 h-3.5 text-nexus-blue" />;
              badgeStyle = 'bg-nexus-blue-04/70 text-nexus-blue border-nexus-blue-20 font-medium';
            } else if (event.type === 'TRACKING_VERIFIED') {
              icon = <Radio className="w-3.5 h-3.5 text-nexus-blue" />;
              badgeStyle = 'bg-nexus-white text-nexus-blue border-nexus-blue-20';
            } else if (event.type === 'RECOVERY_SIMULATION_STARTED') {
              icon = <Brain className="w-3.5 h-3.5 text-nexus-blue" />;
              badgeStyle = 'bg-nexus-white text-nexus-blue border-nexus-blue-20';
            } else if (event.type === 'APPROVAL_REQUESTED') {
              icon = <Lock className="w-3.5 h-3.5 text-nexus-blue" />;
              badgeStyle = 'bg-nexus-blue-04 text-nexus-blue border-nexus-blue-20';
            } else if (event.type === 'PART_RECOVERED') {
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-nexus-blue" />;
              badgeStyle = 'bg-nexus-blue-04/50 text-nexus-blue border-nexus-blue-20';
            } else if (event.type === 'PO_CREATED') {
              icon = <Cpu className="w-3.5 h-3.5 text-nexus-blue" />;
              badgeStyle = 'bg-nexus-white text-nexus-blue border-nexus-blue-20';
            }

            return (
              <div
                key={event.id}
                className={`p-2.5 rounded-[8px] border transition-all flex items-start space-x-2.5 ${badgeStyle}`}
              >
                <span className="text-[10px] text-nexus-blue-60 shrink-0 font-mono pt-0.5">
                  {event.time_formatted}
                </span>
                <div className="shrink-0 pt-0.5">{icon}</div>
                <div className="flex-1 leading-snug">
                  <p className="text-nexus-blue text-xs font-sans">{event.message}</p>
                  {event.part_id && (
                    <span className="text-[10px] text-nexus-blue font-mono mt-1 inline-block font-bold">
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
