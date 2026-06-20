import Reveal from "./Reveal.jsx";

export default function StatCards({ stats }) {
  if (!stats) return null;
  const tiles = [
    ["Approved violations", stats.total_violations.toLocaleString(), "var(--accent)"],
    ["Worst precinct", `${stats.worst_zone} (CII: ${stats.worst_cii})`, "var(--text)"],
    ["Peak time window", stats.peak_window, "var(--text)"],
    ["Total economic loss", `₹${stats.total_economic_loss_lakhs} Lakhs/hr`, "var(--text)"],
  ];
  return (
    <section className="px-5 -mt-4 relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {tiles.map(([label, value, color], i) => (
          <Reveal key={label} delay={i * 0.05}>
            <div className="surface rounded-xl p-5 h-full border hover:shadow-xl transition-all" style={{ background: "rgba(var(--surface-rgb), 0.95)" }}>
              <div className="text-xs uppercase font-bold tracking-wider muted mb-2">{label}</div>
              <div className="font-display font-extrabold text-2xl tracking-tight truncate" style={{ color }}>
                {value}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
