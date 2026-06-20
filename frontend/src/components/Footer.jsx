import { NAME, TAGLINE, EVENT, YEAR } from "../lib/brand.js";

export default function Footer() {
  return (
    <footer className="px-5 pt-10 pb-14" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden shadow-sm shrink-0">
                {/* Glowing gradient background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--border)] to-[var(--accent)]/20 opacity-35 transition-opacity group-hover:opacity-55 duration-300" />
                
                {/* Dynamic Map Pin & Flow Symbol */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="relative z-10 select-none">
                  <circle cx="12" cy="10" r="7" stroke="var(--accent)" strokeWidth="1" className="animate-ping opacity-25" />
                  {/* Left lane (brand accent) */}
                  <path d="M12 21C7.8 17.2 5 13.8 5 10a7 7 0 0 1 7-7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Right lane (brand text) */}
                  <path d="M12 21C16.2 17.2 19 13.8 19 10a7 7 0 0 0-7-7" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Hotspot node */}
                  <circle cx="12" cy="10" r="2.2" fill="var(--accent)" stroke="none" />
                </svg>
              </div>
              <span className="font-display font-extrabold text-lg tracking-tight text-[var(--text)] flex items-center gap-0.5 select-none">
                <span className="font-semibold text-[var(--text)]">Namma</span>
                <span className="bg-gradient-to-r from-[var(--text)] to-[var(--accent)] bg-clip-text text-transparent font-black tracking-wider uppercase">FLOW</span>
              </span>
            </div>
            <p className="muted text-sm mt-3 max-w-sm">{TAGLINE}. Turning reactive,
              blind enforcement into a predictive, prioritised system.</p>
          </div>

          <div className="text-sm sm:text-right">
            <div className="font-display font-semibold">Made for the {EVENT}</div>
            <div className="muted mt-1 flex items-center gap-1.5 sm:justify-end">
              Built with <span style={{ color: "#e24b4a" }}>♥</span> and a lot of coffee
            </div>
            <div className="muted mt-1">Bengaluru Traffic Police open dataset</div>
          </div>
        </div>

        <div className="mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs muted"
          style={{ borderTop: "1px solid var(--border)" }}>
          <span>© {YEAR} {NAME}. All rights reserved.</span>
          <span>FastAPI · MapLibre · scikit-learn · LightGBM</span>
        </div>
      </div>
    </footer>
  );
}
