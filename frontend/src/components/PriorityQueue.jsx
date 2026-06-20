import Reveal from "./Reveal.jsx";

function getCIIColor(score) {
  if (score >= 75) return "bg-rose-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-cyan-500";
}

function formatINRCompact(val) {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L/hr`;
  }
  return `₹${(val / 1000).toFixed(0)}K/hr`;
}

export default function PriorityQueue({ queue, onSelect, isDark, dispatchedCops = {}, myDispatches = new Set() }) {
  if (!queue) return null;
  
  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* List Header */}
      <div className="px-5 py-3.5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-2)]/45 shrink-0">
        <div>
          <h4 className="font-display font-bold text-[var(--text)] text-xs uppercase tracking-wider">Priority Leaderboard</h4>
          <span className="text-[9px] text-[var(--text-soft)] font-medium">Ranked by spatiotemporal congestion impact</span>
        </div>
        <span className="text-[8px] font-bold text-[var(--text-soft)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)] uppercase tracking-wider">Worst First</span>
      </div>

      {/* Rows Container */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2.5 space-y-1.5 scrollbar-thin">
        {queue.map((z, i) => {
          const copsCount = dispatchedCops[z.id] || 0;
          const isMyDispatched = myDispatches.has(z.id);
          return (
            <Reveal key={z.id} delay={Math.min(i * 0.015, 0.25)}>
              <button
                onClick={() => onSelect(z.id)}
                className="w-full flex items-center gap-3.5 py-2.5 px-3 hover:bg-[var(--surface-2)]/55 rounded-lg border border-transparent hover:border-[var(--border)]/50 transition-all text-left relative overflow-hidden group active:scale-[0.995]"
              >
                {/* Clean Rank Indicator */}
                <span className="font-mono text-xs text-[var(--text-soft)]/60 w-6 text-center shrink-0 tabular-nums font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                
                {/* Location and Info */}
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="block text-[13px] font-bold text-[var(--text)] transition-colors truncate">
                      {z.station}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${getCIIColor(z.cii)} shrink-0`} />
                  </span>
                  <span className="block text-[10.5px] text-[var(--text-soft)] truncate mt-1.5 font-semibold leading-none flex items-center justify-between gap-2">
                    <span className="truncate">{z.reason}</span>
                    {copsCount > 0 && (
                      <span className={`shrink-0 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${
                        isMyDispatched
                          ? "bg-accent/15 text-accent border border-accent/25"
                          : "bg-[var(--surface-2)] text-[var(--text-soft)] border border-[var(--border)]"
                      }`}>
                        <i className="hgi hgi-stroke hgi-rounded hgi-police-cap text-[9px] shrink-0"></i>
                        <span>{copsCount}</span>
                      </span>
                    )}
                  </span>
                </span>
                
                {/* Telemetry (Loss and Drive Time) */}
                <span className="text-right shrink-0 flex flex-col items-end mr-2">
                  <span className="text-[12.5px] font-bold text-[var(--text)] tabular-nums">
                    {formatINRCompact(z.economic_loss_inr)}
                  </span>
                  <span className="text-[10px] text-[var(--text-soft)] font-medium mt-1.5 tabular-nums flex items-center gap-1 justify-end">
                    <svg className="w-2.5 h-2.5 text-[var(--text-soft)]/65" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {Math.round(z.travel_time_mins)}m dispatch
                  </span>
                </span>

                {/* Score Column */}
                <span className="text-sm font-bold text-[var(--text)] w-8 text-right tabular-nums shrink-0">
                  {z.cii}%
                </span>
              </button>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
