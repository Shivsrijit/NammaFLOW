"""
Stage 05: assemble artifacts.

Reads the cleaned tables and scored hotspots/density/dark zones,
and outputs static JSON files for FastAPI and Vite React to consume.
"""

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Fix path to load config
ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))
import config as cfg
from lib import load_table

DOW_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def write_json(name, obj):
    (cfg.ARTIFACTS / name).write_text(json.dumps(obj, separators=(",", ":")))


def hotspots_geojson(scored: pd.DataFrame) -> dict:
    def _load(v):
        return json.loads(v) if isinstance(v, str) else v
    feats = []
    for _, r in scored.iterrows():
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
            "properties": {
                "id": int(r["cluster"]),
                "rank": int(r["rank_corrected"]),
                "score": float(r["score"]),
                "cii": float(r["cii"]),
                "economic_loss_inr": float(r["economic_loss_inr"]),
                "lanes": int(r["lanes"]),
                "metro_name": r["metro_name"],
                "metro_dist_m": float(r["metro_dist_m"]),
                "hospital_name": r["hospital_name"],
                "hospital_dist_m": float(r["hospital_dist_m"]),
                "station_dist_m": float(r["station_dist_m"]),
                "travel_time_mins": float(r["travel_time_mins"]),
                "count": int(r["count"]),
                "adj_count": round(float(r["adj_count"]), 1),
                "coverage": int(r["coverage"]),
                "rank_raw": int(r["rank_raw"]),
                "rank_shift": int(r["rank_shift"]),
                "station": r["police_station"],
                "dominant_vehicle": r["dominant_vehicle"],
                "heavy_share": round(float(r["heavy_share"]), 3),
                "reason": r["reason"],
                "components": {
                    "density": round(float(r["c_density"]), 3),
                    "severity": round(float(r["c_severity"]), 3),
                    "persistence": round(float(r["c_persistence"]), 3),
                    "road_poi": round(float(r["c_road_poi"]), 3),
                },
                "hour_hist": _load(r["hour_hist"]),
                "dow_hist": _load(r["dow_hist"]),
                "top_vehicles": _load(r["top_vehicles"]),
                "n_days_active": int(r["n_days_active"]),
            },
        })
    return {"type": "FeatureCollection", "features": feats}


def heatmap(density: pd.DataFrame) -> list:
    out = []
    for _, r in density.iterrows():
        out.append({
            "gh": r["geohash7"], "lat": round(float(r["lat"]), 5),
            "lon": round(float(r["lon"]), 5), "t": int(r["total"]),
            "dp": [int(r["dp_morning"]), int(r["dp_midday"]),
                   int(r["dp_evening"]), int(r["dp_night"])],
            "vc": [int(r["vc_heavy"]), int(r["vc_car"]), int(r["vc_two_wheeler"]),
                   int(r["vc_auto"]), int(r["vc_other"])],
        })
    return out


def priority_queue(scored: pd.DataFrame) -> list:
    out = []
    for _, r in scored.iterrows():
        out.append({
            "rank": int(r["rank_corrected"]), "id": int(r["cluster"]),
            "station": r["police_station"], "lat": float(r["lat"]),
            "lon": float(r["lon"]), "score": float(r["score"]),
            "cii": float(r["cii"]), "economic_loss_inr": float(r["economic_loss_inr"]),
            "travel_time_mins": float(r["travel_time_mins"]),
            "count": int(r["count"]), "adj_count": round(float(r["adj_count"]), 1),
            "coverage": int(r["coverage"]), "rank_shift": int(r["rank_shift"]),
            "dominant_vehicle": r["dominant_vehicle"], "reason": r["reason"],
            "components": {"density": round(float(r["c_density"]), 3),
                           "severity": round(float(r["c_severity"]), 3),
                           "persistence": round(float(r["c_persistence"]), 3),
                           "road_poi": round(float(r["c_road_poi"]), 3)},
        })
    return out


def temporal(df: pd.DataFrame) -> dict:
    matrix = (df.groupby(["dow", "hour"]).size()
              .reindex(pd.MultiIndex.from_product([range(7), range(24)],
                       names=["dow", "hour"]), fill_value=0)
              .unstack(fill_value=0).reindex(range(7)).fillna(0).astype(int))
    mat = matrix.to_numpy().tolist()

    daypart = df["daypart"].value_counts().reindex(
        ["morning", "midday", "evening", "night"], fill_value=0).to_dict()
    vehicles = df["vehicle"].value_counts().head(8).to_dict()
    violations = df["primary_violation"].value_counts().head(6).to_dict()
    monthly = [{"month": m, "count": int(c)}
               for m, c in df["month"].value_counts().sort_index().items()]

    flat = matrix.to_numpy()
    pslot = int(flat.argmax())
    pd_dow, pd_hour = divmod(pslot, 24)
    return {
        "matrix": mat, "dow_names": DOW_NAMES,
        "daypart": {k: int(v) for k, v in daypart.items()},
        "vehicles": {k: int(v) for k, v in vehicles.items()},
        "violations": {str(k): int(v) for k, v in violations.items()},
        "monthly": monthly,
        "peak": {"dow": DOW_NAMES[pd_dow], "hour": int(pd_hour),
                 "label": f"{DOW_NAMES[pd_dow]} {pd_hour:02d}:00"},
    }


def stats(df: pd.DataFrame, scored: pd.DataFrame, temporal_obj: dict) -> dict:
    heavy = df["vehicle"].isin(
        ["BUS (BMTC/KSRTC)", "PRIVATE BUS", "TANKER", "LGV", "VAN", "GOODS AUTO"]).mean()
    n_changed = int((scored["rank_shift"] != 0).sum())
    named = (df["junction_name"].fillna("No Junction") != "No Junction").mean()
    try:
        fmeta = json.loads((cfg.DATA_PROCESSED / "forecast_meta.json").read_text())
        r2 = fmeta.get("holdout_r2")
        fmodel = fmeta.get("model")
    except Exception:
        r2, fmodel = None, None
        
    total_loss = float(scored["economic_loss_inr"].sum())
    
    return {
        "total_violations": int(len(df)),
        "n_hotspots": int(len(scored)),
        "n_stations": int(df["police_station"].nunique()),
        "worst_zone": scored.iloc[0]["police_station"],
        "worst_score": float(scored.iloc[0]["score"]),
        "worst_cii": float(scored.iloc[0]["cii"]),
        "total_economic_loss_lakhs": round(total_loss / 100000.0, 2),
        "peak_window": temporal_obj["peak"]["label"],
        "heavy_share": round(float(heavy), 3),
        "named_junction_share": round(float(named), 3),
        "rank_changed": n_changed,
        "rank_changed_pct": round(100 * n_changed / max(1, len(scored)), 0),
        "forecast_r2": r2,
        "forecast_model": fmodel,
        "n_officers": int(df["created_by_id"].nunique()),
        "n_devices": int(df["device_id"].nunique()),
        "date_start": str(df["created_dt"].min().date()),
        "date_end": str(df["created_dt"].max().date()),
        "top_vehicle": df["vehicle"].value_counts().index[0],
    }


def methodology(df: pd.DataFrame, scored: pd.DataFrame) -> dict:
    moved = int((scored["rank_shift"] != 0).sum())
    meta = json.loads((cfg.DATA_PROCESSED / "forecast_meta.json").read_text())
    return {
        "timezone_note": "Timestamps are UTC in the source and converted to IST "
                         "(Asia/Kolkata) before any temporal analysis; otherwise "
                         "every pattern shifts by 5h30m.",
        "approved_only": f"Analysis uses the {len(df):,} validation-approved "
                         "records (the confirmed-real core), not the raw feed.",
        "bias_correction": f"Violation counts are normalised by patrol coverage "
                         f"(distinct officers per zone). {moved} of "
                         f"{len(scored)} hotspots changed rank after correction, "
                         "showing the raw counts partly measured enforcement "
                         "presence rather than parking severity.",
        "forecast_model": f"Forecast model: {meta['model']}"
                          + (f", held-out R2 {meta['holdout_r2']} on a 20% validation split."
                             if meta.get("holdout_r2") is not None else "."),
        "score_formula": "Impact = 0.35 x density + 0.20 x severity + 0.20 x persistence + 0.15 x road_poi + 0.10 x coverage_adj, normalized to 0-100.",
    }


def main():
    cfg.ARTIFACTS.mkdir(parents=True, exist_ok=True)
    df = load_table(cfg.CLEANED)
    scored = load_table(cfg.DATA_PROCESSED / "scored")
    density = load_table(cfg.DATA_PROCESSED / "density")
    dark_zones = load_table(cfg.DATA_PROCESSED / "dark_zones")

    write_json("hotspots.geojson", hotspots_geojson(scored))
    write_json("heatmap.json", heatmap(density))
    write_json("priority_queue.json", priority_queue(scored))
    write_json("dark_zones.json", dark_zones.to_dict(orient="records"))
    temporal_obj = temporal(df)
    write_json("temporal.json", temporal_obj)
    write_json("stats.json", stats(df, scored, temporal_obj))
    write_json("methodology.json", methodology(df, scored))

    print("wrote artifacts:")
    for p in sorted(cfg.ARTIFACTS.glob("*.json")) + sorted(cfg.ARTIFACTS.glob("*.geojson")):
        print(f"  {p.name:22s} {p.stat().st_size/1024:7.1f} KB")

    # keep the frontend's static fallback in sync with this run
    import shutil
    pub = cfg.ROOT.parent / "frontend" / "public" / "data"
    if pub.parent.exists():
        pub.mkdir(parents=True, exist_ok=True)
        for p in list(cfg.ARTIFACTS.glob("*.json")) + list(cfg.ARTIFACTS.glob("*.geojson")):
            shutil.copy(p, pub / p.name)
        print(f"synced {pub.relative_to(cfg.ROOT.parent)} with this run")


if __name__ == "__main__":
    main()
