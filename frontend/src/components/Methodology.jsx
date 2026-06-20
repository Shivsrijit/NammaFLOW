import { useState } from "react";

const ORDER = [
  ["Approved-only core", "approved_only"],
  ["Timezone handling", "timezone_note"],
  ["Enforcement-bias correction", "bias_correction"],
  ["Congestion Impact Index", "cii_formula"],
  ["Impact score", "score_formula"],
  ["Economic Loss Model", "economic_loss"],
  ["Forecast model", "forecast_model"],
];

// Helper to parse and render LaTeX using global window.katex
function renderTextWithMath(text) {
  if (!text) return "";
  if (typeof window === "undefined" || !window.katex) {
    return text;
  }

  const blocks = text.split("$$");
  let html = "";

  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      // Math block ($$ ... $$)
      try {
        html += window.katex.renderToString(blocks[i], {
          displayMode: true,
          throwOnError: false
        });
      } catch (err) {
        html += `<span class="text-red-500 font-mono text-[10px]">${blocks[i]}</span>`;
      }
    } else {
      // Non-math block, check for inline math ($ ... $)
      const inlines = blocks[i].split("$");
      for (let j = 0; j < inlines.length; j++) {
        if (j % 2 === 1) {
          // Inline math ($ ... $)
          try {
            html += window.katex.renderToString(inlines[j], {
              displayMode: false,
              throwOnError: false
            });
          } catch (err) {
            html += `<span class="text-red-500 font-mono text-[10px]">${inlines[j]}</span>`;
          }
        } else {
          // Plain text
          html += inlines[j];
        }
      }
    }
  }

  return html;
}

export default function Methodology({ methodology, fullWidth }) {
  const [openKey, setOpenKey] = useState("approved_only");

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
              <div 
                key={key} 
                className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:border-[var(--text-soft)]/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="font-display font-semibold text-xs uppercase tracking-wider text-accent mb-2.5">{title}</div>
                  <div 
                    className="text-xs text-[var(--text-soft)] leading-relaxed font-medium markdown-math"
                    dangerouslySetInnerHTML={{ __html: renderTextWithMath(methodology[key]) }}
                  />
                </div>
                {["bias_correction", "cii_formula", "score_formula", "economic_loss", "forecast_model"].includes(key) && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)]/45 flex justify-end">
                    <a 
                      href="https://github.com/Shivsrijit/NammaFLOW/tree/main/ml" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-accent hover:opacity-80 transition-opacity"
                    >
                      <span>Docs</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                )}
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
                <div 
                  className="text-xs text-[var(--text-soft)] leading-relaxed font-medium markdown-math"
                  dangerouslySetInnerHTML={{ __html: renderTextWithMath(methodology[key]) }}
                />
                {["bias_correction", "cii_formula", "score_formula", "economic_loss", "forecast_model"].includes(key) && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)]/45 flex justify-end">
                    <a 
                      href="https://github.com/Shivsrijit/NammaFLOW/tree/main/ml" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-accent hover:opacity-80 transition-opacity"
                    >
                      <span>Docs</span>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null;
      })}
    </div>
  );
}
