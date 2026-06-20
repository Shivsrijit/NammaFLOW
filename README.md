# NammaFLOW: Municipal Parking Enforcement Intelligence and Patrol Routing

NammaFLOW is an analytics and predictive routing console designed for parking enforcement. The platform ingests municipal e-challan traffic violation data, calculates a multi-dimensional Congestion Impact Index (CII) using road topology and spatial landmarks, identifies unenforced coverage gaps (Dark Zones), and generates spatiotemporal forecasts to suggest optimized patrol routes.

The platform is designed to operate completely as a static frontend console utilizing pre-compiled spatiotemporal data artifacts. This eliminates the need for live backend database queries during client visualization, resulting in fast load times.

---

## Technical Stack

* **Frontend Dashboard**: React, Vite, Vanilla CSS, MapLibre GL for spatial mapping, and WebGL Three.js for canvas background particle simulations.
* **Backend API**: FastAPI and Uvicorn (used for local artifact generation and model development).
* **Data Science and Machine Learning**: Python, pandas, scikit-learn, HDBSCAN (for spatial hotspot clustering), and LightGBM / HistGradientBoosting (for spatiotemporal violation load forecasting).
* **Geospatial Analytics**: Geohash-6 (coarse grid for forecasting) and Geohash-7 (fine grid for density mapping).

---

## System Architecture

The project is structured into three layers: the machine learning pipeline, the serving API, and the static frontend client.

```
+--------------------------------------------------------------+
|                         ML PIPELINE                          |
|  1. Clean Raw Data -> 2. Spatial HDBSCAN Clustering           |
|  3. Congestion & Loss Scoring -> 4. LightGBM Forecast        |
|  5. Assemble JSON/GeoJSON Artifacts                          |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                       STATIC ARTIFACTS                       |
|  Pre-compiled JSON, GeoJSON, and model metrics cached in     |
|  frontend/public/data/ for direct static loading             |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                      FRONTEND CLIENT                         |
|  Pure React + Vite dashboard displaying interactive maps,     |
|  priority queues, temporal matrices, and 12-hour forecasts   |
+--------------------------------------------------------------+
```

---

## Directory Structure

* **frontend/**: React dashboard code, custom CSS, asset configurations, and static JSON data.
* **backend/**: FastAPI python server providing endpoints for serving and generating live data.
* **ml/**: Python scripts containing the data cleaning, clustering, scoring, and forecasting modules.
* **doc/**: Reference guides including API specifications, engineering practices, and problem definitions.
* **local/**: Local documents and raw text problem descriptions.

---

## Run and Build Instructions

### Static Frontend Console

Vite compiles code to static HTML, CSS, and JS. You can build and run it locally:

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build static distribution package:
   ```bash
   npm run build
   ```

### Executing the ML Pipeline

To refresh the static JSON artifacts, execute the end-to-end Python pipeline from the project root:

1. Setup virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Run the pipeline:
   ```bash
   python ml/run_all.py
   ```
   *This script runs all ingestion, clustering, scoring, and forecasting stages sequentially, automatically writing updated JSON assets into `frontend/public/data/`.*
