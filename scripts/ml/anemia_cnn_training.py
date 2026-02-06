import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D, Input, BatchNormalization
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, TerminateOnNaN
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils import class_weight
import random
import cv2

print(f"TensorFlow: {tf.__version__}")
print(f"OpenCV: {cv2.__version__}")

# Configuration
BASE_DIR = os.path.abspath(os.path.join(os.getcwd(), "..", "..")) 
DATASET_PATH = os.path.join(BASE_DIR, 'dataset')

IMG_HEIGHT = 224
IMG_WIDTH = 224
BATCH_SIZE = 16
PHASE1_EPOCHS = 25
PHASE2_EPOCHS = 40
LEARNING_RATE_P1 = 1e-3
LEARNING_RATE_P2 = 1e-5

DATASET_TYPES = ['skin', 'fingernails', 'conjunctiva']

# Advanced Preprocessing (CLAHE)
def apply_clahe(img):
    img = img.astype(np.uint8)
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl,a,b))
    final = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    return final.astype(np.float32)

def custom_preprocessing(img):
    # CLAHE + EfficientNet Scaling
    img_clahe = apply_clahe(img)
    return tf.keras.applications.efficientnet.preprocess_input(img_clahe)

def get_img_array(img_path, size):
    img = load_img(img_path, target_size=size)
    array = img_to_array(img)
    array = np.expand_dims(array, axis=0)
    return array

# Grad-CAM explainability
def make_gradcam_heatmap(img_array, model, last_conv_layer_name="top_activation"):
    grad_model = Model(
        model.inputs, [model.get_layer(last_conv_layer_name).output, model.output]
    )

    with tf.GradientTape() as tape:
        last_conv_layer_output, preds = grad_model(img_array)
        class_channel = preds[:, 0]

    grads = tape.gradient(class_channel, last_conv_layer_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    last_conv_layer_output = last_conv_layer_output[0]
    heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    heatmap = tf.maximum(heatmap, 0) / tf.reduce_max(heatmap)
    return heatmap.numpy()

def save_and_display_gradcam(img_path, heatmap, alpha=0.5, title=None):
    img = load_img(img_path)
    img = img_to_array(img)
    heatmap = np.uint8(255 * heatmap)
    jet = cm.get_cmap("jet")
    jet_colors = jet(np.arange(256))[:, :3]
    jet_heatmap = jet_colors[heatmap]
    jet_heatmap = tf.keras.preprocessing.image.array_to_img(jet_heatmap)
    jet_heatmap = jet_heatmap.resize((img.shape[1], img.shape[0]))
    jet_heatmap = img_to_array(jet_heatmap)
    superimposed_img = jet_heatmap * alpha + img
    superimposed_img = tf.keras.preprocessing.image.array_to_img(superimposed_img)

    plt.figure(figsize=(8, 8))
    plt.imshow(superimposed_img)
    if title: plt.title(title)
    plt.axis('off')
    plt.show()

# Enhanced Model Architecture
def create_advanced_model():
    base_model = EfficientNetB0(
        weights='imagenet', 
        include_top=False, 
        input_shape=(IMG_HEIGHT, IMG_WIDTH, 3)
    )
    base_model.trainable = False

    inputs = Input(shape=(IMG_HEIGHT, IMG_WIDTH, 3))
    x = base_model(inputs, training=False)
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='swish')(x)
    x = Dropout(0.5)(x)
    x = Dense(256, activation='swish')(x)
    x = Dropout(0.3)(x)
    outputs = Dense(1, activation='sigmoid')(x)

    model = Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE_P1),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
    )
    return model, base_model

# Training Pipeline
def train_anemia_model(dataset_type):
    print(f"\n" + "="*60)
    print(f" TRAINING ENHANCED: {dataset_type.upper()} ")
    print("="*60)

    target_path = os.path.join(DATASET_PATH, dataset_type)
    if not os.path.exists(target_path): return

    # 1. DATA AUGMENTATION
    train_datagen = ImageDataGenerator(
        preprocessing_function=custom_preprocessing,
        rotation_range=30, width_shift_range=0.2, height_shift_range=0.2,
        zoom_range=0.2, horizontal_flip=True, brightness_range=[0.7, 1.3],
        fill_mode='reflect', validation_split=0.2
    )
    test_datagen = ImageDataGenerator(preprocessing_function=custom_preprocessing, validation_split=0.2)

    train_generator = train_datagen.flow_from_directory(
        os.path.join(target_path, 'train'),
        target_size=(IMG_HEIGHT, IMG_WIDTH), batch_size=BATCH_SIZE,
        class_mode='binary', subset='training'
    )
    validation_generator = train_datagen.flow_from_directory(
        os.path.join(target_path, 'train'),
        target_size=(IMG_HEIGHT, IMG_WIDTH), batch_size=BATCH_SIZE,
        class_mode='binary', subset='validation'
    )

    # Calculate Class Weights
    classes = train_generator.classes
    weights = class_weight.compute_class_weight('balanced', classes=np.unique(classes), y=classes)
    class_weights = dict(enumerate(weights))

    # 2. MODEL PREPARATION
    model, base_model = create_advanced_model()
    
    callbacks = [
        ModelCheckpoint(f"anemia_{dataset_type}_efficientnet.h5", save_best_only=True, monitor='val_auc', mode='max'),
        EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-8),
        TerminateOnNaN()
    ]

    # 3. PHASE 1
    print("\n[Phase 1] Training classification layers...")
    model.fit(train_generator, epochs=PHASE1_EPOCHS, validation_data=validation_generator, callbacks=callbacks, class_weight=class_weights)

    # 4. PHASE 2
    print("\n[Phase 2] Fine-tuning all layers...")
    base_model.trainable = True
    model.compile(optimizer=tf.keras.optimizers.Adam(LEARNING_RATE_P2), loss='binary_crossentropy', metrics=['accuracy', tf.keras.metrics.AUC(name='auc')])
    model.fit(train_generator, epochs=PHASE2_EPOCHS, validation_data=validation_generator, callbacks=callbacks, class_weight=class_weights)

    # 5. SAMPLE VISUALIZATION
    test_dir = os.path.join(target_path, 'test')
    if os.path.exists(test_dir):
        all_imgs = []
        for r, d, f in os.walk(test_dir):
            for file in f: 
                if file.lower().endswith(('.png', '.jpg')): all_imgs.append(os.path.join(r, file))
        
        if all_imgs:
            sample = random.choice(all_imgs)
            img_array = custom_preprocessing(get_img_array(sample, (IMG_HEIGHT, IMG_WIDTH)))
            pred = model.predict(img_array)[0][0]
            heatmap = make_gradcam_heatmap(img_array, model)
            save_and_display_gradcam(sample, heatmap, title=f"Result: {'Anemic' if pred > 0.5 else 'Healthy'} ({pred:.2%})")

# Execute Training
if __name__ == "__main__":
    for t in DATASET_TYPES:
        train_anemia_model(t)