# NammaFLOW Serving API

This directory contains the FastAPI python backend for NammaFLOW. During development, this server provides API endpoints to fetch pipeline results, handles raw e-challan CSV file uploads, fits forecasting models, and serves compiled static assets.

---

## Endpoint Specifications

* **GET /api/health**: Returns server status and lists loaded JSON artifacts.
* **GET /api/stats**: Returns aggregate citywide parking metrics.
* **GET /api/hotspots**: Returns GeoJSON FeatureCollection of calculated parking hotspots.
* **GET /api/hotspot/{id}**: Returns Feature details for a specific hotspot ID.
* **GET /api/heatmap**: Returns full density coordinate grid.
* **GET /api/priority-queue**: Returns priority queue list sorted worst-first.
* **GET /api/forecast**: Returns weekly spatiotemporal forecast predictions.
* **GET /api/temporal**: Returns weekly heat matrices and peak hourly windows.
* **GET /api/dark-zones**: Returns calculated unenforced risk zones.
* **GET /api/forecast-12h**: Runs inference on the pre-trained operational model to forecast load for the next shift.
* **POST /api/forecast-12h/upload**: Recieves raw CSV file, triggers model retraining, and returns predictions (currently disabled for static Vercel build).

---

## Technical Features

* **Warm Caching**: Loads all JSON and GeoJSON files from disk on application startup to ensure instant response times.
* **Startup Retraining**: Checks for the existence of the operational model `forecast_model_12h.pkl` on startup. If missing, it automatically trains the LightGBM/GradientBoosting model on the default dataset once and caches it.
* **CORS Middleware**: Allows requests from the local Vite development server on port 5173.

---

## Running the Server

1. **Activate Environment**:
   ```bash
   # In root directory
   .venv\Scripts\activate
   ```
2. **Start FastAPI**:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
3. **Interactive Documentation**:
   * Interactive API docs: http://localhost:8000/docs
   * Raw JSON schema: http://localhost:8000/openapi.json
