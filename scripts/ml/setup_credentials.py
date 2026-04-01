#!/usr/bin/env python3
"""
Anemo AI — Kaggle Credential Setup
====================================
Writes ~/.kaggle/kaggle.json from arguments or environment variables.
Run this once before downloading datasets.

Usage:
  python scripts/ml/setup_credentials.py --username YOUR_USERNAME --key YOUR_KEY
  python scripts/ml/setup_credentials.py   # reads from KAGGLE_USERNAME / KAGGLE_KEY env vars
"""

import argparse
import json
import os
import stat
import sys
from pathlib import Path


def setup_kaggle_credentials(username: str, key: str) -> Path:
    """Write Kaggle API credentials to ~/.kaggle/kaggle.json."""
    kaggle_dir = Path.home() / ".kaggle"
    kaggle_dir.mkdir(exist_ok=True)
    kaggle_json = kaggle_dir / "kaggle.json"

    credentials = {"username": username, "key": key}
    kaggle_json.write_text(json.dumps(credentials))

    # Set permissions to 600 (owner read/write only) — required by Kaggle CLI
    if os.name != "nt":  # Unix/Mac
        kaggle_json.chmod(stat.S_IRUSR | stat.S_IWUSR)
    else:
        # Windows: set as not read-only, Kaggle CLI handles the rest
        os.chmod(kaggle_json, stat.S_IREAD | stat.S_IWRITE)

    print(f"✓ Kaggle credentials written to: {kaggle_json}")
    return kaggle_json


def verify_credentials(username: str, key: str) -> bool:
    """Quick sanity check on credential format."""
    if not username or len(username) < 3:
        print("ERROR: Username appears invalid (too short)")
        return False
    if not key or not key.startswith("KGAT_") and len(key) < 20:
        print("WARNING: Key format looks unusual — proceeding anyway")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Set up Kaggle API credentials for dataset download",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--username",
        default=os.environ.get("KAGGLE_USERNAME", ""),
        help="Kaggle username (or set KAGGLE_USERNAME env var)",
    )
    parser.add_argument(
        "--key",
        default=os.environ.get("KAGGLE_KEY", ""),
        help="Kaggle API key (or set KAGGLE_KEY env var)",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only check if credentials are already set up, don't write anything",
    )
    args = parser.parse_args()

    if args.verify_only:
        kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
        if kaggle_json.exists():
            creds = json.loads(kaggle_json.read_text())
            print(f"✓ Kaggle credentials found: user={creds.get('username', '?')}")
            return 0
        elif os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
            print(f"✓ Kaggle credentials in environment: user={os.environ['KAGGLE_USERNAME']}")
            return 0
        else:
            print("✗ No Kaggle credentials found")
            return 1

    if not args.username or not args.key:
        print("""
ERROR: Kaggle credentials not provided.

Either:
  1. Pass them as arguments:
       python setup_credentials.py --username YOUR_USER --key YOUR_KEY

  2. Set environment variables:
       set KAGGLE_USERNAME=YOUR_USER
       set KAGGLE_KEY=YOUR_KEY

Get your credentials at: https://www.kaggle.com/settings → API → Create New Token
""")
        return 1

    verify_credentials(args.username, args.key)
    setup_kaggle_credentials(args.username, args.key)

    # Verify Kaggle package is importable
    try:
        import kaggle  # noqa: F401
        print("✓ Kaggle package is installed")
    except ImportError:
        print("⚠ Kaggle package not installed yet. Run:")
        print("    pip install -r scripts/ml/requirements_local.txt")

    print("\nReady to download datasets:")
    print("  python scripts/ml/download_datasets.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
