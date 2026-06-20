# NammaFLOW: Next-Gen Municipal Traffic Enforcement & Proactive Dispatch

NammaFLOW is an enterprise-grade, data-driven spatiotemporal parking enforcement and proactive patrol dispatch platform. By bridging the gap between passive historical ticket logging and active street-level road topology, NammaFLOW transforms traditional traffic enforcement into a predictive, flow-optimizing operation.

---

## Product Launch Workflow

https://excalidraw.com/#json=-tNNe9_PtN4ayGQOSFezy,cXUiqIc1bC4Rn-AGi9yStw

---

## 1. The Solution: Shifting to Proactive Enforcement

Traditional municipal parking and traffic enforcement suffers from two systemic flaws:
1. **Patrol Presence Bias**: Historical violation logs are heavily skewed. Officers only record tickets where they are already patrolling, creating a feedback loop that leaves highly congested but unpatrolled sectors completely unmonitored.
2. **Lack of Traffic Flow Integration**: Traditional ticketing systems treat a double-parked vehicle on a wide avenue identically to one choking a narrow, single-lane arterial road, ignoring the real economic and temporal costs of traffic delays.

**NammaFLOW solves this by transforming enforcement into a predictive dispatch loop:**
* **Corrects historical patrol bias** using statistical normalization against officer density.
* **Calculates the real-time Congestion Impact Index (CII)** based on vehicle size, lane layout, and proximity to critical hubs.
* **Forecasts violation peaks** up to 168 hours in advance using gradient-boosted decision trees.
* **Guides officers proactively** to critical bottlenecks to clear blockages *before* severe gridlock sets in.
* **Mitigates patrol route stagnation** by pointing officers to underserved sectors, ensuring comprehensive urban coverage.
* **Reduces control room cognitive load** through automatic prioritization, giving operators clear routing targets.

---

## 2. Core Product Features

Designed for municipal command centers and dispatch operators, the NammaFLOW console presents a clean, unified dashboard with several key capabilities:

* **Patrol Priority Queue (Active Dispatch Leaderboard)**: Ranks active hotspots by priority. It provides dispatch operators with the estimated travel time for patrol officers, the active congestion triggers (e.g. narrow single-lane choke points or hospital zones), and the real-time financial drain.
* **Predictive Congestion Forecast**: Integrates a temporal autoplay slider to scrub through the 168 hours of the weekly horizon, predicting future violation spikes in specific high-precision grid cells.
* **Enforcement Coverage Gaps (Unenforced Dark Zones)**: Automatically maps critical municipal transit exits and emergency medical corridors that have high traffic volumes but zero violation records, highlighting areas where patrols are urgently needed.
* **Interactive GIS Map & Density Heatmap**: Built on MapLibre GL to display hotspot clusters, spillover neighborhood congestion ripples (visualizing downstream backups), and predicted grid risks.
* **Premium 3D Blueprint Background**: A WebGL Three.js background canvas rendering street lanes, dashed centerlines, and faded glowing particle flows moving at speeds matching traffic velocity.
* **Collapsible Command Panel**: Features a collapsible left navigation panel and drawer sliders to give operators maximum map real estate during high-intensity operations.
* **Micro-interaction Feedback**: Implements fluid, GPU-accelerated transition animations built on Framer Motion to provide real-time UI tactile feedback.
* **Unified Analytical Charts**: Integrates interactive SVGs rendering weekly trend timelines, category lists, and vehicle footprint charts.

---

## 3. The Methodology: Math, Normalization & Models

NammaFLOW processes raw geospatial telemetry through five pipeline stages:

### A. Timezone Normalization
All incoming logs are parsed and converted to Asia/Kolkata (IST). This aligns violations with the city's actual morning, midday, evening, and night commute cycles rather than raw UTC timestamps.
* This ensures that commute-induced traffic spikes align exactly with real-world officer shift patterns.
* It prevents temporal data drift that typically degrades the predictive performance of timezone-naive algorithms.

### B. Patrol Coverage Bias Correction
To eliminate patrol presence bias, raw violation frequencies are normalized against historical officer counts logged in that zone. The adjusted violation weight is calculated as:

$$Count_{\text{adjusted}} = \frac{Count_{\text{raw}}}{\sqrt{\text{Officers}_{\text{active}}}}$$

* By applying a square-root penalty to heavily patrolled areas, the pipeline neutralizes historical route bias.
* This exposes quiet, unpatrolled sectors where violations occur frequently but are rarely logged.

> [!IMPORTANT]
> **295 out of 298 hotspots changed rank** after applying this correction. This proves that raw ticket counts measure officer presence rather than the actual severity of illegal parking, making bias correction crucial.

### C. Congestion Impact Index (CII)
The severity of each hotspot is scored from 0 to 100. It measures the physical road blockages by evaluating:

$$CII_{\text{raw}} = Footprint_{\text{avg}} \times Lanes \times Density_{\text{adjusted}} \times Persistence_{\text{raw}} \times Proximity_{\text{POI}}$$

Where:
* **$Footprint_{\text{avg}}$**: Maps the physical space occupied by the violating vehicle types (e.g. buses/trucks = 2.5m, cars = 0.8m, scooters = 0.4m).
* **$Lanes$**: Street profile lane count (Highways = 3 lanes, Avenues = 2 lanes, Side-streets = 1 lane).
* **$Density_{\text{adjusted}}$**: Normalized log-scale adjusted violation count.
* **$Persistence_{\text{raw}}$**: The duration a violation blocks a lane, combining the active days and the 24-hour daily entropy spread.
* **$Proximity_{\text{POI}}$**: An impact multiplier representing distance to key landmarks (Hospitals = 2.0x weight, Metro Stations = 1.5x weight).
* **Scale Consolidation**: Normalizes raw values into a standardized linear range from 0 to 100 to ensure intuitive ranking.
* **Contextual Escalation**: Multiplies the score exponentially on narrow single-lane roads where blockages completely halt traffic flow.

### D. Machine Learning Forecasting
* **Algorithm**: LightGBM (Gradient Boosted Decision Trees) regressor.
* **Accuracy**: Achieves an $R^2$ validation score of **`0.8065`** with a Mean Absolute Error (MAE) of **`0.113`**.
* **Features**: Uses spatial Geohash encoding, combined with temporal cyclic transformations (sine and cosine encodings of hour and day of week) to project violation density over a weekly 168-hour horizon.
* **Cyclical Encoding**: Captures recurring weekly and daily congestion rhythms, allowing the model to adapt to rush hours.
* **Model Serialization**: Compiles and serializes the model structure into a lightweight cached pipeline artifact for sub-millisecond offline inferences.

---

## 4. Technical Innovation

NammaFLOW introduces two innovations that set it apart from standard municipal dashboards:

### 1. OpenStreetMap Road Profiling
Instead of treating all coordinate points uniformly, the system integrates with OpenStreetMap to map local lane widths. By intersecting spatial coordinates, it identifies active bus corridors, single-lane roads, and emergency access pathways, dynamically increasing the severity score for violations blocking these narrow corridors.
* Performs offline network parsing using local data caches to avoid external API dependencies during scoring runs.
* Integrates directly with land-use nodes to differentiate residential alleys from high-traffic commercial zones.

### 2. The Economic Loss Matrix
To justify dispatch budgets, abstract traffic delays are converted into real-world monetary damage per hour (in INR, ₹). The formulation is calculated as:

$$\text{Economic Loss} = \text{Traffic Volume} \times \left( \text{Idle Fuel Burn Cost} + \text{Commuter Delay Wage Cost} \right)$$

* **$\text{Traffic Volume}$**: Derived as $Lanes \times 1,200$ (average baseline hourly capacity).
* **$\text{Idle Fuel Burn Cost}$**: Calculated from idle fuel consumption (0.6 L/hr) times Bengaluru fuel price (₹102.5/L).
* **$\text{Commuter Delay Wage Cost}$**: Based on average commuter wages (₹150.0/hr).
* **$\text{Delay Duration}$**: Scaled dynamically up to 6 minutes (0.08 hrs) based on the zone's active CII score.
* **Tunable Parameters**: Allows municipal admins to edit local fuel costs and wage rates to match specific cities.
* **Financial Justification**: Provides clean ROI summaries showing the cost savings achieved by deploying a patrol unit to clear a bottleneck.

---

## 5. Technology Stack

NammaFLOW utilizes a modern, unified technology stack designed for low-latency operations and high visual polish:

| Layer | Component | Core Technologies | Primary Role |
| :--- | :--- | :--- | :--- |
| **Data Engine & ML** | Python Pipeline | `pandas`, `NumPy`, `LightGBM`, `scikit-learn`, `Shapely`, `GeoPandas` | Data cleaning, spatial clustering, OpenStreetMap scraping, and model training. |
| **API Backend** | FastAPI | `FastAPI`, `Uvicorn`, In-Memory caching | Loads all static data artifacts into memory at startup to serve API requests in under 5ms. |
| **Interactive UI** | React + Vite | `React`, `Tailwind CSS`, `Framer Motion`, `Lenis` | Responsive layout, sidebar menu toggles, and smooth dashboard transitions. |
| **GIS Mapping** | MapLibre GL | `maplibre-gl` | Client-side vector maps rendering hotspots, routing corridors, and heatmaps. |
| **3D Rendering** | Three.js WebGL | `three`, `r3f` (React Three Fiber) | WebGL rendering of the faded blueprint road structure and animated traffic flow. |

* **Zero-Database Overhead**: The backend utilizes dynamic caching to load pre-calculated spatial structures directly from Python pipelines.
* **Aesthetic Consistency**: Employs a custom styling system using CSS tokens to render glassmorphism panels, dark mode layouts, and high-visibility status indicators.

---

## 6. Impact & Global Scalability

### Municipal & Operational Impact
* **Reduces Emergency Response Delay**: Prioritizing patrols near emergency routes keeps hospital paths clear, reducing critical ambulance delay times.
* **Optimized Resource Deployment**: Prevents police officers from performing arbitrary patrols by routing them directly to active and predicted bottlenecks.
* **Justifiable Enforcement Budgets**: Quantifying delays in Rupees (e.g., ₹20,000/hr in losses) gives city councils clear, financial returns on investment for enforcement resources.
* **Long-Term Policy Validation**: Enables urban planners to analyze historical congestion graphs to verify the impact of new zoning laws or road widening projects.
* **Public Transit Prioritization**: Minimizes delays along BMTC bus corridors by keeping public transit lanes clear of illegally parked vehicles.

### Universal City-Agnostic Design
NammaFLOW is designed to scale to any city globally. It partitions geospatial coordinates into the hierarchical **Geohash-6** grid standard (approx. $1.2\text{km} \times 0.6\text{km}$ cells). This standard makes it coordinate-system agnostic. 
* By indexing space globally through Geohashes, the platform does not rely on local precinct boundary definitions.
* Spatial indexing remains extremely lightweight, scaling to millions of records without requiring spatial joins.

To launch the system in a new city (e.g., London, New York, Mumbai), operators only need to follow three steps:
1. **Swap Input Files**: Replace the raw violation dataset and extract the city's OpenStreetMap segment layout.
2. **Re-run Data Pipeline**: Execute the data processing engine to regenerate the spatial clusters, re-score the locations, and train the forecasting model.
3. **Launch Servicers**: Spin up the backend and frontend servers to serve the new city's live dispatch console.
