// Data layer. Fetches the pre-compiled static JSON artifacts directly.

const FALLBACK = {
  stats: "/data/stats.json",
  hotspots: "/data/hotspots.geojson",
  heatmap: "/data/heatmap.json",
  priority: "/data/priority_queue.json",
  forecast: "/data/forecast.json",
  temporal: "/data/temporal.json",
  methodology: "/data/methodology.json",
  darkZones: "/data/dark_zones.json",
};

async function tryFetch(url, timeout = 2500) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function getData(key) {
  return await tryFetch(FALLBACK[key], 8000);
}

export async function getAll() {
  const keys = Object.keys(FALLBACK);
  const results = await Promise.all(keys.map((k) => getData(k).catch(() => null)));
  const out = {};
  keys.forEach((k, i) => (out[k] = results[i]));
  return out;
}
