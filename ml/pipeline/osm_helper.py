"""
OSM POI Caching & Retrieval Helper.
Provides real proximity calculations (Metro stations, Hospitals) for Bengaluru coordinates.
"""

import json
from pathlib import Path
import math
import requests

# Fallback Bengaluru POIs if Overpass API is offline or slow
FALLBACK_METRO = [
    {"name": "Majestic (Kempegowda)", "lat": 12.9756, "lon": 77.5728},
    {"name": "Indiranagar", "lat": 12.9784, "lon": 77.6408},
    {"name": "MG Road", "lat": 12.9743, "lon": 77.6068},
    {"name": "Cubbon Park", "lat": 12.9810, "lon": 77.5971},
    {"name": "Vidhana Soudha", "lat": 12.9798, "lon": 77.5907},
    {"name": "Trinity", "lat": 12.9730, "lon": 77.6169},
    {"name": "Halasuru", "lat": 12.9758, "lon": 77.6267},
    {"name": "Jayanagar", "lat": 12.9292, "lon": 77.5802},
    {"name": "Banashankari", "lat": 12.9156, "lon": 77.5736},
    {"name": "Yeshwanthpur", "lat": 13.0248, "lon": 77.5501},
    {"name": "Rajajinagar", "lat": 12.9792, "lon": 77.5562},
    {"name": "Malleshwaram", "lat": 13.0031, "lon": 77.5696},
    {"name": "Chickpet", "lat": 12.9680, "lon": 77.5738},
    {"name": "K R Market", "lat": 12.9602, "lon": 77.5736},
    {"name": "Whitefield", "lat": 12.9698, "lon": 77.7500},
    {"name": "Halasuru Bazaar", "lat": 12.9758, "lon": 77.6288},
    {"name": "Lalbagh", "lat": 12.9510, "lon": 77.5862},
    {"name": "Southend Circle", "lat": 12.9378, "lon": 77.5801},
    {"name": "J P Nagar", "lat": 12.9074, "lon": 77.5735},
]

FALLBACK_HOSPITALS = [
    {"name": "NIMHANS", "lat": 12.9430, "lon": 77.5985},
    {"name": "Fortis Hospital Bannerghatta", "lat": 12.8950, "lon": 77.5991},
    {"name": "Manipal Hospital HAL Road", "lat": 12.9592, "lon": 77.6477},
    {"name": "Bowring & Lady Curzon Hospital", "lat": 12.9839, "lon": 77.6015},
    {"name": "St. John's Medical College Hospital", "lat": 12.9333, "lon": 77.6244},
    {"name": "Victoria Hospital", "lat": 12.9634, "lon": 77.5719},
    {"name": "Mallya Hospital", "lat": 12.9696, "lon": 77.5947},
    {"name": "Narayana Health", "lat": 12.8130, "lon": 77.6930},
    {"name": "Apollo Hospitals Jayanagar", "lat": 12.9232, "lon": 77.5984},
    {"name": "HBS Hospital", "lat": 12.9972, "lon": 77.6185},
]

# Central Police Stations coordinate dictionary
POLICE_STATIONS = {
    "UPPARPET": {"lat": 12.9760, "lon": 77.5720},
    "SHIVAJINAGAR": {"lat": 12.9870, "lon": 77.6010},
    "MALLESHWARAM": {"lat": 12.9980, "lon": 77.5680},
    "JAYANAGAR": {"lat": 12.9280, "lon": 77.5810},
    "INDIRANAGAR": {"lat": 12.9750, "lon": 77.6380},
    "BANASHANKARI": {"lat": 12.9150, "lon": 77.5720},
    "YESHWANTHPUR": {"lat": 13.0230, "lon": 77.5490},
    "K R MARKET": {"lat": 12.9610, "lon": 77.5720},
    "CHICKPET": {"lat": 12.9680, "lon": 77.5738},
    "MAJESTIC": {"lat": 12.9756, "lon": 77.5728},
}


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two coordinates."""
    R = 6371000.0  # earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def get_osm_pois(cache_dir: Path):
    """Fetch POIs from Overpass or load from cache / fallback."""
    cache_path = cache_dir / "osm_cache.json"
    if cache_path.exists():
        try:
            with open(cache_path, "r") as f:
                return json.load(f)
        except Exception:
            pass

    # Attempt to query Overpass API
    query = """
    [out:json][timeout:30];
    (
      node["railway"="station"](12.7, 77.35, 13.4, 77.85);
      node["amenity"="hospital"](12.7, 77.35, 13.4, 77.85);
    );
    out body;
    """
    try:
        print("Querying Overpass API for Bengaluru POIs...")
        r = requests.post("https://overpass-api.de/api/interpreter", data={"data": query}, timeout=15)
        if r.status_code == 200:
            data = r.json()
            metros = []
            hospitals = []
            for element in data.get("elements", []):
                name = element.get("tags", {}).get("name", "Unknown POI")
                lat = element.get("lat")
                lon = element.get("lon")
                if not lat or not lon:
                    continue
                poi = {"name": name, "lat": lat, "lon": lon}
                if element.get("tags", {}).get("railway") == "station":
                    metros.append(poi)
                elif element.get("tags", {}).get("amenity") == "hospital":
                    hospitals.append(poi)
            
            # Save if we found a reasonable amount of data
            if len(metros) > 3 and len(hospitals) > 3:
                result = {"metros": metros, "hospitals": hospitals}
                cache_dir.mkdir(parents=True, exist_ok=True)
                with open(cache_path, "w") as f:
                    json.dump(result, f)
                return result
    except Exception as e:
        print(f"Overpass API query failed ({e}). Using local fallback assets.")

    # Return local fallbacks
    return {"metros": FALLBACK_METRO, "hospitals": FALLBACK_HOSPITALS}


def calculate_proximity_features(lat, lon, pois):
    """Compute proximity factors to metros, hospitals and nearest police station."""
    min_metro_dist = float("inf")
    nearest_metro_name = "None"
    for m in pois["metros"]:
        d = haversine_distance(lat, lon, m["lat"], m["lon"])
        if d < min_metro_dist:
            min_metro_dist = d
            nearest_metro_name = m["name"]

    min_hospital_dist = float("inf")
    nearest_hospital_name = "None"
    for h in pois["hospitals"]:
        d = haversine_distance(lat, lon, h["lat"], h["lon"])
        if d < min_hospital_dist:
            min_hospital_dist = d
            nearest_hospital_name = h["name"]

    # Calculate proximity factor:
    # 2.0 if hospital < 200m
    # 1.5 if metro < 200m
    # 1.3 if either is within 500m
    # 1.0 default
    if min_hospital_dist <= 200:
        proximity_factor = 2.0
    elif min_metro_dist <= 200:
        proximity_factor = 1.5
    elif min_hospital_dist <= 500 or min_metro_dist <= 500:
        proximity_factor = 1.3
    else:
        proximity_factor = 1.0

    return {
        "metro_dist_m": min_metro_dist,
        "metro_name": nearest_metro_name,
        "hospital_dist_m": min_hospital_dist,
        "hospital_name": nearest_hospital_name,
        "proximity_factor": proximity_factor
    }


def get_police_station_dist(lat, lon, station_name):
    """Compute travel time & distance from station centroid."""
    clean_name = str(station_name).upper().strip()
    station_coords = None
    for k, v in POLICE_STATIONS.items():
        if k in clean_name or clean_name in k:
            station_coords = v
            break

    if not station_coords:
        # Default to Majestic center if police station is not mapped
        station_coords = POLICE_STATIONS["MAJESTIC"]

    dist_m = haversine_distance(lat, lon, station_coords["lat"], station_coords["lon"])
    return dist_m
