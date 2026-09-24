import { Bot, Sparkles } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm mx-auto p-6 rounded-2xl bg-[#091020]/80 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] backdrop-blur-xl">
        <div className="inline-block p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <Bot className="w-8 h-8 text-purple-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold font-mono text-white flex items-center justify-center gap-1.5">
            <span>Loading Telemetry</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Synchronizing neural control plane state...
          </p>
        </div>
        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="w-full h-full bg-linear-to-r from-purple-500 via-cyan-400 to-purple-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
