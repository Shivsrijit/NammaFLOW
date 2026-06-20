import { useEffect, useState } from "react";
import { NAME } from "../lib/brand.js";

const LINKS = [
  ["Overview", "overview"],
  ["Dispatch Queue", "dispatch"],
  ["Predictive Forecast", "forecast"],
  ["Unenforced Gaps", "darkzones"],
  ["Analytics", "analytics"],
  ["Methodology", "methodology"],
];

export default function Navbar({ theme, onToggleTheme, view, onViewChange, onTabChange }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  const handleLinkClick = (id) => {
    if (id === "overview") {
      if (view !== "landing") {
        onViewChange && onViewChange("landing");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      const tabMap = {
        dispatch: "leaderboard",
        forecast: "forecast",
        darkzones: "darkzones",
        analytics: "analytics",
        methodology: "methodology"
      };
      const tab = tabMap[id] || "leaderboard";
      onViewChange && onViewChange("console");
      onTabChange && onTabChange(tab);
    }
  };

  return (
    <header className="fixed top-3 inset-x-0 z-50 transition-all duration-300 px-4">
      <div 
        className={`max-w-7xl mx-auto px-6 h-14 rounded-full flex items-center justify-between transition-all duration-300 border ${
          scrolled || menuOpen
            ? "bg-[var(--surface)]/80 backdrop-blur-md border-[var(--border)] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)]" 
            : "bg-transparent border-transparent"
        }`}
      >
        <button onClick={() => { setMenuOpen(false); handleLinkClick("overview"); }} className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-7.5 h-7.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden shadow-sm shrink-0">
            {/* Glowing gradient background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--border)] to-[var(--accent)]/20 opacity-35 transition-opacity group-hover:opacity-55 duration-300" />
            
            {/* Dynamic Map Pin & Flow Symbol */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="relative z-10 select-none">
              <circle cx="12" cy="10" r="7" stroke="var(--accent)" strokeWidth="1" className="animate-ping opacity-25" />
              {/* Left lane (brand accent) */}
              <path d="M12 21C7.8 17.2 5 13.8 5 10a7 7 0 0 1 7-7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Right lane (brand text) */}
              <path d="M12 21C16.2 17.2 19 13.8 19 10a7 7 0 0 0-7-7" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Hotspot node */}
              <circle cx="12" cy="10" r="2.2" fill="var(--accent)" stroke="none" />
            </svg>
          </div>
          <span className="font-display font-extrabold text-base tracking-tight text-[var(--text)] flex items-center gap-0.5 select-none">
            <span className="font-semibold text-[var(--text)]">Namma</span>
            <span className="bg-gradient-to-r from-[var(--text)] to-[var(--accent)] bg-clip-text text-transparent font-black tracking-wider uppercase">FLOW</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-6 text-[10px] uppercase font-bold tracking-wider text-[var(--text-soft)]">
          {LINKS.map(([label, id]) => (
            <button 
              key={id} 
              onClick={() => handleLinkClick(id)} 
              className="hover:text-[var(--text)] transition-colors py-1 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-accent hover:after:w-full after:transition-all after:duration-200"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {view === "landing" && (
            <button
              onClick={() => {
                onViewChange && onViewChange("console");
                onTabChange && onTabChange("leaderboard");
              }}
              className="hidden sm:inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg bg-accent text-[var(--bg)] hover:opacity-90 hover:scale-[0.98] transition-all active:scale-[0.96]"
            >
              Control Console
            </button>
          )}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="grid place-items-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--text-soft)] hover:text-[var(--text)] transition-all shrink-0"
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            )}
          </button>
          
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex lg:hidden grid place-items-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--text-soft)] hover:text-[var(--text)] transition-all shrink-0"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drop-down panel */}
      {menuOpen && (
        <div className="absolute top-16 inset-x-4 bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl p-4 shadow-2xl flex flex-col gap-1.5 z-50 lg:hidden animate-in fade-in slide-in-from-top-3 duration-200">
          {LINKS.map(([label, id]) => (
            <button
              key={id}
              onClick={() => {
                setMenuOpen(false);
                handleLinkClick(id);
              }}
              className="w-full text-left px-4 py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60 transition-colors"
            >
              {label}
            </button>
          ))}
          {view === "landing" && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onViewChange && onViewChange("console");
                onTabChange && onTabChange("leaderboard");
              }}
              className="w-full text-center text-[10px] font-bold uppercase tracking-widest py-3 rounded-lg bg-accent text-[var(--bg)] mt-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Control Console
            </button>
          )}
        </div>
      )}
    </header>
  );
}