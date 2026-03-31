#!/usr/bin/env python3
"""
Anemo AI — Model Converter & Deployer
======================================
Converts trained Keras .h5 models to INT8-quantized TF.js graph models
and places them in the correct public/models/ directory structure that
matches the model-registry.ts URL paths.

Conversion pipeline:
  .h5 (Keras) → SavedModel → TF.js graph model (INT8 quantized)

INT8 quantization reduces each model's file size by ~4× while preserving
>95% of accuracy — critical for fast PWA loading on mobile devices.

Usage:
  # Auto-detect and convert all .h5 files n models_output/:
  python scripts/ml/convert_deploy.py
i
  # Convert a specific .h5 file:
  python scripts/ml/convert_deploy.py --model models_output/anemia_conjunctiva_best.h5 --body-part conjunctiva

  # List what would be converted (dry run):
  python scripts/ml/convert_deploy.py --dry-run

  # Skip quantization (larger files, higher accuracy):
  python scripts/ml/convert_deploy.py --no-quantize

After conversion, model files will be at:
  public/models/judges/efficientnet-b0/model.json  (conjunctiva)
  public/models/judges/efficientnet-b0/model.json  (fingernails)
  etc.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Directory mapping: body part → model registry URL path
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "models_output"
PUBLIC_MODELS_DIR = BASE_DIR / "public" / "models"

# Each body part maps to multiple model paths in the registry.
# The primary trained model is deployed as the EfficientNet-B0 judge.
# Scouts and specialists fall back to the same weights until separate models are trained.
BODY_PART_TO_REGISTRY_PATHS = {
    "conjunctiva": [
        "judges/efficientnet-b0",
        "scouts/squeezenet-1.1-eye",
        "specialists/densenet121",
    ],
    "fingernails": [
        "scouts/mobilenet-v3-nails",
        "specialists/inceptionv3",
    ],
    "skin": [
        "scouts/mobilenet-v3-skin",
        "specialists/resnet50v2",
        "specialists/vgg16",
    ],
}

# Multi-part model that uses all three (judges/meta-learner)
ALL_PARTS_PATHS = [
    "judges/vit-tiny",
    "judges/mlp-meta-learner",
]

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def check_tensorflowjs_installed() -> bool:
    try:
        result = subprocess.run(
            ["tensorflowjs_converter", "--version"],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def convert_h5_to_tfjs(
    h5_path: Path,
    output_dir: Path,
    quantize: bool = True,
    dry_run: bool = False,
) -> bool:
    """
    Convert a .h5 Keras model to TF.js INT8-quantized graph model.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "tensorflowjs_converter",
        "--input_format=keras",
        "--output_format=tfjs_graph_model",
        "--signature_name=serving_default",
        "--saved_model_tags=serve",
    ]

    if quantize:
        cmd.append("--quantize_uint8=*")

    cmd += [str(h5_path), str(output_dir)]

    print(f"  Command: {' '.join(cmd)}")

    if dry_run:
        print("  [DRY RUN] Skipping actual conversion")
        return True

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            # Verify output
            model_json = output_dir / "model.json"
            if model_json.exists():
                size_kb = sum(f.stat().st_size for f in output_dir.rglob("*") if f.is_file()) / 1024
                print(f"  ✓ Converted successfully ({size_kb:.1f} KB total)")
                return True
            else:
                print(f"  ✗ Conversion completed but model.json not found")
                return False
        else:
            print(f"  ✗ Conversion failed:")
            print(f"    STDOUT: {result.stdout[-500:] if result.stdout else '(empty)'}")
            print(f"    STDERR: {result.stderr[-500:] if result.stderr else '(empty)'}")
            return False
    except subprocess.TimeoutExpired:
        print("  ✗ Conversion timed out (>5 min)")
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def deploy_to_registry_path(
    source_dir: Path,
    registry_path: str,
    public_models_dir: Path,
) -> bool:
    """Copy a converted TF.js model to the correct public/models/ path."""
    dest = public_models_dir / registry_path
    dest.mkdir(parents=True, exist_ok=True)

    # Copy all files (model.json + weights shards)
    files_copied = 0
    for f in source_dir.iterdir():
        if f.is_file():
            shutil.copy2(f, dest / f.name)
            files_copied += 1

    print(f"  ✓ Deployed {files_copied} files → public/models/{registry_path}")
    return files_copied > 0


def create_model_metadata(output_dir: Path, body_part: str, accuracy: float = 0.0):
    """Write metadata JSON alongside model.json for runtime info."""
    metadata = {
        "bodyPart": body_part,
        "architecture": "EfficientNetV2-S",
        "inputShape": [224, 224, 3],
        "numClasses": 4,
        "classNames": ["0_Normal", "1_Mild", "2_Moderate", "3_Severe"],
        "quantized": True,
        "quantizationType": "uint8",
        "trainedOn": "Anemo AI Dataset v1 (Kaggle anemia-dataset + nail-beds)",
        "accuracy": accuracy,
        "notes": "CLAHE preprocessing required before inference. See model-loader.ts.",
    }
    meta_path = output_dir / "metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2))
    print(f"  ✓ Metadata written: {meta_path}")


def print_deployment_summary(public_models_dir: Path):
    """Print a summary of all deployed models."""
    print("\n" + "=" * 60)
    print("DEPLOYED MODELS")
    print("=" * 60)
    total_size_kb = 0
    for model_json in sorted(public_models_dir.rglob("model.json")):
        model_dir = model_json.parent
        size_kb = sum(f.stat().st_size for f in model_dir.rglob("*") if f.is_file()) / 1024
        rel_path = model_dir.relative_to(public_models_dir)
        print(f"  /{rel_path}  ({size_kb:.0f} KB)")
        total_size_kb += size_kb
    print(f"\n  Total: {total_size_kb:.0f} KB ({total_size_kb / 1024:.1f} MB)")
    print("=" * 60)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Convert Keras .h5 models to TF.js and deploy to public/models/",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--models-dir",
        default=str(MODELS_DIR),
        help="Directory containing .h5 model files",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Path to a specific .h5 file (auto-detects if not set)",
    )
    parser.add_argument(
        "--body-part",
        choices=["conjunctiva", "fingernails", "skin", "all"],
        default="all",
    )
    parser.add_argument(
        "--no-quantize",
        action="store_true",
        help="Skip INT8 quantization (larger files but higher accuracy)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    parser.add_argument(
        "--public-dir",
        default=str(PUBLIC_MODELS_DIR),
        help="Root public/models directory",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("ANEMO AI — MODEL CONVERTER & DEPLOYER")
    print("=" * 60)

    # Check tensorflowjs is installed
    if not check_tensorflowjs_installed():
        print("""
ERROR: tensorflowjs_converter not found.

Install it with:
  pip install tensorflowjs==4.17.0

Or in Google Colab:
  !pip install tensorflowjs
""")
        sys.exit(1)

    public_dir = Path(args.public_dir)
    models_dir = Path(args.models_dir)

    # Find .h5 files to convert
    if args.model:
        h5_files = {None: Path(args.model)}
    else:
        h5_files = {}
        for bp in ["conjunctiva", "fingernails", "skin"]:
            if args.body_part != "all" and args.body_part != bp:
                continue
            candidates = [
                models_dir / f"anemia_{bp}_best.h5",
                models_dir / f"anemia_{bp}_fold0_best.h5",
            ]
            for c in candidates:
                if c.exists():
                    h5_files[bp] = c
                    break

    if not h5_files:
        print(f"\nNo .h5 files found in {models_dir}")
        print("Train models first: python scripts/ml/train_enhanced.py")
        sys.exit(1)

    print(f"\nModels to convert: {len(h5_files)}")
    for bp, path in h5_files.items():
        print(f"  {bp or 'custom'}: {path}")

    # Convert and deploy
    converted = 0
    for body_part, h5_path in h5_files.items():
        print(f"\n[Converting] {h5_path.name}")
        if not h5_path.exists():
            print(f"  ✗ File not found: {h5_path}")
            continue

        # Convert to temporary directory first
        temp_dir = models_dir / f"tfjs_temp_{body_part or 'model'}"
        success = convert_h5_to_tfjs(
            h5_path=h5_path,
            output_dir=temp_dir,
            quantize=not args.no_quantize,
            dry_run=args.dry_run,
        )

        if not success:
            continue

        # Write metadata
        if not args.dry_run:
            create_model_metadata(temp_dir, body_part or "unknown")

        # Deploy to all matching registry paths
        registry_paths = BODY_PART_TO_REGISTRY_PATHS.get(body_part, [])
        for reg_path in registry_paths:
            print(f"  Deploying to: /models/{reg_path}")
            if not args.dry_run:
                deploy_to_registry_path(temp_dir, reg_path, public_dir)
            else:
                print(f"  [DRY RUN] Would deploy to public/models/{reg_path}")

        # Also deploy to all-parts judge paths using conjunctiva weights
        if body_part == "conjunctiva":
            for reg_path in ALL_PARTS_PATHS:
                print(f"  Deploying multi-part judge: /models/{reg_path}")
                if not args.dry_run:
                    deploy_to_registry_path(temp_dir, reg_path, public_dir)

        # Clean up temp dir
        if not args.dry_run and temp_dir.exists():
            shutil.rmtree(temp_dir)

        converted += 1

    if not args.dry_run:
        print_deployment_summary(public_dir)

    print(f"""
{'=' * 60}
DONE: {converted} model(s) converted and deployed.

The models are now in public/models/ and will be automatically
loaded by the Anemo AI TF.js ensemble engine.

To verify in the browser:
  1. Run: npm run dev
  2. Open the camera scan page
  3. Check browser console for: "[ConsensusEngine] Model loaded: ..."

NEXT: Test with real images and compare against Gemini AI results.
{'=' * 60}
""")


if __name__ == "__main__":
    main()
