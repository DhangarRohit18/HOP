import React from 'react';
import {
  Shield,
  Play,
  Pause,
  FastForward,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  Activity,
  Cpu
} from 'lucide-react';

interface HeaderProps {
  simulating: boolean;
  onToggleSimulate: () => void;
  onStepSimulation: () => void;
  onResetSimulation: () => void;
  autonomousMode: boolean;
  onToggleAutonomous: () => void;
  activeDisruptionCount: number;
  totalAvoidedLoss: number;
  executiveMode?: boolean;
  onToggleExecutiveMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  simulating,
  onToggleSimulate,
  onStepSimulation,
  onResetSimulation,
  autonomousMode,
  onToggleAutonomous,
  activeDisruptionCount,
  totalAvoidedLoss,
  executiveMode = false,
  onToggleExecutiveMode
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm font-sans">
      
      {/* ─── LEFT: Logo & Brand Identity ─── */}
      <div className="flex items-center space-x-3.5">
        <div className="p-2.5 bg-sky-600 rounded-xl text-white shadow-md shadow-sky-600/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight font-heading">
              SUPPLYSHIELD <span className="text-sky-600 font-mono text-xs px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 font-bold">3D AUTONOMOUS</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Automotive Supply Chain Digital Twin &amp; Procurement Intelligence
          </p>
        </div>
      </div>

      {/* ─── CENTER: Telemetry & Executive Metrics ─── */}
      <div className="hidden xl:flex items-center space-x-3 font-mono text-xs">
        
        {/* Simulation Clock */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>CLOCK: <strong className="text-slate-900">DAY 01 • 19:41:15</strong></span>
        </div>

        {/* Production State Pill */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-900">
          <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
          <span className="font-bold">{activeDisruptionCount > 0 ? `${activeDisruptionCount} Disruption Detected` : 'Production Nominal'}</span>
        </div>

        {/* Avoided Loss KPI */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700">
          <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
          <span>AVOIDED LOSS: <strong className="text-sky-600 font-bold">₹{(totalAvoidedLoss / 100000).toFixed(2)} Lakh</strong></span>
        </div>

        {/* AI Agent Status */}
        <div className="flex items-center space-x-2 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 text-sky-700">
          <Cpu className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
          <span className="font-bold text-[11px]">SAMBANOVA AI ACTIVE</span>
        </div>

      </div>

      {/* ─── RIGHT: Controls & Executive Mode Toggle ─── */}
      <div className="flex items-center space-x-2.5">
        
        {/* Executive Mode Toggle */}
        {onToggleExecutiveMode && (
          <button
            onClick={onToggleExecutiveMode}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
              executiveMode
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Executive Summary vs Control Tower View"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{executiveMode ? 'EXECUTIVE VIEW' : 'CONTROL TOWER'}</span>
          </button>
        )}

        {/* Autonomous Mode Toggle */}
        <button
          onClick={onToggleAutonomous}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            autonomousMode
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${autonomousMode ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
          <span className="hidden md:inline">AUTONOMOUS:</span>
          <span>{autonomousMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Simulation Controls */}
        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 space-x-1">
          <button
            onClick={onToggleSimulate}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              simulating
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:text-sky-600 hover:bg-slate-100'
            }`}
            title={simulating ? 'Pause Event Clock' : 'Start Event Clock'}
          >
            {simulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={onStepSimulation}
            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-100 transition-all text-xs"
            title="Step Simulation Forward (+1 hr)"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            onClick={onResetSimulation}
            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-100 transition-all text-xs"
            title="Reset to Initial Supply Chain State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>

    </header>
  );
};
