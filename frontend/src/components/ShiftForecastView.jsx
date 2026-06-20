import { useState, useEffect } from "react";

export default function ShiftForecastView({ theme }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStep, setUploadStep] = useState(0); // 0: Idle, 1: Uploading, 2: Cleaning data, 3: Training model, 4: Generating predictions
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const fetchCurrentForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/data/forecast_12h.json`);
      if (!res.ok) {
        throw new Error("Failed to fetch static 12h forecast");
      }
      const data = await res.json();
      setForecast(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch initial 12h forecast. Please ensure static artifacts are built.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentForecast();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setShowComingSoon(true);
  };

  const handleFileChange = (e) => {
    setShowComingSoon(true);
  };

  const uploadFile = async (file) => {
    setShowComingSoon(true);
  };

  // SVG Chart rendering helper
  const renderChart = () => {
    if (!forecast || !forecast.series || forecast.series.length === 0) return null;
    const series = forecast.series;
    
    const w = 600;
    const h = 220;
    const padX = 40;
    const padY = 30;

    const maxVal = Math.max(...series.map((d) => d.hi), 1) * 1.1;
    const n = series.length;

    const x = (i) => padX + (i * (w - padX * 2)) / (n - 1);
    const y = (v) => h - padY - (v / maxVal) * (h - padY * 2);

    // Compute P10-P90 filled band
    const areaPoints = series.map((d, i) => `${x(i)},${y(d.hi)}`);
    const reverseLoPoints = [...series].reverse().map((d, i) => `${x(n - 1 - i)},${y(d.lo)}`);
    const areaPath = `M ${areaPoints.join(" L ")} L ${reverseLoPoints.join(" L ")} Z`;

    // Compute central prediction line
    const linePath = series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.pred)}`).join(" ");

    // Gridline positions
    const yGrid = [0.25, 0.5, 0.75].map((ratio) => h - padY - ratio * (h - padY * 2));
    const yGridLabels = [0.25, 0.5, 0.75].map((ratio) => Math.round(ratio * maxVal));

    return (
      <div className="relative border border-[var(--border)] bg-[var(--surface)] p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[var(--border)]/40 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Shift Violation Load Timeline (+12 Hours)</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-[var(--text-soft)] whitespace-nowrap">
              <span className="w-2.5 h-1.5 bg-accent opacity-15 rounded-sm shrink-0" /> Expected Range (P10 Min - P90 Max)
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text)] whitespace-nowrap">
              <span className="w-2.5 h-0.5 bg-accent shrink-0" /> Blended Prediction
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
          <defs>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {yGrid.map((yg, idx) => (
            <g key={idx}>
              <line x1={padX} y1={yg} x2={w - padX} y2={yg} stroke="var(--border)" strokeDasharray="4,4" strokeWidth="0.75" opacity="0.5" />
              <text x={padX - 8} y={yg + 3} fontSize="8" fontWeight="600" textAnchor="end" fill="var(--text-soft)">{yGridLabels[idx]}</text>
            </g>
          ))}
          <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="var(--border)" strokeWidth="1" />

          {/* Shaded P10-P90 uncertainty interval band */}
          <path d={areaPath} fill="url(#bandGrad)" />

          {/* Central forecast line */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinejoin="round" />

          {/* Interactive dots */}
          {series.map((d, i) => (
            <g key={i}>
              <circle
                cx={x(i)}
                cy={y(d.pred)}
                r={hoveredIdx === i ? "5.5" : "3.5"}
                fill="var(--bg)"
                stroke="var(--accent)"
                strokeWidth={hoveredIdx === i ? "3.25" : "2"}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* Highlight Hover Tooltip inside SVG */}
              {hoveredIdx === i && (
                <g>
                  <rect
                    x={x(i) - 40}
                    y={y(d.pred) - 36}
                    width="80"
                    height="28"
                    rx="6"
                    fill="var(--surface-2)"
                    stroke="var(--border)"
                    strokeWidth="0.75"
                  />
                  <text x={x(i)} y={y(d.pred) - 24} fontSize="8" fontWeight="700" textAnchor="middle" fill="var(--text)">
                    {d.pred} Tickets
                  </text>
                  <text x={x(i)} y={y(d.pred) - 14} fontSize="7" fontWeight="600" textAnchor="middle" fill="var(--text-soft)">
                    Range: {d.lo} - {d.hi}
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* X Axis Labels */}
          {series.map((d, i) => (i % 2 === 0 || i === n - 1) && (
            <text key={i} x={x(i)} y={h - 10} fontSize="7.5" fontWeight="700" textAnchor="middle" fill="var(--text-soft)">
              {d.at_label}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-4 sm:p-8 overflow-y-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <h3 className="font-display font-bold text-xl sm:text-2xl tracking-tight">12-Hour Operational Shift Forecaster</h3>
            <p className="text-xs text-[var(--text-soft)] mt-1.5 leading-relaxed font-medium max-w-2xl">
              Forecast citywide violation counts hour-by-hour for the next operational shift. Drag and drop a new raw violation CSV to retrain the blended LightGBM and seasonal ensemble models instantly.
            </p>
          </div>
        </div>

        {/* Loading / Progress State */}
        {loading && uploadStep > 0 && (
          <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center space-y-5 animate-pulse shadow-lg">
            <div className="flex justify-center">
              <span className="relative flex h-8 w-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-8 w-8 bg-accent"></span>
              </span>
            </div>
            
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="font-display font-bold text-sm uppercase tracking-wider">Processing Raw Violations Stream</h4>
              <p className="text-xs text-[var(--text-soft)] font-medium">Pipeline is execution live. Fitting non-overfit predictors.</p>
            </div>

            {/* Checklist of steps */}
            <div className="max-w-sm mx-auto text-left border border-[var(--border)] bg-[var(--surface-2)]/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={uploadStep >= 1 ? "text-[var(--text)]" : "text-[var(--text-soft)]/50"}>
                  {uploadStep > 1 ? "✓ Ingested raw e-challan stream" : "⌛ Loading CSV file data..."}
                </span>
                {uploadStep === 1 && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />}
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={uploadStep >= 2 ? "text-[var(--text)]" : "text-[var(--text-soft)]/50"}>
                  {uploadStep > 2 ? "✓ Sanitised Coordinates & localized dates" : "⌛ Cleaning spatiotemporal bounds..."}
                </span>
                {uploadStep === 2 && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />}
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={uploadStep >= 3 ? "text-[var(--text)]" : "text-[var(--text-soft)]/50"}>
                  {uploadStep > 3 ? "✓ Blended LightGBM + profile models fit" : "⌛ Fitting gradient boosters (poisson target)..."}
                </span>
                {uploadStep === 3 && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />}
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={uploadStep >= 4 ? "text-[var(--text)]" : "text-[var(--text-soft)]/50"}>
                  {uploadStep > 4 ? "✓ Quantiles computed (P10/P90)" : "⌛ Generating Live uncertainty bands..."}
                </span>
                {uploadStep === 4 && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />}
              </div>
            </div>
          </div>
        )}


        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-[10px] font-bold uppercase tracking-wider hover:underline shrink-0">Dismiss</button>
          </div>
        )}

        {/* Normal stats & dashboard view */}
        {(!loading || uploadStep === 0) && forecast && (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 border border-[var(--border)] bg-[var(--surface)] rounded-2xl shadow-sm hover:border-[var(--text-soft)]/30 transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Expected Violation Tickets</span>
                <h4 className="font-display font-extrabold text-2xl mt-1 text-[var(--text)] tabular-nums">{forecast.total_12h} <span className="text-xs text-[var(--text-soft)] font-medium">Tickets</span></h4>
                <p className="text-[9px] text-[var(--text-soft)] mt-2 font-bold uppercase tracking-wider">Range: {forecast.p10} (Min) - {forecast.p90} (Max)</p>
              </div>

              <div className="p-5 border border-[var(--border)] bg-[var(--surface)] rounded-2xl shadow-sm hover:border-[var(--text-soft)]/30 transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Model R² Score</span>
                <h4 className="font-display font-extrabold text-2xl mt-1 text-[var(--text)] tabular-nums">{(forecast.cv_r2 * 100).toFixed(1)}%</h4>
                <p className="text-[9px] text-[var(--text-soft)] mt-2 font-bold uppercase tracking-wider">Cross-Validated (CV)</p>
              </div>

              <div className="p-5 border border-[var(--border)] bg-[var(--surface)] rounded-2xl shadow-sm hover:border-[var(--text-soft)]/30 transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Ensemble Model</span>
                <h4 className="font-display font-extrabold text-xl mt-1.5 text-[var(--text)] truncate">{forecast.engine} Blended</h4>
                <p className="text-[9px] text-[var(--text-soft)] mt-2.5 font-bold uppercase tracking-wider">0.7 Seasonal / 0.3 GBM</p>
              </div>

              <div className="p-5 border border-[var(--border)] bg-[var(--surface)] rounded-2xl shadow-sm hover:border-[var(--text-soft)]/30 transition-colors">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Trained Through</span>
                <h4 className="font-display font-extrabold text-base mt-2.5 text-[var(--text)] truncate">
                  {new Date(forecast.trained_through).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </h4>
                <p className="text-[9px] text-[var(--text-soft)] mt-3.5 font-bold uppercase tracking-wider">Latest data tick</p>
              </div>
            </div>

            {/* Custom SVG Line Chart */}
            {renderChart()}

            {/* Layout Grid: CSV Uploader & Table */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Ingestion & Guide */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Uploader Card */}
                <div className="border border-[var(--border)] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/30 shrink-0">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text)]">Police Ingestion Terminal</h4>
                    <p className="text-[9px] text-[var(--text-soft)] font-medium">Retrain forecast model with live local records</p>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    <div
                      onClick={() => setShowComingSoon(true)}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center items-center group ${
                        dragActive
                          ? "border-accent bg-[var(--surface-2)] shadow-[inset_0_2px_12px_var(--border)]"
                          : "border-[var(--border)] hover:border-[var(--text-soft)]/50 bg-[var(--surface-2)]/10"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center space-y-3.5 w-full h-full select-none">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-soft)] group-hover:text-[var(--text)] transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[var(--text)]">Drag & drop raw violations file</p>
                          <p className="text-[9.5px] font-semibold text-[var(--text-soft)]">Supports e-challan exported CSV</p>
                        </div>
                        
                        <span className="text-[9px] font-bold px-3 py-1 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-md uppercase tracking-wider group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-colors">Select CSV File</span>
                      </div>
                    </div>

                    {/* CSV Field requirements */}
                    <div className="space-y-3 text-[10px] font-semibold text-[var(--text-soft)]">
                      <span className="uppercase tracking-widest text-[9px] font-bold text-[var(--text-soft)]">CSV Schema Requirements</span>
                      <ul className="space-y-2 border border-[var(--border)] bg-[var(--surface-2)]/20 rounded-xl p-3.5 leading-relaxed">
                        <li className="flex items-start gap-2">
                          <span className="text-accent shrink-0">✓</span> 
                          <span>Must have columns for coordinates (<code className="font-mono text-[9px]">latitude</code>, <code className="font-mono text-[9px]">longitude</code>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-accent shrink-0">✓</span> 
                          <span>Must have timestamp column (<code className="font-mono text-[9px]">created_date</code> or <code className="font-mono text-[9px]">created_datetime</code>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-accent shrink-0">✓</span> 
                          <span>Supports headerless CSVs automatically via index maps</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Shift Planner's Interpretation Guide Card */}
                <div className="border border-[var(--border)] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-[var(--text-soft)]/20 transition-colors">
                  <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)]/30 shrink-0">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text)]">Shift Planner's Guide</h4>
                  </div>
                  <div className="p-4 space-y-3 text-[10.5px] font-semibold text-[var(--text-soft)] leading-relaxed font-sans">
                    <p className="font-medium text-[10.5px]">
                      Forecast values show the <strong>predicted number of illegal parking tickets</strong> expected citywide in that hour.
                    </p>
                    <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)]/50 pt-2.5">
                      <div>
                        <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[8px] block mb-0.5">Optimistic Min (P10)</span>
                        <p className="font-medium text-[9.5px]">10% chance actual tickets fall below this count.</p>
                      </div>
                      <div>
                        <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[8px] block mb-0.5">Pessimistic Max (P90)</span>
                        <p className="font-medium text-[9.5px]">90% chance actual tickets stay below this count.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Forecast Table Card */}
              <div className="lg:col-span-7 border border-[var(--border)] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/30 shrink-0 flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text)] truncate">Detailed Shift Prediction Table</h4>
                    <p className="text-[9px] text-[var(--text-soft)] font-medium truncate">Hour-by-hour forecast details and bands</p>
                  </div>
                  <span className="text-[9px] font-bold text-accent px-2.5 py-1 rounded-full bg-accent/5 border border-accent/20 whitespace-nowrap shrink-0">Bengaluru Citywide</span>
                </div>

                <div className="overflow-x-auto min-h-0 flex-1 scrollbar-thin">
                  <table className="w-full text-[11px] text-left border-collapse font-semibold">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-soft)] bg-[var(--surface-2)]/35 text-[9px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-5">Time Slot</th>
                        <th className="py-3 px-5">Scheduled Hour</th>
                        <th className="py-3 px-5 text-right">Expected Tickets</th>
                        <th className="py-3 px-5 text-right">Optimistic Min (P10)</th>
                        <th className="py-3 px-5 text-right">Pessimistic Max (P90)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/70 font-medium tabular-nums text-[var(--text)]">
                      {forecast.series.map((s, idx) => (
                        <tr key={idx} className="hover:bg-[var(--surface-2)]/25 transition-colors">
                          <td className="py-3 px-5 font-bold text-[var(--text)]">{s.h}</td>
                          <td className="py-3 px-5 text-[var(--text-soft)]">{s.at_label}</td>
                          <td className="py-3 px-5 text-right font-extrabold text-[var(--text)]">{s.pred} tickets</td>
                          <td className="py-3 px-5 text-right text-cyan-600 dark:text-cyan-400 font-bold">{s.lo} tickets</td>
                          <td className="py-3 px-5 text-right text-rose-600 dark:text-rose-400 font-bold">{s.hi} tickets</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>


          </div>
        )}
      </div>

      {/* Coming Soon Glassmorphic Modal */}
      {showComingSoon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div 
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            
            <div className="space-y-1">
              <h4 className="font-display font-extrabold text-sm uppercase tracking-wider text-[var(--text)]">Coming Soon</h4>
              <p className="text-[10.5px] text-[var(--text-soft)] font-medium">
                This feature is coming soon.
              </p>
            </div>

            <button
              onClick={() => setShowComingSoon(false)}
              className="w-full py-2.5 px-4 bg-[var(--text)] text-[var(--bg)] hover:bg-[var(--text)]/90 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
