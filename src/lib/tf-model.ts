import * as tf from '@tensorflow/tfjs';

/**
 * Utility class to load and run a custom TensorFlow.js model.
 * 
 * PRE-REQUISITE:
 * Your .h5 model must be converted to TensorFlow.js format (layers or graph model)
 * using the `tensorflowjs_converter` python tool.
 * 
 * Command to convert:
 * pip install tensorflowjs
 * tensorflowjs_converter --input_format=keras /path/to/my_model.h5 /path/to/output_folder
 * 
 * Then place the 'model.json' and binary shard files into the 'public/model' directory of this project.
 */

let model: tf.LayersModel | tf.GraphModel | null = null;

export async function loadModel(modelUrl: string = '/model/model.json') {
  if (model) return model;

  try {
    // Try loading as a layers model (standard Keras conversion)
    model = await tf.loadLayersModel(modelUrl);
    console.log('Custom TFJS Layers Model loaded successfully');
  } catch (error) {
    try {
      // Fallback: Try loading as a graph model (SavedModel conversion)
      model = await tf.loadGraphModel(modelUrl);
      console.log('Custom TFJS Graph Model loaded successfully');
    } catch (graphError) {
      console.error('Failed to load model:', error);
      throw new Error('Could not load custom AI model. Ensure files are in public/model/');
    }
  }
  return model;
}

export async function predict(imageElement: HTMLImageElement | HTMLVideoElement) {
  const loadedModel = await loadModel();
  
  // 1. Preprocess the image
  // Adjust 'resizeBilinear' dimensions [224, 224] to match your model's input shape!
  const tensor = tf.tidy(() => {
    return tf.browser.fromPixels(imageElement)
      .resizeBilinear([224, 224]) // STANDARD SIZE - CHANGE IF NEEDED
      .toFloat()
      .expandDims(0)
      .div(tf.scalar(255)); // Normalize to 0-1
  });

  // 2. Run inference
  const prediction = await loadedModel.predict(tensor);
  
  // 3. Process output
  // This depends on your model's output layer. 
  // Example for binary classification [probability]:
  let result;
  if (Array.isArray(prediction)) {
      const data = await prediction[0].data();
      result = Array.from(data);
  } else {
      const data = await (prediction as tf.Tensor).data();
      result = Array.from(data);
  }

  // Cleanup
  tensor.dispose();
  
  return result;
}
