import { useState } from "react";

const ORDER = [
  ["Approved-only core", "approved_only"],
  ["Timezone handling", "timezone_note"],
  ["Enforcement-bias correction", "bias_correction"],
  ["Impact score", "score_formula"],
  ["Forecast model", "forecast_model"],
];

export default function Methodology({ methodology, fullWidth }) {
  const [openKey, setOpenKey] = useState("approved_only"); // default first open

  if (!methodology) return null;

  const toggleKey = (key) => {
    setOpenKey(openKey === key ? null : key);
  };

  if (fullWidth) {
    return (
      <div className="bg-transparent">
        <div className="mb-6">
          <h4 className="font-display font-bold text-[var(--text)] text-xs uppercase tracking-wider">System Methodology</h4>
          <span className="text-[9px] text-[var(--text-soft)] mt-1 block font-medium">Core math formulations and bias adjustment models</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ORDER.map(([title, key]) =>
            methodology[key] ? (
              <div key={key} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:border-[var(--text-soft)]/40 transition-colors">
                <div className="font-display font-semibold text-xs uppercase tracking-wider text-accent mb-2">{title}</div>
                <p className="text-xs text-[var(--text-soft)] leading-relaxed font-medium">{methodology[key]}</p>
              </div>
            ) : null
          )}
        </div>
      </div>
    );
  }

  // Compact sidebar accordion layout
  return (
    <div className="space-y-2">
      {ORDER.map(([title, key]) => {
        const isOpen = openKey === key;
        return methodology[key] ? (
          <div 
            key={key} 
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/20 overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => toggleKey(key)}
              className="w-full flex items-center justify-between p-3.5 text-left focus:outline-none hover:bg-[var(--surface-2)]/50 transition-colors"
            >
              <span className="font-display font-semibold text-xs uppercase tracking-wider text-[var(--text)]">
                {title}
              </span>
              <span className="text-[var(--text-soft)]/60 transition-transform duration-200" style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="px-3.5 pb-4 pt-1 border-t border-[var(--border)]/50">
                <p className="text-xs text-[var(--text-soft)] leading-relaxed font-medium">
                  {methodology[key]}
                </p>
              </div>
            )}
          </div>
        ) : null;
      })}
    </div>
  );
}
