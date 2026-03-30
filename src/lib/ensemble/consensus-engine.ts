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
 *
 * Value: 0.4 — a conservative placeholder based on informal testing.
 * TODO: Replace with a clinically-validated threshold once labelled
 * quality-annotated test data is available (recommended approach: F1-optimised
 * threshold on a held-out quality-labelled set).
 */
const SCOUT_QUALITY_THRESHOLD = 0.4;

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
    result.qualityApproved = result.confidence >= SCOUT_QUALITY_THRESHOLD;
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

  // ── Consensus ─────────────────────────────────────────────────────────────
  emit('consensus', undefined, 'Aggregating consensus…');

  const contributing = modelResults.filter((r) => r.contributedToConsensus);
  const scores = contributing.map((r) => r.confidence);
  const weights = contributing.map(
    (r) => ENSEMBLE_MODELS.find((m) => m.id === r.modelId)?.consensusWeight ?? 1,
  );

  const severity = consensusClassify(scores, weights);
  const consensusHgb = severity.hgbValue ?? confidenceToHgb(
    scores.reduce((s, c, i) => s + c * weights[i], 0) /
      weights.reduce((s, w) => s + w, 0),
  );

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

async function runSingleModel(
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
      confidence: 0,
      estimatedHgb: 0,
      contributedToConsensus: false,
      error,
    };
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
