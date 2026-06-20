# NammaFLOW System Architecture

This document describes the high-level architecture, pipeline flow, and data serving layers of the NammaFLOW traffic enforcement intelligence platform.

---

## Architecture Flow Overview

```mermaid
flowchart TB
    %% Styling definitions
    classDef ingest fill:#fef3c7,stroke:#d97706,stroke-width:1px,color:#92400e
    classDef pipeline fill:#eff6ff,stroke:#2563eb,stroke-width:1px,color:#1e40af
    classDef artifact fill:#ecfdf5,stroke:#059669,stroke-width:1px,color:#065f46
    classDef backend fill:#faf5ff,stroke:#7c3aed,stroke-width:1px,color:#5b21b6
    classDef frontend fill:#fff5f5,stroke:#dc2626,stroke-width:1px,color:#991b1b
    classDef user fill:#f8fafc,stroke:#475569,stroke-width:1px,color:#1e293b

    %% Nodes structure
    subgraph INGEST ["1. Data Ingestion & Inputs"]
        A1["Raw Municipal Logs (CSV)"]:::ingest
        A2["OpenStreetMap Network Data (OSM)"]:::ingest
    end

    subgraph PIPELINE ["2. Offline Machine Learning & Scoring Pipeline (ml/run_all.py)"]
        direction LR
        B1["01_clean.py<br>(IST Timezone & Validation Filter)"]:::pipeline
        B2["02_cluster.py<br>(Geo-clustering of violations)"]:::pipeline
        B3["03_score.py<br>(CII Score & Priority calculation)"]:::pipeline
        B4["04_forecast.py<br>(Train LightGBM forecast regressor)"]:::pipeline
        B5["05_artifacts.py<br>(JSON/GeoJSON exports)"]:::pipeline
        
        B1 --> B2 --> B3 --> B4 --> B5
    end

    subgraph ARTIFACTS ["3. Static Telemetry & Model Cache (ml/artifacts/)"]
        direction TB
        C1["forecast_model.pkl<br>(Trained LightGBM regressor)"]:::artifact
        C2["Data Artifacts<br>(stats.json, hotspots.geojson, heatmap.json, etc.)"]:::artifact
    end

    subgraph SERVING ["4. Serving Layer (backend/main.py)"]
        D1["FastAPI Server"]:::backend
        D2["FastAPI In-Memory Cache (_CACHE)"]:::backend
        
        D1 <--> D2
    end

    subgraph PRESENTATION ["5. Presentation Layer (frontend/src/)"]
        direction TB
        E1["Vite + React Dashboard Application"]:::frontend
        E2["MapLibre GL Canvas<br>(Interactive Maps & Heatmaps)"]:::frontend
        E3["Three.js Background Canvas<br>(3D Road Blueprint & Flowing Traffic)"]:::frontend
        E4["Stateful Sidebar Menu<br>(Operations Queue, Forecast Cards)"]:::frontend
        
        E1 --> E2
        E1 --> E3
        E1 --> E4
    end

    subgraph CLIENT ["6. End User Interface"]
        F1["Patrol Dispatchers / Traffic Police Coordinator"]:::user
    end

    %% Connections
    A1 --> B1
    A2 --> B3
    B4 --> C1
    B5 --> C2
    C2 --> D2
    D1 -- HTTP API Responses --> E1
    E1 <--> F1

    %% Layout style
    linkStyle default interpolate basis
```

---

## 1. Data Ingestion & Inputs
* **Raw Municipal Logs**: Historical geo-logged parking and traffic violation records containing timestamps, locations, and category attributes.
* **OpenStreetMap (OSM)**: Extracted street segment layouts, lane numbers, bus stops, and localized traffic restrictions. Used by `osm_helper.py` to calculate lane constraints and bottleneck points.

## 2. Preprocessing & ML Pipeline (`ml/`)
The pipeline runs sequentially via `ml/run_all.py` to compute and clean the modeling data:
* **`01_clean.py`**: Converts raw UTC coordinates and timestamps into Asia/Kolkata (IST), cleans invalid fields, and filters for approved, core validation records.
* **`02_cluster.py`**: Groups scattered violation coordinates into distinct spatial hotspot clusters.
* **`03_score.py`**: Calculates the **Congestion Impact Index (CII)** using lane layouts, vehicle footprint severity factors, and persistence rates over time. Also normalizes values based on historical officer patrol coverage to eliminate presence bias.
* **`04_forecast.py`**: Builds weekly (168-hour) forecasts using a trained **LightGBM** regressor, exportable to a cached serialization file (`forecast_model.pkl`).
* **`05_artifacts.py`**: Generates and formats JSON and GeoJSON structures representing priority leaderboards, heatmaps, and dark zones.

## 3. Serving Layer (`backend/`)
* Built using the **FastAPI** ASGI framework in Python.
* Loads all data artifacts into an in-memory cache (`_CACHE`) at server startup.
* Serves static JSON data at endpoints like `/api/stats`, `/api/hotspots`, `/api/priority-queue`, `/api/forecast`, `/api/dark-zones`, and `/api/temporal`.

## 4. Presentation Layer (`frontend/`)
* Built with **Vite, React, and Tailwind CSS**.
* **MapLibre GL**: Visualizes city heatmaps, interactive hotspot markers, and predicted grid cells client-side.
* **Three.js**: Powers the landing page background canvas, rendering smooth, faded 3D road blueprints and glowing vector traffic flows.
* **Stateful Sidebar Menu**: Displays dispatch operations lists, predictive forecast cards, and coverage gaps. Can be collapsed for a full-screen map experience.
