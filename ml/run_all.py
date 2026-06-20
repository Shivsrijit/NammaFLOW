"""
Run the entire NammaFLOW pipeline end to end and print exactly what was produced.

    python run_all.py
    python run_all.py --raw path/to/file.csv

This removes any ambiguity about which artifacts (including the trained model
.pkl) were generated.
"""

import argparse
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))
import config as cfg

STAGES = [
    "pipeline/01_clean.py",
    "pipeline/02_cluster.py",
    "pipeline/03_score.py",
    "pipeline/04_forecast.py",
    "pipeline/05_artifacts.py",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=None, help="path to raw CSV (stage 01 only)")
    args = ap.parse_args()

    for stage in STAGES:
        print("\n" + "=" * 64)
        print(f"RUNNING {stage}")
        print("=" * 64)
        argv = [stage]
        if stage.endswith("01_clean.py") and args.raw:
            argv += ["--raw", args.raw]
        sys.argv = argv
        runpy.run_path(str(ROOT / stage), run_name="__main__")

    print("\n" + "#" * 64)
    print("PIPELINE COMPLETE - artifacts/ now contains:")
    print("#" * 64)
    any_files = False
    for p in sorted(cfg.ARTIFACTS.iterdir()):
        if p.is_file() and not p.name.startswith("."):
            any_files = True
            print(f"  {p.name:24s} {p.stat().st_size/1024:8.1f} KB")
    pkl = cfg.ARTIFACTS / "forecast_model.pkl"
    print("\nTrained model present:", "YES [OK]  " + pkl.name if pkl.exists() else "NO [MISSING]")
    if not any_files:
        print("  (nothing - check errors above)")


if __name__ == "__main__":
    main()
