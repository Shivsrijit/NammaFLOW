# NammaFLOW — Parking Enforcement Intelligence

**NammaFLOW** is an AI-driven parking intelligence platform designed for the Bengaluru Traffic Police e-challan dataset. 

It identifies illegal parking hotspots, quantifies their traffic flow impact using a real **Congestion Impact Index (CII)**, estimates hourly **Economic Loss (in Rupees)**, detects **Unenforced Dark Zones**, and forecasts peak violation times to recommend proactive patrol routing.

The project is structured into three clean top-level directories:
* `frontend/`: React + Vite + Tailwind CSS dashboard with dynamic MapLibre routing and Three.js 3D animations.
* `backend/`: FastAPI application serving pre-computed pipeline artifacts and predictions.
* `ml/`: The Python data processing and ML pipeline, config, and dataset assets.

---

## 🚀 Quickstart Guide (Run Locally)

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**

---

### Step 1: Install Python Dependencies & Restructure
In the project root, activate your virtual environment and install the required modules:
```bash
python -m venv .venv
# On Windows (Powershell):
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

---

### Step 2: Ingest the Data & Run the Pipeline
Ensure the raw dataset is dropped into `ml/data/raw/jan_to_may_police_violation_anonymized791b166.csv`. 

Then, run the entire ML & scoring pipeline end-to-end:
```bash
python ml/run_all.py
```
This script will sequentially:
1. Ingest & clean the e-challan violations, parsing local timestamps (IST).
2. Execute **HDBSCAN Clustering** to discover hotspots and generate the spatial density grid.
3. Query the **OSM Overpass API** (with local cache fallback) to locate metro stations, hospitals, and road lane profiles; calculate **CII**, **Economic Loss**, and **Dark Zones**.
4. Fit the **LightGBM / sklearn Gradient Boosting** spatiotemporal models to forecast violation loads.
5. Compile and sync JSON artifacts to `ml/artifacts/` and the frontend directory.

---

### Step 3: Start the Backend API
Run the FastAPI application from the project root:
```bash
uvicorn backend.main:app --reload --port 8000
```
* Interactive API docs: http://localhost:8000/docs
* Health Check: http://localhost:8000/api/health

---

### Step 4: Start the Frontend App
Navigate to the `frontend` folder, install the packages, and launch Vite:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 to interact with the command center dashboard!

---

## 💡 Key Features Mapped on the UI
1. **Interactive 3D Traffic Hero**: A custom WebGL Three.js particle animation rendering traffic gridlock waves and pulsing hotspots in real-time.
2. **CII & Priority Scorecard**: Shows exactly why a zone is prioritized based on vehicle sizes, road width constraints, and landmark proximity.
3. **Economic Loss indicators**: Formulates the monetary drain index in Rupees (₹) lost per hour from fuel wastage and commuter delay wages.
4. **Spillover Congestion Ripples**: BFS-based neighboring overlays that animate outward on the map when a hotspot is clicked, visualizing backup corridors.
5. **Unenforced Dark Zones**: Highlights locations with high traffic POIs (hospitals, metro exits) but zero recorded violation history in the dataset.
6. **Precinct Route Dispatch**: Filters map coordinates and draws optimized patrol routes when you select a specific police station precinct.
7. **Autoplay Temporal Forecast**: Slide the timeline slider or press play to watch predicted violation concentrations shift across the 168 hours of the week.
