"""
Stage 03: Multi-dimensional Congestion Indexing, Economic Loss, and Coverage Gap Analysis.

Enriches spatial hotspots with OpenStreetMap road layouts and landmark features:
  - Calculates local proximity features to transit nodes (Metro exits) and emergency hospital corridors.
  - Computes the Congestion Impact Index (CII) considering vehicle footprint, local lane width, and hotspot density.
  - Formulates an enforcement-bias correction model to normalize raw ticket counts based on officer distribution.
  - Projects local hourly economic delays into INR metrics.
  - Scans for unenforced spatial corridors to detect high-risk Coverage Gaps (Dark Zones).
"""

import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Fix path to load config and helpers
ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))
sys.path.append(str(ROOT / "pipeline"))

import config as cfg
from lib import load_table, save_table
from osm_helper import get_osm_pois, calculate_proximity_features, get_police_station_dist, haversine_distance


def _norm(s: pd.Series) -> pd.Series:
    lo, hi = s.min(), s.max()
    if hi - lo < 1e-9:
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - lo) / (hi - lo)


def _avg_footprint(top_vehicles) -> float:
    """Resolve average vehicle footprint in meters blocked based on vehicles in cluster."""
    if isinstance(top_vehicles, str):
        top_vehicles = json.loads(top_vehicles)
    items = [(k, v) for k, v in top_vehicles.items() if v is not None]
    total = sum(v for _, v in items) or 1
    acc = 0.0
    # Vehicle footprint in lane-meters (from Feature 5 specification)
    footprints = {
        "BUS (BMTC/KSRTC)": 2.5,
        "PRIVATE BUS": 2.5,
        "TANKER": 2.5,
        "LGV": 1.5,
        "GOODS AUTO": 1.2,
        "VAN": 1.2,
        "MAXI-CAB": 1.2,
        "CAR": 0.8,
        "PASSENGER AUTO": 0.6,
        "MOTOR CYCLE": 0.4,
        "SCOOTER": 0.4,
        "MOPED": 0.4,
    }
    for veh, c in items:
        acc += footprints.get(veh, 0.5) * c
    return acc / total


def _avg_severity(top_vehicles) -> float:
    if isinstance(top_vehicles, str):
        top_vehicles = json.loads(top_vehicles)
    items = [(k, v) for k, v in top_vehicles.items() if v is not None]
    total = sum(v for _, v in items) or 1
    acc = 0.0
    for veh, c in items:
        acc += cfg.VEHICLE_SEVERITY.get(veh, cfg.DEFAULT_SEVERITY) * c
    return acc / total


def _hour_spread(hour_hist) -> float:
    if isinstance(hour_hist, str):
        hour_hist = json.loads(hour_hist)
    arr = np.asarray(hour_hist, dtype=float)
    if arr.sum() == 0:
        return 0.0
    p = arr / arr.sum()
    p = p[p > 0]
    ent = -(p * np.log(p)).sum()
    return float(ent / np.log(24))


def classify_lanes(location_name, station_name) -> int:
    """Classify lane count based on street indicators."""
    name = str(location_name).upper() + " " + str(station_name).upper()
    if any(x in name for x in ["HIGHWAY", "RING ROAD", "EXPRESSWAY", "NH ", "NH4", "OUTER RING"]):
        return 3
    if any(x in name for x in ["MAIN", "ROAD", "FLYOVER", "AVENUE", "JUGGLER", "JUNCTION", "METRO"]):
        return 2
    return 1


def score(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = df.copy()
    
    # Ingest POIs
    pois = get_osm_pois(cfg.DATA_PROCESSED)

    # --- 1. Proximity features and lanes ---
    print("  resolving POI proximities and road profiles...")
    metro_dists = []
    metro_names = []
    hospital_dists = []
    hospital_names = []
    prox_factors = []
    lane_counts = []
    station_dists = []

    for _, r in df.iterrows():
        # proximity
        p_feat = calculate_proximity_features(r["lat"], r["lon"], pois)
        metro_dists.append(p_feat["metro_dist_m"])
        metro_names.append(p_feat["metro_name"])
        hospital_dists.append(p_feat["hospital_dist_m"])
        hospital_names.append(p_feat["hospital_name"])
        prox_factors.append(p_feat["proximity_factor"])
        # lanes
        lane_counts.append(classify_lanes(r.get("location", ""), r["police_station"]))
        # travel cost
        station_dists.append(get_police_station_dist(r["lat"], r["lon"], r["police_station"]))

    df["metro_dist_m"] = metro_dists
    df["metro_name"] = metro_names
    df["hospital_dist_m"] = hospital_dists
    df["hospital_name"] = hospital_names
    df["proximity_factor"] = prox_factors
    df["lanes"] = lane_counts
    df["station_dist_m"] = station_dists
    df["travel_time_mins"] = (df["station_dist_m"] / 1000.0) / (cfg.PATROL_SPEED_KMH / 60.0)

    # --- 2. Enforcement-bias correction ---
    coverage = df["n_officers"].clip(lower=1)
    df["coverage"] = coverage
    df["adj_count"] = df["count"] / np.sqrt(coverage)

    # --- 3. Component indices ---
    df["vehicle_footprint"] = df["top_vehicles"].apply(_avg_footprint)
    df["severity_raw"] = df["top_vehicles"].apply(_avg_severity)
    df["hour_spread"] = df["hour_hist"].apply(_hour_spread)
    
    # Persistence: combination of days active and hour entropy
    persistence_raw = _norm(df["n_days_active"]) * 0.6 + _norm(df["hour_spread"]) * 0.4

    # Calculate CII: vehicle_footprint x road_lane_count x violation_density x persistence x proximity
    # We use density proxy = adj_count normalized
    df["c_density"] = _norm(np.log1p(df["adj_count"]))
    df["c_severity"] = _norm(df["severity_raw"])
    df["c_persistence"] = _norm(persistence_raw)
    df["c_road_poi"] = _norm(df["proximity_factor"] * (4.0 - df["lanes"])) # worse blockage on narrow roads

    # CII raw combination
    df["cii_raw"] = df["vehicle_footprint"] * df["lanes"] * df["c_density"] * persistence_raw * df["proximity_factor"]
    df["cii"] = (_norm(df["cii_raw"]) * 100).round(1)

    # Score: weighted impact composite
    w = cfg.IMPACT_WEIGHTS
    df["impact"] = (
        w["density"] * df["c_density"]
        + w["severity"] * df["c_severity"]
        + w["persistence"] * df["c_persistence"]
        + w["road_poi"] * df["c_road_poi"]
        + w["coverage_adj"] * _norm(1.0 / np.sqrt(df["coverage"]))
    )
    df["score"] = (df["impact"] * 100).round(1)

    # Raw vs corrected rank shift
    df["rank_corrected"] = df["score"].rank(ascending=False, method="first").astype(int)
    raw_rank = df["count"].rank(ascending=False, method="first").astype(int)
    df["rank_raw"] = raw_rank
    df["rank_shift"] = df["rank_raw"] - df["rank_corrected"]

    # --- 4. Economic Loss Matrix ---
    # Loss/Hour = (CII_score * volume * fuel_burn * fuel_cost) + (delay_time * wage)
    traffic_volume = df["lanes"] * cfg.TRAFFIC_VOLUME_MULTIPLIER
    # delay ranges up to 6 minutes (0.1 hrs)
    delay_hours = (df["cii"] / 100.0) * 0.08
    idle_burn_cost = delay_hours * cfg.IDLE_FUEL_BURN_L_HR * cfg.FUEL_COST_INR
    time_wage_cost = delay_hours * cfg.AVG_HOURLY_WAGE_INR
    df["economic_loss_inr"] = (traffic_volume * (idle_burn_cost + time_wage_cost)).round(0)

    # Sort worst-first by score
    df = df.sort_values("score", ascending=False).reset_index(drop=True)

    # Dynamic reasons
    def reason(r):
        bits = []
        if r["proximity_factor"] == 2.0:
            bits.append("blocking hospital emergency corridor")
        elif r["proximity_factor"] == 1.5:
            bits.append("blocking metro hub transit path")
        elif r["lanes"] == 1:
            bits.append("choking narrow single-lane passage")
            
        comps = {
            "high density": r["c_density"],
            "heavy vehicle blockage": r["c_severity"],
            "chronic all-day parking": r["c_persistence"]
        }
        bits.append(max(comps, key=comps.get))
        
        if r["heavy_share"] > 0.08:
            bits.append(f"{r['heavy_share']*100:.0f}% heavy vehicle footprint")
        return ", ".join(bits)

    df["reason"] = df.apply(reason, axis=1)

    # --- 5. Dark-Zone Detection ---
    # Scans for transit exits/hospitals that are unenforced (i.e. zero violations in e-challans nearby)
    print("  scanning for Dark Zones (unenforced high-risk spots)...")
    dark_zones = []
    
    # Check each metro POI
    for m in pois["metros"]:
        # Find nearest violation in original cluster centroids
        nearest_dist = float("inf")
        for _, r in df.iterrows():
            d = haversine_distance(m["lat"], m["lon"], r["lat"], r["lon"])
            if d < nearest_dist:
                nearest_dist = d
        # If no hotspot is within 400m, it's a Dark Zone
        if nearest_dist > 400.0:
            dark_zones.append({
                "type": "Metro Exit",
                "name": m["name"],
                "lat": m["lat"],
                "lon": m["lon"],
                "risk_score": 75.0,
                "reason": f"Metro transit exit at {m['name']} is completely unenforced in e-challan logs (nearest hotspot is {nearest_dist/1000.0:.2f}km away)."
            })

    # Check each hospital POI
    for h in pois["hospitals"]:
        nearest_dist = float("inf")
        for _, r in df.iterrows():
            d = haversine_distance(h["lat"], h["lon"], r["lat"], r["lon"])
            if d < nearest_dist:
                nearest_dist = d
        if nearest_dist > 400.0:
            dark_zones.append({
                "type": "Hospital Corridor",
                "name": h["name"],
                "lat": h["lat"],
                "lon": h["lon"],
                "risk_score": 85.0,
                "reason": f"Emergency hospital zone at {h['name']} has zero recorded enforcement actions (nearest hotspot is {nearest_dist/1000.0:.2f}km away)."
            })

    dz_df = pd.DataFrame(dark_zones)
    return df, dz_df


def main():
    summary = load_table(cfg.DATA_PROCESSED / "cluster_summary")
    print(f"scoring {len(summary)} hotspots ...")
    scored, dark_zones = score(summary)
    
    save_table(scored, cfg.DATA_PROCESSED / "scored")
    save_table(dark_zones, cfg.DATA_PROCESSED / "dark_zones")

    print("\nPRIORITY ENFORCEMENT QUEUE (OSM-enriched & corrected for bias):")
    print(f"  {'rank':>4} {'score':>5} {'CII':>5} {'Loss/hr':>11} {'shift':>5}  station")
    for _, r in scored.head(12).iterrows():
        arrow = f"+{r['rank_shift']}" if r["rank_shift"] > 0 else str(r["rank_shift"])
        print(f"  {r['rank_corrected']:>4} {r['score']:>5.1f} {r['cii']:>5.1f} "
              f"Rs.{r['economic_loss_inr']:>9,.0f} {arrow:>5}  {r['police_station']}  ({r['reason']})")
    
    print(f"\nDetected {len(dark_zones)} Dark Zones (unenforced high-risk corridors).")


if __name__ == "__main__":
    main()
