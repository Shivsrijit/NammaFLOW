# NammaFLOW Backend API Reference

This document details the FastAPI REST API specifications used during local development. By default, the backend server runs on port 8000.

---

## Endpoint Details

### GET /api/health
Returns the operational status of the server and lists all pre-compiled spatiotemporal JSON artifacts found in the caching folder.

* **Request Parameters**: None
* **Sample Response**:
  ```json
  {
    "status": "ok",
    "artifacts": [
      "dark_zones.json",
      "forecast.json",
      "heatmap.json",
      "methodology.json",
      "priority_queue.json",
      "stats.json",
      "temporal.json",
      "hotspots.geojson"
    ]
  }
  ```

---

### GET /api/stats
Returns aggregate citywide statistics compiled from the e-challan violations dataset.

* **Request Parameters**: None
* **Sample Response**:
  ```json
  {
    "total_violations": 20456,
    "n_hotspots": 45,
    "n_stations": 12,
    "worst_zone": "Ulsoor Gate Traffic",
    "worst_score": 92.4,
    "worst_cii": 88.1,
    "total_economic_loss_lakhs": 24.5,
    "peak_window": "Mon 12:00",
    "heavy_share": 0.125,
    "named_junction_share": 0.85
  }
  ```

---

### GET /api/hotspots
Returns a GeoJSON FeatureCollection of all calculated illegal parking hotspots.

* **Request Parameters**: None
* **Sample Response**:
  ```json
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [77.5946, 12.9716]
        },
        "properties": {
          "id": 1,
          "rank": 1,
          "score": 95.2,
          "cii": 91.5,
          "economic_loss_inr": 4500.0,
          "lanes": 2,
          "station": "Cubbon Park Traffic",
          "dominant_vehicle": "CAR",
          "reason": "High density blockage of commercial cars near hospital exit"
        }
      }
    ]
  }
  ```

---

### GET /api/hotspot/{id}
Returns detailed spatial and metadata metrics for a single hotspot cluster ID.

* **Request Parameters**:
  * `id` (path, required): The hotspot integer ID.
* **Sample Response**:
  ```json
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "properties": {
      "id": 1,
      "rank": 1,
      "score": 95.2,
      "cii": 91.5,
      "economic_loss_inr": 4500.0,
      "lanes": 2,
      "metro_name": "Dr. B.R. Ambedkar Station",
      "metro_dist_m": 120.5,
      "hospital_name": "Bowring Hospital",
      "hospital_dist_m": 450.2,
      "count": 345,
      "adj_count": 310.2,
      "hour_hist": [12, 14, 25, 45, 60, 30, 20, 10],
      "dow_hist": [50, 45, 55, 60, 70, 30, 35]
    }
  }
  ```

---

### GET /api/priority-queue
Returns the list of hotspots sorted by priority score, indicating where proactive patrols should be dispatched.

* **Request Parameters**:
  * `limit` (query, optional, default=50): Maximum number of hotspots to return.
* **Sample Response**:
  ```json
  [
    {
      "rank": 1,
      "id": 12,
      "station": "Kalyan Nagar Traffic",
      "lat": 13.0245,
      "lon": 77.6412,
      "score": 94.8,
      "cii": 91.0,
      "economic_loss_inr": 4120.0,
      "reason": "Narrow 2-lane roadway near Metro exit showing high heavy-vehicle density"
    }
  ]
  ```

---

### GET /api/forecast-12h
Loads the pre-trained forecasting model and cached feature tables to perform inference for the next operational shift.

* **Request Parameters**: None
* **Sample Response**:
  ```json
  {
    "total_12h": 269.1,
    "p10": 198.4,
    "p90": 289.7,
    "cv_r2": 0.8575,
    "engine": "LightGBM",
    "trained_through": "2024-04-08 11:00:00",
    "series": [
      {
        "h": "+1h",
        "at": "2024-04-08 12:00:00",
        "at_label": "Mon 12:00",
        "pred": 134.6,
        "lo": 99.3,
        "hi": 145.0
      }
    ]
  }
  ```

---

### POST /api/forecast-12h/upload
Receives a raw CSV file, triggers model retraining, and outputs updated predictions.

* **Status**: Disabled for production (static Vercel builds return `501 NotImplemented`).
* **Request Header**: `Content-Type: multipart/form-data`
* **Response**:
  * Status code: `501`
  * Body:
    ```json
    {
      "detail": "Live retraining via CSV upload is currently disabled (Coming Soon)."
    }
    ```
