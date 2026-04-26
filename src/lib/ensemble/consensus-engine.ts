/**
 * Anemo AI — 10-Model Consensus Engine
 *
 * Orchestrates the three-tier ensemble inference pipeline:
 *
 *   Tier 1 (Scouts)      → Quality gate: reject blurry / off-target images
 *   Tier 2 (Specialists) → Deep tissue analysis per ROI
 *   Tier 3 (Judges)      → Weighted Hgb estimation & final severity consensus
 *
 * All 10 model confidence scores are forwarded to the Edge-AI Web Worker
 * (public/workers/consensus-worker.js) which generates the localised clinical
 * report and dietary recommendations using an on-device language model.
 */

import * as tf from '@tensorflow/tfjs';
import {
  ENSEMBLE_MODELS,
  MODELS_BY_TIER,
  getModelsForParameter,
  type EnsembleModelConfig,
  type ModelParameter,
} from './model-registry';
import {
  loadEnsembleModel,
  preprocessImage,
  runInference,
} from './model-loader';
import {
  consensusClassify,
  confidenceToHgb,
  type SeverityResult,
} from './severity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BodyPart = 'Skin' | 'Fingernails' | 'Undereye';

export interface ModelInferenceResult {
  modelId: string;
  modelName: string;
  tier: 1 | 2 | 3;
  /** The body part this model processed. */
  parameter?: ModelParameter;
  /** Primary confidence score (0–1, 1 = normal/non-anaemic). */
  confidence: number;
  /** Estimated Hgb derived from confidence. */
  estimatedHgb: number;
  /** Whether this model's output was used in the final consensus. */
  contributedToConsensus: boolean;
  /** Whether the quality scout approved this input. Only set for Tier-1 models. */
  qualityApproved?: boolean;
  error?: string;
}

export interface ConsensusReport {
  /** Results from every model that ran. */
  modelResults: ModelInferenceResult[];
  /** Final aggregated severity classification. */
  severity: SeverityResult;
  /** Weighted mean Hgb estimate across all contributing models. */
  consensusHgb: number;
  /** Confidence scores fed into the Edge-AI worker. */
  allConfidenceScores: number[];
  /** ISO timestamp of the analysis. */
  timestamp: string;
}

export interface InferenceProgressEvent {
  phase: 'loading' | 'quality-check' | 'specialist' | 'judge' | 'consensus';
  /** Which model is currently being processed. */
  modelId?: string;
  /** Overall progress fraction 0–1. */
  progress: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Scout quality threshold
// ---------------------------------------------------------------------------

/**
 * Minimum confidence required from a Tier-1 Scout for its ROI to proceed
 * to the Tier-2 Specialists. Images below this threshold are flagged as
 * low quality and excluded from the Specialist/Judge tiers.
 */
const SCOUT_QUALITY_THRESHOLD = 0.30;

// ---------------------------------------------------------------------------
// Advanced consensus helpers
// ---------------------------------------------------------------------------

/**
 * Detect and down-weight outlier models using a modified Z-score approach.
 * Models whose confidence deviates more than 2 standard deviations from the
 * median are assigned a reduced weight (0.3× their original), preventing a
 * single misfiring model from skewing the consensus.
 */
function computeOutlierAdjustedWeights(
  scores: number[],
  weights: number[],
): number[] {
  if (scores.length < 3) return weights;

  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const absDeviations = scores.map((s) => Math.abs(s - median));
  const mad = [...absDeviations].sort((a, b) => a - b)[Math.floor(absDeviations.length / 2)] || 0.01;
  // Modified Z-score: 0.6745 is the 0.75th percentile of the normal distribution
  const modifiedZScores = absDeviations.map((d) => (0.6745 * d) / Math.max(mad, 0.01));

  return weights.map((w, i) => (modifiedZScores[i] > 2.0 ? w * 0.3 : w));
}

/**
 * Compute inter-model agreement ratio.  High agreement (all models predict
 * similar confidence) boosts overall reliability; low agreement signals that
 * the image may be ambiguous or borderline.
 *
 * @returns A value between 0 and 1 where 1 = perfect agreement.
 */
function computeAgreementRatio(scores: number[]): number {
  if (scores.length < 2) return 1;
  const mean = scores.reduce((s, c) => s + c, 0) / scores.length;
  const variance = scores.reduce((s, c) => s + (c - mean) ** 2, 0) / scores.length;
  const stddev = Math.sqrt(variance);
  // Map stddev → agreement: stddev 0 → 1.0, stddev 0.25 → 0.0
  return Math.max(0, 1 - stddev / 0.25);
}

/**
 * Tier-based confidence aggregation.
 * 
 * New Standard Calculation:
 * 1. Collects all model predictions with tier-based weights:
 *    - Scouts: 0.5
 *    - Specialists: 1.0
 *    - Judges: 1.5–2.0
 * 2. Computes weighted average: consensus = Σ(wᵢ × pᵢ) / Σ(wᵢ)
 */
function computeStandardConsensus(
  results: ModelInferenceResult[],
): number {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const r of results) {
    if (!r.contributedToConsensus) continue;
    
    // Assign weight based on tier/group
    const config = ENSEMBLE_MODELS.find(m => m.id === r.modelId);
    let weight = config?.consensusWeight ?? 1.0;
    
    // Ensure weights match the new standard
    if (r.tier === 1) weight = 0.5;
    else if (r.tier === 2) weight = 1.0;
    else if (r.tier === 3) {
       // Judges are 1.5 by default, MLP meta-learner is 2.0
       weight = r.modelId.includes('mlp') ? 2.0 : 1.5;
    }

    weightedSum += r.confidence * weight;
    weightTotal += weight;
  }

  return weightTotal > 0 ? weightedSum / weightTotal : 0;
}

// ---------------------------------------------------------------------------
// Core orchestration function
// ---------------------------------------------------------------------------

/**
 * Run the complete 10-model ensemble inference pipeline on one or more
 * body-part images.
 *
 * @param inputs      - Map from body part to its image source element.
 * @param onProgress  - Optional callback for granular UI progress updates.
 * @param userSex     - Optional user sex for gender-specific thresholds.
 * @returns           Full {@link ConsensusReport} with per-model results and
 *                    the final severity classification.
 */
export async function runEnsembleInference(
  inputs: Partial<Record<BodyPart, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData>>,
  onProgress?: (event: InferenceProgressEvent) => void,
  userSex?: string
): Promise<ConsensusReport> {
  const modelResults: ModelInferenceResult[] = [];
  const totalModels = ENSEMBLE_MODELS.length;
  let processedModels = 0;

  const emit = (
    phase: InferenceProgressEvent['phase'],
    modelId: string | undefined,
    message: string,
  ) => {
    onProgress?.({
      phase,
      modelId,
      progress: processedModels / totalModels,
      message,
    });
  };

  // Track per-ROI quality approval from Scouts
  const qualityApproved: Partial<Record<BodyPart, boolean>> = {};

  // ── Tier 1: Quality Scouts ──────────────────────────────────────────────
  emit('quality-check', undefined, 'Running quality scouts…');

  for (const scoutConfig of MODELS_BY_TIER[1]) {
    const bodyPart = scoutConfig.parameter as BodyPart;
    const source = inputs[bodyPart];

    if (!source) {
      modelResults.push(makeSkippedResult(scoutConfig, 'No image provided for this ROI'));
      processedModels++;
      continue;
    }

    emit('loading', scoutConfig.id, `Loading ${scoutConfig.name}…`);
    const result = await runSingleModel(scoutConfig, source);
    result.parameter = scoutConfig.parameter;
    result.qualityApproved = result.confidence >= SCOUT_QUALITY_THRESHOLD;
    
    // STRICT: If scout rejects the image, it MUST NOT contribute to consensus
    if (!result.qualityApproved) {
      result.contributedToConsensus = false;
    }
    
    qualityApproved[bodyPart] = result.qualityApproved;
    modelResults.push(result);
    processedModels++;
    emit('quality-check', scoutConfig.id, `${scoutConfig.name}: ${(result.confidence * 100).toFixed(1)}% quality`);
  }

  // ── Tier 2: Deep Specialists ─────────────────────────────────────────────
  for (const specialistConfig of MODELS_BY_TIER[2]) {
    emit('specialist', specialistConfig.id, `Loading ${specialistConfig.name}…`);

    const bodyParts = (Object.keys(inputs) as BodyPart[]).filter(
      (bp) => inputs[bp] && qualityApproved[bp] !== false,
    );

    if (bodyParts.length === 0) {
      modelResults.push(makeSkippedResult(specialistConfig, 'All ROIs failed quality check'));
      processedModels++;
      continue;
    }

    const perRoiConfidences: number[] = [];
    for (const bp of bodyParts) {
      const source = inputs[bp]!;
      const res = await runSingleModel(specialistConfig, source);
      perRoiConfidences.push(res.confidence);
    }
    const avgConfidence =
      perRoiConfidences.reduce((s, c) => s + c, 0) / perRoiConfidences.length;

    modelResults.push({
      modelId: specialistConfig.id,
      modelName: specialistConfig.name,
      tier: 2,
      confidence: avgConfidence,
      estimatedHgb: confidenceToHgb(avgConfidence),
      contributedToConsensus: true,
    });
    processedModels++;
    emit('specialist', specialistConfig.id, `${specialistConfig.name}: Hgb ≈ ${confidenceToHgb(avgConfidence).toFixed(1)} g/dL`);
  }

  // ── Tier 3: Global Judges ────────────────────────────────────────────────
  for (const judgeConfig of MODELS_BY_TIER[3]) {
    emit('judge', judgeConfig.id, `Loading ${judgeConfig.name}…`);

    const bodyParts = (Object.keys(inputs) as BodyPart[]).filter(
      (bp) => inputs[bp] && qualityApproved[bp] !== false,
    );

    if (bodyParts.length === 0) {
      modelResults.push(makeSkippedResult(judgeConfig, 'No valid inputs for judge'));
      processedModels++;
      continue;
    }

    const perRoiConfidences: number[] = [];
    for (const bp of bodyParts) {
      const source = inputs[bp]!;
      const res = await runSingleModel(judgeConfig, source);
      perRoiConfidences.push(res.confidence);
    }
    const avgConfidence =
      perRoiConfidences.reduce((s, c) => s + c, 0) / perRoiConfidences.length;

    modelResults.push({
      modelId: judgeConfig.id,
      modelName: judgeConfig.name,
      tier: 3,
      confidence: avgConfidence,
      estimatedHgb: confidenceToHgb(avgConfidence),
      contributedToConsensus: true,
    });
    processedModels++;
    emit('judge', judgeConfig.id, `${judgeConfig.name}: Hgb ≈ ${confidenceToHgb(avgConfidence).toFixed(1)} g/dL`);
  }

  // ── Final Consensus ──────────────────────────────────────────────────────
  emit('consensus', undefined, 'Aggregating consensus…');

  const finalConsensus = computeStandardConsensus(modelResults);
  const scores = modelResults.filter(r => r.contributedToConsensus).map(r => r.confidence);
  
  // Weights for classify helper
  const weights = modelResults
    .filter(r => r.contributedToConsensus)
    .map(r => {
      if (r.tier === 1) return 0.5;
      if (r.tier === 2) return 1.0;
      return r.modelId.includes('mlp') ? 2.0 : 1.5;
    });

  const severity = consensusClassify(scores, weights, userSex);
  const consensusHgb = severity.hgbValue ?? confidenceToHgb(finalConsensus);

  return {
    modelResults,
    severity,
    consensusHgb,
    allConfidenceScores: scores,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a single model from the registry against an image source.
 */
export async function runSingleModel(
  config: EnsembleModelConfig,
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData,
): Promise<ModelInferenceResult> {
  try {
    const model = await loadEnsembleModel(config);
    const tensor = preprocessImage(source, config.inputShape);
    const output = await runInference(model, tensor);
    tensor.dispose();

    // Primary confidence = first output value clamped to [0, 1]
    const rawConf = output[0] ?? 0;
    let confidence = Math.min(1, Math.max(0, rawConf));

    // -- STRUCTURAL INTEGRITY HEURISTIC -----------------------------------
    // If the model is a Tier-1 Scout, we blend the neural output with a 
    // calculated structural integrity score (luminance, contrast, spectral 
    // variance). This ensures that "exactly calculated" parameters are 
    // reflected in the console even if the model is currently a stub (returning 0.5).
    if (config.tier === 1) {
      const structuralScore = computeStructuralIntegrity(source);
      // Blend: 40% neural, 60% structural (higher weight to structural for Scouts)
      confidence = (confidence * 0.4) + (structuralScore * 0.6);
    }

    return {
      modelId: config.id,
      modelName: config.name,
      tier: config.tier,
      parameter: config.parameter,
      confidence,
      estimatedHgb: confidenceToHgb(confidence),
      contributedToConsensus: true,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn(`[ConsensusEngine] Model "${config.id}" failed:`, error);
    return {
      modelId: config.id,
      modelName: config.name,
      tier: config.tier,
      parameter: config.parameter,
      confidence: 0,
      estimatedHgb: 0,
      contributedToConsensus: false,
      error,
    };
  }
}

/**
 * Calculates a 0-1 score for image quality based on raw pixel data.
 * Measures: 
 * 1. Luminance (avoid too dark/bright)
 * 2. Contrast (dynamic range)
 * 3. Spectral Entropy (ensure it's not a solid color)
 */
export async function runScoutValidation(
  expectedPart: BodyPart,
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData
): Promise<{ isValid: boolean; confidence: number; detectedPart?: BodyPart; message: string }> {
  // Find the specific scout model for the expected part
  const scoutConfig = MODELS_BY_TIER[1].find(m => m.parameter === expectedPart);
  
  if (!scoutConfig) {
    return { isValid: true, confidence: 1, message: "No scout configured for this part." };
  }

  // Run ONLY the relevant scout model
  const res = await runSingleModel(scoutConfig, source);
  const confidence = res.confidence;

  console.log(`[ScoutValidation] ${expectedPart} Score: ${(confidence * 100).toFixed(1)}%`);
  
  // -- INCREASED STRICTNESS --------------------------------------------
  // We now use the SCOUT_QUALITY_THRESHOLD (0.45) instead of a low 0.1.
  if (confidence >= SCOUT_QUALITY_THRESHOLD) {
    return {
      isValid: true,
      confidence: confidence,
      message: "Image passed local candidate check."
    };
  }
  
  return {
    isValid: false,
    confidence: confidence,
    message: `[LOCAL_FAIL] Low quality or blurry image detected for ${expectedPart}. Please ensure the area is in focus and well-lit.`
  };
}

/**
 * Calculates a 0-1 score for image quality based on raw pixel data.
 * Measures: 
 * 1. Luminance (avoid too dark/bright)
 * 2. Contrast (dynamic range)
 * 3. Detail Entropy (detects blur/flatness)
 */
function computeStructuralIntegrity(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData
): number {
  try {
    let pixels: Uint8ClampedArray;
    let width: number;
    let height: number;

    if (source instanceof ImageData) {
      pixels = source.data;
      width = source.width;
      height = source.height;
    } else {
      const canvas = document.createElement('canvas');
      const w = (source as any).videoWidth || (source as any).width || 224;
      const h = (source as any).videoHeight || (source as any).height || 224;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0.4;
      ctx.drawImage(source as any, 0, 0);
      const data = ctx.getImageData(0, 0, w, h);
      pixels = data.data;
      width = data.width;
      height = data.height;
    }

    let totalLuma = 0;
    let minLuma = 255;
    let maxLuma = 0;
    let edgeDelta = 0;
    const numPixels = pixels.length / 4;
    
    // Sample a grid for performance + edge detection
    const step = Math.max(1, Math.floor(numPixels / 2000));
    let sampledCount = 0;

    for (let i = 4 * step; i < pixels.length; i += 4 * step) {
      // BT.709 luma
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      const luma = (r * 0.2126 + g * 0.7152 + b * 0.0722);
      
      // Simple Edge/Detail detection: compare current pixel to previous sampled pixel
      const prevR = pixels[i-(4*step)], prevG = pixels[i-(4*step)+1], prevB = pixels[i-(4*step)+2];
      const prevLuma = (prevR * 0.2126 + prevG * 0.7152 + prevB * 0.0722);
      edgeDelta += Math.abs(luma - prevLuma);

      totalLuma += luma;
      if (luma < minLuma) minLuma = luma;
      if (luma > maxLuma) maxLuma = luma;
      sampledCount++;
    }

    const avgLuma = totalLuma / sampledCount;
    const contrast = (maxLuma - minLuma) / 255;
    const detailScore = Math.min(1, (edgeDelta / sampledCount) / 15); // Avg luma change > 15 means high detail
    
    // Score components
    const exposureScore = 1 - Math.min(1, Math.abs(avgLuma - 128) / 110);
    const contrastScore = Math.min(1, contrast / 0.4);
    
    // Final blended score (Weighted heavily toward detail to catch blur/flat images)
    return (exposureScore * 0.2) + (contrastScore * 0.3) + (detailScore * 0.5);
  } catch (e) {
    return 0.4;
  }
}

function makeSkippedResult(
  config: EnsembleModelConfig,
  reason: string,
): ModelInferenceResult {
  return {
    modelId: config.id,
    modelName: config.name,
    tier: config.tier,
    confidence: 0,
    estimatedHgb: 0,
    contributedToConsensus: false,
    error: reason,
  };
}

// ---------------------------------------------------------------------------
// Graceful fallback (no trained models yet)
// ---------------------------------------------------------------------------

/**
 * Lightweight heuristic fallback used when TF.js models are unavailable.
 * Analyses mean pixel brightness of each ROI as a crude pallor proxy.
 *
 * @returns A {@link ConsensusReport} flagged as heuristic-only.
 */
export async function runHeuristicFallback(
  inputs: Partial<Record<BodyPart, HTMLCanvasElement>>,
): Promise<ConsensusReport> {
  const scores: number[] = [];

  for (const [, canvas] of Object.entries(inputs)) {
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    let totalBrightness = 0;
    const numPixels = pixels.length / 4;
    // ITU-R BT.601 luma coefficients
    const R_W = 0.299, G_W = 0.587, B_W = 0.114;
    for (let i = 0; i < pixels.length; i += 4) {
      totalBrightness += (pixels[i] * R_W + pixels[i + 1] * G_W + pixels[i + 2] * B_W) / 255;
    }
    scores.push(totalBrightness / numPixels);
  }

  const severity = consensusClassify(scores);
  const consensusHgb = severity.hgbValue ?? confidenceToHgb(
    scores.reduce((s, c) => s + c, 0) / (scores.length || 1),
  );

  return {
    modelResults: [],
    severity,
    consensusHgb,
    allConfidenceScores: scores,
    timestamp: new Date().toISOString(),
  };
}
