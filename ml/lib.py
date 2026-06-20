"""
Shared helpers for the NammaFLOW pipeline.

Contains:
  1. A standalone, dependency-free geohash encoder to ensure portable builds.
  2. Table saving and loading utilities that leverage Parquet for fast disk access,
     falling back to pickle if pyarrow is not available.
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
    """Vectorized wrapper mapping geohash_encode over series pairs."""
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
