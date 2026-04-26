import h5py
import os
import json
import numpy as np

public_models = r"C:\laragon\www\anemo-ai-v3\public\models"

models = [
    ("scouts/mobilenet-v3-skin"),
    ("scouts/mobilenet-v3-nails"),
    ("scouts/squeezenet-1.1-eye"),
    ("specialists/densenet121"),
    ("specialists/inceptionv3"),
    ("specialists/resnet50v2"),
    ("specialists/vgg16"),
]

def convert_h5_to_tfjs(h5_path, output_dir):
    print(f"\nConverting {h5_path}...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    weights = []
    weight_specs = []
    weight_bytes = b""
    
    with h5py.File(h5_path, 'r') as f:
        def visit_func(name, obj):
            nonlocal weights, weight_specs, weight_bytes
            if isinstance(obj, h5py.Dataset):
                data = obj[()]
                if data.ndim > 0:
                    weights.append(data)
                    weight_specs.append({
                        "name": name.replace('/', '.'),
                        "shape": list(data.shape),
                        "dtype": "float32"
                    })
                    weight_bytes += data.flatten().astype(np.float32).tobytes()
        
        f.visititems(visit_func)
        
        print(f"  Found {len(weights)} weight arrays")
        print(f"  Total weight bytes: {len(weight_bytes)}")
        
        # Pad to multiple of 4
        padding = (4 - len(weight_bytes) % 4) % 4
        if padding:
            weight_bytes += b'\x00' * padding
            print(f"  Added {padding} bytes padding")
        
        # Write binary
        with open(os.path.join(output_dir, "group1-shard1of1.bin"), "wb") as out:
            out.write(weight_bytes)
        
        # Create model.json
        config_path = os.path.join(os.path.dirname(os.path.dirname(h5_path)), "extracted", "config.json")
        config = {}
        if os.path.exists(config_path):
            with open(config_path, 'r') as cf:
                config = json.load(cf)
        
        model_json = {
            "format": "layers-model",
            "generatedBy": "keras 3.x",
            "convertedBy": "manual",
            "modelTopology": config,
            "weightsManifest": [{
                "paths": ["group1-shard1of1.bin"],
                "weights": weight_specs
            }]
        }
        
        with open(os.path.join(output_dir, "model.json"), "w") as out:
            json.dump(model_json, out, indent=2)
        
        print(f"  Done! Binary: {os.path.join(output_dir, 'group1-shard1of1.bin')}")
    
    return True

for model_path in models:
    h5_path = os.path.join(public_models, model_path, "extracted", "model.weights.h5")
    output_dir = os.path.join(public_models, model_path)
    
    if os.path.exists(h5_path):
        try:
            convert_h5_to_tfjs(h5_path, output_dir)
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"Not found: {h5_path}")

print("\n\nDone converting all models!")