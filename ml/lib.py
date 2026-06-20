"""
Shared helpers for the ParkSight pipeline.

Two things live here:
  1. A small, dependency-free geohash encoder, so the pipeline never breaks on
     a missing geohash library at a hackathon.
  2. save_table / load_table, which prefer Parquet (compact, fast) and fall back
     to pickle automatically if pyarrow is not installed. Later stages just call
     load_table without caring which format was written.
"""

import pandas as pd

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def geohash_encode(lat: float, lon: float, precision: int = 7) -> str:
    """Encode a latitude/longitude into a geohash string of the given precision."""
    lat_lo, lat_hi = -90.0, 90.0
    lon_lo, lon_hi = -180.0, 180.0
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True  # start with longitude
    while len(geohash) < precision:
        if even:
            mid = (lon_lo + lon_hi) / 2
            if lon > mid:
                ch |= bits[bit]
                lon_lo = mid
            else:
                lon_hi = mid
        else:
            mid = (lat_lo + lat_hi) / 2
            if lat > mid:
                ch |= bits[bit]
                lat_lo = mid
            else:
                lat_hi = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(_BASE32[ch])
            bit = 0
            ch = 0
    return "".join(geohash)


def geohash_series(lat: pd.Series, lon: pd.Series, precision: int) -> pd.Series:
    """Vectorised-ish wrapper. Fast enough for a few hundred thousand rows."""
    pairs = zip(lat.to_numpy(), lon.to_numpy())
    return pd.Series(
        [geohash_encode(la, lo, precision) for la, lo in pairs],
        index=lat.index,
    )


def save_table(df: pd.DataFrame, path_no_ext) -> str:
    """Save a DataFrame, preferring Parquet, falling back to pickle. Returns the
    actual path written (with extension)."""
    path_no_ext = str(path_no_ext)
    try:
        out = path_no_ext + ".parquet"
        df.to_parquet(out, index=False)
        return out
    except Exception:
        out = path_no_ext + ".pkl"
        df.to_pickle(out)
        return out


def load_table(path_no_ext) -> pd.DataFrame:
    """Load whichever of {.parquet, .pkl} exists for the given base path."""
    import os

    path_no_ext = str(path_no_ext)
    parquet = path_no_ext + ".parquet"
    pickle = path_no_ext + ".pkl"
    if os.path.exists(parquet):
        return pd.read_parquet(parquet)
    if os.path.exists(pickle):
        return pd.read_pickle(pickle)
    raise FileNotFoundError(f"No cleaned table found at {parquet} or {pickle}")
