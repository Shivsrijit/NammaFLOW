import { useEffect, useMemo, useState } from "react";
import Lenis from "lenis";
import { getAll } from "./lib/api.js";
import { NAME } from "./lib/brand.js";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import MapView from "./components/MapView.jsx";
import HotspotDetail from "./components/HotspotDetail.jsx";
import PriorityQueue from "./components/PriorityQueue.jsx";
import Analytics from "./components/Charts.jsx";
import TemporalView from "./components/TemporalView.jsx";
import ForecastView from "./components/ForecastView.jsx";
import Methodology from "./components/Methodology.jsx";
import ShiftForecastView from "./components/ShiftForecastView.jsx";
import Footer from "./components/Footer.jsx";
import { PlatformFeatures, SystemArchitecture, ConsoleLaunchCTA } from "./components/LandingSections.jsx";
import ThreeTrafficBg from "./components/ThreeTrafficBg.jsx";

// Custom Dark Zones List inside command sidebar
function DarkZonesList({ darkZones }) {
  if (!darkZones) return null;
  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-2)]/50 shrink-0">
        <h3 className="font-display font-bold text-[var(--text)] text-xs uppercase tracking-wider">Unenforced Dark Zones</h3>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">9 High-Risk</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-2 scrollbar-thin">
        {darkZones.map((dz, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text-soft)]/40 transition-colors relative overflow-hidden group">
            <div className="flex justify-between items-start gap-3">
              <span className="font-bold text-sm text-[var(--text)] truncate flex-1">{dz.name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-soft)] border border-[var(--border)] uppercase tracking-wider">
                {dz.type}
              </span>
            </div>
            <p className="text-xs text-[var(--text-soft)] mt-2 leading-relaxed font-medium">{dz.reason}</p>
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Congestion Risk: {dz.risk_score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState("light"); // Default to light theme
  const [view, setView] = useState("landing"); // landing | console
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("dispatch"); // dispatch | forecast | darkzones | analytics | methodology
  const [mapMode, setMapMode] = useState("points"); // heat | points | forecast
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });
  const [mobileConsoleView, setMobileConsoleView] = useState("map"); // map | list
  const [dispatchedCops, setDispatchedCops] = useState({});
  const [myDispatches, setMyDispatches] = useState(() => new Set());

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNavigate = (targetView, tab) => {
    setView(targetView);
    if (targetView === "console") {
      if (tab === "analytics") {
        setActiveTab("analytics");
      } else if (tab === "methodology") {
        setActiveTab("methodology");
      } else if (tab === "forecast") {
        setActiveTab("forecast");
        setMapMode("forecast");
      } else if (tab === "shift_forecast") {
        setActiveTab("shift_forecast");
      } else if (tab === "darkzones") {
        setActiveTab("darkzones");
        setMapMode("points");
      } else {
        setActiveTab("dispatch");
        setMapMode("points");
      }
    }
  };

  const handleToggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const toggleMyDispatch = (id) => {
    setMyDispatches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setDispatchedCops((cops) => ({
          ...cops,
          [id]: Math.max(0, (cops[id] || 0) - 1),
        }));
      } else {
        next.add(id);
        setDispatchedCops((cops) => ({
          ...cops,
          [id]: (cops[id] || 0) + 1,
        }));
      }
      return next;
    });
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (view !== "landing") return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [view]);

  useEffect(() => {
    getAll().then((d) => {
      if (!d.stats || !d.hotspots) setError(true);
      setData(d);
      if (d.priority) {
        const initial = {};
        d.priority.forEach((z) => {
          // Determinstic simulated baseline cops (0 to 2) based on rank/id
          initial[z.id] = (Number(z.rank || z.id) % 3);
        });
        setDispatchedCops(initial);
      }
    }).catch(() => setError(true));
  }, []);

  const selectedFeature = useMemo(() => {
    if (!data || !data.hotspots || selectedId == null) return null;
    return data.hotspots.features.find((f) => f.properties.id === selectedId) || null;
  }, [data, selectedId]);

  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#030303] text-neutral-200 font-sans">
        <div className="text-center">
          <div className="font-display font-bold text-3xl mb-3 tracking-tight">{NAME}</div>
          <div className="text-sm text-neutral-500 font-semibold uppercase tracking-widest animate-pulse">
            {error ? "Database Connection Offline." : "Syncing Bengaluru Command Server…"}
          </div>
        </div>
      </div>
    );
  }

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-transparent text-neutral-900 dark:text-neutral-100 font-sans selection:bg-accent selection:text-white relative">
        <ThreeTrafficBg isDark={theme === "dark"} />
        <Navbar
          theme={theme}
          onToggleTheme={handleToggleTheme}
          view={view}
          onViewChange={(v) => handleNavigate(v)}
          onTabChange={(t) => handleNavigate("console", t)}
        />
        <Hero
          stats={data.stats}
          isDark={theme === "dark"}
          onEnterConsole={(tab) => handleNavigate("console", tab)}
        />
        <PlatformFeatures />
        <SystemArchitecture />
        <ConsoleLaunchCTA onEnter={(tab) => handleNavigate("console", tab)} />
        <Footer />
      </div>
    );
  }

  const NavLink = ({ id, label, icon }) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          if (id === "dispatch") setMapMode("points");
          else if (id === "forecast") setMapMode("forecast");
          else if (id === "darkzones") setMapMode("points");
          // Collapse sidebar automatically on click in mobile/tablet views
          if (window.innerWidth < 1024) {
            setSidebarCollapsed(true);
          }
        }}
        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-left text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${
          active 
            ? "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)] shadow-[0_2px_8px_var(--glow)]" 
            : "text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/30 border-transparent"
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div className="h-screen w-screen flex bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans selection:bg-[var(--accent)] selection:text-white transition-colors duration-300">
      
      {/* Backdrop overlay for mobile when sidebar is expanded */}
      {!sidebarCollapsed && (
        <div 
          onClick={() => setSidebarCollapsed(true)} 
          className="fixed inset-0 bg-black/40 z-20 lg:hidden backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Left Navigation Sidebar Panel */}
      <aside className={`border-r border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0 z-30 transition-all duration-300 ${
        sidebarCollapsed 
          ? "w-0 overflow-hidden opacity-0 border-r-0 pointer-events-none" 
          : "w-64 fixed lg:relative h-full top-0 left-0 shadow-2xl lg:shadow-none"
      }`}>
        
        {/* Brand Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center gap-3 shrink-0 group">
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
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-base tracking-tight leading-none text-[var(--text)] flex items-center gap-0.5 select-none">
              <span className="font-semibold text-[var(--text)]">Namma</span>
              <span className="bg-gradient-to-r from-[var(--text)] to-[var(--accent)] bg-clip-text text-transparent font-black tracking-wider uppercase">FLOW</span>
            </span>
            <span className="text-[9px] font-semibold text-[var(--text-soft)] tracking-wider uppercase mt-1">Patrol Console</span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-none">
          <NavLink 
            id="dispatch" 
            label="Dispatch Queue" 
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>} 
          />
          <NavLink 
            id="forecast" 
            label="Congestion Forecast" 
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} 
          />
          <NavLink 
            id="darkzones" 
            label="Coverage Gaps" 
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} 
          />
          <NavLink 
            id="analytics" 
            label="System Analytics" 
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>} 
          />
          <NavLink 
            id="shift_forecast" 
            label="Shift Forecast (12h)" 
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><circle cx="18" cy="18" r="4"/><path d="M18 16.5v1.5l1 1"/></svg>} 
          />
          <NavLink 
            id="methodology" 
            label="Methodology Notes" 
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>} 
          />
        </nav>

        {/* Sidebar Footer (exit) */}
        <div className="p-4 border-t border-[var(--border)] shrink-0">
          <button
            onClick={() => {
              setView("landing");
              if (window.innerWidth < 1024) {
                setSidebarCollapsed(true);
              }
            }}
            className="w-full text-center text-[10px] font-bold uppercase tracking-widest py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-soft)] hover:text-[var(--text)] transition-all active:scale-[0.97]"
          >
            Exit Console
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        
        {/* Dynamic Console Header */}
        <header className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-[var(--border)] bg-[var(--surface)] shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)]/60 text-[var(--text-soft)] hover:text-[var(--text)] transition-colors mr-1 shrink-0"
              title={sidebarCollapsed ? "Expand Navigation" : "Collapse Navigation"}
            >
              {sidebarCollapsed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="14" y1="9" x2="18" y2="9"/><line x1="14" y1="15" x2="18" y2="15"/></svg>
              )}
            </button>
            <h2 className="font-display font-bold text-xs sm:text-sm uppercase tracking-wider text-[var(--text)] truncate">
              {activeTab === "dispatch" && "Operations Queue"}
              {activeTab === "forecast" && "Predictive Congestion Forecast"}
              {activeTab === "shift_forecast" && "12-Hour Shift Forecaster"}
              {activeTab === "darkzones" && "Enforcement Coverage Gaps"}
              {activeTab === "analytics" && "System Analytics & Trends"}
              {activeTab === "methodology" && "Evaluation Methodology"}
            </h2>
          </div>

          {/* Mobile view toggle for split maps & lists */}
          {(activeTab === "dispatch" || activeTab === "forecast" || activeTab === "darkzones") && (
            <div className="flex md:hidden bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5 shrink-0 mx-2 shadow-sm">
              <button
                onClick={() => setMobileConsoleView("map")}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  mobileConsoleView === "map"
                    ? "bg-[var(--text)] text-[var(--bg)] shadow-sm"
                    : "text-[var(--text-soft)] hover:text-[var(--text)]"
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setMobileConsoleView("list")}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  mobileConsoleView === "list"
                    ? "bg-[var(--text)] text-[var(--bg)] shadow-sm"
                    : "text-[var(--text-soft)] hover:text-[var(--text)]"
                }`}
              >
                {activeTab === "dispatch" && "Queue"}
                {activeTab === "forecast" && "Forecast"}
                {activeTab === "darkzones" && "Gaps"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {selectedFeature && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 text-[10px] font-bold">
                <span className="text-[var(--text-soft)]">Precinct:</span>
                <span className="text-accent">{selectedFeature.properties.station}</span>
              </div>
            )}
            {/* Theme Selector */}
            <button
              onClick={handleToggleTheme}
              className="grid place-items-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--text-soft)] hover:text-[var(--text)] transition-all shrink-0"
              aria-label="Toggle theme"
              title="Toggle Theme"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
              )}
            </button>
          </div>
        </header>

        {/* Content Switcher */}
        <div className="flex-1 min-h-0 relative">
          
          {/* Spatial Split-Screen Pages */}
          {(activeTab === "dispatch" || activeTab === "forecast" || activeTab === "darkzones") && (
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 items-stretch p-3 sm:p-4 gap-3 sm:gap-4">
              
              {/* Map Canvas Visualizer (Toggled on mobile < 768px, side-by-side on tablet/desktop) */}
              <div className={`md:col-span-7 lg:col-span-8 flex flex-col h-full min-h-0 ${mobileConsoleView === "map" ? "flex" : "hidden md:flex"}`}>
                <MapView
                  heatmap={data.heatmap}
                  hotspots={data.hotspots}
                  forecast={data.forecast}
                  darkZones={data.darkZones}
                  theme={theme}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  mode={mapMode}
                  onModeChange={setMapMode}
                  dispatchedCops={dispatchedCops}
                />
              </div>

              {/* Operations Control List (Toggled on mobile < 768px, side-by-side on tablet/desktop) */}
              <div className={`md:col-span-5 lg:col-span-4 flex flex-col h-full min-h-0 border border-[var(--border)] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl ${mobileConsoleView === "list" ? "flex" : "hidden md:flex"}`}>
                
                {/* Compact Quick Stats Ticker */}
                <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--surface-2)]/50 text-center shrink-0">
                  <div className="py-2.5 px-1 border-r border-[var(--border)]">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-soft)]">CII Hotspots</div>
                    <div className="text-xs font-extrabold mt-0.5 tabular-nums">{data.stats.n_hotspots}</div>
                  </div>
                  <div className="py-2.5 px-1 border-r border-[var(--border)]">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-soft)]">Loss / Hour</div>
                    <div className="text-xs font-extrabold mt-0.5 text-[var(--text)] tabular-nums">₹{data.stats.total_economic_loss_lakhs}L</div>
                  </div>
                  <div className="py-2.5 px-1">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-soft)]">Peak Window</div>
                    <div className="text-[9.5px] font-extrabold mt-0.5 text-[var(--text)] truncate px-0.5">{data.stats.peak_window}</div>
                  </div>
                </div>

                {/* Tab Component Render */}
                <div className="flex-1 overflow-hidden min-h-0 bg-[var(--bg)]/10">
                  {activeTab === "dispatch" && (
                    <PriorityQueue
                      queue={data.priority}
                      onSelect={setSelectedId}
                      isDark={theme === "dark"}
                      dispatchedCops={dispatchedCops}
                      myDispatches={myDispatches}
                    />
                  )}
                  {activeTab === "forecast" && (
                    <ForecastView forecast={data.forecast} onSelectZone={(z) => setSelectedId(z.id)} />
                  )}
                  {activeTab === "darkzones" && (
                    <DarkZonesList darkZones={data.darkZones} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Full Screen Analytics Page */}
          {activeTab === "analytics" && (
            <div className="w-full h-full p-4 sm:p-8 overflow-y-auto scrollbar-thin">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col mb-4">
                  <h3 className="font-display font-bold text-xl tracking-tight">System Performance & Traffic Insights</h3>
                  <p className="text-xs text-[var(--text-soft)] mt-1">Analyze monthly violation patterns, vehicle distribution, and predictive accuracy.</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] mb-3">Monthly Violation Trend</h4>
                    <Analytics temporal={data.temporal} forecast={data.forecast} onlyChart="monthly" />
                  </div>
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] mb-3">Predicted Hourly Traffic Load</h4>
                    <Analytics temporal={data.temporal} forecast={data.forecast} onlyChart="hourly" />
                  </div>
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] mb-3">Violation Types</h4>
                    <Analytics temporal={data.temporal} forecast={data.forecast} onlyChart="violations" />
                  </div>
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] mb-3">Vehicle Mix</h4>
                    <Analytics temporal={data.temporal} forecast={data.forecast} onlyChart="vehicles" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] mb-4">Weekly Load Matrix</h4>
                  <TemporalView temporal={data.temporal} isDark={theme === "dark"} fullWidth={true} />
                </div>
              </div>
            </div>
          )}

          {/* Full Screen Methodology Notes */}
          {activeTab === "methodology" && (
            <div className="w-full h-full p-4 sm:p-8 overflow-y-auto scrollbar-thin">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col mb-4">
                  <h3 className="font-display font-bold text-xl tracking-tight">Methodology & Calculation Formulas</h3>
                  <p className="text-xs text-[var(--text-soft)] mt-1">Overview of the formulas, normalization rules, and data filters used in calculations.</p>
                </div>
                <Methodology methodology={data.methodology} fullWidth={true} />
              </div>
            </div>
          )}

          {activeTab === "shift_forecast" && (
            <ShiftForecastView theme={theme} />
          )}

        </div>
      </div>

      {/* Selected hotspot side detail drawer */}
      <HotspotDetail
        feature={selectedFeature}
        onClose={() => setSelectedId(null)}
        isMyDispatched={selectedId !== null && myDispatches.has(selectedId)}
        copsCount={selectedId !== null ? (dispatchedCops[selectedId] || 0) : 0}
        onToggleDispatch={toggleMyDispatch}
      />
    </div>
  );
}
