"""
ParkSight backend.

Loads the precomputed artifacts into memory once at startup and serves them.
No heavy computation happens per request, so responses are instant and the demo
cannot stutter. Run the pipeline first so artifacts/ is populated.

Run:
    cd parksight
    uvicorn backend.main:app --reload --port 8000
Docs at http://localhost:8000/docs
"""

import json
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / "ml" / "artifacts"

app = FastAPI(title="ParkSight API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # demo: allow the Vite dev server on any port
    allow_methods=["*"],
    allow_headers=["*"],
)

_CACHE: dict = {}


def _load(name: str):
    if name not in _CACHE:
        path = ARTIFACTS / name
        if not path.exists():
            raise HTTPException(503, f"Artifact {name} missing. Run the pipeline "
                                     "(see README) to generate artifacts/.")
        _CACHE[name] = json.loads(path.read_text())
    return _CACHE[name]


@app.on_event("startup")
def warm_cache():
    for f in ("stats.json", "hotspots.geojson", "heatmap.json",
              "priority_queue.json", "forecast.json", "temporal.json",
              "methodology.json", "dark_zones.json"):
        try:
            _load(f)
        except HTTPException:
            pass  # allow boot even if some artifact is not yet built

    # Ensure 12-hour forecast model is trained on startup
    model_path = ARTIFACTS / "forecast_model_12h.pkl"
    if not model_path.exists():
        print("[startup] 12h forecast model not found. Training on default dataset...")
        try:
            # Add ml directory to sys.path so we can import modules correctly
            sys.path.append(str(ROOT / "ml"))
            from ml.forecast_12h import smart_read_csv, clean_for_12h, train_12h
            raw_csv = ROOT / "ml" / "data" / "raw" / "jan_to_may_police_violation_anonymized791b166.csv"
            if raw_csv.exists():
                df_raw = smart_read_csv(raw_csv)
                df_clean = clean_for_12h(df_raw)
                train_12h(df_clean)
                print("[startup] 12h forecast model trained successfully.")
            else:
                print(f"[startup] Default raw CSV not found at {raw_csv}. Cannot train 12h model.")
        except Exception as e:
            print(f"[startup] Failed to train 12h model on startup: {e}")



@app.get("/api/health")
def health():
    have = sorted(p.name for p in ARTIFACTS.glob("*.json")) + \
           sorted(p.name for p in ARTIFACTS.glob("*.geojson"))
    return {"status": "ok", "artifacts": have}


@app.get("/api/stats")
def stats():
    return _load("stats.json")


@app.get("/api/hotspots")
def hotspots():
    return _load("hotspots.geojson")


@app.get("/api/hotspot/{hid}")
def hotspot(hid: int):
    fc = _load("hotspots.geojson")
    for f in fc["features"]:
        if f["properties"]["id"] == hid:
            return f
    raise HTTPException(404, f"hotspot {hid} not found")


@app.get("/api/heatmap")
def heatmap():
    # full density grid; the frontend slices by daypart/vehicle client-side
    return JSONResponse(_load("heatmap.json"))


@app.get("/api/priority-queue")
def priority_queue(limit: int = 50):
    return _load("priority_queue.json")[:limit]


@app.get("/api/forecast")
def forecast():
    return _load("forecast.json")


@app.get("/api/temporal")
def temporal():
    return _load("temporal.json")


@app.get("/api/methodology")
def methodology():
    return _load("methodology.json")


@app.get("/api/dark-zones")
def dark_zones():
    return _load("dark_zones.json")


@app.get("/api/forecast-12h")
def get_forecast_12h():
    try:
        sys.path.append(str(ROOT / "ml"))
        from ml.forecast_12h import predict_next_12h_live
        return predict_next_12h_live()
    except FileNotFoundError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error generating live 12h forecast: {e}")


@app.post("/api/forecast-12h/upload")
def upload_and_forecast_12h(file: UploadFile = File(...)):
    raise HTTPException(501, "Live retraining via CSV upload is currently disabled (Coming Soon).")


# Serve frontend static assets from the built Vite folder
FRONTEND_DIST = ROOT / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
else:
    print(f"[warning] Frontend build folder not found at {FRONTEND_DIST}. Serve API only.")

