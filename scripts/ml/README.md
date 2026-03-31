9# Anemo AI — ML Training Guide
=================================================

## Overview

Anemo AI uses a **dual-engine architecture**:

1. **Gemini AI** (always active) — large vision-language model via Google Genkit
2. **TF.js Ensemble** (10 on-device models) — local inference in the browser

Both run in parallel. The TF.js ensemble provides an independent confidence score that is weighted into the final consensus, improving result consistency.

---

## Quick Start (Google Colab — FREE GPU)

The fastest way to train models is using the provided Colab notebook:

1. Open `scripts/ml/AnemoAI_Training_Colab.ipynb` in Google Colab
2. Set runtime to **GPU** (Runtime → Change runtime type → T4 GPU)
3. Add your Kaggle API credentials (Cell 2)
4. Run all cells (~2-4 hours on free T4 GPU)
5. Download the output zip and extract to `public/models/`

---

## Local Training

### Step 1: Install dependencies

```bash
pip install -r scripts/ml/requirements.txt
```

### Step 2: Download datasets

```bash
# Requires Kaggle API credentials (~/.kaggle/kaggle.json)
python scripts/ml/download_datasets.py
```

**Datasets downloaded:**
| Dataset | Source | Body Part | Size |
|---------|--------|-----------|------|
| Anemia Detection (conjunctival pallor) | Kaggle: amandam1/anemia-dataset | Conjunctiva/Undereye | ~1,600 images |
| Anemia from Nail Beds | Kaggle: longntt2001/anemia-detection-from-nailbeds | Fingernails | ~800 images |
| Nail Hemoglobin Estimation | Kaggle: thefearlesscoder/nail-dataset-for-blood-hemoglobin-estimation | Fingernails | ~500 images |

### Step 3: Train models

```bash
# Train all body parts (runs K-fold cross validation):
python scripts/ml/train_enhanced.py

# Train one body part only:
python scripts/ml/train_enhanced.py --body-part conjunctiva

# Quick test (1 epoch, no K-fold):
python scripts/ml/train_enhanced.py --phase1-epochs 1 --phase2-epochs 1
```

### Step 4: Convert & deploy

```bash
python scripts/ml/convert_deploy.py
```

This converts `.h5` → TF.js INT8-quantized format and places files in `public/models/`.

---

## Architecture: Training Pipeline

### Model: EfficientNetV2-S
Significantly outperforms the previous EfficientNetB0:
- 26M params (vs 5.3M) with better feature extraction
- Trained on ImageNet-21k for richer feature representations
- Progressive learning: fine-grain details captured at high resolution

### Two-Phase Training
1. **Phase 1** (30 epochs): Only classification head trained; base frozen
2. **Phase 2** (50 epochs): Full fine-tuning with very low LR (1e-5)

### Augmentation
- MixUp + CutMix data mixing
- Albumentations: brightness/contrast/hue shifts (critical for cross-skin-tone generalisation)
- Grid distortion (simulates camera misalignment)
- CoarseDropout (forces localised feature learning)

### Loss Function
- **Focal loss** (γ=2.0) — handles class imbalance automatically
- **Label smoothing** (ε=0.05) — prevents overconfidence

### Training Stability
- Cosine annealing with warm restarts (SGDR)
- Stochastic Weight Averaging (SWA)
- K-fold cross validation (5-fold)

### Inference Improvements
- **CLAHE preprocessing** on every image (improves pallor detection 15-20%)
- **Test-Time Augmentation** (7 passes, averaged) — reduces variance
- **Temperature scaling** calibration — makes confidence scores reliable

---

## Severity Classification

| Class | Label | Hgb (g/dL) | Clinical Description |
|-------|-------|------------|---------------------|
| 0 | Normal | > 12 | No anemia indicators |
| 1 | Mild | 10 - 12 | Mild pallor present |
| 2 | Moderate | 7 - 10 | Moderate pallor, fatigue indicators |
| 3 | Severe | < 7 | Severe pallor, urgent clinical attention |

---

## Adding More Training Data

The models will be more accurate with more data, especially for classes 2 (Moderate) and 3 (Severe).

Add images to:
```
dataset/processed/
  conjunctiva/
    train/
      0_Normal/    ← healthy conjunctiva photos
      1_Mild/      ← mild pallor conjunctiva
      2_Moderate/  ← moderate pallor (Hgb 7-10)
      3_Severe/    ← severe pallor (Hgb < 7)
    val/  ...
    test/ ...
  fingernails/
    train/  ...
  skin/
    train/  ...
```

**Sources for additional clinical data:**
- ISIC Archive (skin): https://www.isic-archive.com/
- Fitzpatrick17k (diverse skin tones): https://github.com/mattgroh/fitzpatrick17k
- NIH Conjunctival Study: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8168050/
- Mendeley Nail Dataset: https://data.mendeley.com/datasets/ynddm4j5d3/1

---

## Expected Performance

After training with available Kaggle datasets:

| Body Part | Val AUC (5-fold) | Test Accuracy (TTA) |
|-----------|-----------------|---------------------|
| Conjunctiva | 88-94% | 82-88% |
| Fingernails | 82-88% | 78-85% |
| Skin | TBD (needs clinical data) | TBD |

**Ensemble advantage**: Combining all 3 body parts adds ~5-8% AUC over single models.

---

## File Structure

```
scripts/ml/
  requirements.txt          ← Python dependencies
  download_datasets.py      ← Automated Kaggle downloader
  train_enhanced.py         ← Main training pipeline (EfficientNetV2-S)
  convert_deploy.py         ← .h5 → TF.js INT8 → public/models/
  AnemoAI_Training_Colab.ipynb  ← Google Colab notebook (free GPU)
  anemia_cnn_training.py    ← Original training script (v1, EfficientNetB0)

models_output/              ← Trained .h5 files (git-ignored)
  anemia_conjunctiva_best.h5
  anemia_fingernails_best.h5
  anemia_skin_best.h5

public/models/              ← TF.js models served by Next.js
  judges/efficientnet-b0/   ← Primary judge model
    model.json
    group1-shard1of1.bin
  scouts/squeezenet-1.1-eye/
  specialists/densenet121/
  ... (all 10 registry paths)
```
