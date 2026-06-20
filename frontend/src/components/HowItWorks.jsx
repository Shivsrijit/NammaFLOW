import Reveal from "./Reveal.jsx";

const STEPS = [
  ["01", "Clean & localise", "298k raw records filtered to the approved core, timestamps converted to IST, every point geohashed."],
  ["02", "Cluster", "HDBSCAN finds parking hotspots of varying density; a geohash grid builds the heatmap surface."],
  ["03", "Score & correct", "An interpretable impact score, then normalised by patrol coverage so we measure parking, not policing."],
  ["04", "Forecast", "A gradient-boosted model learns each cell's hour-of-week rhythm to predict the next peak."],
  ["05", "Serve", "Everything precomputed into static artifacts, served instantly to the map — nothing heavy runs live."],
];

export default function HowItWorks() {
  return (
    <section className="px-5 py-20">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-xs muted uppercase tracking-wide mb-2">How it works</div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl max-w-2xl">
            From raw challans to a dispatch plan.
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-8">
          {STEPS.map(([n, title, body], i) => (
            <Reveal key={n} delay={i * 0.05}>
              <div className="surface rounded-xl p-5 h-full">
                <div className="font-display font-bold text-2xl" style={{ color: "var(--accent)" }}>{n}</div>
                <div className="font-medium mt-2">{title}</div>
                <p className="text-sm muted mt-1.5 leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
