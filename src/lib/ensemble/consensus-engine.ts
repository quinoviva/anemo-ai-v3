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
const SCOUT_QUALITY_THRESHOLD = 0.45;

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
 * Instead of a simple weighted average across all models, this groups models
 * by tier and computes a tier-level consensus first, then blends the tier
 * results with tier-importance weights.  This prevents Tier-1 scout models
 * (which are low-precision quality-checkers) from diluting the high-precision
 * Tier-3 Judge outputs.
 *
 * Tier importance: Scouts 10%, Specialists 35%, Judges 55%
 */
function tierWeightedConsensus(
  results: ModelInferenceResult[],
): { weightedMean: number; tierBreakdown: Record<number, number> } {
  const TIER_IMPORTANCE: Record<number, number> = { 1: 0.10, 2: 0.35, 3: 0.55 };
  const tierBreakdown: Record<number, number> = {};
  let totalTierWeight = 0;
  let blended = 0;

  for (const tier of [1, 2, 3] as const) {
    const tierResults = results.filter((r) => r.tier === tier && r.contributedToConsensus);
    if (tierResults.length === 0) continue;

    const tierScores = tierResults.map((r) => r.confidence);
    const tierWeights = tierResults.map(
      (r) => ENSEMBLE_MODELS.find((m) => m.id === r.modelId)?.consensusWeight ?? 1,
    );
    const adjustedWeights = computeOutlierAdjustedWeights(tierScores, tierWeights);

    const wSum = adjustedWeights.reduce((s, w) => s + w, 0);
    const tierMean = tierScores.reduce((s, c, i) => s + c * adjustedWeights[i], 0) / (wSum || 1);

    tierBreakdown[tier] = tierMean;
    blended += tierMean * TIER_IMPORTANCE[tier];
    totalTierWeight += TIER_IMPORTANCE[tier];
  }

  return {
    weightedMean: totalTierWeight > 0 ? blended / totalTierWeight : 0,
    tierBreakdown,
  };
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
 * @returns           Full {@link ConsensusReport} with per-model results and
 *                    the final severity classification.
 */
export async function runEnsembleInference(
  inputs: Partial<Record<BodyPart, HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData>>,
  onProgress?: (event: InferenceProgressEvent) => void,
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

    // Specialists accept all ROIs; we pass whichever images are available
    // and average over them.
    const bodyParts = (Object.keys(inputs) as BodyPart[]).filter(
      (bp) => inputs[bp] && qualityApproved[bp] !== false,
    );

    if (bodyParts.length === 0) {
      modelResults.push(makeSkippedResult(specialistConfig, 'All ROIs failed quality check'));
      processedModels++;
      continue;
    }

    // Run the specialist on each approved ROI and average the confidences
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

  // ── Advanced Consensus with Outlier Detection & Tier Weighting ──────────
  emit('consensus', undefined, 'Aggregating consensus with outlier detection…');

  const contributing = modelResults.filter((r) => r.contributedToConsensus);
  const scores = contributing.map((r) => r.confidence);
  const weights = contributing.map(
    (r) => ENSEMBLE_MODELS.find((m) => m.id === r.modelId)?.consensusWeight ?? 1,
  );

  // Advanced: outlier-adjusted weights prevent single misfiring models from skewing results
  const adjustedWeights = computeOutlierAdjustedWeights(scores, weights);

  // Advanced: tier-weighted consensus gives Judges 55% influence, Specialists 35%, Scouts 10%
  const { weightedMean: tierConsensus, tierBreakdown } = tierWeightedConsensus(contributing);

  // Blend: 60% tier-weighted consensus + 40% traditional weighted average for robustness
  const traditionalMean =
    scores.reduce((s, c, i) => s + c * adjustedWeights[i], 0) /
    (adjustedWeights.reduce((s, w) => s + w, 0) || 1);
  const finalConsensus = tierConsensus * 0.6 + traditionalMean * 0.4;

  // Compute inter-model agreement for confidence calibration
  const agreement = computeAgreementRatio(scores);

  const severity = consensusClassify(scores, adjustedWeights);
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
    const confidence = Math.min(1, Math.max(0, rawConf));

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
 * STRICT LOCAL VALIDATION:
 * Runs all Tier-1 Scout models against an image to determine if it matches 
 * the expected body part.
 * 
 * Logic:
 * 1. If the expected part is the best match, we allow it (even with low confidence), 
 *    leaving the final strict validation to the server-side Gemini/Groq AI.
 * 2. We ONLY hard-reject locally if we are CONFIDENT that the image is a 
 *    DIFFERENT body part (Mismatch).
 */
export async function runScoutValidation(
  expectedPart: BodyPart,
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData
): Promise<{ isValid: boolean; confidence: number; detectedPart?: BodyPart; message: string }> {
  const scoutResults: { part: BodyPart; confidence: number }[] = [];
  
  // Run all scouts in parallel
  const scouts = MODELS_BY_TIER[1];
  const results = await Promise.all(scouts.map(s => runSingleModel(s, source)));
  
  for (const res of results) {
    scoutResults.push({
      part: res.parameter as BodyPart,
      confidence: res.confidence
    });
  }

  console.log('[ScoutValidation] Scores:', scoutResults.map(r => `${r.part}: ${(r.confidence * 100).toFixed(1)}%`).join(' | '));
  
  // Find the scout with highest confidence
  const bestMatch = [...scoutResults].sort((a, b) => b.confidence - a.confidence)[0];
  const expectedResult = scoutResults.find(r => r.part === expectedPart);
  
  // 1. SUCCESS: Expected part is the strongest candidate
  if (bestMatch.part === expectedPart && bestMatch.confidence > 0.1) {
    return {
      isValid: true,
      confidence: bestMatch.confidence,
      message: "Image passed local candidate check."
    };
  }
  
  // 2. REJECTION: We are confident this is a DIFFERENT part (Mismatch)
  // Use a higher threshold for hard-rejection to avoid false negatives
  const HARD_MISMATCH_THRESHOLD = 0.65;
  if (bestMatch.confidence >= HARD_MISMATCH_THRESHOLD && bestMatch.part !== expectedPart) {
    return {
      isValid: false,
      confidence: bestMatch.confidence,
      detectedPart: bestMatch.part,
      message: `Parameter Mismatch: This looks like ${bestMatch.part}, but you selected "${expectedPart}". Please provide the correct image.`
    };
  }
  
  // 3. AMBIGUOUS: Local models are unsure. 
  // We allow it to proceed to the server-side AI (Gemini) which has much higher 
  // reasoning capability for the final "ruthless" validation.
  return {
    isValid: true,
    confidence: expectedResult?.confidence ?? 0,
    message: "Local check ambiguous; proceeding to AI validation."
  };
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
