import Reveal from "./Reveal.jsx";

export default function InsightStrip({ stats }) {
  if (!stats) return null;
  const tiles = [
    ["Zones re-ranked by bias fix", `${stats.rank_changed_pct ?? 99}%`, "of hotspots moved once corrected for patrol coverage"],
    ["Forecast accuracy", stats.forecast_r2 != null ? `R² ${stats.forecast_r2}` : "—", stats.forecast_model || "gradient-boosted"],
    ["On named junctions", `${Math.round((stats.named_junction_share || 0) * 100)}%`, "of violations sit on a named junction"],
    ["Patrol units seen", (stats.n_officers || 0).toLocaleString(), `across ${stats.n_stations} stations`],
  ];
  return (
    <section className="px-5 py-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([label, value, sub], i) => (
          <Reveal key={label} delay={i * 0.05}>
            <div className="surface rounded-xl p-5 h-full">
              <div className="text-xs muted mb-2">{label}</div>
              <div className="font-display font-semibold text-2xl tracking-tight">{value}</div>
              <div className="text-xs muted mt-1">{sub}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
