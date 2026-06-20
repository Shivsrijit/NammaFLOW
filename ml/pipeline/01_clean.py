"""
Patch 1 - Stage 01: clean + geohash.

Reads the raw violation CSV and produces a single trustworthy cleaned table
that every later stage builds on. It:
  - parses timestamps and derives hour / day-of-week / month / daypart
  - coalesces vehicle_type with the corrected updated_vehicle_type
  - parses the violation list and offence codes into a primary value + count
  - filters to approved violations (the confirmed-real core)
  - drops invalid / out-of-Bengaluru coordinates
  - drops the near-empty columns
  - attaches geohash6 (coarse, for forecasting) and geohash7 (fine, for density)
  - writes data/processed/cleaned.(parquet|pkl)
  - prints a sanity report so you can confirm the data is sound

Run from the repo root:
    python pipeline/01_clean.py
Optionally point at a CSV elsewhere:
    python pipeline/01_clean.py --raw /path/to/file.csv
"""

import argparse
import ast
import sys
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent))
import config as cfg
from lib import geohash_series, save_table

USECOLS = [
    "id", "latitude", "longitude", "location",
    "vehicle_type", "updated_vehicle_type",
    "violation_type", "offence_code",
    "created_datetime", "modified_datetime",
    "device_id", "created_by_id", "center_code",
    "police_station", "junction_name",
    "validation_status",
]


def _parse_list(value):
    """Safely parse a stringified list like '[\"NO PARKING\"]' or '[113]'."""
    if pd.isna(value):
        return []
    try:
        parsed = ast.literal_eval(value)
        if isinstance(parsed, list):
            return parsed
        return [parsed]
    except (ValueError, SyntaxError):
        return [str(value)]


def clean(raw_path: Path) -> pd.DataFrame:
    print(f"Reading {raw_path} ...")
    df = pd.read_csv(raw_path, usecols=lambda c: c in USECOLS, low_memory=False)
    n_raw = len(df)
    print(f"  raw rows: {n_raw:,}")

    # --- timestamps and temporal features ---
    # The raw timestamps are UTC. Bengaluru is UTC+5:30, so deriving hour/daypart
    # from UTC would shift every temporal pattern by 5h30m (morning rush lands in
    # the "night" bucket). Convert to Asia/Kolkata, then drop tz to keep the local
    # wall-clock time, which is what every temporal feature should be based on.
    created_utc = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True)
    created = created_utc.dt.tz_convert("Asia/Kolkata").dt.tz_localize(None)
    df["created_dt"] = created
    df["hour"] = created.dt.hour
    df["dow"] = created.dt.dayofweek            # 0 = Monday
    df["date"] = created.dt.date
    df["month"] = created.dt.strftime("%Y-%m")
    df["is_weekend"] = df["dow"].isin([5, 6])
    df["daypart"] = df["hour"].apply(lambda h: cfg.daypart(int(h)) if pd.notna(h) else None)

    # --- vehicle: prefer the corrected value ---
    veh = df["updated_vehicle_type"].fillna(df["vehicle_type"])
    df["vehicle"] = veh.astype("string").str.strip().str.upper()

    # --- violations and offence codes ---
    vio = df["violation_type"].apply(_parse_list)
    df["primary_violation"] = vio.apply(lambda lst: lst[0] if lst else None)
    df["n_violations"] = vio.apply(len)
    off = df["offence_code"].apply(_parse_list)
    df["primary_offence"] = off.apply(lambda lst: lst[0] if lst else None)

    # --- validation breakdown (reported before filtering) ---
    print("  validation status (full set):")
    for status, count in df["validation_status"].value_counts(dropna=False).items():
        print(f"    {str(status):12s} {count:>8,}")

    # --- coordinate sanity ---
    in_bounds = (
        df["latitude"].between(cfg.LAT_MIN, cfg.LAT_MAX)
        & df["longitude"].between(cfg.LON_MIN, cfg.LON_MAX)
    )
    dropped_coords = (~in_bounds).sum()
    df = df[in_bounds].copy()

    # --- approved-only core ---
    if cfg.KEEP_ONLY_APPROVED:
        before = len(df)
        df = df[df["validation_status"] == "approved"].copy()
        print(f"  kept approved core: {len(df):,} (from {before:,} in-bounds)")

    # --- drop dead timestamp rows ---
    df = df[df["created_dt"].notna()].copy()

    # --- geohashes ---
    print("  encoding geohashes ...")
    df["geohash6"] = geohash_series(df["latitude"], df["longitude"], cfg.GEOHASH_COARSE)
    df["geohash7"] = geohash_series(df["latitude"], df["longitude"], cfg.GEOHASH_FINE)

    # --- final column selection (drop the near-empty originals) ---
    keep = [
        "id", "latitude", "longitude", "location",
        "vehicle", "primary_violation", "n_violations", "primary_offence",
        "created_dt", "hour", "dow", "date", "month", "is_weekend", "daypart",
        "device_id", "created_by_id", "center_code",
        "police_station", "junction_name",
        "validation_status", "geohash6", "geohash7",
    ]
    df = df[keep].reset_index(drop=True)

    print(f"  dropped {dropped_coords:,} out-of-bounds rows along the way")
    return df


def sanity_report(df: pd.DataFrame) -> None:
    print("\n" + "=" * 60)
    print("SANITY REPORT")
    print("=" * 60)
    print(f"clean rows: {len(df):,}")
    print(f"date range: {df['created_dt'].min()}  ->  {df['created_dt'].max()}")

    print("\ntop 10 police stations:")
    for name, count in df["police_station"].value_counts().head(10).items():
        print(f"  {name:20s} {count:>7,}")

    print("\nvehicle mix (top 8):")
    for name, count in df["vehicle"].value_counts().head(8).items():
        print(f"  {str(name):16s} {count:>7,}")

    print("\nby daypart:")
    for name, count in df["daypart"].value_counts().items():
        print(f"  {str(name):10s} {count:>7,}")

    named = (df["junction_name"].fillna("No Junction") != "No Junction").sum()
    print(f"\nnamed junctions: {named:,} of {len(df):,} "
          f"({100*named/len(df):.0f}%)")

    print(f"\nunique geohash6 cells: {df['geohash6'].nunique():,}")
    print(f"unique geohash7 cells: {df['geohash7'].nunique():,}")
    print("top 8 geohash6 cells by violations:")
    for cell, count in df["geohash6"].value_counts().head(8).items():
        sample = df[df["geohash6"] == cell].iloc[0]
        print(f"  {cell}  {count:>6,}   near {sample['police_station']}")

    print("\nenforcement coverage signals (for bias correction later):")
    print(f"  unique devices : {df['device_id'].nunique():,}")
    print(f"  unique officers: {df['created_by_id'].nunique():,}")
    print(f"  unique centers : {df['center_code'].nunique():,}")
    print("=" * 60)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(cfg.RAW_CSV),
                    help="path to the raw violations CSV")
    args = ap.parse_args()

    raw_path = Path(args.raw)
    if not raw_path.exists():
        print(f"ERROR: raw CSV not found at {raw_path}")
        print(f"Drop the dataset into {cfg.DATA_RAW}/ "
              f"or pass --raw /path/to/file.csv")
        sys.exit(1)

    cfg.DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    df = clean(raw_path)
    sanity_report(df)

    out = save_table(df, cfg.CLEANED)
    fmt = "parquet" if out.endswith(".parquet") else "pickle (install pyarrow for parquet)"
    print(f"\nwrote cleaned table -> {out}  [{fmt}]")


if __name__ == "__main__":
    main()
