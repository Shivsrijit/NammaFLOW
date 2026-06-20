import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

function Bar({ label, value, color }) {
  return (
    <div className="mb-3.5">
      <div className="flex justify-between text-[13px] mb-1.5">
        <span className="text-[var(--text-soft)] font-medium">{label}</span>
        <span className="font-bold">{Math.round(value * 100)}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function HourSpark({ hist }) {
  const max = Math.max(...hist, 1);
  return (
    <div className="flex items-end gap-[2px] h-12">
      {hist.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all hover:opacity-100" title={`${i}:00 — ${v} violations`}
          style={{ height: `${(v / max) * 100}%`, minHeight: 2, background: "var(--accent)", opacity: 0.55 }} />
      ))}
    </div>
  );
}

export default function HotspotDetail({ feature, onClose, isMyDispatched, copsCount, onToggleDispatch }) {
  const p = feature ? feature.properties : null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {feature && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-[55]"
            style={{ background: "rgba(0,0,0,0.4)" }}
          />
          <motion.aside
            key="panel"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 h-full w-[400px] max-w-[95vw] z-[60] surface overflow-y-auto shadow-2xl backdrop-blur-md"
            style={{ borderLeft: "1px solid var(--border)", background: "rgba(var(--surface-rgb), 0.95)" }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="sticky top-3 left-full -ml-12 grid place-items-center w-9 h-9 rounded-full z-10 transition-transform hover:scale-105 active:scale-95 shadow-md"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
            <div className="px-6 pb-8 pt-4">
              <div>
                <div className="text-[11px] font-bold text-[var(--text-soft)] uppercase tracking-wider">Rank #{p.rank} · zone {p.id}</div>
                <h3 className="font-display font-bold text-3xl mt-2 pr-10 leading-tight">{p.station}</h3>
              </div>

              {/* Economic Loss Tile */}
              <div className="mt-5 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 relative overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  Economic Drain Index
                </div>
                <div className="font-display font-bold text-3xl text-[var(--text)] mt-2 tabular-nums">₹{Number(p.economic_loss_inr).toLocaleString()}/hr</div>
                <div className="text-xs muted mt-1.5 leading-relaxed">
                  Lost capital from driver delay wages and idle vehicle fuel consumption due to lane blockage.
                </div>
              </div>

              {/* Patrol Allocation Deployment Card */}
              <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 relative overflow-hidden">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <i className="hgi hgi-stroke hgi-rounded hgi-police-cap text-lg text-accent shrink-0"></i>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                        Patrol Allocation
                      </div>
                      <div className="text-xs font-bold text-[var(--text)] mt-0.5">
                        {copsCount} {copsCount === 1 ? "Officer" : "Officers"} dispatched
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleDispatch(p.id)}
                    className={`text-[10px] font-bold uppercase tracking-widest px-3.5 py-2 rounded-lg transition-all active:scale-[0.97] border ${
                      isMyDispatched
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
                        : "bg-accent text-[var(--bg)] border-transparent hover:opacity-90 shadow-sm"
                    }`}
                  >
                    {isMyDispatched ? "Leave Dispatch" : "Deploy Here"}
                  </button>
                </div>
                <div className="text-[10px] text-[var(--text-soft)] mt-3 leading-relaxed border-t border-[var(--border)]/40 pt-2.5">
                  {isMyDispatched 
                    ? "You are deployed to this zone. Depart when the roadway has been cleared."
                    : "Signal your patrol commitment to prevent redundant officer dispatch."}
                </div>
              </div>

              {/* CII Gauge & Score */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl p-3.5 border border-[var(--border)] bg-[var(--surface-2)]/30">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-soft)]">CII Score</div>
                  <div className="font-display font-bold text-4xl mt-1.5 text-amber-500 tabular-nums">{p.cii}</div>
                  <div className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-500 mt-1">Congestion Impact</div>
                </div>
                <div className="rounded-xl p-3.5 border border-[var(--border)] bg-[var(--surface-2)]/30">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-soft)]">Impact Score</div>
                  <div className="font-display font-bold text-4xl mt-1.5 text-accent tabular-nums">{p.score}</div>
                  <div className="text-[10.5px] font-semibold text-accent mt-1">Enforcement Priority</div>
                </div>
              </div>

              <p className="text-[14.5px] font-medium text-[var(--text)] mt-4 capitalize border-b pb-4 leading-relaxed" style={{ borderColor: "var(--border)" }}>
                {p.reason}
              </p>

              {/* Score components */}
              <div className="mt-6">
                <div className="text-[10.5px] font-bold mb-4 text-[var(--text-soft)] uppercase tracking-wider">Metric Breakdowns</div>
                <Bar label="Density (coverage-corrected)" value={p.components.density} color="var(--accent)" />
                <Bar label="Vehicle footprint weight" value={p.components.severity} color="var(--accent)" />
                <Bar label="Time Persistence" value={p.components.persistence} color="var(--accent)" />
                <Bar label="POI & Road profile factor" value={p.components.road_poi} color="var(--accent)" />
              </div>

              {/* Centroid metrics */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl p-3">
                  <div className="text-[10px] font-semibold muted">Road Lanes</div>
                  <div className="font-display font-semibold text-lg">{p.lanes} {p.lanes > 1 ? "lanes" : "lane"}</div>
                </div>
                <div className="bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl p-3">
                  <div className="text-[10px] font-semibold muted">Patrol Travel Time</div>
                  <div className="font-display font-semibold text-lg">{Math.round(p.travel_time_mins)} mins</div>
                  <span className="text-[9px] muted">({(p.station_dist_m/1000).toFixed(1)} km to station)</span>
                </div>
                <div className="bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl p-3">
                  <div className="text-[10px] font-semibold muted">Raw Violations</div>
                  <div className="font-display font-semibold text-lg">{p.count.toLocaleString()}</div>
                </div>
                <div className="bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl p-3">
                  <div className="text-[10px] font-semibold muted">Patrol Normalization</div>
                  <div className="font-display font-semibold text-lg">{p.coverage} officers</div>
                </div>
              </div>

              {/* Proximity POIs */}
              <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs font-bold mb-2.5 muted uppercase tracking-wider">OSM Proximity landmarks</div>
                <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="muted font-medium">Nearest Metro Exit</span>
                  <span className="font-semibold text-right truncate pl-4 max-w-[200px]" title={p.metro_name}>
                    {p.metro_name} ({Math.round(p.metro_dist_m)}m)
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="muted font-medium">Emergency Hospital</span>
                  <span className="font-semibold text-right truncate pl-4 max-w-[200px]" title={p.hospital_name}>
                    {p.hospital_name} ({Math.round(p.hospital_dist_m)}m)
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-bold mb-3.5 muted uppercase tracking-wider">Hourly Profile (IST)</div>
                <HourSpark hist={p.hour_hist} />
              </div>

              <div className="mt-5">
                <div className="text-xs font-bold mb-2.5 muted uppercase tracking-wider">Vehicle composition</div>
                {Object.entries(p.top_vehicles).map(([v, c]) => (
                  <div key={v} className="flex justify-between text-xs py-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <span className="font-medium text-[var(--text-soft)]">{v}</span>
                    <span className="muted font-semibold tabular-nums">{c.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
