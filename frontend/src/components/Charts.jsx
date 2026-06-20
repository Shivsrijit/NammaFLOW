import Reveal from "./Reveal.jsx";

const ACCENT = "var(--accent)";

function AreaChart({ values, labels }) {
  const w = 400, h = 100, pad = 8;
  const max = Math.max(...values, 1);
  const n = values.length;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(n - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const yGrid = [0.25, 0.5, 0.75].map(ratio => h - pad - ratio * (h - pad * 2));
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 mt-2">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Gridlines */}
      {yGrid.map((yg, idx) => (
        <line key={idx} x1={pad} y1={yg} x2={w - pad} y2={yg} stroke="var(--border)" strokeDasharray="3,3" strokeWidth="0.5" opacity="0.45" />
      ))}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="0.75" />
      
      <path d={area} fill="url(#chartGrad)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" />
      
      {/* Hollow Data Dots */}
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.25" />
      ))}
      {labels && labels.map((l, i) => (
        <text key={i} x={x(i)} y={h - 1} fontSize="7" fontWeight="600" textAnchor="middle" fill="var(--text-soft)">{l}</text>
      ))}
    </svg>
  );
}

function LineChart({ values }) {
  const w = 400, h = 100, pad = 8;
  const max = Math.max(...values, 1);
  const x = (i) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const yGrid = [0.25, 0.5, 0.75].map(ratio => h - pad - ratio * (h - pad * 2));
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 mt-2">
      {/* Gridlines */}
      {yGrid.map((yg, idx) => (
        <line key={idx} x1={pad} y1={yg} x2={w - pad} y2={yg} stroke="var(--border)" strokeDasharray="3,3" strokeWidth="0.5" opacity="0.45" />
      ))}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="0.75" />
      
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" />
      
      {/* Hollow Data Dots (every 2 steps to avoid crowding) */}
      {values.map((v, i) => i % 2 === 0 && (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.25" />
      ))}
      {[0, 6, 12, 18, 23].map((hh) => (
        <text key={hh} x={x(hh)} y={h - 1} fontSize="7" fontWeight="600" textAnchor="middle" fill="var(--text-soft)">{hh}:00</text>
      ))}
    </svg>
  );
}

function formatLabel(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function BarList({ data }) {
  const entries = Object.entries(data)
    .filter(([k]) => k && k.trim() && k.trim() !== "-" && k.trim() !== ".")
    .slice(0, 5); // Show top 5 valid entries
  const max = Math.max(...entries.map(([, v]) => v), 1);
  
  return (
    <div className="space-y-4 mt-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-[10.5px] font-semibold mb-1.5">
            <span className="text-[var(--text-soft)] truncate pr-2">{formatLabel(k)}</span>
            <span className="text-[var(--text)] font-bold tabular-nums">{v.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]/35 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-700 ease-out" 
              style={{ 
                width: `${(v / max) * 100}%`, 
                background: `linear-gradient(90deg, var(--accent), var(--text-soft))`
              }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function forecastHourly(forecast) {
  if (!forecast || !forecast.grid) return null;
  const hourly = new Array(24).fill(0);
  forecast.grid.forEach((cell) => {
    for (let d = 0; d < 7; d++)
      for (let hh = 0; hh < 24; hh++) hourly[hh] += cell.pred[d * 24 + hh] || 0;
  });
  return hourly.map((v) => v / 7); // average per day
}

export default function Analytics({ temporal, forecast, onlyChart }) {
  if (!temporal) return null;
  const monthly = temporal.monthly || [];
  const fHourly = forecastHourly(forecast);

  if (onlyChart === "monthly") {
    return (
      <AreaChart
        values={monthly.map((m) => m.count)}
        labels={monthly.map((m) => m.month.slice(5))}
      />
    );
  }

  if (onlyChart === "hourly") {
    return fHourly ? <LineChart values={fHourly} /> : <div className="muted text-xs">No forecast loaded.</div>;
  }

  if (onlyChart === "violations") {
    return <BarList data={temporal.violations} />;
  }

  if (onlyChart === "vehicles") {
    return <BarList data={temporal.vehicles} />;
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/45">
        <h4 className="font-display font-bold text-[var(--text)] text-sm uppercase tracking-wider">System Analytics</h4>
        <span className="text-[10px] muted font-semibold">Analytical trends & data patterns</span>
      </div>

      {/* Panels list */}
      <div className="flex-1 overflow-y-auto max-h-[520px] p-5 space-y-4 scrollbar-thin">
        
        {/* Card 1 */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Monthly violation trend</div>
          <AreaChart
            values={monthly.map((m) => m.count)}
            labels={monthly.map((m) => m.month.slice(5))}
          />
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Predicted Hourly Traffic Load</div>
          {fHourly ? <LineChart values={fHourly} /> : <div className="muted text-xs">No forecast loaded.</div>}
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Violation Types</div>
          <BarList data={temporal.violations} />
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Vehicle Mix</div>
          <BarList data={temporal.vehicles} />
        </div>

      </div>
    </div>
  );
}
