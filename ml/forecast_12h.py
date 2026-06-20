"""12-Hour Operational Shift Forecaster Core.

Integrates the cleaning, feature engineering, training, and inference
for the next 12-hour violation load predictions.
"""
import sys
import pickle
import warnings
import glob
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.metrics import r2_score

# Add parent directory to path to import config and lib
sys.path.append(str(Path(__file__).resolve().parent))
import config as cfg
from lib import load_table, save_table

warnings.filterwarnings("ignore")

try:
    import lightgbm as lgb
    HAVE_LGB = True
except Exception:
    HAVE_LGB = False
from sklearn.ensemble import HistGradientBoostingRegressor

H = 12  # Horizon
FEATS = ([f"lag_{L}" for L in [1, 3, 6, 12, 24, 48, 168, 336]] +
         ["rm_6", "rm_24", "rm_72", "rm_168", "eww", "lvl24", "lvl48", "lvl168",
          "hs", "hc", "ds", "dc", "wknd", "tprof"])


def smart_read_csv(file_path_or_obj) -> pd.DataFrame:
    """Reads a CSV file, dynamically detecting if it contains headers.
    If headerless, applies default column names matching the dataset schema."""
    default_cols = [
        "id",                  # 0
        "latitude",            # 1
        "longitude",           # 2
        "location",            # 3
        "vehicle_no",          # 4
        "vehicle_type",        # 5
        "updated_vehicle_type",# 6
        "violation_type",      # 7
        "offence_code",        # 8
        "created_datetime",    # 9
        "closed_datetime",     # 10
        "modified_datetime",   # 11
        "device_id",           # 12
        "created_by_id",       # 13
        "center_code",         # 14
        "police_station",      # 15
        "is_valid_etc",        # 16
        "junction_name",       # 17
        "location_name",       # 18
        "col19",               # 19
        "col20",               # 20
        "col21",               # 21
        "validation_status",   # 22
        "approved_datetime",   # 23
    ]
    
    # Read the first line to check for headers
    if isinstance(file_path_or_obj, (str, Path)):
        with open(file_path_or_obj, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline()
    else:
        # File-like object (e.g. from FastAPI UploadFile)
        # We read a chunk, then seek back
        first_line = file_path_or_obj.readline().decode("utf-8", errors="ignore")
        file_path_or_obj.seek(0)

    # Check if the first row items contain exact header keywords
    first_row_items = [item.strip().strip('"').strip("'").lower() for item in first_line.split(",")]
    header_keywords = {"id", "latitude", "longitude", "created_date", "created_datetime", "vehicle_type", "validation_status"}
    has_header = any(item in header_keywords for item in first_row_items)

    if has_header:
        df = pd.read_csv(file_path_or_obj, low_memory=False)
    else:
        # If it doesn't match 24 columns, pad it
        df = pd.read_csv(file_path_or_obj, header=None, low_memory=False)
        cols = default_cols[:df.shape[1]]
        if len(cols) < df.shape[1]:
            cols += [f"col_{i}" for i in range(len(cols), df.shape[1])]
        df.columns = cols

    return df


def clean_for_12h(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Performs clean steps specifically for 12h forecast.
    Keeps all rows (both approved and unapproved) as required by the 12h forecaster
    to accurately model full raw violation patterns, but handles timezone localization
    and coordinates check."""
    df = raw_df.copy()
    
    # Standardise column names
    renamed = {}
    for col in df.columns:
        key = str(col).strip().lower().replace(" ", "_")
        # Handle maps
        if key in ["created_date", "created_datetime", "timestamp"]:
            renamed[col] = "created_date"
        elif key in ["validation_status", "validation", "status"]:
            renamed[col] = "validation"
        elif key in ["vehicle_type", "vehicle"]:
            renamed[col] = "vehicle_type"
        else:
            renamed[col] = key
    df = df.rename(columns=renamed)
    df = df.loc[:, ~df.columns.duplicated()]

    # Treat textual NULLs as missing
    df = df.replace({"NULL": np.nan, "null": np.nan, "": np.nan})

    # Coordinates validation
    for c in ("latitude", "longitude"):
        if c not in df:
            raise KeyError(f"required column '{c}' missing after normalisation")
        df[c] = pd.to_numeric(df[c], errors="coerce")
    
    # Filter within Bengaluru bounds
    df = df[df.latitude.between(cfg.LAT_MIN, cfg.LAT_MAX) &
            df.longitude.between(cfg.LON_MIN, cfg.LON_MAX)]

    # Timestamps localization (UTC -> Asia/Kolkata -> local naive)
    if "created_date" not in df:
         raise KeyError("no created_date/created_datetime column found")
    
    df["created_date"] = pd.to_datetime(df["created_date"], errors="coerce", utc=True)
    df = df[df.created_date.notna()].copy()
    df["created_date"] = df.created_date.dt.tz_convert("Asia/Kolkata").dt.tz_localize(None)
    df["hour"] = df.created_date.dt.hour
    df["dow"] = df.created_date.dt.dayofweek
    df["date"] = df.created_date.dt.floor("h")

    # Vehicle mix
    base = df.get("vehicle_type", pd.Series(index=df.index, dtype=object))
    vt = df.get("updated_vehicle_type")
    df["vehicle"] = (vt.fillna(base) if vt is not None else base).astype(str).str.upper().str.strip()

    # Approved status
    if "validation" in df:
        v = df.validation.astype(str).str.lower().str.strip()
        df["approved"] = v.isin(["approved", "true", "1", "yes"])
    else:
        df["approved"] = True

    # Fill default values for missing columns
    for c in ("device_id", "created_by", "center_code", "police_station", "junction_name", "location_name"):
        if c not in df:
            df[c] = np.nan

    return df


def _hourly_city(df):
    full = pd.date_range(df.date.min().floor("h"), df.date.max().floor("h"), freq="h")
    y = df.groupby("date").size().reindex(full, fill_value=0).astype(float)
    return full, y


def _features(full, y):
    d = pd.DataFrame({"date": full, "y": y.values})
    for L in [1, 3, 6, 12, 24, 48, 168, 336]:
        d[f"lag_{L}"] = y.shift(L).values
    for R in [6, 24, 72, 168]:
        d[f"rm_{R}"] = y.shift(1).rolling(R).mean().values
    d["eww"] = y.shift(168).ewm(span=8).mean().values
    h = d.date.dt.hour; dw = d.date.dt.dayofweek
    d["how"] = dw * 24 + h
    d["hs"] = np.sin(2 * np.pi * h / 24); d["hc"] = np.cos(2 * np.pi * h / 24)
    d["ds"] = np.sin(2 * np.pi * dw / 7); d["dc"] = np.cos(2 * np.pi * dw / 7)
    d["wknd"] = (dw >= 5).astype(int)
    # next-12h cumulative load (the operational target)
    yv = y.values
    d["t"] = [yv[i + 1:i + 1 + H].sum() if i + 1 + H <= len(yv) else np.nan for i in range(len(yv))]
    return d


def _add_level_and_profile(tr, te, gmean):
    for X in (tr, te):
        X["lvl24"] = (X["rm_24"] / gmean).clip(0.4, 2.2)
        X["lvl48"] = (X["rm_48"] / gmean).clip(0.4, 2.2) if "rm_48" in X else 1.0
        X["lvl168"] = (X["rm_168"] / gmean).clip(0.5, 1.8)
    prof = tr.groupby("how").t.mean()
    fill = tr.t.mean()
    tr["tprof"] = tr.how.map(prof).fillna(fill)
    te["tprof"] = te.how.map(prof).fillna(fill)
    return prof, fill


def _fit_gbm(X, ytr, quantile=None):
    if HAVE_LGB:
        if quantile is None:
            m = lgb.LGBMRegressor(objective="poisson", n_estimators=350, learning_rate=0.04,
                                  num_leaves=31, min_child_samples=80, reg_lambda=3.0,
                                  subsample=0.85, colsample_bytree=0.85, n_jobs=-1, verbose=-1)
        else:
            m = lgb.LGBMRegressor(objective="quantile", alpha=quantile, n_estimators=300,
                                  learning_rate=0.04, num_leaves=31, min_child_samples=80,
                                  n_jobs=-1, verbose=-1)
        m.fit(X, ytr)
        return m
    loss = "poisson" if quantile is None else "quantile"
    kw = dict(loss=loss, max_iter=350, learning_rate=0.04, max_leaf_nodes=31,
              min_samples_leaf=80, l2_regularization=3.0, early_stopping=True,
              validation_fraction=0.12, random_state=0)
    if quantile is not None:
        kw["quantile"] = quantile
    m = HistGradientBoostingRegressor(**kw)
    m.fit(X, ytr)
    return m


def train_12h(df: pd.DataFrame) -> dict:
    """Trains the 12-hour forecasting model on the cleaned dataframe.
    Computes cross-validation metrics, final fits, and caches the model/feature frame."""
    full, y = _hourly_city(df)
    feat = _features(full, y)
    feat["rm_48"] = y.shift(1).rolling(48).mean().values
    base = feat.dropna(subset=["lag_336", "t"]).reset_index(drop=True)
    gmean = float(y.mean())

    # rolling-origin cross-validation
    folds = [14, 21, 28, 35]
    per_fold = {}
    for cd in folds:
        cutoff = base.date.max() - pd.Timedelta(days=cd)
        tr = base[base.date <= cutoff].copy(); te = base[base.date > cutoff].copy()
        _add_level_and_profile(tr, te, gmean)
        gb = _fit_gbm(tr[FEATS], tr.t)
        pte = np.clip(gb.predict(te[FEATS]), 0, None)
        seasonal = te.tprof.values * te.lvl48.values
        ens = 0.7 * seasonal + 0.3 * pte
        per_fold[cd] = round(float(r2_score(te.t, ens)), 4)
        print(f"[forecast_12h] holdout last {cd}d: R2 = {per_fold[cd]:.4f}")
        
    cv_r2 = round(float(np.mean(list(per_fold.values()))), 4)
    print(f"[forecast_12h] rolling-origin mean R2 = {cv_r2:.4f}")

    # Final fit on all data
    tr = base.copy(); te = base.tail(1).copy()
    prof, fill = _add_level_and_profile(tr, te, gmean)
    gb = _fit_gbm(tr[FEATS], tr.t)
    ql = _fit_gbm(tr[FEATS], tr.t, quantile=0.1)
    qh = _fit_gbm(tr[FEATS], tr.t, quantile=0.9)

    # Hourly shape of the raw hourly load to disaggregate the 12h total
    shape = tr.assign(hr=tr.date.dt.hour, dw=tr.date.dt.dayofweek).groupby("how").y.mean()

    bundle = dict(
        engine="LightGBM" if HAVE_LGB else "HistGradientBoosting",
        gbm=gb, q_low=ql, q_high=qh, profile=prof.to_dict(), profile_fill=fill,
        hour_shape=shape.to_dict(), gmean=gmean, feats=FEATS, horizon=H,
        cv_r2=cv_r2, per_fold=per_fold, target="citywide next-12h load",
        trained_through=str(base.date.max())
    )
    
    cfg.ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with open(cfg.ARTIFACTS / "forecast_model_12h.pkl", "wb") as f:
        pickle.dump(bundle, f)
        
    save_table(base, cfg.DATA_PROCESSED / "feature_frame_12h")
    print(f"[forecast_12h] saved forecast_model_12h.pkl and feature_frame_12h")
    
    return bundle


def predict_next_12h_live() -> dict:
    """Predicts next 12 hours from cached model and feature frame."""
    model_path = cfg.ARTIFACTS / "forecast_model_12h.pkl"
    feature_path = cfg.DATA_PROCESSED / "feature_frame_12h"
    
    if not model_path.exists():
        raise FileNotFoundError("12h forecasting model not trained yet.")
        
    with open(model_path, "rb") as f:
        b = pickle.load(f)
        
    base = load_table(feature_path)
    row = base.sort_values("date").tail(1).copy()
    row["lvl24"] = (row["rm_24"] / b["gmean"]).clip(0.4, 2.2)
    row["lvl48"] = (row["rm_48"] / b["gmean"]).clip(0.4, 2.2)
    row["lvl168"] = (row["rm_168"] / b["gmean"]).clip(0.5, 1.8)
    row["tprof"] = row.how.map(b["profile"]).fillna(b["profile_fill"])
    
    seasonal = float(row["tprof"].iloc[0] * row["lvl48"].iloc[0])
    gbm_pred = float(np.clip(b["gbm"].predict(row[b["feats"]]), 0, None)[0])
    total = 0.7 * seasonal + 0.3 * gbm_pred
    
    lo = float(np.clip(b["q_low"].predict(row[b["feats"]]), 0, None)[0])
    hi = float(np.clip(b["q_high"].predict(row[b["feats"]]), 0, None)[0])

    t0 = pd.to_datetime(row.date.iloc[0])
    hours = [(t0 + pd.Timedelta(hours=k)) for k in range(1, b["horizon"] + 1)]
    shape = np.array([b["hour_shape"].get(t.dayofweek * 24 + t.hour, b["gmean"]) for t in hours])
    shape = shape / max(shape.sum(), 1e-6)
    
    out = []
    for k, t in enumerate(hours):
        # Format nice display label (e.g. "Sat 17:00")
        at_label = t.strftime("%a %H:00")
        out.append(dict(
            h=f"+{k+1}h",
            at=str(t),
            at_label=at_label,
            pred=round(total * shape[k], 1),
            lo=round(lo * shape[k], 1),
            hi=round(hi * shape[k], 1)
        ))
        
    return {
        "total_12h": round(total, 1),
        "p10": round(lo, 1),
        "p90": round(hi, 1),
        "cv_r2": b["cv_r2"],
        "engine": b["engine"],
        "trained_through": b["trained_through"],
        "series": out
    }


if __name__ == "__main__":
    print("Training 12-hour forecasting model using default raw CSV...")
    # Find the default CSV
    raw_csv = cfg.RAW_CSV
    if not raw_csv.exists():
        print(f"Error: Raw CSV not found at {raw_csv}")
        sys.exit(1)
        
    df_raw = smart_read_csv(raw_csv)
    df_clean = clean_for_12h(df_raw)
    train_12h(df_clean)
    
    pred = predict_next_12h_live()
    print("\nPrediction for next 12 hours:")
    print(f"Total: {pred['total_12h']} (P10: {pred['p10']} - P90: {pred['p90']})")
    for s in pred["series"]:
        print(f"  {s['h']} ({s['at_label']}): {s['pred']} (lo: {s['lo']}, hi: {s['hi']})")
