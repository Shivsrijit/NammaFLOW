import Reveal from "./Reveal.jsx";

export default function ForecastView({ forecast, onSelectZone }) {
  if (!forecast) return null;
  const { meta } = forecast;
  const rec = meta.recommendation;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/45 shrink-0">
        <h4 className="font-display font-bold text-[var(--text)] text-xs uppercase tracking-wider">Predictive Dispatch</h4>
        <span className="text-[9px] text-[var(--text-soft)] font-medium">Proactive patrol routing engine</span>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 scrollbar-thin">
        
        {/* Next Peak Card */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 relative overflow-hidden">
          <div className="text-[9px] font-bold uppercase tracking-wider text-accent">Next predicted peak</div>
          <div className="font-display font-bold text-2xl mt-1 text-[var(--text)]">{rec.label}</div>
          <div className="text-[9px] font-bold text-[var(--text-soft)] mt-2">
            Model: {meta.model} {meta.holdout_r2 != null ? `(R² ${meta.holdout_r2})` : ""}
          </div>
        </div>

        {/* Dispatch Order */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-soft)] mb-3 flex justify-between items-center">
            <span>Recommended Patrol Dispatch</span>
            <span className="text-[8px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/5 border border-accent/10">6 Optimal Cells</span>
          </div>
          <div className="space-y-2.5">
            {rec.zones.map((z, i) => (
              <button
                key={z.geohash6}
                onClick={() => onSelectZone && onSelectZone(z)}
                className="w-full block py-3.5 px-4 hover:bg-[var(--surface-2)]/55 border border-[var(--border)] bg-[var(--surface)]/40 rounded-xl transition-all text-left relative overflow-hidden group active:scale-[0.995]"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[var(--text-soft)]/70 px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13px] font-bold text-[var(--text)] truncate">
                      Grid Zone {z.geohash6.toUpperCase()}
                    </span>
                  </div>
                  
                  <span className="text-[13px] font-bold text-[var(--text)] tabular-nums text-right">
                    ~{z.predicted}/hr
                  </span>
                </div>
                
                <div className="text-[10.5px] text-[var(--text-soft)] mt-2 font-medium tabular-nums">
                  Latitude: {z.lat.toFixed(5)} · Longitude: {z.lon.toFixed(5)}
                </div>
                
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)]/40 pt-2.5">
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    z.predicted >= 10 
                      ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" 
                      : z.predicted >= 6 
                        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" 
                        : "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                  }`}>
                    {z.predicted >= 10 ? "Critical Risk" : z.predicted >= 6 ? "High Risk" : "Moderate Risk"}
                  </span>
                  
                  <span className="text-[8px] text-[var(--text-soft)] font-medium group-hover:text-[var(--text)] transition-colors">Click to locate</span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
