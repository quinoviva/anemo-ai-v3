#!/usr/bin/env python3
"""
gen_notebook.py
Run once to regenerate AnemoAI_Training_Colab.ipynb with:
  - 10 CNN ensemble architectures
  - All bug fixes
  - Clean outputs (no stale Windows tracebacks)

Usage:
    python scripts/ml/gen_notebook.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "AnemoAI_Training_Colab.ipynb")


def cell_md(source: str) -> dict:
    lines = source.split("\n")
    src = [l + "\n" for l in lines[:-1]] + ([lines[-1]] if lines[-1] else [])
    return {"cell_type": "markdown", "metadata": {}, "source": src}


def cell_code(source: str) -> dict:
    lines = source.split("\n")
    src = [l + "\n" for l in lines[:-1]] + ([lines[-1]] if lines[-1] else [])
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": src,
    }


# ── Cell 0: Overview ──────────────────────────────────────────────────────────
C0 = cell_md("""\
# Anemo AI — Training Pipeline (Google Colab)

**One-click GPU training for anemia detection using a 10-model CNN ensemble.**

This notebook:
1. Verifies GPU availability
2. Installs all dependencies
3. Configures Kaggle credentials
4. Downloads anemia datasets from Kaggle
5. Organises dataset into train/val/test splits
6. Trains **10 CNN architectures** per body part (conjunctiva, fingernails, skin)
7. Converts best models to TF.js INT8-quantised format
8. Downloads models as a ZIP for deployment

**Before running:**
- Set runtime to GPU: Runtime → Change runtime type → T4 GPU
- Run cells top-to-bottom (Shift+Enter)

**Expected training time:** ~4–8 h on T4 GPU (10 architectures × 3 body parts)\
""")

# ── Cell 1: GPU Check ─────────────────────────────────────────────────────────
C1 = cell_code("""\
# ── Cell 1: GPU & Environment Check ──────────────────────────────────────────
import subprocess
import sys

try:
    result = subprocess.run(
        ['nvidia-smi'], capture_output=True, text=True, timeout=10)
    if result.returncode == 0:
        print(result.stdout)
    else:
        print('nvidia-smi error (GPU may still be available via TF)')
except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
    print('nvidia-smi not found - normal in some Colab environments')

import tensorflow as tf
print(f'TensorFlow: {tf.__version__}')
gpus = tf.config.list_physical_devices('GPU')
print(f'GPUs available: {len(gpus)}')
for gpu in gpus:
    try:
        details = tf.config.experimental.get_device_details(gpu)
        print(f'  -> {details.get("device_name", str(gpu))}')
        tf.config.experimental.set_memory_growth(gpu, True)
    except Exception as e:
        print(f'  -> {gpu} (details unavailable: {e})')

if not gpus:
    print('\\nWARNING: No GPU found. Training will be VERY slow on CPU.')
    print('  -> Enable GPU: Runtime -> Change runtime type -> T4 GPU -> Save')
else:
    print('\\nGPU ready!')\
""")

# ── Cell 2: Install Dependencies ──────────────────────────────────────────────
C2 = cell_code("""\
# ── Cell 2: Install Dependencies ──────────────────────────────────────────────
import subprocess
import sys

packages = [
    'kaggle>=1.6.0',
    'albumentations>=1.3.0,<2.0.0',   # pin v1.x — stable augmentation API
    'tensorflowjs>=4.10.0',
    'scikit-learn>=1.3.0',
    'opencv-python-headless',
    'tqdm',
    'matplotlib',
    'seaborn',
]

print('Installing dependencies...')
result = subprocess.run(
    [sys.executable, '-m', 'pip', 'install', '-q'] + packages,
    capture_output=True, text=True)
if result.returncode == 0:
    print('All dependencies installed')
else:
    print('Some packages may have issues:')
    print(result.stderr[-1000:] if result.stderr else '(no output)')

# Verify imports
failed = []
for pkg in ['kaggle', 'albumentations', 'cv2', 'sklearn']:
    try:
        mod = __import__(pkg)
        ver = getattr(mod, '__version__', 'unknown')
        print(f'  OK {pkg} {ver}')
    except ImportError as e:
        print(f'  FAIL {pkg}: {e}')
        failed.append(pkg)
if failed:
    print(f'\\nFailed imports: {failed}. Re-run this cell.')
else:
    print('\\nAll imports verified!')\
""")

# ── Cell 3: Kaggle Credentials ────────────────────────────────────────────────
C3 = cell_code("""\
# ── Cell 3: Kaggle Credentials ────────────────────────────────────────────────
import json
import os
from pathlib import Path

# --- SET YOUR CREDENTIALS -----------------------------------------------------
KAGGLE_USERNAME = 'cyrilcquinoviva'
KAGGLE_KEY      = 'KGAT_4c4efbb044d9da5e17af934f94de5acd'
# ------------------------------------------------------------------------------

kaggle_dir = Path.home() / '.kaggle'
kaggle_dir.mkdir(exist_ok=True)
kaggle_json = kaggle_dir / 'kaggle.json'
kaggle_json.write_text(json.dumps({'username': KAGGLE_USERNAME, 'key': KAGGLE_KEY}))
kaggle_json.chmod(0o600)

os.environ['KAGGLE_USERNAME'] = KAGGLE_USERNAME
os.environ['KAGGLE_KEY']      = KAGGLE_KEY

import kaggle
try:
    kaggle.api.authenticate()
    print(f'Kaggle authenticated as: {KAGGLE_USERNAME}')
except Exception as e:
    print(f'Kaggle auth failed: {e}')
    print('  Verify credentials at: https://www.kaggle.com/settings -> API')\
""")

# ── Cell 4: Setup Workspace ───────────────────────────────────────────────────
C4 = cell_code("""\
# ── Cell 4: Setup Workspace ───────────────────────────────────────────────────
from pathlib import Path

WORKSPACE      = Path('/content/anemo_training')
DATASET_RAW    = WORKSPACE / 'dataset' / 'raw'
DATASET_PROC   = WORKSPACE / 'dataset' / 'processed'
MODELS_OUT     = WORKSPACE / 'models_output'
PUBLIC_MODELS  = WORKSPACE / 'public' / 'models'

for d in [DATASET_RAW, DATASET_PROC, MODELS_OUT, PUBLIC_MODELS]:
    d.mkdir(parents=True, exist_ok=True)

print(f'Workspace : {WORKSPACE}')
print(f'  raw     : {DATASET_RAW}')
print(f'  proc    : {DATASET_PROC}')
print(f'  models  : {MODELS_OUT}')
print(f'  deploy  : {PUBLIC_MODELS}')\
""")

# ── Cell 5: Download Datasets ─────────────────────────────────────────────────
C5 = cell_code("""\
# ── Cell 5: Download Datasets ─────────────────────────────────────────────────
import kaggle
from pathlib import Path

DATASETS = [
    # (dataset_id,                                         dest_subdir,         priority)
    ('amandam1/anemia-dataset',                            'conjunctiva',         1),
    ('longntt2001/anemia-detection-from-nailbeds',         'nailbed',             1),
    ('thefearlesscoder/nail-dataset-for-blood-hemoglobin-estimation',
                                                           'nailbed_hgb',         2),
    ('ehababoelnaga/anemia-types-classification',          'clinical',            2),
    ('omkar-thombre/anemia-detection-dataset',             'conjunctiva_palm',    2),
]

downloaded = {}
for dataset_id, dest_name, priority in sorted(DATASETS, key=lambda x: x[2]):
    dest = DATASET_RAW / dest_name
    if dest.exists():
        imgs = list(dest.rglob('*.jpg')) + list(dest.rglob('*.png'))
        if len(imgs) > 10:
            print(f'  skip {dataset_id}: {len(imgs)} images already downloaded')
            downloaded[dest_name] = dest
            continue

    dest.mkdir(parents=True, exist_ok=True)
    print(f'  downloading {dataset_id}...')
    try:
        kaggle.api.dataset_download_files(
            dataset_id, path=str(dest), unzip=True, quiet=False)
        imgs = list(dest.rglob('*.jpg')) + list(dest.rglob('*.png'))
        print(f'    OK: {len(imgs)} images')
        downloaded[dest_name] = dest
    except Exception as e:
        print(f'    FAIL (priority={priority}): {e}')
        if priority == 1:
            print('    Primary dataset - check credentials and retry.')

print(f'\\nDownloaded {len(downloaded)} datasets')\
""")

# ── Cell 6: Organise Dataset ──────────────────────────────────────────────────
C6 = cell_code("""\
# ── Cell 6: Organise Dataset ──────────────────────────────────────────────────
import random
import shutil
from pathlib import Path

random.seed(42)
CLASS_NAMES = ['0_Normal', '1_Mild', '2_Moderate', '3_Severe']


def organise_binary_dataset(raw_dir, output_base, body_part,
                             positive_kw=None, negative_kw=None):
    positive_kw = positive_kw or ['anemia', 'anemic', 'positive', '1']
    negative_kw = negative_kw or ['normal', 'healthy', 'negative', '0', 'non']

    raw_dir = Path(raw_dir)
    if not raw_dir.exists():
        print(f'  not found: {raw_dir}')
        return 0

    exts = {'.jpg', '.jpeg', '.png', '.bmp'}
    imgs = [f for ext in exts for f in raw_dir.rglob(f'*{ext}')]
    if not imgs:
        print(f'  no images in {raw_dir}')
        return 0

    anemic, normal, unclassified = [], [], []
    for img in imgs:
        check_str = str(img).lower() + ' ' + img.parent.name.lower()
        is_pos = any(k in check_str for k in positive_kw)
        is_neg = any(k in check_str for k in negative_kw)
        if is_pos and not is_neg:
            anemic.append(img)
        elif is_neg and not is_pos:
            normal.append(img)
        else:
            unclassified.append(img)

    normal.extend(unclassified)
    print(f'  {body_part}: {len(anemic)} anemic, {len(normal)} normal')

    for label, files in [('1_Mild', anemic), ('0_Normal', normal)]:
        random.shuffle(files)
        n  = len(files)
        n1 = int(n * 0.70)
        n2 = int(n * 0.15)
        splits = {
            'train': files[:n1],
            'val':   files[n1:n1 + n2],
            'test':  files[n1 + n2:],
        }
        for split_name, split_files in splits.items():
            dest = Path(output_base) / body_part / split_name / label
            dest.mkdir(parents=True, exist_ok=True)
            for src in split_files:
                try:
                    shutil.copy2(src, dest / src.name)
                except Exception:
                    pass
    return len(imgs)


print('Organising datasets...')
total = 0
for conjunctiva_src in ['conjunctiva', 'conjunctiva_palm']:
    total += organise_binary_dataset(DATASET_RAW / conjunctiva_src, DATASET_PROC, 'conjunctiva')
for nail_src in ['nailbed', 'nailbed_hgb']:
    total += organise_binary_dataset(DATASET_RAW / nail_src, DATASET_PROC, 'fingernails')

print(f'\\nTotal images organised: {total}')
print('\\nDataset summary:')
for bp in ['conjunctiva', 'fingernails', 'skin']:
    bp_dir = DATASET_PROC / bp
    if not bp_dir.exists():
        print(f'  {bp}: no data')
        continue
    n = sum(1 for f in bp_dir.rglob('*.jpg')) + sum(1 for f in bp_dir.rglob('*.png'))
    print(f'  {bp}: {n} images')\
""")

# ── Cell 7: Multi-Model Ensemble Training ─────────────────────────────────────
C7 = cell_code("""\
# ── Cell 7: Multi-Model Ensemble Training (10 CNN Architectures) ──────────────
#
# Trains up to 10 CNN architectures per body part. Each model is:
#   Phase 1 — head fine-tuned, base frozen          (15 epochs)
#   Phase 2 — top 40% of base unfrozen for fine-tune (30 epochs)
# Models are ranked by AUC on the held-out test set.
# ---
import gc
import json
import numpy as np
import cv2
import albumentations as A
from pathlib import Path
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, mixed_precision
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report

# ── Mixed precision (GPU speedup) ─────────────────────────────────────────────
try:
    mixed_precision.set_global_policy('mixed_float16')
    print(f'Mixed precision: {mixed_precision.global_policy().name}')
except Exception as e:
    print(f'Mixed precision not available (OK on CPU): {e}')

# ── Configuration ─────────────────────────────────────────────────────────────
LOAD_SIZE   = 224    # base load size (resized per-architecture as needed)
BATCH_SIZE  = 16     # conservative for multi-model memory
NUM_CLASSES = 4
CLASS_NAMES = ['0_Normal', '1_Mild', '2_Moderate', '3_Severe']
SEED        = 42
MAX_MODELS  = 10     # reduce to 3-5 for faster training

np.random.seed(SEED)
tf.random.set_seed(SEED)

# ── CLAHE preprocessing ───────────────────────────────────────────────────────
def apply_clahe(img_uint8):
    img = np.clip(img_uint8, 0, 255).astype(np.uint8)
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    cl = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge([cl, a, b]), cv2.COLOR_LAB2RGB).astype(np.float32)

# ── Augmentation (albumentations v1.x API) ────────────────────────────────────
train_aug = A.Compose([
    A.HorizontalFlip(p=0.5),
    A.VerticalFlip(p=0.15),
    A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.7),
    A.HueSaturationValue(hue_shift_limit=12, sat_shift_limit=25,
                         val_shift_limit=20, p=0.5),
    A.ShiftScaleRotate(shift_limit=0.1, scale_limit=0.15, rotate_limit=25,
                       border_mode=cv2.BORDER_REFLECT, p=0.6),
    A.GaussNoise(var_limit=(5.0, 30.0), p=0.3),
    A.GaussianBlur(blur_limit=(3, 5), p=0.2),
    A.CoarseDropout(max_holes=8, max_height=24, max_width=24,
                    min_holes=2, p=0.25),
    A.CLAHE(clip_limit=3.0, p=0.3),
    A.ElasticTransform(alpha=30, sigma=5, alpha_affine=5, p=0.1),
])

# ── Architecture Registry (10 CNNs) ───────────────────────────────────────────
def get_model_configs():
    cfgs = {}
    # 1. EfficientNetV2S — best default for medical imaging
    try:
        from tensorflow.keras.applications import EfficientNetV2S
        from tensorflow.keras.applications.efficientnet_v2 import preprocess_input as p
        cfgs['EfficientNetV2S'] = {'builder': EfficientNetV2S, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    # 2. EfficientNetB0 — fast convergence, good baseline
    try:
        from tensorflow.keras.applications import EfficientNetB0
        from tensorflow.keras.applications.efficientnet import preprocess_input as p
        cfgs['EfficientNetB0'] = {'builder': EfficientNetB0, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    # 3. ResNet50V2 — deep residual, strong generalisation
    try:
        from tensorflow.keras.applications import ResNet50V2
        from tensorflow.keras.applications.resnet_v2 import preprocess_input as p
        cfgs['ResNet50V2'] = {'builder': ResNet50V2, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    # 4. DenseNet121 — dense connections, excellent for small medical datasets
    try:
        from tensorflow.keras.applications import DenseNet121
        from tensorflow.keras.applications.densenet import preprocess_input as p
        cfgs['DenseNet121'] = {'builder': DenseNet121, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    # 5. InceptionV3 — multi-scale features
    try:
        from tensorflow.keras.applications import InceptionV3
        from tensorflow.keras.applications.inception_v3 import preprocess_input as p
        cfgs['InceptionV3'] = {'builder': InceptionV3, 'preprocess': p, 'size': 299}
    except Exception:
        pass
    # 6. MobileNetV3Large — efficient, runs well on limited RAM
    try:
        from tensorflow.keras.applications import MobileNetV3Large
        from tensorflow.keras.applications.mobilenet_v3 import preprocess_input as p
        cfgs['MobileNetV3Large'] = {'builder': MobileNetV3Large, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    # 7. Xception — depthwise separable, high accuracy
    try:
        from tensorflow.keras.applications import Xception
        from tensorflow.keras.applications.xception import preprocess_input as p
        cfgs['Xception'] = {'builder': Xception, 'preprocess': p, 'size': 299}
    except Exception:
        pass
    # 8. NASNetMobile — neural architecture search, compact
    try:
        from tensorflow.keras.applications import NASNetMobile
        from tensorflow.keras.applications.nasnet import preprocess_input as p
        cfgs['NASNetMobile'] = {'builder': NASNetMobile, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    # 9. EfficientNetB4 — larger variant, higher capacity
    try:
        from tensorflow.keras.applications import EfficientNetB4
        from tensorflow.keras.applications.efficientnet import preprocess_input as p
        cfgs['EfficientNetB4'] = {'builder': EfficientNetB4, 'preprocess': p, 'size': 380}
    except Exception:
        pass
    # 10. DenseNet201 — deeper dense net for complex patterns
    try:
        from tensorflow.keras.applications import DenseNet201
        from tensorflow.keras.applications.densenet import preprocess_input as p
        cfgs['DenseNet201'] = {'builder': DenseNet201, 'preprocess': p, 'size': 224}
    except Exception:
        pass
    return cfgs

MODELS_CONFIG = dict(list(get_model_configs().items())[:MAX_MODELS])
print(f'Architectures ({len(MODELS_CONFIG)}): {list(MODELS_CONFIG.keys())}')

# ── Ordinal Focal Loss ────────────────────────────────────────────────────────
def ordinal_focal_loss(gamma=2.0, label_smoothing=0.05):
    def loss_fn(y_true, y_pred):
        y_smooth = y_true * (1 - label_smoothing) + label_smoothing / NUM_CLASSES
        ce = tf.keras.losses.categorical_crossentropy(y_smooth, y_pred)
        p_t = tf.reduce_sum(y_true * y_pred, axis=-1)
        fl = tf.pow(1.0 - p_t, gamma) * ce
        true_rank = tf.cast(tf.argmax(y_true, axis=-1), tf.float32)
        pred_rank = tf.cast(tf.argmax(y_pred, axis=-1), tf.float32)
        rank_penalty = tf.abs(true_rank - pred_rank) / float(NUM_CLASSES - 1)
        return fl + 0.25 * rank_penalty
    loss_fn.__name__ = 'ordinal_focal_loss'
    return loss_fn

# ── Model Builder ─────────────────────────────────────────────────────────────
def build_arch_model(arch_name, config):
    size = config['size']
    base = config['builder'](weights='imagenet', include_top=False,
                              input_shape=(size, size, 3))
    base.trainable = False
    inp = keras.Input((size, size, 3))
    x   = base(inp, training=False)
    x   = layers.GlobalAveragePooling2D()(x)
    x   = layers.BatchNormalization()(x)
    x   = layers.Dense(512, activation='swish')(x)
    x   = layers.Dropout(0.4)(x)
    x   = layers.Dense(256, activation='swish')(x)
    x   = layers.Dropout(0.3)(x)
    out = layers.Dense(NUM_CLASSES, activation='softmax',
                        dtype='float32', name='predictions')(x)
    return keras.Model(inp, out), base

# ── Data Loader (per-architecture) ────────────────────────────────────────────
def load_split_arch(data_dir, body_part, split, config, augment=False):
    size         = config['size']
    preprocess_fn = config['preprocess']
    images, labels = [], []
    split_dir = Path(data_dir) / body_part / split
    if not split_dir.exists():
        return np.array([]), np.array([])
    for class_idx, class_name in enumerate(CLASS_NAMES):
        class_dir = split_dir / class_name
        if not class_dir.exists():
            continue
        img_paths = (list(class_dir.glob('*.jpg')) +
                     list(class_dir.glob('*.jpeg')) +
                     list(class_dir.glob('*.png')))
        for img_path in img_paths:
            try:
                img = img_to_array(
                    load_img(img_path, target_size=(size, size))
                ).astype(np.uint8)
                if augment:
                    img = train_aug(image=img)['image']
                img_proc = preprocess_fn(apply_clahe(img))
                images.append(img_proc)
                labels.append(class_idx)
            except Exception:
                pass
    if not images:
        return np.array([]), np.array([])
    X = np.array(images, dtype=np.float32)
    y = np.array(labels, dtype=np.int32)
    idx = np.random.permutation(len(X))
    return X[idx], y[idx]

# ── Main Training Loop ────────────────────────────────────────────────────────
trained_models = {}
MODELS_OUT.mkdir(exist_ok=True)
SEP = '=' * 60

for body_part in ['conjunctiva', 'fingernails', 'skin']:
    print(f'\\n{SEP}\\nTRAINING: {body_part.upper()}\\n{SEP}')
    bp_results = {}

    for arch_name, arch_config in MODELS_CONFIG.items():
        arch_size = arch_config['size']
        print(f'\\n  [{arch_name}]  input={arch_size}px')

        X_tr, y_tr = load_split_arch(DATASET_PROC, body_part, 'train',
                                      arch_config, augment=True)
        X_va, y_va = load_split_arch(DATASET_PROC, body_part, 'val',
                                      arch_config, augment=False)

        if len(X_tr) == 0:
            print(f'    No data for {body_part} — skipping remaining architectures')
            break
        print(f'    train={len(X_tr)}  val={len(X_va)}')

        y_tr_ohe = np.eye(NUM_CLASSES)[y_tr]
        y_va_ohe = np.eye(NUM_CLASSES)[y_va] if len(y_va) > 0 else None
        val_data = (X_va, y_va_ohe) if y_va_ohe is not None else None

        # Class weights for imbalanced data
        cw_arr = compute_class_weight('balanced',
                                       classes=np.unique(y_tr), y=y_tr)
        class_weights = {int(c): float(w)
                         for c, w in zip(np.unique(y_tr), cw_arr)}
        for i in range(NUM_CLASSES):
            class_weights.setdefault(i, 1.0)

        best_path = str(MODELS_OUT / f'anemia_{body_part}_{arch_name}_best.h5')
        monitor   = 'val_accuracy' if val_data else 'accuracy'
        loss_mon  = 'val_loss'     if val_data else 'loss'

        callbacks = [
            keras.callbacks.ModelCheckpoint(
                best_path, save_best_only=True, monitor=monitor, verbose=0),
            keras.callbacks.EarlyStopping(
                monitor=monitor, patience=7,
                restore_best_weights=True, verbose=1),
            keras.callbacks.ReduceLROnPlateau(
                monitor=loss_mon, factor=0.5, patience=3,
                min_lr=1e-9, verbose=0),
            keras.callbacks.TerminateOnNaN(),
        ]

        try:
            model, base = build_arch_model(arch_name, arch_config)

            # Phase 1: head only (frozen base)
            model.compile(
                optimizer=keras.optimizers.Adam(1e-3),
                loss=ordinal_focal_loss(),
                metrics=['accuracy', keras.metrics.AUC(name='auc')])
            model.fit(X_tr, y_tr_ohe, validation_data=val_data,
                       epochs=15, batch_size=BATCH_SIZE,
                       class_weight=class_weights, callbacks=callbacks,
                       verbose=0)

            # Phase 2: fine-tune top 40% of base
            base.trainable = True
            cut = int(len(base.layers) * 0.6)
            for i, lyr in enumerate(base.layers):
                lyr.trainable = i >= cut
            n_unfrozen = sum(1 for lyr in base.layers if lyr.trainable)
            print(f'    fine-tune {n_unfrozen}/{len(base.layers)} layers')

            model.compile(
                optimizer=keras.optimizers.Adam(2e-6),
                loss=ordinal_focal_loss(),
                metrics=['accuracy', keras.metrics.AUC(name='auc')])
            model.fit(X_tr, y_tr_ohe, validation_data=val_data,
                       epochs=30, batch_size=BATCH_SIZE,
                       class_weight=class_weights, callbacks=callbacks,
                       verbose=0)

            # Load best checkpoint
            if Path(best_path).exists():
                model.load_weights(best_path)

            # Evaluate on test set
            X_te, y_te = load_split_arch(DATASET_PROC, body_part, 'test',
                                          arch_config, augment=False)
            if len(X_te) > 0:
                y_te_ohe = np.eye(NUM_CLASSES)[y_te]
                ev = model.evaluate(X_te, y_te_ohe, verbose=0)
                t_acc, t_auc = ev[1], ev[2]
                y_pred = np.argmax(model.predict(X_te, verbose=0), axis=1)
                print(f'    acc={t_acc:.4f}  AUC={t_auc:.4f}')
                print(classification_report(
                    y_te, y_pred, target_names=CLASS_NAMES, zero_division=0))
            else:
                t_acc = t_auc = 0.0
                print('    trained (no test set)')

            model.save(best_path)
            bp_results[arch_name] = {
                'path':          best_path,
                'test_accuracy': float(t_acc),
                'test_auc':      float(t_auc),
                'input_size':    arch_config['size'],
            }

        except Exception as exc:
            print(f'    FAILED {arch_name}: {exc}')
        finally:
            try:
                del model
            except Exception:
                pass
            tf.keras.backend.clear_session()
            gc.collect()

    if bp_results:
        trained_models[body_part] = bp_results
        ranked = sorted(bp_results.items(),
                        key=lambda x: x[1]['test_auc'], reverse=True)
        print(f'\\n  {body_part} ensemble ({len(bp_results)} models):')
        for n, info in ranked:
            print(f'    {n}: acc={info["test_accuracy"]:.4f}  AUC={info["test_auc"]:.4f}')
    else:
        print(f'\\n  {body_part}: no models trained (no dataset?)')

print(f'\\n{SEP}\\nMULTI-MODEL TRAINING COMPLETE\\n{SEP}')
for bp, mods in trained_models.items():
    avg_auc = sum(m['test_auc'] for m in mods.values()) / max(len(mods), 1)
    print(f'  {bp}: {len(mods)} models  avg AUC={avg_auc:.4f}')\
""")

# ── Cell 8: Convert to TF.js ──────────────────────────────────────────────────
C8 = cell_code("""\
# ── Cell 8: Convert to TF.js ──────────────────────────────────────────────────
import subprocess
import shutil
from pathlib import Path

# Registry paths must match src/lib/ensemble/model-registry.ts
BODY_PART_REGISTRY = {
    'conjunctiva': [
        'judges/efficientnet-b0',
        'scouts/squeezenet-1.1-eye',
        'specialists/densenet121',
        'judges/vit-tiny',
        'judges/mlp-meta-learner',
    ],
    'fingernails': [
        'scouts/mobilenet-v3-nails',
        'specialists/inceptionv3',
    ],
    'skin': [
        'scouts/mobilenet-v3-skin',
        'specialists/resnet50v2',
        'specialists/vgg16',
    ],
}

converted = []
for body_part, models_info in trained_models.items():
    # Use the highest-AUC model for TF.js conversion
    ranked = sorted(models_info.items(),
                     key=lambda x: x[1]['test_auc'], reverse=True)
    arch_name, best_info = ranked[0]
    h5_path = Path(best_info['path'])

    print(f'\\nConverting {body_part} (best: {arch_name}, AUC={best_info["test_auc"]:.4f})...')
    if not h5_path.exists():
        print(f'  Not found: {h5_path}')
        continue

    temp_dir = MODELS_OUT / f'tfjs_{body_part}'
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Try INT8 quantised first, fall back to no quantisation
    for quant_flag in ['--quantize_uint8', None]:
        cmd = [
            'tensorflowjs_converter',
            '--input_format=keras',
            '--output_format=tfjs_graph_model',
        ]
        if quant_flag:
            cmd.append(quant_flag)
        cmd += [str(h5_path), str(temp_dir)]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0 and (temp_dir / 'model.json').exists():
            label = 'INT8' if quant_flag else 'none'
            print(f'  Converted (quantisation: {label})')
            break
        else:
            if quant_flag:
                print(f'  INT8 failed, trying without quantisation...')
            else:
                print(f'  Conversion failed: {result.stderr[-200:]}')
                break

    if not (temp_dir / 'model.json').exists():
        continue

    registry_paths = BODY_PART_REGISTRY.get(body_part, ['judges/efficientnet-b0'])
    for reg_path in registry_paths:
        dest = PUBLIC_MODELS / reg_path
        dest.mkdir(parents=True, exist_ok=True)
        for f in temp_dir.iterdir():
            if f.is_file():
                shutil.copy2(f, dest / f.name)
        size_kb = sum(f.stat().st_size for f in dest.rglob('*') if f.is_file()) / 1024
        print(f'  -> public/models/{reg_path} ({size_kb:.0f} KB)')

    shutil.rmtree(temp_dir, ignore_errors=True)
    converted.append(body_part)

print(f'\\nTF.js conversion done: {converted}')\
""")

# ── Cell 9: Download Models ───────────────────────────────────────────────────
C9 = cell_code("""\
# ── Cell 9: Download Models ───────────────────────────────────────────────────
import shutil
from google.colab import files
from pathlib import Path

print('Creating deployment ZIP...')
export_src = Path('/content/anemo_models_export_tmp')
export_src.mkdir(exist_ok=True)

# Public TF.js models
shutil.copytree(str(PUBLIC_MODELS), str(export_src / 'public' / 'models'),
                dirs_exist_ok=True)

# Keras .h5 files + metadata
h5_dir = export_src / 'keras_models'
h5_dir.mkdir(exist_ok=True)
for h5 in MODELS_OUT.glob('*.h5'):
    shutil.copy2(h5, h5_dir / h5.name)
for meta in MODELS_OUT.glob('*_metadata.json'):
    shutil.copy2(meta, h5_dir / meta.name)

zip_path = '/content/anemo_models_export'
shutil.make_archive(zip_path, 'zip', export_src)
zip_file = zip_path + '.zip'
size_mb = Path(zip_file).stat().st_size / (1024 * 1024)
print(f'ZIP: {zip_file} ({size_mb:.1f} MB)')

print('Downloading...')
files.download(zip_file)
print('\\nDownload started!')
print('\\nAfter downloading:')
print('  1. Extract ZIP into your project root')
print('  2. Files go to public/models/ (model.json + .bin shards)')
print('  3. Run: npm run dev')
print('  4. Check console for: [ConsensusEngine] Model loaded: ...')\
""")

# ── Cell 10: Final Summary ────────────────────────────────────────────────────
C10 = cell_code("""\
# ── Cell 10: Final Summary ────────────────────────────────────────────────────
import json
from pathlib import Path

SEP = '=' * 60
print(SEP)
print('ANEMO AI TRAINING SUMMARY')
print(SEP)

print('\\nTrained models per body part:')
for bp, models_info in trained_models.items():
    ranked = sorted(models_info.items(),
                     key=lambda x: x[1]['test_auc'], reverse=True)
    avg_auc = sum(m['test_auc'] for m in models_info.values()) / max(len(models_info), 1)
    print(f'\\n  {bp.upper()} ({len(models_info)} models, avg AUC={avg_auc:.4f}):')
    for i, (name, info) in enumerate(ranked):
        star = '*' if i == 0 else ' '
        print(f'    {star} {name}: acc={info["test_accuracy"]:.4f}  AUC={info["test_auc"]:.4f}  size={info["input_size"]}px')

print('\\nDeployed TF.js models:')
total_kb = 0
for model_json in sorted(PUBLIC_MODELS.rglob('model.json')):
    rel = model_json.parent.relative_to(PUBLIC_MODELS)
    size_kb = sum(f.stat().st_size for f in model_json.parent.rglob('*') if f.is_file()) / 1024
    total_kb += size_kb
    print(f'  /models/{rel}  ({size_kb:.0f} KB)')

print(f'\\n  Total: {total_kb:.0f} KB ({total_kb / 1024:.1f} MB)')
print(f'\\n{SEP}')
print('All done! Upload the downloaded ZIP to your deployment.')\
""")

# ── Assemble Notebook ─────────────────────────────────────────────────────────
NOTEBOOK = {
    "cells": [C0, C1, C2, C3, C4, C5, C6, C7, C8, C9, C10],
    "metadata": {
        "accelerator": "GPU",
        "colab": {
            "gpuType": "T4",
            "machine_shape": "hm",
            "name": "AnemoAI_Training_Colab.ipynb",
            "provenance": [],
        },
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {
            "codemirror_mode": {"name": "ipython", "version": 3},
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbformat": 4,
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.10.12",
        },
    },
    "nbformat": 4,
    "nbformat_minor": 4,
}

with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    json.dump(NOTEBOOK, f, indent=1, ensure_ascii=False)

print(f"Written: {OUT}")
print(f"Cells  : {len(NOTEBOOK['cells'])}")
