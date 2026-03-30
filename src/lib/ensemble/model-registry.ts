/**
 * Anemo AI — 10-Model Heterogeneous Ensemble Registry
 *
 * Defines the complete model catalogue for the three-tier ensemble:
 *
 *   Tier 1 — Quality Scouts  (3 models): Image quality & ROI validation
 *   Tier 2 — Deep Specialists (4 models): High-precision tissue analysis
 *   Tier 3 — Global Judges   (3 models): Hgb estimation & consensus
 *
 * Each entry includes the metadata required for:
 *   - Lazy-loading the INT8-quantized TensorFlow.js model from /public/models/
 *   - Routing images to the correct model based on body-part parameter
 *   - Weighting the final consensus decision
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelTier = 1 | 2 | 3;
export type ModelGroup = 'Scouts' | 'Specialists' | 'Judges';
export type ModelParameter = 'Skin' | 'Fingernails' | 'Undereye' | 'All';

export interface EnsembleModelConfig {
  /** Unique identifier used as the IndexedDB key and model-URL segment. */
  id: string;
  /** Human-friendly display name. */
  name: string;
  /** Ensemble tier (1 = Scout, 2 = Specialist, 3 = Judge). */
  tier: ModelTier;
  /** Ensemble group for dataset partitioning. */
  group: ModelGroup;
  /**
   * Body-part parameter this model is specialised for.
   * 'All' means the model accepts any parameter (meta-learners).
   */
  parameter: ModelParameter;
  /**
   * Path to the TensorFlow.js model JSON file inside /public/models/.
   * Example: "/models/scouts/mobilenet-v3-skin/model.json"
   */
  modelUrl: string;
  /** Input image size expected by this model [height, width]. */
  inputShape: [number, number];
  /**
   * Relative weight applied to this model's output during consensus
   * aggregation. Judges receive the highest weight.
   */
  consensusWeight: number;
  /** Short description of the model's clinical role. */
  description: string;
}

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

export const ENSEMBLE_MODELS: EnsembleModelConfig[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // Tier 1 — Quality Scouts
  // Role: Validate image quality and ROI alignment before deep analysis.
  //       Low-latency MobileNet/SqueezeNet architectures for fast rejection.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'scout-mobilenet-skin',
    name: 'MobileNetV3-Small (Skin)',
    tier: 1,
    group: 'Scouts',
    parameter: 'Skin',
    modelUrl: '/models/scouts/mobilenet-v3-skin/model.json',
    inputShape: [224, 224],
    consensusWeight: 0.5,
    description:
      'Validates skin image quality, checks for correct ROI framing, and provides an initial skin-pallor confidence score.',
  },
  {
    id: 'scout-mobilenet-nails',
    name: 'MobileNetV3-Small (Fingernails)',
    tier: 1,
    group: 'Scouts',
    parameter: 'Fingernails',
    modelUrl: '/models/scouts/mobilenet-v3-nails/model.json',
    inputShape: [224, 224],
    consensusWeight: 0.5,
    description:
      'Validates nailbed image quality and ROI alignment; outputs nailbed-pallor confidence.',
  },
  {
    id: 'scout-squeezenet-eye',
    name: 'SqueezeNet 1.1 (Under-eye / Conjunctiva)',
    tier: 1,
    group: 'Scouts',
    parameter: 'Undereye',
    modelUrl: '/models/scouts/squeezenet-1.1-eye/model.json',
    inputShape: [227, 227],
    consensusWeight: 0.5,
    description:
      'Validates conjunctiva/under-eye image quality and checks for adequate contrast; outputs conjunctival-pallor confidence.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Tier 2 — Deep Specialists
  // Role: High-precision tissue analysis. Each model is trained on all three
  //       body-part parameters for comprehensive anemia feature extraction.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'specialist-resnet50v2',
    name: 'ResNet50V2',
    tier: 2,
    group: 'Specialists',
    parameter: 'All',
    modelUrl: '/models/specialists/resnet50v2/model.json',
    inputShape: [224, 224],
    consensusWeight: 1.0,
    description:
      'Deep residual network (50 layers, v2 pre-activation) for robust pallor feature extraction across all ROIs.',
  },
  {
    id: 'specialist-densenet121',
    name: 'DenseNet121',
    tier: 2,
    group: 'Specialists',
    parameter: 'All',
    modelUrl: '/models/specialists/densenet121/model.json',
    inputShape: [224, 224],
    consensusWeight: 1.0,
    description:
      'Densely-connected network with strong feature reuse; excels at detecting subtle colour changes in tissue.',
  },
  {
    id: 'specialist-inceptionv3',
    name: 'InceptionV3',
    tier: 2,
    group: 'Specialists',
    parameter: 'All',
    modelUrl: '/models/specialists/inceptionv3/model.json',
    inputShape: [299, 299],
    consensusWeight: 1.0,
    description:
      'Multi-scale feature extraction via Inception modules; captures both fine-grained texture and macro colour gradients.',
  },
  {
    id: 'specialist-vgg16',
    name: 'VGG16',
    tier: 2,
    group: 'Specialists',
    parameter: 'All',
    modelUrl: '/models/specialists/vgg16/model.json',
    inputShape: [224, 224],
    consensusWeight: 1.0,
    description:
      'Classic deep convolutional network; strong baseline for colour and texture-based anemia detection.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Tier 3 — Global Judges
  // Role: Final Hgb estimation and consensus decision-making.
  //       These models receive all-ROI features and produce the authoritative
  //       severity classification and estimated Hgb value.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'judge-efficientnet-b0',
    name: 'EfficientNet-B0',
    tier: 3,
    group: 'Judges',
    parameter: 'All',
    modelUrl: '/models/judges/efficientnet-b0/model.json',
    inputShape: [224, 224],
    consensusWeight: 1.5,
    description:
      'Compound-scaled efficient network; provides the primary Hgb regression estimate with high parameter efficiency.',
  },
  {
    id: 'judge-vit-tiny',
    name: 'Vision Transformer (ViT-Tiny)',
    tier: 3,
    group: 'Judges',
    parameter: 'All',
    modelUrl: '/models/judges/vit-tiny/model.json',
    inputShape: [224, 224],
    consensusWeight: 1.5,
    description:
      'Lightweight Vision Transformer; captures global tissue context via self-attention for Hgb estimation.',
  },
  {
    id: 'judge-mlp-meta-learner',
    name: 'Custom MLP Meta-Learner',
    tier: 3,
    group: 'Judges',
    parameter: 'All',
    modelUrl: '/models/judges/mlp-meta-learner/model.json',
    inputShape: [224, 224],
    consensusWeight: 2.0,
    description:
      'Stacked meta-learner that ingests the logit outputs of all 9 upstream models and produces the final consensus Hgb estimate.',
  },
];

// ---------------------------------------------------------------------------
// Convenience lookups
// ---------------------------------------------------------------------------

/** All models grouped by tier. */
export const MODELS_BY_TIER: Record<ModelTier, EnsembleModelConfig[]> = {
  1: ENSEMBLE_MODELS.filter((m) => m.tier === 1),
  2: ENSEMBLE_MODELS.filter((m) => m.tier === 2),
  3: ENSEMBLE_MODELS.filter((m) => m.tier === 3),
};

/** All models grouped by group name. */
export const MODELS_BY_GROUP: Record<ModelGroup, EnsembleModelConfig[]> = {
  Scouts: ENSEMBLE_MODELS.filter((m) => m.group === 'Scouts'),
  Specialists: ENSEMBLE_MODELS.filter((m) => m.group === 'Specialists'),
  Judges: ENSEMBLE_MODELS.filter((m) => m.group === 'Judges'),
};

/** Look up a single model config by its unique ID. */
export function getModelById(id: string): EnsembleModelConfig | undefined {
  return ENSEMBLE_MODELS.find((m) => m.id === id);
}

/**
 * Returns the ordered list of model IDs to run for a given body-part parameter.
 *
 * Scout models are filtered to only those that match the parameter.
 * Specialist and Judge models accept 'All' parameters.
 */
export function getModelsForParameter(
  parameter: Exclude<ModelParameter, 'All'>,
): EnsembleModelConfig[] {
  return ENSEMBLE_MODELS.filter(
    (m) => m.parameter === parameter || m.parameter === 'All',
  );
}

/** Total number of models in the ensemble. */
export const ENSEMBLE_SIZE = ENSEMBLE_MODELS.length;
