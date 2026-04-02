#!/usr/bin/env python3
"""
update_cell5.py — Patch Cell 5 in AnemoAI_Training_Colab.ipynb with the
                  upgraded multi-source + high-volume dataset strategy.

Dataset target: ~16 000 images (3 body parts × ~5 000+ each)
  - Synthetic  : 1 000/class × 4 classes × 3 body parts = 12 000 images
  - Real       : ~471 conjunctiva images (Roboflow 253 + HuggingFace 218)
  - Augmented  : ~3 768 conjunctiva augmented (471 × 8)
  ──────────────────────────────────────────────────────
  Grand total  : ~16 239 images

Run BEFORE uploading to Google Colab:
    python scripts/ml/update_cell5.py

Or regenerate the entire notebook from scratch:
    python scripts/ml/gen_notebook.py
"""

import json, textwrap
from pathlib import Path

NOTEBOOK = Path(__file__).parent / 'AnemoAI_Training_Colab.ipynb'

# ── New Cell 5 code (written as a plain Python string for readability) ─────────
_CELL5_CODE = textwrap.dedent('''
    # ── Cell 5: Multi-Source Dataset Acquisition ─────────────────────────────────
    #
    # Dataset target: ~16 000 images for high-accuracy CNN training
    #
    # CONFIRMED SOURCES:
    #   ✅ Roboflow: sneha-tndy8/non-invasive-anemia-detection — 253 conjunctiva
    #   ✅ HuggingFace: Yahaira/anemia-eyes — 218 conjunctiva
    #   🔬 Synthetic: 1 000/class × 4 classes × 3 body parts = 12 000 images
    #   🔄 Augmented: real images × 8 = ~3 768 additional conjunctiva
    #
    # STRATEGY (4 sources):
    #   1. Roboflow API    (free key required — 253 real conjunctiva images)
    #   2. HuggingFace Hub (zero auth — 218 real conjunctiva images)
    #   3. Synthetic       (always runs — 4 000 per body part)
    #   4. Augmentation    (multiplies real images 8×)
    # ---------------------------------------------------------------------------

    import os, sys, io, shutil, zipfile
    import urllib.request
    from pathlib import Path
    import numpy as np
    import cv2

    # ── 1. Roboflow Universe (PRIMARY — confirmed working, CC BY 4.0) ─────────────
    print("="*60)
    print("SOURCE 1: Roboflow Universe — Non-Invasive Anemia Detection")
    print("="*60)

    # ── Auto-detect API key (Kaggle Secrets → Colab Secrets → env var → manual) ──
    ROBOFLOW_API_KEY = ""  # ← Optional: paste key here if not using Secrets

    if not ROBOFLOW_API_KEY:
        try:
            from kaggle_secrets import UserSecretsClient
            ROBOFLOW_API_KEY = UserSecretsClient().get_secret("ROBOFLOW_API_KEY")
            print("  API key loaded from Kaggle Secrets ✓")
        except Exception:
            pass

    if not ROBOFLOW_API_KEY:
        try:
            from google.colab import userdata
            ROBOFLOW_API_KEY = userdata.get("ROBOFLOW_API_KEY")
            print("  API key loaded from Colab Secrets ✓")
        except Exception:
            pass

    if not ROBOFLOW_API_KEY:
        import os
        ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")

    rf_downloaded = {}
    rf_dest = DATASET_RAW / "conjunctiva_roboflow"

    if list(rf_dest.rglob("*.jpg")) or list(rf_dest.rglob("*.png")):
        existing = list(rf_dest.rglob("*.jpg")) + list(rf_dest.rglob("*.png"))
        print(f"  skip: {len(existing)} images already present")
        rf_downloaded["conjunctiva_roboflow"] = rf_dest
    elif ROBOFLOW_API_KEY:
        print("  downloading from Roboflow...")
        rf_dest.mkdir(parents=True, exist_ok=True)
        try:
            import subprocess
            subprocess.run([sys.executable, "-m", "pip", "install", "-q", "roboflow"], check=True)
            from roboflow import Roboflow
            rf = Roboflow(api_key=ROBOFLOW_API_KEY)
            project = rf.workspace("sneha-tndy8").project("non-invasive-anemia-detection")
            version = project.version(2)
            version.download("folder", location=str(rf_dest))
            imgs = list(rf_dest.rglob("*.jpg")) + list(rf_dest.rglob("*.png"))
            print(f"    OK: {len(imgs)} images downloaded")
            if len(imgs) > 0:
                rf_downloaded["conjunctiva_roboflow"] = rf_dest
        except Exception as e:
            print(f"    FAIL: {e}")
            print("    → Get free API key at: https://app.roboflow.com")
    else:
        print("  SKIPPED — no Roboflow API key found")
        print()
        print("  HOW TO ADD YOUR KEY (choose one method):")
        print()
        print("  METHOD 1 — Kaggle Secrets (recommended):")
        print("    Notebook sidebar → Add-ons → Secrets → Add secret")
        print("    Name: ROBOFLOW_API_KEY   Value: <your key>")
        print()
        print("  METHOD 2 — Colab Secrets:")
        print("    Left sidebar 🔑 icon → Add secret")
        print("    Name: ROBOFLOW_API_KEY   Value: <your key>")
        print()
        print("  METHOD 3 — Paste directly (least secure):")
        print("    Set ROBOFLOW_API_KEY = 'your_key_here' at the top of this cell")
        print()
        print("  Get your FREE key: https://app.roboflow.com → Settings → API")

    # ── 2. HuggingFace Hub (218 real conjunctiva images, zero auth) ───────────────
    print()
    print("="*60)
    print("SOURCE 2: HuggingFace Hub — Yahaira/anemia-eyes (218 images)")
    print("="*60)

    try:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                        "huggingface_hub", "datasets"], check=True)
    except Exception as e:
        print(f"  pip warning: {e}")

    hf_downloaded = {}
    hf_dest = DATASET_RAW / "conjunctiva_hf"
    existing_hf = list(hf_dest.rglob("*.jpg")) + list(hf_dest.rglob("*.png"))

    if len(existing_hf) > 10:
        print(f"  skip: {len(existing_hf)} images already present")
        hf_downloaded["conjunctiva_hf"] = hf_dest
    else:
        print("  downloading Yahaira/anemia-eyes...")
        try:
            from datasets import load_dataset
            from PIL import Image as PILImage
            ds_all = load_dataset("Yahaira/anemia-eyes")
            total = 0
            for sp in ds_all.keys():
                for i, row in enumerate(ds_all[sp]):
                    label_val = row.get("label", 0)
                    cls = ("1_Anemia" if (isinstance(label_val, int) and label_val == 0)
                           else ("1_Anemia" if "anemia" in str(label_val).lower() else "0_Normal"))
                    out_dir = hf_dest / cls
                    out_dir.mkdir(parents=True, exist_ok=True)
                    img = row.get("image")
                    if img is not None:
                        if not isinstance(img, PILImage.Image):
                            try:
                                img = PILImage.fromarray(img)
                            except Exception:
                                img = PILImage.open(io.BytesIO(img))
                        img.convert("RGB").save(out_dir / f"{sp}_{i:05d}.jpg", quality=95)
                        total += 1
            print(f"    OK: {total} images saved")
            if total > 0:
                hf_downloaded["conjunctiva_hf"] = hf_dest
        except Exception as e:
            print(f"    FAIL: {e}")

    # ── 3. Synthetic (1 000/class × 4 classes × 3 body parts = 12 000 images) ────
    # No public nailbed or palm datasets exist on any platform.
    # Synthetic uses clinical HSV pallor ranges (Fitzpatrick skin-tone variants).
    # References: Sheth TN et al. 1997 NEJM, Nevo S et al. 1998, Kalantri A et al. 2010 BMC
    print()
    print("="*60)
    print("SOURCE 3: Synthetic images — 1 000/class × 4 classes × 3 body parts")
    print("="*60)

    def generate_synthetic_images(dest_dir, body_part, n_per_class=1000):
        RANGES = {
            "conjunctiva": {
                "0_Normal":   {"h":(0,15),  "s":(90,170),"v":(180,240)},
                "1_Mild":     {"h":(0,12),  "s":(65,130),"v":(160,220)},
                "2_Moderate": {"h":(0,10),  "s":(30,90), "v":(140,200)},
                "3_Severe":   {"h":(0, 8),  "s":(10,50), "v":(110,170)},
            },
            "nailbed": {
                "0_Normal":   {"h":(0,15),  "s":(50,110),"v":(190,245)},
                "1_Mild":     {"h":(0,12),  "s":(35,85), "v":(170,225)},
                "2_Moderate": {"h":(0,10),  "s":(18,55), "v":(145,205)},
                "3_Severe":   {"h":(0, 8),  "s":(5, 30), "v":(115,175)},
            },
            "palm": {
                "0_Normal":   {"h":(5,20),  "s":(70,150),"v":(170,235)},
                "1_Mild":     {"h":(5,18),  "s":(50,115),"v":(155,215)},
                "2_Moderate": {"h":(3,15),  "s":(25,80), "v":(135,195)},
                "3_Severe":   {"h":(2,12),  "s":(8, 40), "v":(105,165)},
            },
        }
        # Fitzpatrick skin-tone V-channel offsets (I/II light → VI dark)
        SKIN_TONE_V = [0, -15, -30, -50]
        ranges = RANGES.get(body_part, RANGES["conjunctiva"])
        rng = np.random.default_rng(42)
        Path(dest_dir).mkdir(parents=True, exist_ok=True)
        IH, IW = 224, 224
        total = 0
        for cls, r in ranges.items():
            out_dir = Path(dest_dir) / cls
            out_dir.mkdir(parents=True, exist_ok=True)
            for i in range(n_per_class):
                tone_off = SKIN_TONE_V[i % len(SKIN_TONE_V)]
                h = float(rng.uniform(*r["h"]))
                s = float(rng.uniform(*r["s"]))
                v = float(np.clip(rng.uniform(*r["v"]) + tone_off, 0, 255))
                base = np.full((IH, IW, 3), [h, s, v], dtype=np.float32)
                # Lighting gradient
                gt = i % 4
                if gt == 0:
                    base[:,:,2] += np.linspace(-18, 18, IW, dtype=np.float32)[np.newaxis,:]
                elif gt == 1:
                    base[:,:,2] += np.linspace(-18, 18, IH, dtype=np.float32)[:,np.newaxis]
                elif gt == 2:
                    cx, cy = IW//2, IH//2
                    Y, X = np.ogrid[:IH, :IW]
                    dist = np.sqrt((X-cx)**2+(Y-cy)**2)/max(cx,cy)
                    base[:,:,2] -= (dist*float(rng.uniform(10,28))).astype(np.float32)
                base[:,:,0] = np.clip(base[:,:,0], 0, 179)
                base[:,:,1] = np.clip(base[:,:,1], 0, 255)
                base[:,:,2] = np.clip(base[:,:,2], 0, 255)
                rgb = cv2.cvtColor(base.astype(np.uint8), cv2.COLOR_HSV2RGB)
                # Vein / crease simulation
                if rng.random() > 0.25:
                    overlay = rgb.astype(np.float32)
                    for _ in range(int(rng.integers(2,9))):
                        x1=int(rng.uniform(0,IW)); y1=int(rng.uniform(0,IH))
                        x2=int(np.clip(x1+rng.uniform(-IW*.6,IW*.6),0,IW-1))
                        y2=int(np.clip(y1+rng.uniform(-IH*.4,IH*.4),0,IH-1))
                        lc=[max(0,int(rgb[y1,x1,c])-int(rng.uniform(20,45))) for c in range(3)]
                        cv2.line(overlay,(x1,y1),(x2,y2),lc,int(rng.integers(1,3)))
                    rgb = np.clip(overlay*.6+rgb*.4, 0, 255).astype(np.uint8)
                # Noise
                noise = rng.integers(-28, 28, (IH,IW,3), dtype=np.int16)
                rgb = np.clip(rgb.astype(np.int16)+noise, 0, 255).astype(np.uint8)
                # Blur
                bk = i % 3
                if bk == 0: rgb = cv2.GaussianBlur(rgb,(5,5),0)
                elif bk == 1: rgb = cv2.GaussianBlur(rgb,(3,3),0)
                # CLAHE
                bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
                lc,a,b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=float(rng.uniform(1.5,3.5)),tileGridSize=(8,8))
                lc = clahe.apply(lc)
                bgr = cv2.cvtColor(cv2.merge([lc,a,b]), cv2.COLOR_LAB2BGR)
                # Brightness/contrast
                bgr = np.clip(bgr.astype(np.float32)*float(rng.uniform(.88,1.14))+float(rng.uniform(-12,12)),0,255).astype(np.uint8)
                cv2.imwrite(str(out_dir/f"synth_{i:05d}.jpg"), bgr,
                            [cv2.IMWRITE_JPEG_QUALITY, int(rng.integers(88,97))])
                total += 1
        return total

    SYNTH_PER_CLASS = 1000
    synth_downloaded = {}
    for body_part in ["nailbed", "palm", "conjunctiva"]:
        dest = DATASET_RAW / f"{body_part}_synthetic"
        existing = list(dest.rglob("*.jpg"))
        target = SYNTH_PER_CLASS * 4
        if len(existing) >= target:
            print(f"  skip {body_part}_synthetic: {len(existing)} already present")
            synth_downloaded[f"{body_part}_synthetic"] = dest
            continue
        print(f"  generating {body_part}: {SYNTH_PER_CLASS}/class × 4 classes = {target} images...")
        n = generate_synthetic_images(dest, body_part, n_per_class=SYNTH_PER_CLASS)
        print(f"    ✓ {n} images → {dest}")
        synth_downloaded[f"{body_part}_synthetic"] = dest

    # ── 4. Augment real images (8× multiplier on Roboflow + HuggingFace) ─────────
    print()
    print("="*60)
    print("SOURCE 4: Augmenting real images (8× multiplier)")
    print("="*60)

    def augment_real_images(src_dir, dest_dir, multiplier=8):
        src_dir = Path(src_dir); dest_dir = Path(dest_dir)
        if not src_dir.exists(): return 0
        imgs = (list(src_dir.rglob("*.jpg"))+list(src_dir.rglob("*.jpeg"))
                +list(src_dir.rglob("*.png")))
        if not imgs: return 0
        rng = np.random.default_rng(99)
        total = 0
        for img_path in imgs:
            rel = img_path.relative_to(src_dir)
            out_base = dest_dir / rel.parent
            out_base.mkdir(parents=True, exist_ok=True)
            img = cv2.imread(str(img_path))
            if img is None: continue
            img = cv2.resize(img, (224, 224))
            for aug_i in range(multiplier):
                aug = img.copy()
                if rng.random()>.5: aug=cv2.flip(aug,1)
                angle=float(rng.uniform(-20,20))
                M=cv2.getRotationMatrix2D((112,112),angle,1.0)
                aug=cv2.warpAffine(aug,M,(224,224),borderMode=cv2.BORDER_REFLECT)
                aug=np.clip(aug.astype(np.float32)*float(rng.uniform(.80,1.22))+float(rng.uniform(-18,18)),0,255).astype(np.uint8)
                hsv=cv2.cvtColor(aug,cv2.COLOR_BGR2HSV).astype(np.float32)
                hsv[:,:,1]=np.clip(hsv[:,:,1]*float(rng.uniform(.72,1.30)),0,255)
                aug=cv2.cvtColor(hsv.astype(np.uint8),cv2.COLOR_HSV2BGR)
                noise=rng.normal(0,float(rng.uniform(2,9)),aug.shape).astype(np.int16)
                aug=np.clip(aug.astype(np.int16)+noise,0,255).astype(np.uint8)
                if rng.random()>.65:
                    k=int(rng.choice([3,5])); aug=cv2.GaussianBlur(aug,(k,k),0)
                cv2.imwrite(str(out_base/f"{img_path.stem}_aug{aug_i:02d}.jpg"), aug,
                            [cv2.IMWRITE_JPEG_QUALITY, 92])
                total += 1
        return total

    aug_downloaded = {}
    for src_name, src_dir in {**rf_downloaded, **hf_downloaded}.items():
        if not isinstance(src_dir, Path) or not src_dir.exists(): continue
        real_imgs = (list(src_dir.rglob("*.jpg"))+list(src_dir.rglob("*.png"))
                     +list(src_dir.rglob("*.jpeg")))
        aug_dest = DATASET_RAW / f"{src_name}_augmented"
        existing = list(aug_dest.rglob("*.jpg"))
        if len(existing) >= len(real_imgs)*6:
            print(f"  skip {src_name}: {len(existing)} augmented already present")
            aug_downloaded[f"{src_name}_augmented"] = aug_dest
            continue
        print(f"  augmenting {src_name}: {len(real_imgs)} images × {8}...")
        n = augment_real_images(src_dir, aug_dest, multiplier=8)
        print(f"    ✓ {n} augmented images → {aug_dest}")
        if n > 0:
            aug_downloaded[f"{src_name}_augmented"] = aug_dest

    # ── Summary ───────────────────────────────────────────────────────────────────
    print()
    print("="*60)
    print("DATASET ACQUISITION SUMMARY")
    print("="*60)
    all_sources = {**rf_downloaded, **hf_downloaded, **synth_downloaded, **aug_downloaded}
    total_imgs = sum(
        len(list(d.rglob("*.jpg"))+list(d.rglob("*.png")))
        for d in all_sources.values() if isinstance(d, Path) and d.exists()
    )
    for name, path in sorted(all_sources.items()):
        if isinstance(path, Path) and path.exists():
            n = len(list(path.rglob("*.jpg"))+list(path.rglob("*.png")))
            tag = ("Roboflow" if "roboflow" in name
                   else "HuggingFace" if "hf" in name
                   else "Augmented" if "augmented" in name
                   else "Synthetic")
            print(f"  {name:40s} {n:6d} images  [{tag}]")
    print()
    print(f"  Total images: {total_imgs:,}")
    print()
    if total_imgs < 3000:
        print("⚠  Below 3 000 images — add your Roboflow API key above and re-run.")
    elif total_imgs < 10000:
        print(f"✓ Good — {total_imgs:,} images.")
    else:
        print(f"✓ Excellent — {total_imgs:,} images. Well-suited for high-accuracy CNN training.")
    print()
    print("Expected totals:")
    print("  Conjunctiva synthetic : 1 000/class × 4 = 4 000")
    print("  Nailbed    synthetic  : 1 000/class × 4 = 4 000")
    print("  Palm       synthetic  : 1 000/class × 4 = 4 000")
    print("  Conjunctiva real      : ~471  (Roboflow + HuggingFace)")
    print("  Conjunctiva augmented : ~3 768 (471 × 8)")
    print("  ─────────────────────────────────────")
    print("  Grand total           : ~16 239 images")
''').strip()

# Convert to Jupyter notebook source format (list of strings with \n)
NEW_CELL5_SOURCE = [line + '\n' for line in _CELL5_CODE.split('\n')]
NEW_CELL5_SOURCE[-1] = NEW_CELL5_SOURCE[-1].rstrip('\n')  # last line has no trailing \n

# ── New Cell 6 code ────────────────────────────────────────────────────────────
_CELL6_CODE = textwrap.dedent('''
    # ── Cell 6: Organise Dataset ──────────────────────────────────────────────────
    # Maps Cell 5 output folders → train/val/test splits per body part.
    #
    # Cell 5 creates:
    #   conjunctiva_hf/            (HuggingFace real — binary labels)
    #   conjunctiva_hf_augmented/  (8x augmented real)
    #   conjunctiva_roboflow/      (Roboflow real — if key was set)
    #   conjunctiva_roboflow_augmented/
    #   conjunctiva_synthetic/     (4-class synthetic: 0_Normal…3_Severe)
    #   nailbed_synthetic/
    #   palm_synthetic/
    import random, shutil
    from pathlib import Path

    random.seed(42)
    CLASS_NAMES = ["0_Normal", "1_Mild", "2_Moderate", "3_Severe"]

    BODY_PART_SOURCES = {
        "conjunctiva": [
            "conjunctiva_roboflow_augmented",
            "conjunctiva_roboflow",
            "conjunctiva_hf_augmented",
            "conjunctiva_hf",
            "conjunctiva_synthetic",
        ],
        "fingernails": ["nailbed_synthetic"],
        "skin":        ["palm_synthetic"],
    }

    def copy_split(files, output_base, body_part, cls):
        random.shuffle(files)
        n  = len(files)
        n1 = int(n * 0.70)
        n2 = int(n * 0.15)
        splits = {"train": files[:n1], "val": files[n1:n1+n2], "test": files[n1+n2:]}
        total = 0
        for split_name, split_files in splits.items():
            dest = Path(output_base) / body_part / split_name / cls
            dest.mkdir(parents=True, exist_ok=True)
            for i, src in enumerate(split_files):
                try:
                    shutil.copy2(src, dest / f"{src.stem}_{i:05d}{src.suffix}")
                    total += 1
                except Exception:
                    pass
        return total

    def organise_source(raw_dir, output_base, body_part):
        raw_dir = Path(raw_dir)
        if not raw_dir.exists():
            return 0
        exts = {".jpg", ".jpeg", ".png", ".bmp"}
        total = 0
        subdirs = [d for d in raw_dir.iterdir() if d.is_dir()]
        known = {d.name for d in subdirs}

        # 4-class synthetic layout
        if known & set(CLASS_NAMES):
            print(f"    layout: 4-class ({raw_dir.name})")
            for cls in CLASS_NAMES:
                cls_dir = raw_dir / cls
                if not cls_dir.exists():
                    continue
                imgs = [f for ext in exts for f in cls_dir.glob(f"*{ext}")]
                total += copy_split(imgs, output_base, body_part, cls)
            return total

        # Binary layout (real data)
        anemia_kw = {"anemia","anemic","positive","1_anemia","mild","moderate","severe"}
        bucket = {"0_Normal": [], "1_Mild": []}
        if subdirs:
            print(f"    layout: binary subdirs ({raw_dir.name})")
            for d in subdirs:
                imgs = [f for ext in exts for f in d.glob(f"*{ext}")]
                if any(k in d.name.lower() for k in anemia_kw):
                    bucket["1_Mild"].extend(imgs)
                else:
                    bucket["0_Normal"].extend(imgs)
        else:
            print(f"    layout: flat dir ({raw_dir.name})")
            for f in [f for ext in exts for f in raw_dir.glob(f"*{ext}")]:
                if any(k in f.stem.lower() for k in anemia_kw):
                    bucket["1_Mild"].append(f)
                else:
                    bucket["0_Normal"].append(f)
        for cls, imgs in bucket.items():
            total += copy_split(imgs, output_base, body_part, cls)
        return total

    print("Organising datasets...")
    grand_total = 0
    for body_part, sources in BODY_PART_SOURCES.items():
        part_total = 0
        print(f"\\n  [{body_part}]")
        for src_name in sources:
            raw_dir = DATASET_RAW / src_name
            if not raw_dir.exists():
                print(f"    skip {src_name} (not present)")
                continue
            n = organise_source(raw_dir, DATASET_PROC, body_part)
            print(f"    {src_name:45s} → {n:6d} images copied")
            part_total += n
        print(f"    subtotal: {part_total:,}")
        grand_total += part_total

    print(f"\\nTotal images organised: {grand_total:,}")
    print("\\nDataset summary:")
    for bp in ["conjunctiva", "fingernails", "skin"]:
        bp_dir = DATASET_PROC / bp
        if not bp_dir.exists():
            print(f"  {bp}: no data"); continue
        n = sum(1 for _ in bp_dir.rglob("*.jpg")) + sum(1 for _ in bp_dir.rglob("*.png"))
        cc = {cls: sum(1 for s in ["train","val","test"]
                  for _ in (bp_dir/s/cls).rglob("*.jpg") if (bp_dir/s/cls).exists())
              for cls in CLASS_NAMES}
        cc = {k: v for k, v in cc.items() if v}
        print(f"  {bp}: {n:,} images  {cc}")
    if grand_total == 0:
        raise RuntimeError("No images organised — check Cell 5 ran successfully.")
''').strip()

NEW_CELL6_SOURCE = [line + '\n' for line in _CELL6_CODE.split('\n')]
NEW_CELL6_SOURCE[-1] = NEW_CELL6_SOURCE[-1].rstrip('\n')


def update_notebook():
    print(f'Reading {NOTEBOOK}...')
    nb = json.loads(NOTEBOOK.read_text(encoding='utf-8'))

    def find_cell(nb, *markers):
        for i, cell in enumerate(nb['cells']):
            if cell.get('cell_type') == 'code':
                src = ''.join(cell.get('source', []))
                if any(m in src for m in markers):
                    return i
        return None

    # Patch Cell 5
    c5 = find_cell(nb, '# ── Cell 5:', 'Download Datasets', 'Multi-Source Dataset')
    if c5 is None:
        print('ERROR: Could not find Cell 5!'); return False
    print(f'  Patching Cell 5 (index {c5}) — multi-source dataset acquisition')
    nb['cells'][c5]['source'] = NEW_CELL5_SOURCE

    # Patch Cell 6
    c6 = find_cell(nb, '# ── Cell 6:', 'Organise Dataset', 'organise_binary_dataset')
    if c6 is None:
        print('WARNING: Could not find Cell 6 — inserting after Cell 5')
        new_cell = {"cell_type":"code","execution_count":None,
                    "metadata":{},"outputs":[],"source":NEW_CELL6_SOURCE}
        nb['cells'].insert(c5 + 1, new_cell)
    else:
        print(f'  Patching Cell 6 (index {c6}) — dataset organise with correct folder mapping')
        nb['cells'][c6]['source'] = NEW_CELL6_SOURCE

    NOTEBOOK.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n✓ Notebook updated: {NOTEBOOK}')
    print('  Cell 5: Roboflow → HuggingFace → Synthetic (1000/class) → Augment (8×)')
    print('  Cell 6: organise_source() handles both 4-class synthetic and binary real layouts')
    return True


if __name__ == '__main__':
    success = update_notebook()
    if not success:
        import sys
        sys.exit(1)
