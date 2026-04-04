#!/usr/bin/env python3
"""
ANEMO-AI v3 — CNN Ensemble Training Pipeline
Multi-Model Anemia Detection from Visual Biomarkers

3-Tier Architecture (10 Models)
| Tier | Role        | Models                                                                  | Input   |
|------|-------------|-------------------------------------------------------------------------|---------|
| 1    | Scouts      | MobileNetV3-Small (Skin), MobileNetV3-Small (Nails), SqueezeNet 1.1    | 224/227 |
| 2    | Specialists | ResNet50V2, DenseNet121, InceptionV3, VGG16                            | 224/299 |
| 3    | Judges      | EfficientNet-B0, ViT-Tiny, MLP Meta-Learner (KD)                      | 224     |

Body Parts & Severity:
- Conjunctiva (inner eyelid), Fingernails (nailbed), Skin/Palm (palmar creases)
- Normal (>12 g/dL), Mild (10-12), Moderate (7-10), Severe (<7)

Datasets:
| # | Source                                             | Body Part   | ~Images | Labels          |
|---|----------------------------------------------------|-------------|---------|-----------------|
| 1 | Roboflow puss-in-boost/nemia                       | Conjunctiva | 400     | Normal/Anemic   |
| 2 | Roboflow gourishetty-sindhusha/anemia-classification| Conjunctiva | 642     | Anemic/Non-anemic|
| 3 | Roboflow rcs-le1h6/anemia-olhos                    | Conjunctiva | 228     | 3-level severity|
| 4 | Roboflow studied/kuku-anemia-6ifty                 | Fingernails | 534     | Anemia/Non_Anemia|
| 5 | HuggingFace Yahaira/anemia-eyes                    | Conjunctiva | 218     | Binary          |
| 6-8 | Synthetic (Conj/Nails/Palm)                      | All         | 2400    | 4-class x 200   |
| 9-10| Augmentation (4x real)                            | Conj + Nails| ~8000   | Inherited       |

Output Format:
- Single sigmoid [0,1] -> Hgb = 5.0 + confidence x 11.0
- Exported as TF.js Graph Model with INT8 quantization
"""

# ============================================================
# CELL 1: COMPREHENSIVE DIAGNOSTIC CHECKUP
# ============================================================
import sys, os, platform, shutil, warnings, time, json
warnings.filterwarnings('ignore')

print('=' * 70)
print('  ANEMO-AI v3 — Pre-Training Diagnostic Checkup')
print('=' * 70)

IS_KAGGLE = os.path.exists('/kaggle')
BASE_DIR = '/kaggle/working' if IS_KAGGLE else '.'
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'trained_models')
EXPORT_DIR = os.path.join(BASE_DIR, 'tfjs_export')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

print(f'\nEnvironment: {"Kaggle" if IS_KAGGLE else "Local"}')
print(f'Base dir:    {BASE_DIR}')

import tensorflow as tf
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    for g in gpus:
        tf.config.experimental.set_memory_growth(g, True)
    dev = tf.config.experimental.get_device_details(gpus[0])
    print(f'\nGPU:  {dev.get("device_name", gpus[0].name)}')
else:
    print('\nGPU:  None detected (will use CPU)')

print(f'TF:   {tf.__version__}')
print(f'Py:   {sys.version.split()[0]}')
print(f'CUDA: {tf.test.is_built_with_cuda()}')

try:
    import psutil
    ram = psutil.virtual_memory()
    print(f'RAM:  {ram.total/1e9:.1f}GB total, {ram.available/1e9:.1f}GB free')
except: print('RAM:  psutil not available')

total, used, free = shutil.disk_usage(BASE_DIR)
print(f'Disk: {free/1e9:.1f}GB free of {total/1e9:.1f}GB')

# Enable mixed precision for 2x speedup
tf.keras.mixed_precision.set_global_policy('mixed_float16')
print(f'\nMixed precision: {tf.keras.mixed_precision.global_policy().name}')

# Pre-flight checks
checks = [
    ('TensorFlow >= 2.10', int(tf.__version__.split('.')[1]) >= 10),
    ('GPU available', len(gpus) > 0),
    ('Mixed precision active', 'float16' in str(tf.keras.mixed_precision.global_policy().name)),
    ('Disk > 10GB free', free/1e9 > 10),
]
print('\nPre-flight:')
for name, ok in checks:
    print(f'  {"PASS" if ok else "WARN"} {name}')

print(f'\nPlan: 10 models, ~12.5k images, ~60-90 min on GPU')
print('Diagnostic complete.\n')


# ============================================================
# CELL 2: INSTALL DEPENDENCIES & CONFIGURATION
# ============================================================
os.system('pip install -q roboflow datasets tensorflowjs Pillow scikit-learn matplotlib seaborn tqdm')

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model, callbacks, optimizers
from tensorflow.keras.applications import (
    MobileNetV3Small, ResNet50V2, DenseNet121, InceptionV3, VGG16, EfficientNetB0
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from PIL import Image, ImageDraw, ImageFilter
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm.auto import tqdm
import gc, glob, shutil, random, math, cv2

np.random.seed(42)
tf.random.set_seed(42)
random.seed(42)

# ---- CONFIGURATION ----
CFG = {
    # Training
    'batch_size': 32,
    'epochs_frozen': 8,      # Phase 1: frozen backbone
    'epochs_finetune': 15,   # Phase 2: unfrozen fine-tune
    'lr_frozen': 1e-3,
    'lr_finetune': 1e-5,
    'patience': 5,
    'label_smoothing': 0.05,
    'warmup_epochs': 2,
    'weight_decay': 1e-4,
    'dropout': 0.3,
    'export_epochs': 3,      # Brief final fine-tune for export head
    
    # Synthetic data
    'synthetic_per_class': 200,  # 200 images × 4 classes × 3 body parts = 2400
    'augment_factor': 4,         # Each real image → 4 augmented variants
    
    # Confidence regression targets (midpoints of severity ranges)
    'targets': {'Normal': 0.85, 'Mild': 0.55, 'Moderate': 0.32, 'Severe': 0.09},
    
    # Classification thresholds (maps confidence → severity)
    'thresholds': [0.636, 0.455, 0.182],  # Normal|Mild|Moderate|Severe
    
    # Model catalog
    'models': {
        # Tier 1: Quality Scouts
        'scout-mobilenet-skin':  {'arch': 'MobileNetV3Small', 'size': 224, 'tier': 1, 'weight': 0.5, 'body': 'skin'},
        'scout-mobilenet-nails': {'arch': 'MobileNetV3Small', 'size': 224, 'tier': 1, 'weight': 0.5, 'body': 'nails'},
        'scout-squeezenet-eye':  {'arch': 'SqueezeNet',       'size': 227, 'tier': 1, 'weight': 0.5, 'body': 'eye'},
        # Tier 2: Specialists
        'specialist-resnet50v2':   {'arch': 'ResNet50V2',   'size': 224, 'tier': 2, 'weight': 1.0, 'body': 'all'},
        'specialist-densenet121':  {'arch': 'DenseNet121',  'size': 224, 'tier': 2, 'weight': 1.0, 'body': 'all'},
        'specialist-inceptionv3':  {'arch': 'InceptionV3',  'size': 299, 'tier': 2, 'weight': 1.0, 'body': 'all'},
        'specialist-vgg16':        {'arch': 'VGG16',        'size': 224, 'tier': 2, 'weight': 1.0, 'body': 'all'},
        # Tier 3: Judges
        'judge-efficientnet-b0':   {'arch': 'EfficientNetB0', 'size': 224, 'tier': 3, 'weight': 1.5, 'body': 'all'},
        'judge-vit-tiny':          {'arch': 'ViT',            'size': 224, 'tier': 3, 'weight': 1.5, 'body': 'all'},
        'judge-mlp-meta-learner':  {'arch': 'MetaLearner',   'size': 224, 'tier': 3, 'weight': 2.0, 'body': 'all'},
    }
}

CLASSES = ['Normal', 'Mild', 'Moderate', 'Severe']
print(f'Config loaded: {len(CFG["models"])} models, batch={CFG["batch_size"]}')
print(f'Synthetic: {CFG["synthetic_per_class"]}×4×3 = {CFG["synthetic_per_class"]*4*3} images')


# ============================================================
# CELL 3: DOWNLOAD & ORGANIZE REAL DATASETS
# ============================================================
# Organized into: data/{eye,nails,skin}/{Normal,Mild,Moderate,Severe}/

for bp in ['eye', 'nails', 'skin']:
    for cls in CLASSES:
        os.makedirs(os.path.join(DATA_DIR, bp, cls), exist_ok=True)

def download_roboflow_dataset(workspace, project, version, body_part, label_map):
    """Download from Roboflow and sort into severity folders."""
    try:
        from roboflow import Roboflow
        rf = Roboflow(api_key=os.environ.get('ROBOFLOW_API_KEY', 'YOUR_KEY'))
        proj = rf.workspace(workspace).project(project)
        ds = proj.version(version).download('folder', location=os.path.join(DATA_DIR, 'tmp_rf'))
        
        # Sort images by label
        src_dir = os.path.join(DATA_DIR, 'tmp_rf')
        count = 0
        for split in ['train', 'valid', 'test']:
            split_dir = os.path.join(src_dir, split)
            if not os.path.exists(split_dir):
                continue
            for label_folder in os.listdir(split_dir):
                mapped = label_map.get(label_folder.lower(), label_map.get(label_folder, None))
                if mapped is None:
                    continue
                folder = os.path.join(split_dir, label_folder)
                if not os.path.isdir(folder):
                    continue
                for img in os.listdir(folder):
                    if img.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp')):
                        dst = os.path.join(DATA_DIR, body_part, mapped, f'rf_{project}_{count}_{img}')
                        shutil.copy2(os.path.join(folder, img), dst)
                        count += 1
        
        shutil.rmtree(src_dir, ignore_errors=True)
        print(f'  {project}: {count} images -> {body_part}/')
        return count
    except Exception as e:
        print(f'  {project}: SKIPPED ({e})')
        return 0

def download_huggingface_dataset(repo, body_part, label_map):
    """Download from HuggingFace datasets."""
    try:
        # Load HF token from Kaggle Secrets if available
        try:
            from kaggle_secrets import UserSecretsClient
            hf_token = UserSecretsClient().get_secret("HF_TOKEN")
            if hf_token:
                os.environ['HF_TOKEN'] = hf_token
        except Exception:
            pass  # Not on Kaggle or secret not set
        from datasets import load_dataset
        ds = load_dataset(repo, split='train')
        count = 0
        for i, item in enumerate(ds):
            img = item.get('image', None)
            label = item.get('label', None)
            if img is None or label is None:
                continue
            mapped = label_map.get(str(label), label_map.get(label, 'Normal'))
            save_path = os.path.join(DATA_DIR, body_part, mapped, f'hf_{repo.split("/")[-1]}_{i}.jpg')
            if isinstance(img, Image.Image):
                img.convert('RGB').save(save_path)
            count += 1
        print(f'  {repo}: {count} images -> {body_part}/')
        return count
    except Exception as e:
        print(f'  {repo}: SKIPPED ({e})')
        return 0

print('Downloading real datasets...')
total_real = 0

# Binary label maps (Anemic → split across Mild/Moderate for diversity)
binary_conj = {
    'normal': 'Normal', 'non-anemic': 'Normal', 'non_anemia': 'Normal',
    'nonanemic': 'Normal', 'healthy': 'Normal', 'non anemia': 'Normal',
    'anemic': 'Moderate', 'anemia': 'Moderate', 'positive': 'Moderate',
    'negative': 'Normal', 'possibly positive': 'Mild',
    '0': 'Normal', '1': 'Moderate',
}
binary_nails = {
    'non_anemia': 'Normal', 'non-anemia': 'Normal', 'normal': 'Normal',
    'anemia': 'Moderate', 'anemic': 'Moderate',
}
severity_3 = {
    'negative': 'Normal', 'possibly positive': 'Mild', 'positive': 'Moderate',
}

# Roboflow datasets
rf_datasets = [
    ('puss-in-boost', 'nemia', 1, 'eye', binary_conj),
    ('gourishetty-sindhusha-tb4zc', 'anemia-classification-jtcz7', 1, 'eye', binary_conj),
    ('rcs-le1h6', 'anemia-olhos', 1, 'eye', severity_3),
    ('studied', 'kuku-anemia-6ifty', 1, 'nails', binary_nails),
]
for ws, proj, ver, bp, lm in rf_datasets:
    total_real += download_roboflow_dataset(ws, proj, ver, bp, lm)

# HuggingFace datasets
total_real += download_huggingface_dataset('Yahaira/anemia-eyes', 'eye',
    {'0': 'Normal', '1': 'Moderate', 0: 'Normal', 1: 'Moderate'})

print(f'\nTotal real images downloaded: {total_real}')
print('(If 0: Roboflow API key not set — will use synthetic data only)')

# Count per class per body part
for bp in ['eye', 'nails', 'skin']:
    counts = {c: len(glob.glob(os.path.join(DATA_DIR, bp, c, '*'))) for c in CLASSES}
    print(f'  {bp}: {counts}')


# ============================================================
# CELL 4: SYNTHETIC DATA GENERATION
# ============================================================
# Generates medically-informed synthetic images for all 3 body parts
# 200 images × 4 severity classes × 3 body parts = 2400 images

def add_noise_texture(img_array, intensity=0.08):
    """Add multi-octave Gaussian noise for realistic texture."""
    h, w, c = img_array.shape
    noise = np.zeros_like(img_array, dtype=np.float32)
    for octave in [1, 2, 4]:
        small = np.random.randn(h//octave+1, w//octave+1, c).astype(np.float32)
        upscaled = cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
        noise += upscaled / octave
    noise = noise * intensity * 255
    result = np.clip(img_array.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return result

def add_vessel_pattern(draw, w, h, color, count=8):
    """Draw branching vessel-like patterns."""
    for _ in range(count):
        x, y = random.randint(0, w), random.randint(0, h)
        for seg in range(random.randint(3, 8)):
            x2 = x + random.randint(-30, 30)
            y2 = y + random.randint(-30, 30)
            x2, y2 = max(0, min(w, x2)), max(0, min(h, y2))
            width = random.randint(1, 3)
            r, g, b = color
            vc = (r + random.randint(-20, 20), g + random.randint(-10, 10), b + random.randint(-10, 10))
            vc = tuple(max(0, min(255, c)) for c in vc)
            draw.line([(x, y), (x2, y2)], fill=vc, width=width)
            x, y = x2, y2

def add_crease_lines(draw, w, h, color, count=5):
    """Draw palm crease-like curved lines."""
    for _ in range(count):
        points = []
        x = random.randint(0, w//4)
        y = random.randint(h//4, 3*h//4)
        for _ in range(random.randint(4, 8)):
            points.append((x, y))
            x += random.randint(15, 40)
            y += random.randint(-20, 20)
        if len(points) >= 2:
            draw.line(points, fill=color, width=random.randint(1, 3))

# Skin tone base colors (diverse representation)
SKIN_TONES = [
    (240, 200, 166), (210, 160, 120), (180, 130, 90),
    (150, 100, 70), (120, 80, 55), (90, 60, 40),
    (255, 220, 185), (225, 185, 145),
]

# Color specs per severity per body part (R, G, B ranges)
COLOR_SPECS = {
    'eye': {
        'Normal':   {'base': (200, 100, 100), 'var': (30, 30, 20), 'vessel': (180, 60, 60), 'vessel_n': 12},
        'Mild':     {'base': (210, 150, 140), 'var': (25, 25, 25), 'vessel': (200, 120, 110), 'vessel_n': 8},
        'Moderate': {'base': (220, 190, 175), 'var': (20, 20, 20), 'vessel': (210, 170, 155), 'vessel_n': 4},
        'Severe':   {'base': (238, 225, 218), 'var': (15, 15, 15), 'vessel': (230, 215, 205), 'vessel_n': 2},
    },
    'nails': {
        'Normal':   {'base': (225, 170, 165), 'var': (20, 25, 20), 'lunula': True},
        'Mild':     {'base': (230, 195, 190), 'var': (20, 20, 20), 'lunula': True},
        'Moderate': {'base': (235, 215, 210), 'var': (15, 15, 15), 'lunula': False},
        'Severe':   {'base': (242, 235, 232), 'var': (10, 10, 10), 'lunula': False},
    },
    'skin': {
        'Normal':   {'crease_darken': 40, 'crease_n': 6, 'sat_mult': 1.0},
        'Mild':     {'crease_darken': 25, 'crease_n': 5, 'sat_mult': 0.8},
        'Moderate': {'crease_darken': 12, 'crease_n': 4, 'sat_mult': 0.55},
        'Severe':   {'crease_darken': 5,  'crease_n': 3, 'sat_mult': 0.3},
    }
}

def generate_conjunctiva(severity, size=224):
    spec = COLOR_SPECS['eye'][severity]
    r, g, b = spec['base']
    vr = spec['var']
    base_color = (
        r + random.randint(-vr[0], vr[0]),
        g + random.randint(-vr[1], vr[1]),
        b + random.randint(-vr[2], vr[2]),
    )
    base_color = tuple(max(0, min(255, c)) for c in base_color)
    img = Image.new('RGB', (size, size), base_color)
    draw = ImageDraw.Draw(img)
    # Add gradient (lighter center, darker edges for depth)
    arr = np.array(img, dtype=np.float32)
    cx, cy = size//2, size//2
    Y, X = np.mgrid[0:size, 0:size]
    dist = np.sqrt((X-cx)**2 + (Y-cy)**2) / (size*0.6)
    dist = np.clip(dist, 0, 1)
    for c in range(3):
        arr[:,:,c] = arr[:,:,c] * (1.0 - 0.15 * dist)
    img = Image.fromarray(arr.astype(np.uint8))
    draw = ImageDraw.Draw(img)
    # Vessels
    add_vessel_pattern(draw, size, size, spec['vessel'], spec['vessel_n'])
    # Texture
    arr = add_noise_texture(np.array(img), intensity=0.06)
    # Light blur for realism
    img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.5)))
    return img

def generate_fingernail(severity, size=224):
    spec = COLOR_SPECS['nails'][severity]
    r, g, b = spec['base']
    vr = spec['var']
    skin_tone = random.choice(SKIN_TONES)
    # Fill with skin color background
    img = Image.new('RGB', (size, size), skin_tone)
    draw = ImageDraw.Draw(img)
    # Draw nail shape (rounded rectangle)
    nail_color = (
        r + random.randint(-vr[0], vr[0]),
        g + random.randint(-vr[1], vr[1]),
        b + random.randint(-vr[2], vr[2]),
    )
    nail_color = tuple(max(0, min(255, c)) for c in nail_color)
    margin = size // 6
    draw.rounded_rectangle(
        [margin, margin + size//8, size - margin, size - margin//2],
        radius=size//6, fill=nail_color
    )
    # Lunula (white half-moon)
    if spec.get('lunula', False):
        lx = size // 2
        ly = size - margin//2 - size//10
        lr = size // 6
        draw.ellipse([lx-lr, ly-lr//2, lx+lr, ly+lr//2], fill=(250, 248, 245))
    arr = add_noise_texture(np.array(img), intensity=0.05)
    img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=random.uniform(0.3, 1.0)))
    return img

def generate_palm(severity, size=224):
    spec = COLOR_SPECS['skin'][severity]
    skin_base = random.choice(SKIN_TONES)
    # Desaturate based on severity
    r, g, b = skin_base
    gray = int(0.299*r + 0.587*g + 0.114*b)
    sm = spec['sat_mult']
    palm_color = (
        int(gray + (r - gray) * sm),
        int(gray + (g - gray) * sm),
        int(gray + (b - gray) * sm),
    )
    img = Image.new('RGB', (size, size), palm_color)
    draw = ImageDraw.Draw(img)
    # Gradient (curvature)
    arr = np.array(img, dtype=np.float32)
    Y, X = np.mgrid[0:size, 0:size]
    cx, cy = size//2 + random.randint(-20, 20), size//2 + random.randint(-20, 20)
    dist = np.sqrt((X-cx)**2 + (Y-cy)**2) / (size*0.7)
    for c in range(3):
        arr[:,:,c] *= (1.0 - 0.12 * np.clip(dist, 0, 1))
    img = Image.fromarray(arr.astype(np.uint8))
    draw = ImageDraw.Draw(img)
    # Crease lines (darker = healthier)
    darken = spec['crease_darken']
    crease_color = tuple(max(0, c - darken) for c in palm_color)
    add_crease_lines(draw, size, size, crease_color, spec['crease_n'])
    arr = add_noise_texture(np.array(img), intensity=0.07)
    img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.2)))
    return img

generators = {'eye': generate_conjunctiva, 'nails': generate_fingernail, 'skin': generate_palm}

print('Generating synthetic datasets...')
for bp, gen_fn in generators.items():
    for severity in CLASSES:
        folder = os.path.join(DATA_DIR, bp, severity)
        for i in tqdm(range(CFG['synthetic_per_class']), desc=f'{bp}/{severity}', leave=False):
            img = gen_fn(severity)
            img.save(os.path.join(folder, f'syn_{bp}_{severity}_{i:04d}.jpg'), quality=90)
    print(f'  {bp}: {CFG["synthetic_per_class"] * 4} synthetic images generated')

print(f'\nTotal synthetic: {CFG["synthetic_per_class"] * 4 * 3} images')

# Count final dataset
print('\nDataset summary:')
for bp in ['eye', 'nails', 'skin']:
    counts = {c: len(glob.glob(os.path.join(DATA_DIR, bp, c, '*'))) for c in CLASSES}
    total = sum(counts.values())
    print(f'  {bp}: {counts} (total: {total})')


# ============================================================
# CELL 5: DATA PIPELINE WITH AUGMENTATION
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

# Augmentation layers
augmentation_layer = keras.Sequential([
    layers.RandomFlip('horizontal_and_vertical'),
    layers.RandomRotation(0.15),
    layers.RandomZoom((-0.15, 0.15)),
    layers.RandomBrightness(0.15),
    layers.RandomContrast(0.15),
], name='augmentation')

def load_and_preprocess(path, label, img_size, augment=False):
    """Load image, resize, normalize to [0,1], optionally augment."""
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, [img_size, img_size])
    img = tf.cast(img, tf.float32) / 255.0
    if augment:
        img = augmentation_layer(img, training=True)
        # Ensure float32 after augmentation (mixed precision can cast to float16)
        img = tf.cast(img, tf.float32)
        # Random saturation and hue (color-critical for anemia)
        img = tf.image.random_saturation(img, 0.8, 1.2)
        img = tf.image.random_hue(img, 0.02)
        # Cutout (random erasing)
        if tf.random.uniform([]) > 0.5:
            mask_size = img_size // 6
            y = tf.random.uniform([], 0, img_size - mask_size, dtype=tf.int32)
            x = tf.random.uniform([], 0, img_size - mask_size, dtype=tf.int32)
            mask = tf.ones([mask_size, mask_size, 3], dtype=tf.float32)
            paddings = [[y, img_size - y - mask_size], [x, img_size - x - mask_size], [0, 0]]
            mask = tf.pad(mask, paddings)
            fill = tf.random.uniform([], dtype=tf.float32)
            img = img * (1.0 - mask) + fill * mask
        img = tf.clip_by_value(img, 0.0, 1.0)
    return img, label

def build_dataset(body_parts, img_size, batch_size=CFG['batch_size'], augment_real=True):
    """Build a tf.data dataset from specified body parts.
    
    Args:
        body_parts: list of body part names or 'all'
        img_size: target resize dimension
        augment_real: if True, add augmented copies of real (non-synthetic) images
    
    Returns: (train_ds, val_ds, test_ds), class_counts
    """
    if body_parts == 'all':
        body_parts = ['eye', 'nails', 'skin']
    elif isinstance(body_parts, str):
        body_parts = [body_parts]
    
    all_paths, all_labels = [], []
    aug_paths, aug_labels = [], []
    
    for bp in body_parts:
        for cls_idx, cls_name in enumerate(CLASSES):
            folder = os.path.join(DATA_DIR, bp, cls_name)
            target = CFG['targets'][cls_name]
            files = glob.glob(os.path.join(folder, '*'))
            for f in files:
                all_paths.append(f)
                all_labels.append(target)
                # Mark real images for augmentation
                if augment_real and not os.path.basename(f).startswith('syn_'):
                    for _ in range(CFG['augment_factor']):
                        aug_paths.append(f)
                        aug_labels.append(target)
    
    # Split: 80% train, 10% val, 10% test
    paths_arr = np.array(all_paths)
    labels_arr = np.array(all_labels, dtype=np.float32)
    
    train_p, test_p, train_l, test_l = train_test_split(
        paths_arr, labels_arr, test_size=0.2, random_state=42, stratify=(labels_arr * 10).astype(int)
    )
    val_p, test_p, val_l, test_l = train_test_split(
        test_p, test_l, test_size=0.5, random_state=42, stratify=(test_l * 10).astype(int)
    )
    
    # Add augmented real images to training set
    if len(aug_paths) > 0:
        train_p = np.concatenate([train_p, np.array(aug_paths)])
        train_l = np.concatenate([train_l, np.array(aug_labels, dtype=np.float32)])
    
    # Shuffle training
    idx = np.random.permutation(len(train_p))
    train_p, train_l = train_p[idx], train_l[idx]
    
    def make_ds(paths, labels, augment, shuffle):
        ds = tf.data.Dataset.from_tensor_slices((paths, labels))
        if shuffle:
            ds = ds.shuffle(len(paths), reshuffle_each_iteration=True)
        ds = ds.map(lambda p, l: load_and_preprocess(p, l, img_size, augment),
                    num_parallel_calls=AUTOTUNE)
        ds = ds.batch(batch_size).prefetch(AUTOTUNE)
        return ds
    
    train_ds = make_ds(train_p, train_l, augment=True, shuffle=True)
    val_ds = make_ds(val_p, val_l, augment=False, shuffle=False)
    test_ds = make_ds(test_p, test_l, augment=False, shuffle=False)
    
    print(f'  Dataset: {len(train_p)} train, {len(val_p)} val, {len(test_p)} test (img_size={img_size})')
    return (train_ds, val_ds, test_ds), (train_p, val_p, test_p, train_l, val_l, test_l)

print('Data pipeline ready.')


# ============================================================
# CELL 5b: DATASET VISUALIZATION & SANITY CHECK
# ============================================================
# Displays a 4×5 grid of random samples per body part showing:
#   - Raw vs. augmented side-by-side comparison
#   - Denormalized colors (reversed /255 preprocessing)
#   - Class label + confidence target + estimated Hgb
#   - Visual verification of color gradients across severity levels

def confidence_to_severity(conf):
    """Map confidence value to severity label and color."""
    if conf > 0.636: return 'Normal', '#4CAF50'
    if conf > 0.455: return 'Mild', '#FFC107'
    if conf > 0.182: return 'Moderate', '#FF9800'
    return 'Severe', '#F44336'

def denormalize(img_tensor):
    """Reverse [0,1] normalization back to displayable [0,255] uint8."""
    img = img_tensor.numpy() if hasattr(img_tensor, 'numpy') else np.array(img_tensor)
    img = np.clip(img, 0.0, 1.0)  # Clamp any augmentation overshoot
    return (img * 255).astype(np.uint8)

def visualize_samples(body_part, img_size=224, n_rows=4, n_cols=5):
    """Show a grid of random samples from one body part with severity labels."""
    # Build raw (no aug) + augmented datasets
    ds_raw, splits = build_dataset(body_part, img_size, batch_size=n_rows * n_cols, augment_real=False)
    ds_aug, _ = build_dataset(body_part, img_size, batch_size=n_rows * n_cols, augment_real=False)
    
    # Grab one batch from each
    raw_imgs, raw_labels = next(iter(ds_raw[0]))
    aug_imgs, aug_labels = next(iter(ds_aug[0]))
    
    n_samples = min(n_rows * n_cols, len(raw_imgs))
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(n_cols * 2.8, n_rows * 3.2))
    fig.suptitle(f'Dataset Samples — {body_part.upper()} (img_size={img_size})',
                 fontsize=14, fontweight='bold', y=1.02)
    
    for idx in range(n_samples):
        row, col = divmod(idx, n_cols)
        ax = axes[row][col] if n_rows > 1 else axes[col]
        
        img = denormalize(raw_imgs[idx])
        label = float(raw_labels[idx])
        severity, color = confidence_to_severity(label)
        hgb = 5.0 + label * 11.0
        
        ax.imshow(img)
        ax.set_title(f'{severity}\nconf={label:.2f} | Hgb={hgb:.1f}',
                     fontsize=8, color=color, fontweight='bold')
        ax.axis('off')
        
        # Add colored border to indicate severity
        for spine in ax.spines.values():
            spine.set_edgecolor(color)
            spine.set_linewidth(3)
            spine.set_visible(True)
    
    # Hide unused subplots
    for idx in range(n_samples, n_rows * n_cols):
        row, col = divmod(idx, n_cols)
        ax = axes[row][col] if n_rows > 1 else axes[col]
        ax.axis('off')
    
    plt.tight_layout()
    plt.savefig(os.path.join(BASE_DIR, f'samples_{body_part}.png'), dpi=120, bbox_inches='tight')
    plt.show()

def visualize_augmentation_comparison(body_part, img_size=224, n_samples=5):
    """Show raw vs augmented side-by-side for the same images."""
    # Get raw file paths and labels
    paths, labels = [], []
    for cls_name in CLASSES:
        folder = os.path.join(DATA_DIR, body_part, cls_name)
        target = CFG['targets'][cls_name]
        files = glob.glob(os.path.join(folder, '*'))
        for f in files[:3]:  # 3 per class
            paths.append(f)
            labels.append(target)
    
    # Pick random subset
    indices = random.sample(range(len(paths)), min(n_samples, len(paths)))
    
    fig, axes = plt.subplots(n_samples, 2, figsize=(7, n_samples * 2.8))
    fig.suptitle(f'Raw vs. Augmented — {body_part.upper()}',
                 fontsize=13, fontweight='bold', y=1.01)
    axes[0][0].set_title('Original', fontsize=11, fontweight='bold')
    axes[0][1].set_title('Augmented', fontsize=11, fontweight='bold')
    
    for i, idx in enumerate(indices):
        path, label = paths[idx], labels[idx]
        severity, color = confidence_to_severity(label)
        
        # Load raw
        raw_img, _ = load_and_preprocess(path, label, img_size, augment=False)
        raw_display = denormalize(raw_img)
        
        # Load augmented (run augmentation pipeline)
        aug_img, _ = load_and_preprocess(path, label, img_size, augment=True)
        aug_display = denormalize(aug_img)
        
        axes[i][0].imshow(raw_display)
        axes[i][0].set_ylabel(f'{severity}\n(Hgb={5+label*11:.1f})',
                              fontsize=8, color=color, fontweight='bold', rotation=0, labelpad=55)
        axes[i][0].set_xticks([]); axes[i][0].set_yticks([])
        
        axes[i][1].imshow(aug_display)
        axes[i][1].set_xticks([]); axes[i][1].set_yticks([])
        
        for j in range(2):
            for spine in axes[i][j].spines.values():
                spine.set_edgecolor(color)
                spine.set_linewidth(2)
                spine.set_visible(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join(BASE_DIR, f'augmentation_{body_part}.png'), dpi=120, bbox_inches='tight')
    plt.show()

def visualize_severity_gradient(img_size=224):
    """Show severity progression across all body parts — verifying color gradients."""
    fig, axes = plt.subplots(3, 4, figsize=(12, 9))
    body_parts = ['eye', 'nails', 'skin']
    bp_labels = ['Conjunctiva', 'Fingernails', 'Skin/Palm']
    
    for row, (bp, bp_label) in enumerate(zip(body_parts, bp_labels)):
        for col, cls_name in enumerate(CLASSES):
            folder = os.path.join(DATA_DIR, bp, cls_name)
            files = glob.glob(os.path.join(folder, '*'))
            if files:
                # Pick a random sample
                path = random.choice(files)
                img, label = load_and_preprocess(path, CFG['targets'][cls_name], img_size, augment=False)
                display_img = denormalize(img)
                axes[row][col].imshow(display_img)
            
            severity, color = confidence_to_severity(CFG['targets'][cls_name])
            hgb = 5.0 + CFG['targets'][cls_name] * 11.0
            
            if row == 0:
                axes[row][col].set_title(f'{cls_name}\n(Hgb={hgb:.1f} g/dL)',
                                          fontsize=10, fontweight='bold', color=color)
            axes[row][col].axis('off')
            if col == 0:
                axes[row][col].set_ylabel(bp_label, fontsize=11, fontweight='bold',
                                           rotation=90, labelpad=10)
                axes[row][col].yaxis.set_visible(True)
            
            for spine in axes[row][col].spines.values():
                spine.set_edgecolor(color)
                spine.set_linewidth(3)
                spine.set_visible(True)
    
    fig.suptitle('Severity Gradient — Color Progression Sanity Check',
                 fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(BASE_DIR, 'severity_gradient.png'), dpi=150, bbox_inches='tight')
    plt.show()

# ---- Run all visualizations ----
print('=' * 60)
print('  DATASET VISUALIZATION & SANITY CHECK')
print('=' * 60)

# 1. Severity gradient across all body parts
print('\n1. Severity gradient across body parts:')
visualize_severity_gradient()

# 2. Random samples per body part
for bp in ['eye', 'nails', 'skin']:
    print(f'\n2. Random samples — {bp}:')
    visualize_samples(bp)

# 3. Raw vs augmented comparison
for bp in ['eye', 'nails', 'skin']:
    print(f'\n3. Augmentation comparison — {bp}:')
    visualize_augmentation_comparison(bp)

# 4. Dataset distribution bar chart
print('\n4. Class distribution:')
fig, axes = plt.subplots(1, 3, figsize=(14, 4))
for i, bp in enumerate(['eye', 'nails', 'skin']):
    counts = [len(glob.glob(os.path.join(DATA_DIR, bp, c, '*'))) for c in CLASSES]
    colors = ['#4CAF50', '#FFC107', '#FF9800', '#F44336']
    bars = axes[i].bar(CLASSES, counts, color=colors, edgecolor='black', linewidth=0.5)
    axes[i].set_title(f'{bp.upper()}', fontsize=12, fontweight='bold')
    axes[i].set_ylabel('Images')
    for bar, count in zip(bars, counts):
        axes[i].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                     str(count), ha='center', fontsize=9, fontweight='bold')

plt.suptitle('Class Distribution per Body Part', fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, 'class_distribution.png'), dpi=120, bbox_inches='tight')
plt.show()

print('\nSanity check complete. Verify:')
print('  - Severity colors darken Normal→Severe (more pallor = anemia)')
print('  - Augmentation preserves diagnostic color features')
print('  - No corrupted/black/white images in the grid')
print('  - Class distribution is balanced (200 synthetic + real per class)')


# ============================================================
# CELL 6: MODEL ARCHITECTURE BUILDERS
# ============================================================

def build_head(x, name_prefix):
    """Common classification head: GAP → Dense(256) → Dropout → Dense(128) → Dropout → Dense(1, sigmoid)."""
    x = layers.GlobalAveragePooling2D(name=f'{name_prefix}_gap')(x)
    x = layers.Dense(256, activation='relu', name=f'{name_prefix}_fc1')(x)
    x = layers.Dropout(CFG['dropout'], name=f'{name_prefix}_drop1')(x)
    x = layers.Dense(128, activation='relu', name=f'{name_prefix}_fc2')(x)
    x = layers.Dropout(CFG['dropout'] * 0.67, name=f'{name_prefix}_drop2')(x)
    out = layers.Dense(1, activation='sigmoid', dtype='float32', name=f'{name_prefix}_output')(x)
    return out

# -- Tier 1: Scouts --

def build_mobilenetv3_scout(img_size, name):
    inp = layers.Input(shape=(img_size, img_size, 3), name=f'{name}_input')
    backbone = MobileNetV3Small(include_top=False, weights='imagenet', input_tensor=inp,
                                 minimalistic=True)
    backbone.trainable = False
    out = build_head(backbone.output, name)
    return Model(inp, out, name=name), backbone

def fire_module(x, squeeze, expand, name):
    """SqueezeNet fire module."""
    s = layers.Conv2D(squeeze, 1, activation='relu', padding='same', name=f'{name}_sq')(x)
    e1 = layers.Conv2D(expand, 1, activation='relu', padding='same', name=f'{name}_e1')(s)
    e3 = layers.Conv2D(expand, 3, activation='relu', padding='same', name=f'{name}_e3')(s)
    return layers.Concatenate(name=f'{name}_cat')([e1, e3])

def build_squeezenet_scout(img_size, name):
    inp = layers.Input(shape=(img_size, img_size, 3), name=f'{name}_input')
    x = layers.Conv2D(64, 3, strides=2, activation='relu', padding='same', name=f'{name}_conv1')(inp)
    x = layers.MaxPooling2D(3, strides=2, padding='same')(x)
    x = fire_module(x, 16, 64, f'{name}_fire2')
    x = fire_module(x, 16, 64, f'{name}_fire3')
    x = layers.MaxPooling2D(3, strides=2, padding='same')(x)
    x = fire_module(x, 32, 128, f'{name}_fire4')
    x = fire_module(x, 32, 128, f'{name}_fire5')
    x = layers.MaxPooling2D(3, strides=2, padding='same')(x)
    x = fire_module(x, 48, 192, f'{name}_fire6')
    x = fire_module(x, 48, 192, f'{name}_fire7')
    x = fire_module(x, 64, 256, f'{name}_fire8')
    x = fire_module(x, 64, 256, f'{name}_fire9')
    x = layers.Dropout(0.5)(x)
    x = layers.Conv2D(256, 1, activation='relu', name=f'{name}_conv_final')(x)
    out = build_head(x, name)
    return Model(inp, out, name=name), None  # No pretrained backbone

# -- Tier 2: Specialists --

def build_specialist(BackboneClass, img_size, name, **kwargs):
    inp = layers.Input(shape=(img_size, img_size, 3), name=f'{name}_input')
    backbone = BackboneClass(include_top=False, weights='imagenet', input_tensor=inp, **kwargs)
    backbone.trainable = False
    out = build_head(backbone.output, name)
    return Model(inp, out, name=name), backbone

# -- Tier 3: Judges --

class PatchEmbedding(layers.Layer):
    def __init__(self, patch_size, embed_dim, **kwargs):
        super().__init__(**kwargs)
        self.patch_size = patch_size
        self.proj = layers.Conv2D(embed_dim, patch_size, strides=patch_size, padding='valid')
        self.embed_dim = embed_dim
    
    def call(self, x):
        x = self.proj(x)
        # Use keras.ops for Keras 3 compatibility
        shape = keras.ops.shape(x)
        x = keras.ops.reshape(x, [shape[0], shape[1] * shape[2], shape[3]])
        return x

class CLSTokenLayer(layers.Layer):
    """Prepends a learnable CLS token to the patch sequence."""
    def __init__(self, embed_dim, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
    
    def build(self, input_shape):
        self.cls_token = self.add_weight(
            name='cls_token', shape=(1, 1, self.embed_dim),
            initializer=keras.initializers.TruncatedNormal(stddev=0.02),
            trainable=True
        )
    
    def call(self, x):
        batch_size = keras.ops.shape(x)[0]
        cls_tokens = keras.ops.broadcast_to(self.cls_token, [batch_size, 1, self.embed_dim])
        return keras.ops.concatenate([cls_tokens, x], axis=1)

class AddPositionalEmbedding(layers.Layer):
    """Adds learnable positional embedding to the token sequence."""
    def __init__(self, num_positions, embed_dim, **kwargs):
        super().__init__(**kwargs)
        self.num_positions = num_positions
        self.embed_dim = embed_dim
    
    def build(self, input_shape):
        self.pos_embed = self.add_weight(
            name='pos_embed', shape=(1, self.num_positions, self.embed_dim),
            initializer=keras.initializers.TruncatedNormal(stddev=0.02),
            trainable=True
        )
    
    def call(self, x):
        return x + self.pos_embed

class ExtractCLSToken(layers.Layer):
    """Extracts the CLS token (first token) from the sequence."""
    def call(self, x):
        return x[:, 0]

class TransformerBlock(layers.Layer):
    def __init__(self, embed_dim, num_heads, mlp_dim, dropout=0.1, **kwargs):
        super().__init__(**kwargs)
        self.norm1 = layers.LayerNormalization(epsilon=1e-6)
        self.attn = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim // num_heads, dropout=dropout)
        self.norm2 = layers.LayerNormalization(epsilon=1e-6)
        self.mlp = keras.Sequential([layers.Dense(mlp_dim, activation='gelu'), layers.Dropout(dropout), layers.Dense(embed_dim), layers.Dropout(dropout)])
    
    def call(self, x, training=False):
        normed = self.norm1(x)
        x = x + self.attn(normed, normed, training=training)
        x = x + self.mlp(self.norm2(x), training=training)
        return x

def build_vit_tiny(img_size, name):
    """Vision Transformer Tiny: patch=16, embed=192, depth=4, heads=3."""
    patch_size, embed_dim, depth, heads = 16, 192, 4, 3
    num_patches = (img_size // patch_size) ** 2
    
    inp = layers.Input(shape=(img_size, img_size, 3), name=f'{name}_input')
    x = PatchEmbedding(patch_size, embed_dim, name=f'{name}_patch_embed')(inp)
    
    # Learnable CLS token + positional embedding (as proper Keras layers)
    x = CLSTokenLayer(embed_dim, name=f'{name}_cls_token')(x)
    x = AddPositionalEmbedding(num_patches + 1, embed_dim, name=f'{name}_pos_embed')(x)
    
    for i in range(depth):
        x = TransformerBlock(embed_dim, heads, embed_dim * 4, name=f'{name}_block{i}')(x)
    
    x = layers.LayerNormalization(epsilon=1e-6)(x)
    x = ExtractCLSToken(name=f'{name}_cls_extract')(x)
    x = layers.Dense(256, activation='relu', name=f'{name}_fc1')(x)
    x = layers.Dropout(CFG['dropout'])(x)
    out = layers.Dense(1, activation='sigmoid', dtype='float32', name=f'{name}_output')(x)
    return Model(inp, out, name=name), None

def build_meta_learner(img_size, name):
    """MLP-heavy model with depthwise-separable convolutions for meta-learning."""
    inp = layers.Input(shape=(img_size, img_size, 3), name=f'{name}_input')
    
    # Lightweight feature extraction
    x = layers.Conv2D(32, 3, strides=2, padding='same', activation='relu')(inp)
    x = layers.SeparableConv2D(64, 3, padding='same', activation='relu')(x)
    x = layers.MaxPooling2D(2)(x)
    x = layers.SeparableConv2D(128, 3, padding='same', activation='relu')(x)
    x = layers.SeparableConv2D(128, 3, padding='same', activation='relu')(x)
    x = layers.MaxPooling2D(2)(x)
    x = layers.SeparableConv2D(256, 3, padding='same', activation='relu')(x)
    x = layers.MaxPooling2D(2)(x)
    x = layers.SeparableConv2D(256, 3, padding='same', activation='relu')(x)
    x = layers.GlobalAveragePooling2D()(x)
    
    # Deep MLP head (meta-learner strength)
    x = layers.Dense(512, activation='relu')(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    out = layers.Dense(1, activation='sigmoid', dtype='float32', name=f'{name}_output')(x)
    return Model(inp, out, name=name), None

# Catalog of builder functions
BUILDERS = {
    'scout-mobilenet-skin':      lambda: build_mobilenetv3_scout(224, 'scout_mobilenet_skin'),
    'scout-mobilenet-nails':     lambda: build_mobilenetv3_scout(224, 'scout_mobilenet_nails'),
    'scout-squeezenet-eye':      lambda: build_squeezenet_scout(227, 'scout_squeezenet_eye'),
    'specialist-resnet50v2':     lambda: build_specialist(ResNet50V2, 224, 'specialist_resnet50v2'),
    'specialist-densenet121':    lambda: build_specialist(DenseNet121, 224, 'specialist_densenet121'),
    'specialist-inceptionv3':    lambda: build_specialist(InceptionV3, 299, 'specialist_inceptionv3'),
    'specialist-vgg16':          lambda: build_specialist(VGG16, 224, 'specialist_vgg16'),
    'judge-efficientnet-b0':     lambda: build_specialist(EfficientNetB0, 224, 'judge_efficientnet_b0'),
    'judge-vit-tiny':            lambda: build_vit_tiny(224, 'judge_vit_tiny'),
    'judge-mlp-meta-learner':    lambda: build_meta_learner(224, 'judge_mlp_meta_learner'),
}

# Quick verification
print('Model builders loaded. Quick param count check:')
for model_name in ['scout-mobilenet-skin', 'specialist-resnet50v2', 'judge-vit-tiny']:
    m, _ = BUILDERS[model_name]()
    print(f'  {model_name}: {m.count_params():,} params')
    del m
    gc.collect()


# ============================================================
# CELL 7: TRAINING UTILITIES
# ============================================================

class WarmupCosineDecay(keras.optimizers.schedules.LearningRateSchedule):
    """Warmup + Cosine Decay LR schedule."""
    def __init__(self, base_lr, warmup_steps, total_steps):
        super().__init__()
        self.base_lr = base_lr
        self.warmup_steps = warmup_steps
        self.total_steps = total_steps
    
    def __call__(self, step):
        step = tf.cast(step, tf.float32)
        warmup = self.base_lr * (step / tf.maximum(tf.cast(self.warmup_steps, tf.float32), 1.0))
        progress = (step - self.warmup_steps) / tf.maximum(tf.cast(self.total_steps - self.warmup_steps, tf.float32), 1.0)
        cosine = 0.5 * self.base_lr * (1.0 + tf.cos(math.pi * tf.minimum(progress, 1.0)))
        return tf.where(step < self.warmup_steps, warmup, cosine)
    
    def get_config(self):
        return {'base_lr': self.base_lr, 'warmup_steps': self.warmup_steps, 'total_steps': self.total_steps}

def confidence_to_class(conf):
    """Map confidence value to severity class index."""
    thresholds = CFG['thresholds']
    if conf > thresholds[0]: return 0   # Normal
    if conf > thresholds[1]: return 1   # Mild
    if conf > thresholds[2]: return 2   # Moderate
    return 3                             # Severe

def evaluate_classification(y_true, y_pred):
    """Convert regression predictions to classes and compute metrics."""
    true_cls = np.array([confidence_to_class(y) for y in y_true])
    pred_cls = np.array([confidence_to_class(y) for y in y_pred])
    acc = np.mean(true_cls == pred_cls)
    return acc, true_cls, pred_cls

def train_model(model_name, model, backbone, datasets, splits):
    """Full training pipeline: frozen → unfreeze → fine-tune."""
    train_ds, val_ds, test_ds = datasets
    train_p, val_p, test_p, train_l, val_l, test_l = splits
    
    save_path = os.path.join(MODEL_DIR, model_name.replace('-', '_') + '.keras')
    steps_per_epoch = max(1, len(train_p) // CFG['batch_size'])
    
    # ---- Phase 1: Frozen backbone ----
    total_steps = steps_per_epoch * CFG['epochs_frozen']
    warmup_steps = steps_per_epoch * CFG['warmup_epochs']
    lr_schedule = WarmupCosineDecay(CFG['lr_frozen'], warmup_steps, total_steps)
    
    model.compile(
        optimizer=optimizers.AdamW(learning_rate=lr_schedule, weight_decay=CFG['weight_decay']),
        loss=keras.losses.Huber(delta=0.15),
        metrics=['mae']
    )
    
    cbs = [
        callbacks.EarlyStopping(monitor='val_loss', patience=CFG['patience'], restore_best_weights=True),
        callbacks.ModelCheckpoint(save_path, monitor='val_loss', save_best_only=True, verbose=0),
    ]
    
    print(f'\n  Phase 1: Training head (backbone frozen)...')
    h1 = model.fit(train_ds, validation_data=val_ds, epochs=CFG['epochs_frozen'],
                   callbacks=cbs, verbose=0)
    p1_loss = min(h1.history['val_loss'])
    print(f'  Phase 1 done. Best val_loss: {p1_loss:.4f}')
    
    # ---- Phase 2: Unfreeze and fine-tune ----
    if backbone is not None:
        # Unfreeze top 30% of backbone layers
        total_layers = len(backbone.layers)
        freeze_until = int(total_layers * 0.7)
        for layer in backbone.layers[:freeze_until]:
            layer.trainable = False
        for layer in backbone.layers[freeze_until:]:
            layer.trainable = True
        
        total_steps2 = steps_per_epoch * CFG['epochs_finetune']
        lr_schedule2 = WarmupCosineDecay(CFG['lr_finetune'], steps_per_epoch, total_steps2)
        
        model.compile(
            optimizer=optimizers.AdamW(learning_rate=lr_schedule2, weight_decay=CFG['weight_decay']),
            loss=keras.losses.Huber(delta=0.15),
            metrics=['mae']
        )
        
        print(f'  Phase 2: Fine-tuning (top {total_layers - freeze_until}/{total_layers} layers unfrozen)...')
        h2 = model.fit(train_ds, validation_data=val_ds, epochs=CFG['epochs_finetune'],
                       callbacks=cbs, verbose=0)
        p2_loss = min(h2.history['val_loss'])
        print(f'  Phase 2 done. Best val_loss: {p2_loss:.4f}')
    else:
        # Models without pretrained backbone: train fully from scratch
        for layer in model.layers:
            layer.trainable = True
        
        total_steps2 = steps_per_epoch * (CFG['epochs_frozen'] + CFG['epochs_finetune'])
        lr_schedule2 = WarmupCosineDecay(CFG['lr_frozen'] * 0.5, steps_per_epoch * 2, total_steps2)
        
        model.compile(
            optimizer=optimizers.AdamW(learning_rate=lr_schedule2, weight_decay=CFG['weight_decay']),
            loss=keras.losses.Huber(delta=0.15),
            metrics=['mae']
        )
        
        print(f'  Phase 2: Full training (no pretrained backbone)...')
        h2 = model.fit(train_ds, validation_data=val_ds,
                       epochs=CFG['epochs_frozen'] + CFG['epochs_finetune'],
                       callbacks=cbs, verbose=0)
        p2_loss = min(h2.history['val_loss'])
        print(f'  Phase 2 done. Best val_loss: {p2_loss:.4f}')
    
    # ---- Evaluate ----
    model.load_weights(save_path)
    preds = model.predict(test_ds, verbose=0).flatten()
    acc, true_cls, pred_cls = evaluate_classification(test_l, preds)
    mae = np.mean(np.abs(test_l - preds))
    
    print(f'  Test: Accuracy={acc:.4f}, MAE={mae:.4f}')
    return model, {'accuracy': acc, 'mae': mae, 'val_loss': min(p1_loss, p2_loss)}

print('Training utilities ready.')


# ============================================================
# CELL 8: TRAIN TIER 1 — QUALITY SCOUTS
# ============================================================
# Each scout is trained ONLY on its specific body part

results = {}  # Stores metrics for all models
trained_models = {}  # Stores trained model objects

tier1_configs = [
    ('scout-mobilenet-skin',  'skin',  224),
    ('scout-mobilenet-nails', 'nails', 224),
    ('scout-squeezenet-eye',  'eye',   227),
]

print('=' * 60)
print('TIER 1: Training Quality Scouts')
print('=' * 60)

for model_name, body_part, img_size in tier1_configs:
    print(f'\n[{model_name}] body_part={body_part}, size={img_size}')
    t0 = time.time()
    
    # Build dataset for this body part only
    ds, splits = build_dataset(body_part, img_size)
    
    # Build model
    model, backbone = BUILDERS[model_name]()
    
    # Train
    model, metrics = train_model(model_name, model, backbone, ds, splits)
    results[model_name] = metrics
    trained_models[model_name] = model
    
    elapsed = time.time() - t0
    print(f'  Completed in {elapsed:.0f}s')
    
    # Memory cleanup
    keras.backend.clear_session()
    gc.collect()

print('\n' + '=' * 60)
print('Tier 1 Summary:')
for name in ['scout-mobilenet-skin', 'scout-mobilenet-nails', 'scout-squeezenet-eye']:
    r = results[name]
    print(f'  {name}: Acc={r["accuracy"]:.4f}, MAE={r["mae"]:.4f}')


# ============================================================
# CELL 9: TRAIN TIER 2 — DEEP SPECIALISTS
# ============================================================
# Specialists are trained on ALL body parts combined

tier2_configs = [
    ('specialist-resnet50v2',  224),
    ('specialist-densenet121', 224),
    ('specialist-inceptionv3', 299),
    ('specialist-vgg16',       224),
]

print('=' * 60)
print('TIER 2: Training Deep Specialists')
print('=' * 60)

# Cache the combined dataset at 224 (shared by 3 specialists)
ds_224, splits_224 = build_dataset('all', 224)
ds_299, splits_299 = None, None

for model_name, img_size in tier2_configs:
    print(f'\n[{model_name}] size={img_size}, body=all')
    t0 = time.time()
    
    if img_size == 299:
        if ds_299 is None:
            ds_299, splits_299 = build_dataset('all', 299)
        ds, splits = ds_299, splits_299
    else:
        ds, splits = ds_224, splits_224
    
    model, backbone = BUILDERS[model_name]()
    model, metrics = train_model(model_name, model, backbone, ds, splits)
    results[model_name] = metrics
    trained_models[model_name] = model
    
    elapsed = time.time() - t0
    print(f'  Completed in {elapsed:.0f}s')
    
    keras.backend.clear_session()
    gc.collect()

# Free the 299 dataset
del ds_299, splits_299
gc.collect()

print('\n' + '=' * 60)
print('Tier 2 Summary:')
for name, _ in tier2_configs:
    r = results[name]
    print(f'  {name}: Acc={r["accuracy"]:.4f}, MAE={r["mae"]:.4f}')


# ============================================================
# CELL 10: TRAIN TIER 3 — GLOBAL JUDGES
# ============================================================
# Judges are trained on all body parts.
# Meta-learner uses knowledge distillation from the ensemble of models 1-9.

tier3_configs = [
    ('judge-efficientnet-b0', 224),
    ('judge-vit-tiny',        224),
]

print('=' * 60)
print('TIER 3: Training Global Judges')
print('=' * 60)

# Reuse 224 dataset
ds_224, splits_224 = build_dataset('all', 224)

for model_name, img_size in tier3_configs:
    print(f'\n[{model_name}] size={img_size}, body=all')
    t0 = time.time()
    
    model, backbone = BUILDERS[model_name]()
    model, metrics = train_model(model_name, model, backbone, ds_224, splits_224)
    results[model_name] = metrics
    trained_models[model_name] = model
    
    elapsed = time.time() - t0
    print(f'  Completed in {elapsed:.0f}s')
    
    keras.backend.clear_session()
    gc.collect()

# ---- Meta-Learner with Knowledge Distillation ----
print(f'\n[judge-mlp-meta-learner] Knowledge Distillation from 9 models')
t0 = time.time()

# Generate soft labels from ensemble of first 9 models
print('  Generating ensemble soft labels for KD...')
train_ds_224, val_ds_224, test_ds_224 = ds_224
train_p, val_p, test_p, train_l, val_l, test_l = splits_224

# Collect predictions from all 9 trained models on training data
ensemble_preds_train = []
ensemble_preds_val = []

other_models = [n for n in results.keys() if n != 'judge-mlp-meta-learner']
for mn in other_models:
    model_path = os.path.join(MODEL_DIR, mn.replace('-', '_') + '.keras')
    if os.path.exists(model_path):
        m = keras.models.load_model(model_path, compile=False)
        # Use appropriate image size for this model
        ms = CFG['models'][mn]['size']
        if ms == 224:
            p_train = m.predict(train_ds_224, verbose=0).flatten()
            p_val = m.predict(val_ds_224, verbose=0).flatten()
        else:
            # Rebuild dataset at this size for prediction
            ds_tmp, _ = build_dataset('all', ms)
            p_train = m.predict(ds_tmp[0], verbose=0).flatten()
            p_val = m.predict(ds_tmp[1], verbose=0).flatten()
            del ds_tmp
        ensemble_preds_train.append(p_train)
        ensemble_preds_val.append(p_val)
        del m
        gc.collect()

if len(ensemble_preds_train) > 0:
    # Weighted ensemble soft labels
    weights = [CFG['models'][mn]['weight'] for mn in other_models if os.path.exists(
        os.path.join(MODEL_DIR, mn.replace('-', '_') + '.keras'))]
    weights = np.array(weights) / sum(weights)
    
    soft_train = np.zeros_like(ensemble_preds_train[0])
    soft_val = np.zeros_like(ensemble_preds_val[0])
    for i, (pt, pv) in enumerate(zip(ensemble_preds_train, ensemble_preds_val)):
        min_len_t = min(len(soft_train), len(pt))
        min_len_v = min(len(soft_val), len(pv))
        soft_train[:min_len_t] += pt[:min_len_t] * weights[i]
        soft_val[:min_len_v] += pv[:min_len_v] * weights[i]
    
    # Blend: 70% soft labels + 30% hard labels
    kd_alpha = 0.7
    kd_train_labels = kd_alpha * soft_train[:len(train_l)] + (1 - kd_alpha) * train_l
    kd_val_labels = kd_alpha * soft_val[:len(val_l)] + (1 - kd_alpha) * val_l
    
    # Build KD dataset
    def make_kd_ds(paths, labels, img_size=224, augment=False, shuffle=False):
        ds = tf.data.Dataset.from_tensor_slices((paths, labels.astype(np.float32)))
        if shuffle:
            ds = ds.shuffle(len(paths), reshuffle_each_iteration=True)
        ds = ds.map(lambda p, l: load_and_preprocess(p, l, img_size, augment),
                    num_parallel_calls=AUTOTUNE)
        ds = ds.batch(CFG['batch_size']).prefetch(AUTOTUNE)
        return ds
    
    kd_train_ds = make_kd_ds(train_p, kd_train_labels, augment=True, shuffle=True)
    kd_val_ds = make_kd_ds(val_p, kd_val_labels)
    kd_ds = (kd_train_ds, kd_val_ds, test_ds_224)
    kd_splits = (train_p, val_p, test_p, kd_train_labels, kd_val_labels, test_l)
    
    print(f'  KD labels generated from {len(ensemble_preds_train)} models')
else:
    kd_ds = ds_224
    kd_splits = splits_224
    print('  No ensemble models found, using hard labels')

model, backbone = BUILDERS['judge-mlp-meta-learner']()
model, metrics = train_model('judge-mlp-meta-learner', model, backbone, kd_ds, kd_splits)
results['judge-mlp-meta-learner'] = metrics
trained_models['judge-mlp-meta-learner'] = model

elapsed = time.time() - t0
print(f'  Completed in {elapsed:.0f}s')

print('\n' + '=' * 60)
print('Tier 3 Summary:')
for name in ['judge-efficientnet-b0', 'judge-vit-tiny', 'judge-mlp-meta-learner']:
    r = results[name]
    print(f'  {name}: Acc={r["accuracy"]:.4f}, MAE={r["mae"]:.4f}')

keras.backend.clear_session()
gc.collect()


# ============================================================
# CELL 11: COMPREHENSIVE EVALUATION
# ============================================================

print('=' * 70)
print('  COMPREHENSIVE MODEL EVALUATION')
print('=' * 70)

# Prepare test dataset at needed sizes
ds_224_eval, splits_224_eval = build_dataset('all', 224, augment_real=False)
ds_299_eval, splits_299_eval = build_dataset('all', 299, augment_real=False)
ds_227_eval, splits_227_eval = build_dataset('eye', 227, augment_real=False)

# Per-body-part test sets for scouts
ds_skin_eval, sp_skin = build_dataset('skin', 224, augment_real=False)
ds_nails_eval, sp_nails = build_dataset('nails', 224, augment_real=False)

all_test_preds = {}
eval_results = {}

for model_name, spec in CFG['models'].items():
    model_path = os.path.join(MODEL_DIR, model_name.replace('-', '_') + '.keras')
    if not os.path.exists(model_path):
        print(f'  {model_name}: SKIPPED (no checkpoint)')
        continue
    
    model = keras.models.load_model(model_path, compile=False)
    
    # Select appropriate test set
    if spec['body'] == 'skin':
        _, _, test_ds = ds_skin_eval
        test_labels = sp_skin[5]
    elif spec['body'] == 'nails':
        _, _, test_ds = ds_nails_eval
        test_labels = sp_nails[5]
    elif spec['body'] == 'eye':
        _, _, test_ds = ds_227_eval if spec['size'] == 227 else ds_224_eval
        test_labels = splits_227_eval[5] if spec['size'] == 227 else splits_224_eval[5]
    elif spec['size'] == 299:
        _, _, test_ds = ds_299_eval
        test_labels = splits_299_eval[5]
    else:
        _, _, test_ds = ds_224_eval
        test_labels = splits_224_eval[5]
    
    preds = model.predict(test_ds, verbose=0).flatten()
    all_test_preds[model_name] = preds
    
    acc, true_cls, pred_cls = evaluate_classification(test_labels, preds)
    mae = np.mean(np.abs(test_labels - preds[:len(test_labels)]))
    
    eval_results[model_name] = {
        'accuracy': acc, 'mae': mae, 'tier': spec['tier'], 'weight': spec['weight']
    }
    print(f'  T{spec["tier"]} {model_name:35s} Acc={acc:.4f}  MAE={mae:.4f}  W={spec["weight"]}')
    
    del model
    gc.collect()

# ---- Weighted Ensemble Evaluation ----
print('\n' + '-' * 70)
print('  WEIGHTED ENSEMBLE CONSENSUS')
print('-' * 70)

# Use ALL body parts test set for ensemble eval
test_labels_all = splits_224_eval[5]

# Gather predictions from all-body models (Tier 2+3) at their common test set
ensemble_names = [n for n, s in CFG['models'].items() if s['body'] == 'all']
weights_arr = []
preds_arr = []

for name in ensemble_names:
    if name in all_test_preds:
        p = all_test_preds[name]
        min_len = min(len(p), len(test_labels_all))
        preds_arr.append(p[:min_len])
        weights_arr.append(CFG['models'][name]['weight'])

if preds_arr:
    weights_np = np.array(weights_arr) / sum(weights_arr)
    min_len = min(len(p) for p in preds_arr)
    ensemble_pred = np.zeros(min_len)
    for i, p in enumerate(preds_arr):
        ensemble_pred += p[:min_len] * weights_np[i]
    
    ens_acc, ens_true, ens_pred = evaluate_classification(test_labels_all[:min_len], ensemble_pred)
    ens_mae = np.mean(np.abs(test_labels_all[:min_len] - ensemble_pred))
    
    print(f'  Ensemble ({len(preds_arr)} models, weighted): Acc={ens_acc:.4f}, MAE={ens_mae:.4f}')
    
    # Confusion Matrix
    cm = confusion_matrix(ens_true, ens_pred, labels=[0,1,2,3])
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=CLASSES,
                yticklabels=CLASSES, ax=axes[0])
    axes[0].set_title(f'Ensemble Confusion Matrix (Acc={ens_acc:.3f})')
    axes[0].set_xlabel('Predicted')
    axes[0].set_ylabel('True')
    
    # Per-model accuracy bar chart
    model_names = list(eval_results.keys())
    accs = [eval_results[n]['accuracy'] for n in model_names]
    colors = ['#4CAF50' if eval_results[n]['tier'] == 1 else '#2196F3' if eval_results[n]['tier'] == 2 else '#FF9800' for n in model_names]
    short_names = [n.split('-', 1)[1][:20] for n in model_names]
    
    axes[1].barh(short_names, accs, color=colors)
    axes[1].axvline(x=ens_acc, color='red', linestyle='--', label=f'Ensemble: {ens_acc:.3f}')
    axes[1].set_xlabel('Accuracy')
    axes[1].set_title('Per-Model Accuracy (Green=T1, Blue=T2, Orange=T3)')
    axes[1].legend()
    axes[1].set_xlim(0, 1)
    
    plt.tight_layout()
    plt.savefig(os.path.join(BASE_DIR, 'evaluation_results.png'), dpi=150, bbox_inches='tight')
    plt.show()
    
    # Classification report
    print('\nClassification Report (Ensemble):')
    print(classification_report(ens_true, ens_pred, target_names=CLASSES, digits=4))

# ---- Summary Table ----
print('\n' + '=' * 70)
print(f'{"MODEL":40s} {"TIER":5s} {"ACC":8s} {"MAE":8s} {"WEIGHT":7s}')
print('-' * 70)
for name, r in sorted(eval_results.items(), key=lambda x: x[1]['tier']):
    print(f'{name:40s} T{r["tier"]}    {r["accuracy"]:.4f}   {r["mae"]:.4f}   {r["weight"]}')
if preds_arr:
    print('-' * 70)
    print(f'{"WEIGHTED ENSEMBLE":40s} {"ALL":5s} {ens_acc:.4f}   {ens_mae:.4f}   -')
print('=' * 70)


# ============================================================
# CELL 12: EXPORT TO TF.JS WITH INT8 QUANTIZATION
# ============================================================
import tensorflowjs as tfjs

print('=' * 60)
print('  EXPORTING MODELS TO TF.JS')
print('=' * 60)

# Tier-to-folder mapping
TIER_FOLDERS = {1: 'scouts', 2: 'specialists', 3: 'judges'}

export_summary = []

for model_name, spec in CFG['models'].items():
    model_path = os.path.join(MODEL_DIR, model_name.replace('-', '_') + '.keras')
    if not os.path.exists(model_path):
        print(f'  {model_name}: SKIPPED (no checkpoint)')
        continue
    
    tier_folder = TIER_FOLDERS[spec['tier']]
    export_name = model_name.replace('-', '_')
    export_path = os.path.join(EXPORT_DIR, tier_folder, export_name)
    os.makedirs(export_path, exist_ok=True)
    
    print(f'\n  Exporting {model_name} -> {tier_folder}/{export_name}/')
    
    try:
        model = keras.models.load_model(model_path, compile=False)
        
        # Save as SavedModel first (required for tfjs converter)
        saved_model_path = os.path.join(MODEL_DIR, 'tmp_saved_model')
        model.export(saved_model_path)
        
        # Convert to TF.js Graph Model with INT8 quantization
        tfjs.converters.convert_tf_saved_model(
            saved_model_path,
            export_path,
            quantization_dtype_map={'uint8': '*'},  # INT8 quantization
        )
        
        # Calculate export size
        total_size = sum(
            os.path.getsize(os.path.join(export_path, f))
            for f in os.listdir(export_path)
        )
        size_mb = total_size / (1024 * 1024)
        
        # Write model metadata
        meta = {
            'name': model_name,
            'architecture': spec['arch'],
            'tier': spec['tier'],
            'input_size': spec['size'],
            'weight': spec['weight'],
            'body_part': spec['body'],
            'output': 'sigmoid [0,1]',
            'preprocessing': 'divide by 255.0',
            'quantization': 'uint8',
            'size_mb': round(size_mb, 2),
        }
        if model_name in eval_results:
            meta['accuracy'] = round(eval_results[model_name]['accuracy'], 4)
            meta['mae'] = round(eval_results[model_name]['mae'], 4)
        
        with open(os.path.join(export_path, 'metadata.json'), 'w') as f:
            json.dump(meta, f, indent=2)
        
        export_summary.append({'name': model_name, 'size_mb': size_mb, 'path': export_path})
        print(f'    Size: {size_mb:.2f} MB (INT8 quantized)')
        
        # Cleanup
        shutil.rmtree(saved_model_path, ignore_errors=True)
        del model
        gc.collect()
        
    except Exception as e:
        print(f'    ERROR: {e}')
        # Fallback: try direct Keras → TF.js conversion
        try:
            model = keras.models.load_model(model_path, compile=False)
            tfjs.converters.save_keras_model(
                model, export_path,
                quantization_dtype_map={'uint8': '*'}
            )
            total_size = sum(
                os.path.getsize(os.path.join(export_path, f))
                for f in os.listdir(export_path)
            )
            size_mb = total_size / (1024 * 1024)
            export_summary.append({'name': model_name, 'size_mb': size_mb, 'path': export_path})
            print(f'    Fallback export: {size_mb:.2f} MB')
            del model
            gc.collect()
        except Exception as e2:
            print(f'    FALLBACK ALSO FAILED: {e2}')

print('\n' + '=' * 60)
print('Export Summary:')
total_export = 0
for item in export_summary:
    print(f'  {item["name"]:40s} {item["size_mb"]:6.2f} MB')
    total_export += item['size_mb']
print(f'  {"TOTAL":40s} {total_export:6.2f} MB')
print('=' * 60)


# ============================================================
# CELL 13: FINAL SUMMARY & CLEANUP
# ============================================================

print('\n' + '=' * 70)
print('  ANEMO-AI v3 TRAINING COMPLETE')
print('=' * 70)

# Results table
print(f'\n{"MODEL":40s} {"TIER":5s} {"ACC":8s} {"MAE":8s}')
print('-' * 65)

tier_accs = {1: [], 2: [], 3: []}
for name in CFG['models']:
    if name in eval_results:
        r = eval_results[name]
        print(f'{name:40s} T{r["tier"]}    {r["accuracy"]:.4f}   {r["mae"]:.4f}')
        tier_accs[r['tier']].append(r['accuracy'])

print('-' * 65)
for t in [1, 2, 3]:
    if tier_accs[t]:
        avg = np.mean(tier_accs[t])
        print(f'Tier {t} Average: {avg:.4f}')

if 'ens_acc' in dir():
    print(f'\nWeighted Ensemble Accuracy: {ens_acc:.4f}')
    print(f'Weighted Ensemble MAE:      {ens_mae:.4f}')

# File listing
print(f'\nExported TF.js models:')
for tier_name in ['scouts', 'specialists', 'judges']:
    tier_path = os.path.join(EXPORT_DIR, tier_name)
    if os.path.exists(tier_path):
        for model_dir in sorted(os.listdir(tier_path)):
            full = os.path.join(tier_path, model_dir)
            if os.path.isdir(full):
                files = os.listdir(full)
                size = sum(os.path.getsize(os.path.join(full, f)) for f in files)
                print(f'  {tier_name}/{model_dir}/ ({len(files)} files, {size/1e6:.1f}MB)')

# Cleanup temporary data to save Kaggle disk space
print(f'\nCleaning up...')
cleanup_items = [
    os.path.join(DATA_DIR, 'tmp_rf'),
    os.path.join(MODEL_DIR, 'tmp_saved_model'),
]
for item in cleanup_items:
    if os.path.exists(item):
        shutil.rmtree(item, ignore_errors=True)

# Final disk usage
def get_dir_size(path):
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            total += os.path.getsize(os.path.join(dirpath, f))
    return total

if os.path.exists(DATA_DIR):
    print(f'Dataset size:   {get_dir_size(DATA_DIR)/1e9:.2f} GB')
if os.path.exists(MODEL_DIR):
    print(f'Checkpoints:    {get_dir_size(MODEL_DIR)/1e9:.2f} GB')
if os.path.exists(EXPORT_DIR):
    print(f'TF.js exports:  {get_dir_size(EXPORT_DIR)/1e9:.2f} GB')

total_d, used_d, free_d = shutil.disk_usage(BASE_DIR)
print(f'Disk remaining: {free_d/1e9:.1f} GB')

print(f'\n{"=" * 70}')
print('  DEPLOYMENT INSTRUCTIONS')
print(f'{"=" * 70}')
print(f'''
1. Download the tfjs_export/ folder
2. Copy model folders to your project:
   tfjs_export/scouts/*      -> public/models/scouts/
   tfjs_export/specialists/* -> public/models/specialists/
   tfjs_export/judges/*      -> public/models/judges/

3. Each model folder contains:
   - model.json          (graph definition)
   - group1-shard*.bin   (INT8 quantized weights)
   - metadata.json       (model info & metrics)

4. Model I/O:
   Input:  [1, H, W, 3] float32, normalized /255
   Output: [1, 1] float32, sigmoid [0,1]
   Hgb:    5.0 + confidence * 11.0 (g/dL)

5. Severity thresholds:
   Normal:   confidence > 0.636  (Hgb > 12.0)
   Mild:     0.455 - 0.636       (Hgb 10.0-12.0)
   Moderate: 0.182 - 0.455       (Hgb 7.0-10.0)
   Severe:   < 0.182             (Hgb < 7.0)
''')
print('Training pipeline complete!')
