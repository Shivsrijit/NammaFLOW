"""
Stage 02: cluster + density.

Two outputs that every later stage and the map depend on:
  1. Hotspot clusters via HDBSCAN on the violation coordinates. HDBSCAN finds
     clusters of varying density without a hand-tuned radius, which suits a city
     where a metro hotspot is tight and a market strip is spread out. We use the
     implementation built into scikit-learn (>=1.3), so there is no separate
     hdbscan package to install. Falls back to DBSCAN if needed.
  2. A geohash7 density grid (each ~150 m cell with a violation count, broken
     down by daypart and vehicle class) that becomes the heatmap surface.

Writes:
  data/processed/clusters         (one row per violation, with a cluster label)
  data/processed/cluster_summary  (one row per hotspot)
  data/processed/density          (one row per geohash7 cell)

Run:  python pipeline/02_cluster.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent))
import config as cfg
from lib import load_table, save_table, geohash_encode

# Rough metres-per-degree at Bengaluru's latitude (~13 N), good enough for
# clustering distances within one city.
M_PER_DEG_LAT = 110_574.0
M_PER_DEG_LON = 108_000.0  # cos(13 deg) * 111320


def _vehicle_class(v: str) -> str:
    if v in ("BUS (BMTC/KSRTC)", "PRIVATE BUS", "TANKER", "LGV", "VAN", "GOODS AUTO"):
        return "heavy"
    if v in ("CAR", "MAXI-CAB"):
        return "car"
    if v in ("SCOOTER", "MOTOR CYCLE", "MOPED"):
        return "two_wheeler"
    if v == "PASSENGER AUTO":
        return "auto"
    return "other"


def project(lat: pd.Series, lon: pd.Series):
    """Project lat/lon to local metres so Euclidean distance is meaningful."""
    x = (lon - cfg.LON_MIN) * M_PER_DEG_LON
    y = (lat - cfg.LAT_MIN) * M_PER_DEG_LAT
    return np.column_stack([x.to_numpy(), y.to_numpy()])


def cluster(df: pd.DataFrame) -> pd.DataFrame:
    coords = np.ascontiguousarray(project(df["latitude"], df["longitude"]), dtype=np.float64)
    n = len(coords)
    min_size = max(50, int(n * 0.0008))
    print(f"  clustering {n:,} points (min_cluster_size={min_size}) ...")
    labels = None
    try:
        from sklearn.cluster import HDBSCAN
        model = HDBSCAN(min_cluster_size=min_size, min_samples=15)
        labels = model.fit_predict(coords)
        algo = "HDBSCAN"
    except Exception as exc:  # numpy/sklearn version quirks -> robust fallback
        print(f"  HDBSCAN unavailable ({exc}); falling back to DBSCAN")
        from sklearn.cluster import DBSCAN
        # tighter eps + lower min_samples => more, smaller, sharper hotspots
        labels = DBSCAN(eps=55.0, min_samples=40).fit_predict(coords)
        algo = "DBSCAN"
    df = df.copy()
    df["cluster"] = labels
    n_clusters = len({c for c in labels if c != -1})
    noise = int((labels == -1).sum())
    print(f"  {algo}: {n_clusters} hotspots, {noise:,} unclustered points "
          f"({100*noise/n:.0f}% noise)")
    return df


def summarise_clusters(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    clustered = df[df["cluster"] != -1]
    for cid, g in clustered.groupby("cluster"):
        veh_counts = g["vehicle"].value_counts()
        dom_vehicle = veh_counts.index[0] if len(veh_counts) else "UNKNOWN"
        station = g["police_station"].value_counts().index[0]
        # temporal profile: 7x24 matrix flattened later; here store hour hist
        hour_hist = g["hour"].value_counts().reindex(range(24), fill_value=0).tolist()
        dow_hist = g["dow"].value_counts().reindex(range(7), fill_value=0).tolist()
        rows.append({
            "cluster": int(cid),
            "lat": float(g["latitude"].mean()),
            "lon": float(g["longitude"].mean()),
            "count": int(len(g)),
            "dominant_vehicle": dom_vehicle,
            "police_station": station,
            "n_days_active": int(g["date"].nunique()),
            "n_officers": int(g["created_by_id"].nunique()),
            "n_devices": int(g["device_id"].nunique()),
            "heavy_share": float((g["vehicle"].map(_vehicle_class) == "heavy").mean()),
            "named_junction_share": float(
                (g["junction_name"].fillna("No Junction") != "No Junction").mean()),
            "hour_hist": json.dumps(hour_hist),
            "dow_hist": json.dumps(dow_hist),
            "top_vehicles": json.dumps({str(k): int(v) for k, v in veh_counts.head(5).items()}),
        })
    out = pd.DataFrame(rows).sort_values("count", ascending=False).reset_index(drop=True)
    return out


def density_grid(df: pd.DataFrame) -> pd.DataFrame:
    """Per geohash7 cell counts, with daypart and vehicle-class breakdowns."""
    df = df.copy()
    df["vclass"] = df["vehicle"].map(_vehicle_class)
    rows = []
    for gh, g in df.groupby("geohash7"):
        # cell centroid from the geohash (decode-free: use mean of members)
        rows.append({
            "geohash7": gh,
            "lat": float(g["latitude"].mean()),
            "lon": float(g["longitude"].mean()),
            "total": int(len(g)),
            "dp_morning": int((g["daypart"] == "morning").sum()),
            "dp_midday": int((g["daypart"] == "midday").sum()),
            "dp_evening": int((g["daypart"] == "evening").sum()),
            "dp_night": int((g["daypart"] == "night").sum()),
            "vc_heavy": int((g["vclass"] == "heavy").sum()),
            "vc_car": int((g["vclass"] == "car").sum()),
            "vc_two_wheeler": int((g["vclass"] == "two_wheeler").sum()),
            "vc_auto": int((g["vclass"] == "auto").sum()),
            "vc_other": int((g["vclass"] == "other").sum()),
        })
    return pd.DataFrame(rows).sort_values("total", ascending=False).reset_index(drop=True)


def main():
    df = load_table(cfg.CLEANED)
    print(f"loaded {len(df):,} clean rows")
    labelled = cluster(df)
    summary = summarise_clusters(labelled)
    grid = density_grid(df)

    save_table(labelled[["id", "cluster"]], cfg.DATA_PROCESSED / "clusters")
    save_table(summary, cfg.DATA_PROCESSED / "cluster_summary")
    save_table(grid, cfg.DATA_PROCESSED / "density")

    print(f"\nhotspots: {len(summary)} | density cells: {len(grid)}")
    print("top 8 hotspots:")
    for _, r in summary.head(8).iterrows():
        print(f"  cluster {r['cluster']:>3}  {r['count']:>6,}  "
              f"{r['police_station']:18s}  heavy={r['heavy_share']*100:4.0f}%  "
              f"dom={r['dominant_vehicle']}")


if __name__ == "__main__":
    main()
