import { motion } from "framer-motion";

export function PlatformFeatures() {
  return (
    <section className="py-28 px-6 border-t border-[var(--border)] bg-[var(--bg)] relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-20">
          <span className="text-[9px] font-bold uppercase tracking-widest text-accent">Platform Capabilities</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 text-[var(--text)] leading-tight">
            Dynamic Patrol &amp; <span className="font-serif italic font-normal text-accent">Traffic Intelligence</span>
          </h2>
          <p className="text-sm text-[var(--text-soft)] mt-5 leading-relaxed max-w-2xl font-medium">
            Help patrol teams clear road bottlenecks efficiently by replacing random schedules with predictive route scheduling based on local traffic load.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-accent/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent/5 text-accent flex items-center justify-center mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--text)]">Predictive Route Allocation</h3>
            <p className="text-xs text-[var(--text-soft)] mt-3 leading-relaxed font-medium">
              Predicts high-density traffic risks and parking hotspots across the city using historical data trends and street layouts.
            </p>
          </div>

          <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-accent/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent/5 text-accent flex items-center justify-center mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--text)]">Roadway Layout Constraints</h3>
            <p className="text-xs text-[var(--text-soft)] mt-3 leading-relaxed font-medium">
              Identifies street bottlenecks, bus stops, and lane constraints where illegal parking blocks public transport.
            </p>
          </div>

          <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-accent/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-accent/5 text-accent flex items-center justify-center mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-lg text-[var(--text)]">Economic Waste Assessment</h3>
            <p className="text-xs text-[var(--text-soft)] mt-3 leading-relaxed font-medium">
              Measures financial impact from vehicle delay times and engine fuel waste at critical road bottlenecks.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

export function SystemArchitecture() {
  return (
    <section className="py-28 px-6 border-t border-[var(--border)] bg-[var(--surface-2)]/30 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-20">
          <span className="text-[9px] font-bold uppercase tracking-widest text-accent">Technical Specifications</span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 text-[var(--text)] leading-tight">
            System Data Flow &amp; <span className="font-serif italic font-normal text-accent">Analytics Pipeline</span>
          </h2>
          <p className="text-sm text-[var(--text-soft)] mt-5 leading-relaxed max-w-2xl font-medium">
            NammaFLOW synchronizes geographical logs with analytical pipelines to serve optimized dispatch coordinates to traffic officers.
          </p>
        </div>

        {/* Technical Flow Grid */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6 sm:p-8 shadow-xl overflow-x-auto xl:overflow-x-visible">
          <div className="flex flex-col xl:flex-row items-stretch xl:justify-between gap-4 text-[9px] text-[var(--text-soft)] font-semibold min-w-[260px] xl:min-w-[1100px]">
            
            <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 w-full xl:w-60 shadow-sm hover:border-accent/20 transition-all duration-300 flex flex-col justify-between shrink-0">
              <div>
                <span className="text-[8px] font-bold text-accent px-2 py-0.5 rounded bg-accent/5 border border-accent/10">STEP 01</span>
                <div className="text-[10px] text-[var(--text)] font-extrabold mb-2 mt-2.5 tracking-wide">DATA GATHERING</div>
                <p className="text-[9px] text-[var(--text-soft)] font-medium leading-relaxed mb-4">
                  Combines city road grids, street networks, and patrol histories.
                </p>
              </div>
              <div className="border-t border-[var(--border)]/75 pt-3.5 space-y-2 text-[10px] text-[var(--text-soft)] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>OSM Nodes: <strong className="text-[var(--text)] font-bold">45,182</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Hist. Logs: <strong className="text-[var(--text)] font-bold">298k+</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Ingest API: <strong className="text-[var(--text)] font-bold">HTTPS/WSS</strong></span>
                </div>
              </div>
            </div>
 
            <div className="hidden xl:flex w-[30px] items-center justify-center relative shrink-0">
              <div className="h-[1px] bg-[var(--border)] w-full relative">
                <div className="absolute -top-[3px] right-0 w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            </div>

            <div className="flex xl:hidden h-[20px] w-[1px] mx-auto items-center justify-center relative shrink-0">
              <div className="w-[1px] bg-[var(--border)] h-full relative">
                <div className="absolute -left-[3px] bottom-0 w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            </div>
 
            <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 w-full xl:w-60 shadow-sm hover:border-accent/20 transition-all duration-300 flex flex-col justify-between shrink-0">
              <div>
                <span className="text-[8px] font-bold text-accent px-2 py-0.5 rounded bg-accent/5 border border-accent/10">STEP 02</span>
                <div className="text-[10px] text-[var(--text)] font-extrabold mb-2 mt-2.5 tracking-wide">LAYOUT MODELING</div>
                <p className="text-[9px] text-[var(--text-soft)] font-medium leading-relaxed mb-4">
                  Correlates street layouts with busy commute hours.
                </p>
              </div>
              <div className="border-t border-[var(--border)]/75 pt-3.5 space-y-2 text-[10px] text-[var(--text-soft)] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Time Enc.: <strong className="text-[var(--text)] font-bold">Sin/Cos 168h</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Transit POIs: <strong className="text-[var(--text)] font-bold">12 Categories</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Lane Bottlenecks: <strong className="text-[var(--text)] font-bold">Radius R-250</strong></span>
                </div>
              </div>
            </div>
 
            <div className="hidden xl:flex w-[30px] items-center justify-center relative shrink-0">
              <div className="h-[1px] bg-[var(--border)] w-full relative">
                <div className="absolute -top-[3px] right-0 w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            </div>

            <div className="flex xl:hidden h-[20px] w-[1px] mx-auto items-center justify-center relative shrink-0">
              <div className="w-[1px] bg-[var(--border)] h-full relative">
                <div className="absolute -left-[3px] bottom-0 w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            </div>
 
            <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 w-full xl:w-60 shadow-sm hover:border-accent/20 transition-all duration-300 flex flex-col justify-between shrink-0">
              <div>
                <span className="text-[8px] font-bold text-accent px-2 py-0.5 rounded bg-accent/5 border border-accent/10">STEP 03</span>
                <div className="text-[10px] text-[var(--text)] font-extrabold mb-2 mt-2.5 tracking-wide">RISK FORECASTING</div>
                <p className="text-[9px] text-[var(--text-soft)] font-medium leading-relaxed mb-4">
                  Runs predictive algorithms to estimate localized traffic congestion risk.
                </p>
              </div>
              <div className="border-t border-[var(--border)]/75 pt-3.5 space-y-2 text-[10px] text-[var(--text-soft)] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Model: <strong className="text-[var(--text)] font-bold">LightGBM GBDT</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Inference: <strong className="text-[var(--text)] font-bold">&lt; 1.2s / batch</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Explainability: <strong className="text-[var(--text)] font-bold">SHAP Values</strong></span>
                </div>
              </div>
            </div>
 
            <div className="hidden xl:flex w-[30px] items-center justify-center relative shrink-0">
              <div className="h-[1px] bg-[var(--border)] w-full relative">
                <div className="absolute -top-[3px] right-0 w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            </div>

            <div className="flex xl:hidden h-[20px] w-[1px] mx-auto items-center justify-center relative shrink-0">
              <div className="w-[1px] bg-[var(--border)] h-full relative">
                <div className="absolute -left-[3px] bottom-0 w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
            </div>
 
            <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 w-full xl:w-60 shadow-sm hover:border-accent/20 transition-all duration-300 flex flex-col justify-between shrink-0">
              <div>
                <span className="text-[8px] font-bold text-accent px-2 py-0.5 rounded bg-accent/5 border border-accent/10">STEP 04</span>
                <div className="text-[10px] text-[var(--text)] font-extrabold mb-2 mt-2.5 tracking-wide">OFFICER DISPATCH</div>
                <p className="text-[9px] text-[var(--text-soft)] font-medium leading-relaxed mb-4">
                  Prioritizes dispatch schedules to direct patrol cars to active bottlenecks.
                </p>
              </div>
              <div className="border-t border-[var(--border)]/75 pt-3.5 space-y-2 text-[10px] text-[var(--text-soft)] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Metric: <strong className="text-[var(--text)] font-bold">CII Index (%)</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Routing: <strong className="text-[var(--text)] font-bold">Dijkstra OSRM</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Feedback Loop: <strong className="text-[var(--text)] font-bold">Active logs</strong></span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Technical Specs List */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="p-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-md">
            <h3 className="font-display font-bold text-base text-[var(--text)] mb-6">Pipeline Latency Specifications</h3>
            <div className="space-y-4 text-xs font-semibold tabular-nums">
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-soft)]">Inference Frequency</span>
                <span className="font-bold text-[var(--text)]">Hourly (Every 60m)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-soft)]">OSM Extract Duration</span>
                <span className="font-bold text-[var(--text)]">&lt; 14.5s (45k nodes)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-soft)]">Model Prediction Time</span>
                <span className="font-bold text-[var(--text)]">&lt; 1.2s (LightGBM)</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-md">
            <h3 className="font-display font-bold text-base text-[var(--text)] mb-6">Precision & Validation Metrics</h3>
            <div className="space-y-4 text-xs font-semibold tabular-nums">
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-soft)]">Model Holdout R² score</span>
                <span className="font-bold text-[var(--text)]">0.842</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-soft)]">Test MAE (Count)</span>
                <span className="font-bold text-[var(--text)]">0.113</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-soft)]">CII Correlation Coeff.</span>
                <span className="font-bold text-[var(--text)]">0.914</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ConsoleLaunchCTA({ onEnter }) {
  return (
    <section className="py-28 px-6 border-t border-[var(--border)] bg-[var(--bg)] relative z-10 text-center">
      <div className="max-w-4xl mx-auto">
        <span className="text-[9px] font-bold uppercase tracking-widest text-accent">Launch Console</span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 text-[var(--text)] leading-tight">
          Proactive Dispatch <span className="font-serif italic font-normal text-accent">Awaits</span>
        </h2>
        <p className="text-sm text-[var(--text-soft)] mt-5 leading-relaxed max-w-xl mx-auto font-medium">
          Start predicting violations, monitoring enforcement gaps, and optimizing municipal dispatches directly from the Bengaluru Patrol Console.
        </p>
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => onEnter && onEnter("dispatch")}
            className="px-10 py-4 rounded-lg font-bold text-[10px] uppercase tracking-widest text-[var(--bg)] bg-[var(--text)] hover:opacity-90 transition-all active:scale-[0.98]"
          >
            Launch Bengaluru Command Console
          </button>
        </div>
      </div>
    </section>
  );
}
