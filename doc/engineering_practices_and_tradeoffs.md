# Engineering Practices and Architectural Trade-offs

This document outlines the software engineering principles, coding practices, and technical trade-offs chosen during the development of NammaFLOW.

---

## Engineering Practices

### 1. Modular Data Pipelines
The machine learning codebase is split into five isolated pipeline stages: Ingestion/Cleaning, Spatial Clustering, Scoring, Load Forecasting, and Artifact Assembly.
* **Separation of Concerns**: Each stage is a standalone module with input/output validation.
* **Processed State Cache**: Intermediate data states are written as parquet tables under `ml/data/processed/` so debugging a scoring issue does not require re-clustering the entire coordinate space.

### 2. Configuration Abstraction
All parameters, formulas weights, geographic bounds, and file paths are centralized in [config.py](file:///c:/Users/SSN/OneDrive%20-%20Shiv%20Nadar%20University%20-%20Chennai/Desktop/parksight_v3/parksight/ml/config.py). 
* Changing the vehicle footprint weights or fuel cost coefficients modifies downstream Congestion Impact Index (CII) and Economic Loss metrics automatically without needing to rewrite scoring scripts.

### 3. Frontend-Backend Decoupling
The frontend communicates via a standardized JSON interface. This strict separation allowed the frontend to transition from a dynamic API endpoint client to a 100% static JSON asset-driven console with minimal code changes.

---

## Architectural Trade-offs

### 1. Static Artifact Serving vs Live Spatial Database
* **Chosen Approach**: Pre-compiling all spatiotemporal matrices, GeoJSON layers, and 12-hour forecasts into static JSON files served straight from the browser (e.g. Vercel static hosting).
* **Pros**:
  * **Cost and Server Management**: Zero active database server cost. No PostGIS, PostgreSQL, or active python servers to monitor.
  * **Visual Performance**: Instant dashboard rendering. GeoJSON layers load directly from Vercel's CDN, eliminating API query roundtrips.
* **Cons**:
  * **Static Data Latency**: Live raw e-challan data cannot be ingested and retrained dynamically on the fly. Retraining requires running the Python pipeline offline and committing/pushing the new JSON outputs to GitHub.

---

### 2. LightGBM vs HistGradientBoosting Regressor
* **Chosen Approach**: Dynamically checking for `lightgbm` import capabilities at runtime. If present, the pipeline fits a LightGBM model. If missing, it automatically falls back to scikit-learn's native `HistGradientBoostingRegressor`.
* **Pros**:
  * **Installation Safety**: Prevents installation errors on demo machines where C++ build tools or specific LightGBM compile libraries are missing.
* **Cons**:
  * **Model Divergence**: Minor prediction variances may occur between the two algorithms, though both are configured to use identical loss targets (Poisson) and hyperparameters.

---

### 3. Geohash Precision Selection (Geohash-6 vs Geohash-7)
* **Chosen Approach**: Using Geohash-6 (approx. 1.2km grid cells) for model forecasting and Geohash-7 (approx. 150m grid cells) for fine-grained street density mapping.
* **Pros**:
  * **Sparse Data Management**: Forecasting at Geohash-7 yields highly sparse timelines (many hours with zero tickets), causing regression models to overfit or underpredict. Geohash-6 aggregates enough violation counts per grid cell to learn temporal patterns.
  * **High Definition Viz**: Mapping density at Geohash-7 isolates exact street-level blockages instead of painting massive 1.2km square blocks over the UI.

---

### 4. Custom CSS Variables vs Pure Tailwind Utilities for Theming
* **Chosen Approach**: Declaring global styling variables in `index.css` inside `:root` and `.dark` selectors, and applying them using standard CSS `var(...)` properties for custom components (like SVG charts and MapLibre canvas).
* **Pros**:
  * **Consistent runtime variables**: Lets non-Tailwind elements (like MapLibre vector layers and custom SVG elements) sync their borders, fills, and colors dynamically when the theme state toggles, keeping styling clean.
