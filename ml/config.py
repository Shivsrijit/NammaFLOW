"""
Central configuration for the NammaFLOW pipeline.

Tunable parameters are centralized here: file paths, geographic boundaries,
geohash precision levels, data filters, and impact scoring weights.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "artifacts"

# Drop the dataset here. If your filename differs, change RAW_CSV_NAME only.
RAW_CSV_NAME = "jan_to_may_police_violation_anonymized791b166.csv"
RAW_CSV = DATA_RAW / RAW_CSV_NAME

# ---------------------------------------------------------------------------
# Economic and Operational Parameters for Bengaluru
# ---------------------------------------------------------------------------
FUEL_COST_INR = 102.5       # Cost of fuel per liter in Bengaluru
AVG_HOURLY_WAGE_INR = 150.0 # Average commuter hourly wage
IDLE_FUEL_BURN_L_HR = 0.6   # Average idle fuel burn rate (liters/hour)
TRAFFIC_VOLUME_MULTIPLIER = 1200 # Average baseline hourly traffic volume index
PATROL_SPEED_KMH = 20.0     # Average patrol speed through traffic (km/h)
POI_RADIUS_M = 200          # Proximity threshold for transit exits, hospitals, schools


# The cleaned table every later stage reads from.
CLEANED = DATA_PROCESSED / "cleaned"  # extension added by the io helper

# ---------------------------------------------------------------------------
# Geographic sanity bounds (Bengaluru). Rows outside this box are dropped.
# Slightly padded around the observed data extent.
# ---------------------------------------------------------------------------
LAT_MIN, LAT_MAX = 12.70, 13.40
LON_MIN, LON_MAX = 77.35, 77.85

# ---------------------------------------------------------------------------
# Geohash precision
#   6 ~= 1.2 km cell  -> used for forecasting (enough events per cell to learn)
#   7 ~= 150 m cell   -> used for the street-level density surface
# ---------------------------------------------------------------------------
GEOHASH_COARSE = 6
GEOHASH_FINE = 7

# ---------------------------------------------------------------------------
# Cleaning options
# ---------------------------------------------------------------------------
# Keep only confirmed-real violations as the analytical core. The full set
# (including unvalidated / rejected) is still inspected in the sanity report.
KEEP_ONLY_APPROVED = True

# Columns that are almost entirely empty in this dataset and carry no signal.
DROP_COLUMNS = [
    "description",
    "closed_datetime",
    "action_taken_timestamp",
    "data_sent_to_scita_timestamp",
]

# Dayparts for temporal slicing (start hour inclusive -> label).
# 0-6 night, 6-11 morning, 11-16 midday, 16-21 evening, 21-24 night.
def daypart(hour: int) -> str:
    if 6 <= hour < 11:
        return "morning"
    if 11 <= hour < 16:
        return "midday"
    if 16 <= hour < 21:
        return "evening"
    return "night"

# ---------------------------------------------------------------------------
# Scoring weights used to calculate the Congestion Impact Index (CII).
# Vehicle severity reflects how much a parked vehicle of this type
# obstructs traffic flow. Tune freely.
# ---------------------------------------------------------------------------
VEHICLE_SEVERITY = {
    "BUS (BMTC/KSRTC)": 1.0,
    "PRIVATE BUS": 1.0,
    "TANKER": 1.0,
    "LGV": 0.85,
    "GOODS AUTO": 0.7,
    "VAN": 0.7,
    "MAXI-CAB": 0.65,
    "CAR": 0.5,
    "PASSENGER AUTO": 0.45,
    "MOTOR CYCLE": 0.25,
    "SCOOTER": 0.2,
    "MOPED": 0.2,
}
DEFAULT_SEVERITY = 0.4

# Component weights for the Congestion Impact Index (CII) calculation (must sum to 1.0).
IMPACT_WEIGHTS = {
    "density": 0.35,
    "severity": 0.20,
    "persistence": 0.20,
    "road_poi": 0.15,      # Proximity to Metro exits, hospitals, and narrow roads.
    "coverage_adj": 0.10,  # enforcement-bias correction
}
