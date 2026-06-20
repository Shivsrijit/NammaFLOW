import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";

const STYLE = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYPARTS = [["All day", -1], ["Morning", 0], ["Midday", 1], ["Evening", 2], ["Night", 3]];
const VEHICLES = [["All", -1], ["Heavy", 0], ["Car", 1], ["2-wheeler", 2], ["Auto", 3]];

const HEAT_COLORS_LIGHT = [
  [0.2, "rgba(124, 58, 237, 0.2)"],
  [0.4, "rgba(139, 92, 246, 0.45)"],
  [0.6, "rgba(236, 72, 153, 0.65)"],
  [0.8, "rgba(244, 63, 94, 0.8)"],
  [1.0, "rgba(225, 29, 72, 0.95)"]
];

const HEAT_COLORS_DARK = [
  [0.2, "rgba(139, 92, 246, 0.2)"],
  [0.4, "rgba(139, 92, 246, 0.45)"],
  [0.6, "rgba(167, 139, 250, 0.65)"],
  [0.8, "rgba(224, 204, 254, 0.85)"],
  [1.0, "rgba(255, 255, 255, 0.95)"]
];

function cellWeight(c, dp, vc) {
  if (vc >= 0) return c.vc[vc];
  if (dp >= 0) return c.dp[dp];
  return c.t;
}

function fc(features) { return { type: "FeatureCollection", features }; }

// Haversine distance helper for spillover calculation in browser
function getDistance(lon1, lat1, lon2, lat2) {
  const R = 6371000; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapView({ heatmap, hotspots, forecast, darkZones, theme, onSelect, selectedId, mode: propMode, onModeChange, dispatchedCops = {} }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const dzMarkersRef = useRef([]);
  const dispatchedCopsRef = useRef(dispatchedCops);

  useEffect(() => {
    dispatchedCopsRef.current = dispatchedCops;
  }, [dispatchedCops]);
  
  const [ready, setReady] = useState(false);
  const [internalMode, setInternalMode] = useState("heat"); // heat | points | forecast
  const mode = propMode !== undefined ? propMode : internalMode;
  const setMode = onModeChange !== undefined ? onModeChange : setInternalMode;

  const [dp, setDp] = useState(-1);
  const [vc, setVc] = useState(-1);
  const [showRoute, setShowRoute] = useState(false);
  const [showDarkZones, setShowDarkZones] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedStation, setSelectedStation] = useState("All Stations");
  const [slot, setSlot] = useState(() =>
    forecast?.meta?.recommendation?.peak_slot ?? 10 * 1 + 6 * 24);
  const [playing, setPlaying] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const grid = forecast?.grid || [];
  const maxPred = grid.length
    ? Math.max(1, ...grid.map((g) => Math.max(...g.pred))) : 1;
  const rec = forecast?.meta?.recommendation;

  // Compute unique police stations from hotspots
  const stations = useMemo(() => {
    if (!hotspots || !hotspots.features) return ["All Stations"];
    const names = hotspots.features.map(f => f.properties.station);
    return ["All Stations", ...new Set(names)].sort();
  }, [hotspots]);

  // Filter hotspots based on station selector
  const filteredHotspots = useMemo(() => {
    if (!hotspots || !hotspots.features) return fc([]);
    if (selectedStation === "All Stations") return hotspots;
    return fc(hotspots.features.filter(f => f.properties.station === selectedStation));
  }, [hotspots, selectedStation]);

  // Find selected hotspot coordinate
  const selectedCentroid = useMemo(() => {
    if (!hotspots || !hotspots.features || selectedId == null) return null;
    const f = hotspots.features.find(x => x.properties.id === selectedId);
    return f ? { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], score: f.properties.score } : null;
  }, [hotspots, selectedId]);

  // Init MapLibre
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE[theme],
      center: [77.59, 12.97],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  // Theme Update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setReady(false);
    map.setStyle(STYLE[theme]);
    map.once("styledata", () => setReady(true));
  }, [theme]); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const t = setTimeout(() => map.resize(), 260); return () => clearTimeout(t);
  }, [expanded]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Forecast autoplay
  useEffect(() => {
    if (!playing || mode !== "forecast") return;
    const id = setInterval(() => setSlot((s) => (s + 1) % 168), 650);
    return () => clearInterval(id);
  }, [playing, mode]);

  // Layer Rendering Logic
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !heatmap || !hotspots) return;

    const heatColors = theme === "dark" ? HEAT_COLORS_DARK : HEAT_COLORS_LIGHT;

    // --- Heatmap source & layer ---
    const heatData = fc(heatmap.map((c) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [c.lon, c.lat] },
      properties: { w: cellWeight(c, dp, vc) },
    })));
    if (map.getSource("heat")) {
      map.getSource("heat").setData(heatData);
      map.setPaintProperty("heat", "heatmap-color", ["interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,0,0)", ...heatColors.flat()]);
    } else {
      map.addSource("heat", { type: "geojson", data: heatData });
      map.addLayer({
        id: "heat", type: "heatmap", source: "heat",
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "w"], 0, 0, 60, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 15, 36],
          "heatmap-opacity": 0.8,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)", ...heatColors.flat()],
        },
      });
    }

    // --- Forecast source & layer ---
    const fdata = fc(grid.map((g) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [g.lon, g.lat] },
      properties: { w: g.pred[slot] || 0 },
    })));
    if (map.getSource("fc")) {
      map.getSource("fc").setData(fdata);
      map.setPaintProperty("fc", "heatmap-color", ["interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,0,0)", ...heatColors.flat()]);
    } else {
      map.addSource("fc", { type: "geojson", data: fdata });
      map.addLayer({
        id: "fc", type: "heatmap", source: "fc",
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "w"], 0, 0, maxPred, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 15, 3.5],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 15, 44],
          "heatmap-opacity": 0.82,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)", ...heatColors.flat()],
        },
      });
    }

    // --- Hotspots source & layer ---
    if (!map.getSource("spots")) {
      map.addSource("spots", { type: "geojson", data: filteredHotspots });
      map.addLayer({
        id: "spots", type: "circle", source: "spots",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "score"], 40, 6, 100, 20],
          "circle-color": ["interpolate", ["linear"], ["get", "score"],
            40, "#06b6d4", 60, "#fbbf24", 80, "#f43f5e", 100, "#e11d48"],
          "circle-opacity": 0.88,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": theme === "dark" ? "#08080a" : "#ffffff",
        },
      });
      map.on("click", "spots", (e) => e.features?.[0] && onSelect(e.features[0].properties.id));
      const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      popupRef.current = pop;
      map.on("mouseenter", "spots", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const p = e.features[0].properties;
        const cops = dispatchedCopsRef.current?.[p.id] || 0;
        const copsHTML = cops > 0
          ? `<div style="margin-top:2px;font-weight:bold;color:var(--accent);display:flex;align-items:center;gap:4px"><i class="hgi hgi-stroke hgi-rounded hgi-police-cap" style="font-size:11px;flex-shrink:0"></i> <span>${cops} ${cops === 1 ? "Officer" : "Officers"} active</span></div>`
          : "";
        pop.setLngLat(e.lngLat).setHTML(
          `<div style="font:500 12px Inter,sans-serif;color:var(--text);padding:4px">
             <div style="font-weight:700">${p.station}</div>
             <div style="margin-top:2px">CII Score: <b>${p.cii}</b> · Impact Score: <b>${p.score}</b></div>
             <div>Est. Loss: <b style="color:#f43f5e">₹${Number(p.economic_loss_inr).toLocaleString()}/hr</b></div>
             ${copsHTML}
             <div style="color:var(--text-soft);font-size:10px;margin-top:4px;border-top:1px solid var(--border);padding-top:4px">${p.reason}</div>
           </div>`).addTo(map);
      });
      map.on("mouseleave", "spots", () => { map.getCanvas().style.cursor = ""; pop.remove(); });
    } else {
      map.getSource("spots").setData(filteredHotspots);
      map.setPaintProperty("spots", "circle-stroke-color", theme === "dark" ? "#08080a" : "#ffffff");
    }

    // --- Spillover Congestion Ripple Layer ---
    let spilloverGeo = fc([]);
    if (selectedCentroid) {
      // Find neighboring cells within 500m
      const neighbors = heatmap.filter(c => {
        const dist = getDistance(selectedCentroid.lon, selectedCentroid.lat, c.lon, c.lat);
        return dist > 10 && dist <= 500;
      });

      spilloverGeo = fc(neighbors.map(c => {
        const dist = getDistance(selectedCentroid.lon, selectedCentroid.lat, c.lon, c.lat);
        const ring = dist <= 250 ? 1 : 2;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lon, c.lat] },
          properties: {
            ring,
            w: c.t,
            glow: selectedCentroid.score * (ring === 1 ? 0.7 : 0.45)
          }
        };
      }));
    }

    if (!map.getSource("spillover")) {
      map.addSource("spillover", { type: "geojson", data: spilloverGeo });
      map.addLayer({
        id: "spillover",
        type: "circle",
        source: "spillover",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 15, 24],
          "circle-color": ["match", ["get", "ring"], 1, "#ef4444", "#f97316"],
          "circle-opacity": ["interpolate", ["linear"], ["get", "glow"], 0, 0, 100, 0.45],
          "circle-blur": 0.8
        }
      }, "spots"); // Render beneath spots
    } else {
      map.getSource("spillover").setData(spilloverGeo);
    }

    // Set Visibility states
    map.setLayoutProperty("heat", "visibility", mode === "heat" ? "visible" : "none");
    map.setLayoutProperty("fc", "visibility", mode === "forecast" ? "visible" : "none");
    map.setLayoutProperty("spots", "visibility", mode === "points" ? "visible" : "none");
    map.setLayoutProperty("spillover", "visibility", mode === "points" && selectedId != null ? "visible" : "none");
  }, [ready, heatmap, hotspots, dp, vc, mode, theme, slot, selectedStation, selectedId]); // eslint-disable-line

  // Render Dark Zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear old markers
    dzMarkersRef.current.forEach(m => m.remove());
    dzMarkersRef.current = [];

    if (!showDarkZones || !darkZones || mode !== "points") return;

    darkZones.forEach(dz => {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-110";
      el.style.cssText =
        "width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;border:1.5px solid var(--bg);" +
        "display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 0 8px var(--accent);";
      el.textContent = "⚠";
      el.title = `${dz.type}: ${dz.name}`;

      const pop = new maplibregl.Popup({ offset: 10 }).setHTML(
        `<div style="font:500 12px Inter,sans-serif;color:var(--text);padding:4px">
           <div style="font-weight:700;color:var(--accent)">⚠ Unenforced Dark Zone</div>
           <div style="font-weight:600;margin-top:2px">${dz.name} (${dz.type})</div>
           <div style="margin-top:4px;color:var(--text-soft);line-height:1.3">${dz.reason}</div>
           <div style="margin-top:6px;font-size:10px;color:var(--accent)">Risk Level: <b>Critical (${dz.risk_score})</b></div>
         </div>`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([dz.lon, dz.lat])
        .setPopup(pop)
        .addTo(map);

      dzMarkersRef.current.push(marker);
    });
  }, [ready, darkZones, showDarkZones, mode, hotspots]); // eslint-disable-line

  // Centroid Routing and Custom Dispatch Path
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear route indicators
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (map.getLayer("route")) map.removeLayer("route");
    if (map.getSource("route")) map.removeSource("route");

    // Dynamic Police Station Route
    if (selectedStation !== "All Stations" && filteredHotspots.features.length > 0) {
      // Connect station's hotspots
      const spots = [...filteredHotspots.features].sort((a, b) => b.properties.score - a.properties.score);
      const coords = spots.map(s => s.geometry.coordinates);

      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } }
      });
      map.addLayer({
        id: "route", type: "line", source: "route",
        paint: { "line-color": "var(--accent)", "line-width": 2.5, "line-opacity": 0.85, "line-dasharray": [1.5, 1] }
      });

      spots.forEach((z, i) => {
        const el = document.createElement("div");
        el.style.cssText =
          "width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;border:1.5px solid var(--bg);" +
          "display:grid;place-items:center;font:700 9px Inter,sans-serif;box-shadow:0 2px 8px var(--glow)";
        el.textContent = i + 1;
        
        const m = new maplibregl.Marker({ element: el }).setLngLat(z.geometry.coordinates).addTo(map);
        markersRef.current.push(m);
      });
      return;
    }

    // Default global dispatch route
    if (!showRoute || !rec || rec.zones.length < 2) return;

    const coords = rec.zones.map((z) => [z.lon, z.lat]);
    map.addSource("route", { type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } } });
    map.addLayer({ id: "route", type: "line", source: "route",
      paint: { "line-color": "var(--accent)", "line-width": 2.5, "line-opacity": 0.7, "line-dasharray": [2, 1.5] } });

    rec.zones.forEach((z, i) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;border:1.5px solid var(--bg);" +
        "display:grid;place-items:center;font:700 9px Inter,sans-serif;box-shadow:0 2px 8px var(--glow)";
      el.textContent = i + 1;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([z.lon, z.lat]).addTo(map));
    });
  }, [ready, showRoute, theme, forecast, selectedStation, hotspots]); // eslint-disable-line

  // Camera FlyTo Selected Hotspot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !hotspots || selectedId == null) return;
    const f = hotspots.features.find((x) => x.properties.id === selectedId);
    if (f) map.flyTo({ center: f.geometry.coordinates, zoom: 14.2, duration: 900 });
  }, [selectedId]); // eslint-disable-line

  // Station selector zooms camera to fit its hotspots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || selectedStation === "All Stations" || filteredHotspots.features.length === 0) return;
    // Fit map bounds to show all station hotspots
    const bounds = new maplibregl.LngLatBounds();
    filteredHotspots.features.forEach(f => bounds.extend(f.geometry.coordinates));
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1000 });
  }, [selectedStation]); // eslint-disable-line

  const Seg = ({ active, onClick, children }) => (
    <button onClick={onClick} className="flex-1 sm:flex-none text-center text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-lg transition-all"
      style={{ background: active ? "var(--surface-2)" : "transparent",
               color: active ? "var(--text)" : "var(--text-soft)" }}>{children}</button>
  );

  const legend = mode === "points"
    ? { title: "CII Score / Impact", items: [["#06b6d4", "Low (<55)"], ["#fbbf24", "Medium"], ["#f43f5e", "High (80+)"], ["#e11d48", "Critical"]] }
    : mode === "forecast"
    ? { title: "Predicted violations", items: [
        [theme === "dark" ? "rgba(167, 139, 250, 0.8)" : "rgba(139, 92, 246, 0.8)", "Low"],
        [theme === "dark" ? "rgba(192, 132, 252, 0.8)" : "rgba(167, 139, 250, 0.8)", "Building"],
        [theme === "dark" ? "rgba(224, 204, 254, 0.85)" : "rgba(244, 63, 94, 0.85)", "High"],
        [theme === "dark" ? "rgba(255, 255, 255, 0.95)" : "rgba(225, 29, 72, 0.95)", "Peak"]
      ] }
    : { title: "Violation density", items: [
        [theme === "dark" ? "rgba(139, 92, 246, 0.65)" : "rgba(124, 58, 237, 0.65)", "Low"],
        [theme === "dark" ? "rgba(167, 139, 250, 0.75)" : "rgba(139, 92, 246, 0.75)", "Some"],
        [theme === "dark" ? "rgba(224, 204, 254, 0.85)" : "rgba(236, 72, 153, 0.85)", "High"],
        [theme === "dark" ? "rgba(255, 255, 255, 0.95)" : "rgba(225, 29, 72, 0.95)", "Severe"]
      ] };

  return (
    <div className={expanded ? "fixed inset-0 z-[55] surface flex flex-col animate-in fade-in duration-300" : "surface rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full relative"}>
      
      {/* Top Map Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-[var(--border)] bg-[var(--surface-2)]/45 shrink-0 z-10">
        
        {/* Layer Controls */}
        <div className="flex bg-[var(--surface)] p-0.5 rounded-xl border border-[var(--border)] shadow-sm w-full sm:w-auto">
          <Seg active={mode === "heat"} onClick={() => setMode("heat")}>Heatmap</Seg>
          <Seg active={mode === "points"} onClick={() => setMode("points")}>Hotspots</Seg>
          <Seg active={mode === "forecast"} onClick={() => setMode("forecast")}>Forecast</Seg>
        </div>

        {/* Right controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {mode === "points" && (
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-[#1c1c22] bg-white dark:bg-[#0b0b0e] text-neutral-900 dark:text-[#fafafa] shadow-sm focus:outline-none cursor-pointer appearance-none"
              >
                {stations.map(st => (
                  <option key={st} value={st} className="bg-white dark:bg-[#0b0b0e] text-neutral-900 dark:text-[#fafafa]">
                    {st === "All Stations" ? "All Precincts" : st}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-soft)]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          )}

          {/* Filter Popover */}
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full sm:w-auto text-xs font-semibold px-3 py-1.5 rounded-xl border bg-white dark:bg-[#0b0b0e] hover:text-[var(--text)] flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                showFilters || dp !== -1 || vc !== -1 || !showDarkZones || showRoute ? "text-accent border-accent/25" : "text-[var(--text-soft)] border-zinc-200 dark:border-[#1c1c22]"
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 3H2l8 9v9l4 2v-11z"/></svg>
              Filters
              {(dp !== -1 || vc !== -1) && <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />}
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl z-20 space-y-4 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <div className="text-[9px] uppercase font-bold text-[var(--text-soft)] tracking-wider mb-2">Daypart Slice</div>
                  <div className="grid grid-cols-2 gap-1">
                    {DAYPARTS.map(([l, v]) => (
                      <button
                        key={l}
                        onClick={() => setDp(v)}
                        className={`text-[10px] py-1 rounded-lg font-semibold text-center transition-all ${
                          dp === v ? "bg-[var(--text)] text-[var(--bg)] font-extrabold" : "text-[var(--text-soft)] hover:text-[var(--text)] bg-[var(--surface-2)]/60"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {mode !== "forecast" && (
                  <div>
                    <div className="text-[9px] uppercase font-bold text-[var(--text-soft)] tracking-wider mb-2">Vehicle Profile</div>
                    <div className="grid grid-cols-2 gap-1">
                      {VEHICLES.map(([l, v]) => (
                        <button
                          key={l}
                          onClick={() => setVc(v)}
                          className={`text-[10px] py-1 rounded-lg font-semibold text-center transition-all ${
                            vc === v ? "bg-[var(--text)] text-[var(--bg)] font-extrabold" : "text-[var(--text-soft)] hover:text-[var(--text)] bg-[var(--surface-2)]/60"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-[var(--border)] pt-3 space-y-2.5">
                  {mode === "points" && (
                    <label className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-soft)] cursor-pointer hover:text-[var(--text)] select-none">
                      <span>Show Dark Zones</span>
                      <input
                        type="checkbox"
                        checked={showDarkZones}
                        onChange={() => setShowDarkZones(!showDarkZones)}
                        className="rounded border-[var(--border)] bg-[var(--surface-2)] text-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                  )}
                  {selectedStation === "All Stations" && (
                    <label className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-soft)] cursor-pointer hover:text-[var(--text)] select-none">
                      <span>Patrol Dispatch Route</span>
                      <input
                        type="checkbox"
                        checked={showRoute}
                        onChange={() => setShowRoute(!showRoute)}
                        className="rounded border-[var(--border)] bg-[var(--surface-2)] text-accent focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expand button */}
          <button onClick={() => setExpanded((s) => !s)} aria-label="Full view"
            className="grid place-items-center w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm text-[var(--text-soft)] hover:text-[var(--text)] transition-colors"
          >
            {expanded
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>}
          </button>
        </div>
      </div>

      {/* Map Body */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: "450px" }} />

        {/* Floating Forecast slider (Bottom Center) */}
        {mode === "forecast" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md shadow-2xl w-[90%] max-w-md">
            <button onClick={() => setPlaying((p) => !p)} className="grid place-items-center w-7 h-7 rounded-full shrink-0 bg-[var(--text)] text-[var(--bg)] transition-transform hover:scale-105 active:scale-95 shadow-md" aria-label="Play forecast">
              {playing
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>}
            </button>
            <div className="font-semibold w-20 shrink-0 tabular-nums text-[11px] text-[var(--text)]">
              {DAYS[Math.floor(slot / 24)]} {String(slot % 24).padStart(2, "0")}:00
            </div>
            <input type="range" min="0" max="167" value={slot}
              onChange={(e) => { setPlaying(false); setSlot(Number(e.target.value)); }}
              className="flex-1 cursor-pointer accent-[var(--text)] h-1 bg-[var(--surface-2)] rounded" />
          </div>
        )}

        {/* Legend */}
        <div className="hidden sm:block absolute left-4 bottom-4 surface rounded-xl px-3.5 py-3 shadow-2xl backdrop-blur-md"
          style={{ border: "1px solid var(--border)", background: "rgba(var(--surface-rgb), 0.85)" }}>
          <div className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-soft)] mb-2">{legend.title}</div>
          <div className="flex flex-col gap-1.5">
            {legend.items.map(([c, l]) => (
              <div key={l} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                <span className="text-[var(--text-soft)] font-semibold">{l}</span>
              </div>
            ))}
            {mode === "points" && showDarkZones && (
              <div className="flex items-center gap-2 text-xs border-t border-[var(--border)] pt-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 flex items-center justify-center text-[10px] font-bold text-amber-500">⚠</span>
                <span className="text-amber-500 font-semibold">Unenforced Dark Zone</span>
              </div>
            )}
            {mode === "points" && selectedId != null && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full opacity-40" style={{ background: "#f43f5e" }} />
                <span className="text-rose-500 dark:text-rose-450 font-semibold">Spillover Congestion</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
