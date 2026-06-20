"""
Stage 04: Spatiotemporal forecasting and modeling.

Fits regression models to predict hourly violation counts per Geohash-6 cell.
Provides robust holdout cross-validation to gauge generalization, exports the
trained models, and generates weekly spatiotemporal recommendations.
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent))
import config as cfg
from lib import load_table, save_table

TOP_CELLS = 200
FEATURES = ["dow", "hour", "is_weekend", "sin_h", "cos_h", "sin_d", "cos_d",
            "log_cell_total", "cell_mean", "lat", "lon"]


def build_panel(df: pd.DataFrame):
    span_days = max(1, (df["created_dt"].max() - df["created_dt"].min()).days)
    n_weeks = max(1.0, span_days / 7.0)

    cell_geo = df.groupby("geohash6").agg(
        lat=("latitude", "mean"), lon=("longitude", "mean"), cell_total=("id", "count")
    ).reset_index()

    grp = df.groupby(["geohash6", "dow", "hour"]).size().reset_index(name="n")
    grp["target"] = grp["n"] / n_weeks

    cells = cell_geo["geohash6"].tolist()
    full = pd.MultiIndex.from_product(
        [cells, range(7), range(24)], names=["geohash6", "dow", "hour"]
    ).to_frame(index=False)
    panel = full.merge(grp[["geohash6", "dow", "hour", "target"]],
                       on=["geohash6", "dow", "hour"], how="left").fillna({"target": 0.0})
    panel = panel.merge(cell_geo, on="geohash6", how="left")

    panel["is_weekend"] = panel["dow"].isin([5, 6]).astype(int)
    panel["sin_h"] = np.sin(2 * np.pi * panel["hour"] / 24)
    panel["cos_h"] = np.cos(2 * np.pi * panel["hour"] / 24)
    panel["sin_d"] = np.sin(2 * np.pi * panel["dow"] / 7)
    panel["cos_d"] = np.cos(2 * np.pi * panel["dow"] / 7)
    panel["log_cell_total"] = np.log1p(panel["cell_total"])
    panel["cell_mean"] = panel.groupby("geohash6")["target"].transform("mean")
    return panel, cell_geo, n_weeks


def _make_model():
    try:
        import lightgbm as lgb
        return lgb.LGBMRegressor(n_estimators=600, learning_rate=0.04, num_leaves=48,
                                 subsample=0.8, colsample_bytree=0.8, verbose=-1), "LightGBM"
    except Exception:
        try:
            from sklearn.ensemble import HistGradientBoostingRegressor
            return (HistGradientBoostingRegressor(max_iter=500, learning_rate=0.04,
                    max_depth=7, l2_regularization=0.1),
                    "HistGradientBoosting (sklearn)")
        except Exception:
            return None, "historical average (baseline)"


def fit_predict(panel: pd.DataFrame):
    from sklearn.model_selection import train_test_split
    X = panel[FEATURES].to_numpy()
    y = panel["target"].to_numpy()
    model, name = _make_model()

    holdout_r2 = None
    if model is not None:
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
        model.fit(Xtr, ytr)
        pte = np.clip(model.predict(Xte), 0, None)
        ss_res = float(((yte - pte) ** 2).sum())
        ss_tot = float(((yte - yte.mean()) ** 2).sum()) or 1.0
        holdout_r2 = 1 - ss_res / ss_tot
        # refit on everything for deployment predictions + saved model
        model.fit(X, y)
        pred = np.clip(model.predict(X), 0, None)
    else:
        pred = panel["cell_mean"].to_numpy()

    panel = panel.copy()
    panel["pred"] = pred
    return panel, name, holdout_r2, model


def assemble(panel, cell_geo, model_name, holdout_r2):
    top = set(cell_geo.sort_values("cell_total", ascending=False).head(TOP_CELLS)["geohash6"])
    sub = panel[panel["geohash6"].isin(top)].copy()
    sub["slot"] = sub["dow"] * 24 + sub["hour"]

    grid = []
    for gh, g in sub.groupby("geohash6"):
        g = g.sort_values("slot")
        arr = np.zeros(168)
        arr[g["slot"].to_numpy()] = g["pred"].to_numpy()
        grid.append({"geohash6": gh, "lat": round(float(g["lat"].iloc[0]), 5),
                     "lon": round(float(g["lon"].iloc[0]), 5),
                     "pred": [round(float(v), 2) for v in arr]})

    slot_tot = sub.groupby("slot")["pred"].sum()
    peak_slot = int(slot_tot.idxmax())
    pdow, phour = divmod(peak_slot, 24)
    dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    peak = sub[sub["slot"] == peak_slot].sort_values("pred", ascending=False).head(6)
    rec = {"peak_dow": dows[pdow], "peak_hour": phour, "peak_slot": peak_slot,
           "label": f"{dows[pdow]} {phour:02d}:00",
           "zones": [{"geohash6": r.geohash6, "lat": float(r.lat), "lon": float(r.lon),
                      "predicted": round(float(r.pred), 1)} for r in peak.itertuples()]}
    meta = {"model": model_name,
            "holdout_r2": None if holdout_r2 is None else round(holdout_r2, 4),
            "n_cells": len(grid), "recommendation": rec}
    return grid, meta


def main():
    cfg.ARTIFACTS.mkdir(parents=True, exist_ok=True)        # <-- create BEFORE saving anything
    cfg.DATA_PROCESSED.mkdir(parents=True, exist_ok=True)

    df = load_table(cfg.CLEANED)
    print(f"building hour-of-week panel from {len(df):,} rows ...")
    panel, cell_geo, n_weeks = build_panel(df)
    print(f"  {len(cell_geo)} cells over ~{n_weeks:.1f} weeks -> {len(panel):,} slots")
    panel, model_name, holdout_r2, model = fit_predict(panel)
    msg = f"  model: {model_name}"
    if holdout_r2 is not None:
        msg += f"  (held-out R2 = {holdout_r2:.3f})"
    print(msg)
    grid, meta = assemble(panel, cell_geo, model_name, holdout_r2)

    # persist model (artifacts dir already exists)
    if model is not None:
        import joblib
        model_path = cfg.ARTIFACTS / "forecast_model.pkl"
        joblib.dump({"model": model, "features": FEATURES, "model_name": model_name,
                     "holdout_r2": meta["holdout_r2"]}, model_path)
        meta["model_pkl"] = model_path.name
        print(f"  saved model -> {model_path}  ({model_path.stat().st_size/1024:.0f} KB)")

    save_table(pd.DataFrame(grid), cfg.DATA_PROCESSED / "forecast_grid")
    (cfg.ARTIFACTS / "forecast.json").write_text(
        json.dumps({"meta": meta, "grid": grid}, separators=(",", ":")))
    (cfg.DATA_PROCESSED / "forecast_meta.json").write_text(json.dumps(meta, indent=2))

    rec = meta["recommendation"]
    print(f"\nNEXT PEAK: {rec['label']} -> dispatch to:")
    for z in rec["zones"]:
        print(f"  {z['geohash6']}  ~{z['predicted']}/hr  ({z['lat']:.4f},{z['lon']:.4f})")


if __name__ == "__main__":
    main()
