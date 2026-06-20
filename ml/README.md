# NammaFLOW ML and Ingestion Pipeline

This directory contains the data cleaning, spatial clustering, economic scoring, forecasting models, and artifact packaging modules for NammaFLOW. The pipeline processes raw e-challan traffic violation records to extract spatial congestion patterns.

---

## Ingestion Pipeline Stages

The end-to-end pipeline is structured into five distinct Python stages inside `pipeline/`, executed sequentially by [run_all.py](file:///c:/Users/SSN/OneDrive%20-%20Shiv%20Nadar%20University%20-%20Chennai/Desktop/parksight_v3/parksight/ml/run_all.py):

### Stage 01: Data Cleaning (01_clean.py)
* Normalizes raw CSV headers and handles missing fields.
* Trims coordinate inputs to valid geographic bounds around Bengaluru.
* Localizes transaction timestamps from UTC to Asia/Kolkata naive time (IST).
* Formats vehicle categories into standard types (Two-Wheelers, Cars, LGVs, Buses, etc.).

### Stage 02: Spatial Hotspot Clustering (02_cluster.py)
* Performs density-based spatial clustering of applications with noise (HDBSCAN) on coordinates.
* Filters out spatial noise and isolates concentrated violation clusters (hotspots).
* Compiles temporal profiles (hourly and day-of-week distributions) for each hotspot.

### Stage 03: Congestion Scoring and Gap Detection (03_score.py)
* Queries Metro exits, hospitals, and road lane profiles from OpenStreetMap Overpass API (with local fallback).
* Calculates the Congestion Impact Index (CII) based on vehicle footprint, road lanes, density, persistence, and landmark proximity.
* Implements an enforcement-bias correction model using officer headcount distributions to normalize raw ticket counts.
* Computes the Economic Loss Matrix (in Rupees per hour) based on fuel wastage and commuter time delays.
* Scans for high-risk transit regions that have zero recorded enforcement in the dataset to label Dark Zones.

### Stage 04: Spatiotemporal Forecasting (04_forecast.py)
* Fits regression models to forecast next-week hourly loads.
* Blends a seasonal history profile model (70% weight) with a Gradient Boosting Regressor (30% weight) to generate predictions.
* Saves the resulting model matrices and cross-validation parameters.

### Stage 05: Artifact Assembly (05_artifacts.py)
* Gathers all calculations, matrices, coordinates, and methodology stats.
* Formats and packages output structures into compressed static JSON/GeoJSON files.
* Automatically syncs these files to `frontend/public/data/` for static server rendering.

---

## Tunable Configurations (config.py)

All settings, parameters, and coordinates bounds are centralized in [config.py](file:///c:/Users/SSN/OneDrive%20-%20Shiv%20Nadar%20University%20-%20Chennai/Desktop/parksight_v3/parksight/ml/config.py):

* **Geographic Bounds**: Sets latitude (12.70 to 13.40) and longitude (77.35 to 77.85) limits.
* **Geohash Precision**: Geohash-6 (coarse grid, approx 1.2km) for forecasting, Geohash-7 (fine grid, approx 150m) for street-level density mapping.
* **Economic Coefficients**: Fuel price (102.5 INR/L), average commuter wage (150 INR/hr), and idle burn rate (0.6 L/hr) for Bengaluru.
* **Vehicle Footprints**: Assigns severity weights to different vehicle categories (e.g. Buses have a footprint of 1.0, Motorcycles have 0.25) to scale CII score calculations.

---

## How to Execute the Pipeline

1. **Activate virtual environment and install packages**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Place Raw Data**:
   Ensure your raw dataset CSV file is placed at `ml/data/raw/jan_to_may_police_violation_anonymized791b166.csv`.
3. **Run Pipeline**:
   ```bash
   python ml/run_all.py
   ```
   *To run on a different raw file path, use the `--raw` argument:*
   ```bash
   python ml/run_all.py --raw path/to/file.csv
   ```
