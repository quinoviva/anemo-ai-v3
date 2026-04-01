#!/usr/bin/env python3
"""
Anemo AI — Automated Dataset Downloader
========================================
Downloads the best publicly available datasets for anemia detection
from conjunctiva, nailbed, and skin (pallor) sources.

Datasets downloaded:
  1. Kaggle — Anemia Dataset (conjunctival pallor images)
     kaggle.com/datasets/amandam1/anemia-dataset
  2. Kaggle — Anemia Detection from Nail Beds
     kaggle.com/datasets/longntt2001/anemia-detection-from-nailbeds
  3. Kaggle — Nail Dataset for Blood Hemoglobin Estimation
     kaggle.com/datasets/thefearlesscoder/nail-dataset-for-blood-hemoglobin-estimation
  4. Kaggle — Anemia Types Classification (CBC + clinical images)
     kaggle.com/datasets/ehababoelnaga/anemia-types-classification
  5. Kaggle — Anemia Detection from Conjunctiva
     kaggle.com/datasets/natchapol/anemia-from-conjunctival-pallor (if available)

Prerequisites:
  1. pip install -r scripts/ml/requirements_local.txt
  2. Either:
     - Run: python scripts/ml/setup_credentials.py --username X --key Y
     - Or set env vars: KAGGLE_USERNAME / KAGGLE_KEY
     - Or place kaggle.json at ~/.kaggle/kaggle.json

Usage:
  python scripts/ml/download_datasets.py
  python scripts/ml/download_datasets.py --only conjunctiva
  python scripts/ml/download_datasets.py --only nailbed
  python scripts/ml/download_datasets.py --split 0.7 0.15 0.15
"""

import argparse
import json
import os
import shutil
import stat
import sys
import zipfile
from pathlib import Path
from typing import Optional

import requests
from tqdm import tqdm

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]
DATASET_DIR = BASE_DIR / "dataset"
RAW_DIR = DATASET_DIR / "raw"          # downloaded zips land here
PROCESSED_DIR = DATASET_DIR / "processed"  # organised for training

# Severity thresholds (mirroring severity.ts)
# Hgb (g/dL): Normal > 12, Mild 10-12, Moderate 7-10, Severe < 7
SEVERITY_CLASSES = ["0_Normal", "1_Mild", "2_Moderate", "3_Severe"]
SPLITS = ["train", "val", "test"]
DEFAULT_SPLIT = (0.70, 0.15, 0.15)

KAGGLE_DATASETS = [
    {
        "id": "amandam1/anemia-dataset",
        "name": "Conjunctival Pallor (Eye/Undereye)",
        "target": "conjunctiva",
        "description": "~1600 conjunctival images, binary anemia/non-anemia labels",
        "priority": 1,
    },
    {
        "id": "longntt2001/anemia-detection-from-nailbeds",
        "name": "Anemia Detection from Nail Beds",
        "target": "nailbed",
        "description": "Nail bed pallor images with anemia labels",
        "priority": 1,
    },
    {
        "id": "thefearlesscoder/nail-dataset-for-blood-hemoglobin-estimation",
        "name": "Nail Hemoglobin Estimation Dataset",
        "target": "nailbed_hgb",
        "description": "Nail images with hemoglobin values for regression training",
        "priority": 2,
    },
    {
        "id": "ehababoelnaga/anemia-types-classification",
        "name": "Anemia Types Classification",
        "target": "clinical",
        "description": "Multi-class anemia types with clinical indicators",
        "priority": 2,
    },
    {
        "id": "omkar-thombre/anemia-detection-dataset",
        "name": "Anemia Detection (Conjunctiva + Palm)",
        "target": "conjunctiva_palm",
        "description": "Conjunctiva and palm pallor images",
        "priority": 1,
    },
    {
        "id": "datamunge/eye-conjunctival-pallor-anemia",
        "name": "Eye Conjunctival Pallor Dataset",
        "target": "conjunctiva_extra",
        "description": "Additional conjunctival images",
        "priority": 2,
    },
]

# ---------------------------------------------------------------------------
# Credential Setup
# ---------------------------------------------------------------------------

def auto_setup_credentials() -> bool:
    """
    Auto-write kaggle.json from environment variables if not already present.
    Returns True if credentials are available.
    """
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"

    if kaggle_json.exists():
        try:
            creds = json.loads(kaggle_json.read_text())
            if creds.get("username") and creds.get("key"):
                return True
        except Exception:
            pass

    username = os.environ.get("KAGGLE_USERNAME", "")
    key = os.environ.get("KAGGLE_KEY", "")

    if username and key:
        kaggle_json.parent.mkdir(exist_ok=True)
        kaggle_json.write_text(json.dumps({"username": username, "key": key}))
        if os.name != "nt":
            kaggle_json.chmod(stat.S_IRUSR | stat.S_IWUSR)
        print(f"  ✓ Kaggle credentials auto-configured: {username}")
        return True

    return False


def check_kaggle_auth() -> bool:
    """Verify Kaggle credentials are available."""
    if auto_setup_credentials():
        return True
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    return kaggle_json.exists()



def download_kaggle_dataset(dataset_id: str, output_dir: Path) -> Optional[Path]:
    """Download a Kaggle dataset using the kaggle-cli."""
    try:
        import kaggle  # type: ignore

        print(f"\n  → Downloading: {dataset_id}")
        output_dir.mkdir(parents=True, exist_ok=True)
        kaggle.api.dataset_download_files(
            dataset_id,
            path=str(output_dir),
            unzip=True,
            quiet=False,
        )
        print(f"  ✓ Downloaded to: {output_dir}")
        return output_dir
    except Exception as e:
        print(f"  ✗ Failed to download {dataset_id}: {e}")
        return None


def download_url(url: str, dest: Path) -> bool:
    """Download a file with a progress bar."""
    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()
        total = int(response.headers.get("content-length", 0))
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f, tqdm(
            total=total, unit="B", unit_scale=True, desc=dest.name
        ) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                pbar.update(len(chunk))
        return True
    except Exception as e:
        print(f"  ✗ Download failed: {e}")
        return False


def get_image_files(directory: Path) -> list[Path]:
    """Recursively find all image files in a directory."""
    extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
    images = []
    for ext in extensions:
        images.extend(directory.rglob(f"*{ext}"))
        images.extend(directory.rglob(f"*{ext.upper()}"))
    return images


def split_files(files: list[Path], ratios: tuple[float, float, float]) -> dict[str, list[Path]]:
    """Split a file list into train/val/test sets."""
    import random
    shuffled = files.copy()
    random.seed(42)
    random.shuffle(shuffled)
    n = len(shuffled)
    n_train = int(n * ratios[0])
    n_val = int(n * ratios[1])
    return {
        "train": shuffled[:n_train],
        "val": shuffled[n_train : n_train + n_val],
        "test": shuffled[n_train + n_val :],
    }


def organize_binary_dataset(
    raw_dir: Path,
    output_base: Path,
    body_part: str,
    split_ratios: tuple[float, float, float],
    positive_keywords: list[str] = None,
    negative_keywords: list[str] = None,
):
    """
    Organize a binary (anemia/non-anemia) dataset into the 4-severity structure.

    For binary datasets, anemic images map to '1_Mild' (conservative) and
    non-anemic images map to '0_Normal'. This is a placeholder — ideally
    images are reclassified by a clinician into all 4 severity classes.
    """
    if positive_keywords is None:
        positive_keywords = ["anemia", "anemic", "positive", "1"]
    if negative_keywords is None:
        negative_keywords = ["normal", "healthy", "negative", "0", "non"]

    print(f"\n  Organizing {body_part} dataset from {raw_dir}")

    all_images = get_image_files(raw_dir)
    print(f"  Found {len(all_images)} images total")

    anemic = []
    normal = []
    unclassified = []

    for img in all_images:
        path_lower = str(img).lower()
        is_positive = any(k in path_lower for k in positive_keywords)
        is_negative = any(k in path_lower for k in negative_keywords)

        if is_positive and not is_negative:
            anemic.append(img)
        elif is_negative and not is_positive:
            normal.append(img)
        else:
            unclassified.append(img)

    # Try parent folder names for classification
    for img in unclassified:
        parent = img.parent.name.lower()
        if any(k in parent for k in positive_keywords):
            anemic.append(img)
        elif any(k in parent for k in negative_keywords):
            normal.append(img)
        else:
            normal.append(img)  # default to normal if unknown

    print(f"  Anemic: {len(anemic)}, Normal: {len(normal)}")

    # Split and copy
    for label, files in [("1_Mild", anemic), ("0_Normal", normal)]:
        splits = split_files(files, split_ratios)
        for split_name, split_files in splits.items():
            dest = output_base / body_part / split_name / label
            dest.mkdir(parents=True, exist_ok=True)
            for src in split_files:
                shutil.copy2(src, dest / src.name)

    total_organised = len(anemic) + len(normal)
    print(f"  ✓ Organised {total_organised} images into {output_base / body_part}")
    return total_organised


def create_severity_placeholder_structure(output_base: Path):
    """
    Create placeholder folders for 2_Moderate and 3_Severe when only
    binary data is available. These should be filled with clinical data.
    """
    for body_part in ["skin", "fingernails", "conjunctiva"]:
        for split in SPLITS:
            for severity in ["2_Moderate", "3_Severe"]:
                placeholder = output_base / body_part / split / severity
                placeholder.mkdir(parents=True, exist_ok=True)
                readme = placeholder / "README.txt"
                if not readme.exists():
                    readme.write_text(
                        f"[PLACEHOLDER] Add {severity} {body_part} images here.\n"
                        f"These images should show {severity.replace('_', ' ')} anemia indicators.\n"
                        f"Label criteria:\n"
                        f"  2_Moderate: Hgb 7-10 g/dL\n"
                        f"  3_Severe:   Hgb < 7 g/dL\n"
                    )


def print_dataset_summary(output_base: Path):
    """Print a summary of the organised dataset."""
    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)
    total = 0
    for body_part in ["skin", "fingernails", "conjunctiva"]:
        bp_dir = output_base / body_part
        if not bp_dir.exists():
            continue
        bp_total = 0
        print(f"\n  {body_part.upper()}")
        for split in SPLITS:
            split_total = 0
            for severity in SEVERITY_CLASSES:
                d = bp_dir / split / severity
                if d.exists():
                    count = len(list(d.glob("*.[jpJP][pnPN]*")))
                    split_total += count
                    if count > 0:
                        print(f"    {split:8s} / {severity}: {count:4d} images")
            bp_total += split_total
        total += bp_total
        print(f"  Subtotal: {bp_total} images")
    print(f"\n  GRAND TOTAL: {total} images")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Download and organise datasets for Anemo AI training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--only",
        choices=["conjunctiva", "nailbed", "all"],
        default="all",
        help="Only download a specific dataset type",
    )
    parser.add_argument(
        "--split",
        nargs=3,
        type=float,
        default=list(DEFAULT_SPLIT),
        metavar=("TRAIN", "VAL", "TEST"),
        help="Train/val/test split ratios (must sum to 1.0)",
    )
    parser.add_argument(
        "--output",
        default=str(PROCESSED_DIR),
        help="Output directory for organised dataset",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Skip downloading — only re-organise existing raw data",
    )
    args = parser.parse_args()

    split_ratios = tuple(args.split)
    if abs(sum(split_ratios) - 1.0) > 0.01:
        print(f"ERROR: Split ratios must sum to 1.0 (got {sum(split_ratios):.2f})")
        sys.exit(1)

    output_base = Path(args.output)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    output_base.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("ANEMO AI — DATASET DOWNLOADER")
    print("=" * 60)

    # Check Kaggle auth — auto-configure from env vars if possible
    if not args.skip_download:
        if not check_kaggle_auth():
            print("""
ERROR: Kaggle credentials not found.

To set up Kaggle API access:
  Option 1 — Run the setup script:
    python scripts/ml/setup_credentials.py --username YOUR_USER --key YOUR_KEY

  Option 2 — Set environment variables:
    set KAGGLE_USERNAME=your_username
    set KAGGLE_KEY=your_api_key

  Option 3 — Manual:
    Go to https://www.kaggle.com → Account → API → Create New API Token
    Save kaggle.json to: ~/.kaggle/kaggle.json

Then re-run this script.
""")
            sys.exit(1)

    # Download datasets
    downloaded = {}

    if not args.skip_download:
        # Sort by priority — download most important datasets first
        sorted_datasets = sorted(KAGGLE_DATASETS, key=lambda d: d.get("priority", 99))
        for ds in sorted_datasets:
            if args.only != "all":
                if args.only == "conjunctiva" and ds["target"] not in ["conjunctiva", "conjunctiva_palm", "conjunctiva_extra"]:
                    continue
                if args.only == "nailbed" and ds["target"] not in ["nailbed", "nailbed_hgb"]:
                    continue

            # Skip if already downloaded
            raw_dest = RAW_DIR / ds["target"]
            if raw_dest.exists() and any(raw_dest.iterdir()):
                img_count = sum(1 for _ in raw_dest.rglob("*.jpg")) + sum(1 for _ in raw_dest.rglob("*.png"))
                if img_count > 10:
                    print(f"\n  ↩ {ds['name']}: already downloaded ({img_count} images) — skipping")
                    downloaded[ds["target"]] = raw_dest
                    continue

            result = download_kaggle_dataset(ds["id"], raw_dest)
            if result:
                downloaded[ds["target"]] = result
            else:
                print(f"  ⚠ Skipping {ds['name']} — will proceed with available data")

    # Organise conjunctiva datasets → conjunctiva body part
    print("\n[1/3] Organising conjunctiva dataset...")
    for conjunctiva_target in ["conjunctiva", "conjunctiva_palm", "conjunctiva_extra"]:
        conjunctiva_raw = RAW_DIR / conjunctiva_target
        if conjunctiva_raw.exists():
            organize_binary_dataset(
                raw_dir=conjunctiva_raw,
                output_base=output_base,
                body_part="conjunctiva",
                split_ratios=split_ratios,
            )

    # Organise nailbed datasets → fingernails body part
    print("\n[2/3] Organising nailbed dataset...")
    for nailbed_target in ["nailbed", "nailbed_hgb"]:
        nailbed_raw = RAW_DIR / nailbed_target
        if nailbed_raw.exists():
            organize_binary_dataset(
                raw_dir=nailbed_raw,
                output_base=output_base,
                body_part="fingernails",
                split_ratios=split_ratios,
            )

    # Skin data — create structure for manual population
    print("\n[3/3] Creating skin dataset structure...")
    for split in SPLITS:
        for severity in SEVERITY_CLASSES:
            d = output_base / "skin" / split / severity
            d.mkdir(parents=True, exist_ok=True)
            readme = d / "README.txt"
            if not readme.exists():
                readme.write_text(
                    f"[MANUAL] Add {severity} skin pallor images here.\n"
                    f"Show palm/inner wrist with {'healthy pink tone' if '0' in severity else 'pallor'}.\n"
                    f"Recommendation: Collect from clinic photography or ISIC Archive.\n"
                    f"ISIC: https://www.isic-archive.com/\n"
                )

    # Create Moderate/Severe placeholders for binary-only datasets
    create_severity_placeholder_structure(output_base)

    # Print summary
    print_dataset_summary(output_base)

    print("""
NEXT STEPS:
  1. Run training locally (auto-detects CPU/GPU):
       python scripts/ml/train_local.py

  2. OR run the full pipeline in one step:
       python scripts/ml/train_local.py --full

  3. After training, models are auto-deployed to public/models/

NOTE: For Moderate/Severe anemia classes, add clinical images to:
  dataset/processed/<body_part>/train/2_Moderate/
  dataset/processed/<body_part>/train/3_Severe/
  (Hgb 7-10 g/dL = Moderate, Hgb < 7 g/dL = Severe)
""")


if __name__ == "__main__":
    main()
