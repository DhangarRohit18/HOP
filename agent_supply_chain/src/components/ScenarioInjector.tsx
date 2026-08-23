import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

interface ScenarioInjectorProps {
  onInjectScenario: (scenarioId: string) => void;
}

export const ScenarioInjector: React.FC<ScenarioInjectorProps> = ({ onInjectScenario }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeScenarioName, setActiveScenarioName] = useState<string | null>(null);

  const presets = [
    {
      id: 'SCENARIO_1_DELAY',
      title: 'Supplier Delay',
      desc: 'PO-7712 delayed on Left Headlight. 0 days coverage.'
    },
    {
      id: 'SCENARIO_2_STALE_STOCK',
      title: 'Stale Stock Data',
      desc: 'ERP shows 800 ECU units, warehouse stock is 390.'
    },
    {
      id: 'SCENARIO_3_ADVERSARIAL',
      title: 'Adversarial Claim',
      desc: 'Supplier claims "dispatched", tracking shows "label only".'
    },
    {
      id: 'SCENARIO_4_QUALITY',
      title: 'Quality Failure',
      desc: 'Cheapest supplier fails automotive certification.'
    },
    {
      id: 'SCENARIO_5_BUDGET',
      title: 'Budget Approval',
      desc: 'Emergency recovery exceeds ₹150,000 threshold.'
    },
    {
      id: 'SCENARIO_6_LINE_STOP',
      title: 'Urgent Line Stop',
      desc: 'Line stoppage in 12 hours. Triggers split PO.'
    }
  ];

  const handleSelect = (id: string, title: string) => {
    setActiveScenarioName(title);
    onInjectScenario(id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm font-sans">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 font-heading">
                Disruption Simulation Sandbox
              </span>
              {activeScenarioName && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  Active: {activeScenarioName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Inject live stress-test scenarios to evaluate autonomous recovery twin &amp; procurement decisions.
            </p>
          </div>
        </div>

        {/* Quick Trigger Buttons or Toggle */}
        <div className="flex items-center space-x-1.5">
          <div className="hidden lg:flex items-center space-x-1.5">
            {presets.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id, p.title)}
                className="px-2.5 py-1 text-[11px] bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg transition-all font-medium flex items-center gap-1"
                title={p.desc}
              >
                <PlayCircle className="w-3 h-3 text-blue-700" />
                <span>{p.title}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-all"
          >
            <span>{isExpanded ? 'Hide All 6' : 'View All 6 Scenarios'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Grid (Only when requested) */}
      {isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 mt-3 border-t border-slate-100 animate-fade-in">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset.id, preset.title)}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-sm text-left transition-all flex flex-col justify-between space-y-1.5 group"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-700">
                  {preset.title}
                </span>
                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                  {preset.desc}
                </p>
              </div>
              <span className="text-[10px] text-blue-700 font-semibold group-hover:underline flex items-center gap-1">
                Inject →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
