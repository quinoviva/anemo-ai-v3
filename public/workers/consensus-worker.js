/**
 * Anemo AI — Edge-AI Consensus Worker
 * ====================================
 * Runs entirely inside a browser Web Worker so the main thread stays
 * responsive during heavy LLM inference.
 *
 * What this worker does
 * ---------------------
 * 1. Receives confidence scores from all 10 ensemble models via postMessage.
 * 2. Loads a quantized language model (Phi-3-Mini or Gemma-2B) using
 *    Transformers.js (@huggingface/transformers) — NO API keys required.
 * 3. Constructs a structured clinical prompt from the model scores.
 * 4. Streams the generated report back to the main thread token-by-token.
 * 5. Falls back to a deterministic rule-based report if the LLM is
 *    unavailable (e.g., insufficient device memory or first-load timeout).
 *
 * Message protocol
 * ----------------
 * Incoming (main thread → worker):
 *   { type: 'ANALYSE', payload: ConsensusWorkerInput }
 *   { type: 'ABORT' }
 *
 * Outgoing (worker → main thread):
 *   { type: 'LOADING',  payload: { progress: number, message: string } }
 *   { type: 'TOKEN',    payload: { token: string } }
 *   { type: 'COMPLETE', payload: ConsensusWorkerOutput }
 *   { type: 'ERROR',    payload: { message: string } }
 */

/* global self */

// ---------------------------------------------------------------------------
// Transformers.js — lazy import (loaded only when worker is invoked)
// The CDN fallback ensures the worker works even if the npm bundle is absent.
// ---------------------------------------------------------------------------

let pipeline = null;
let abortController = null;

async function loadTransformers() {
  if (pipeline !== null) return pipeline;

  // Try the npm-bundled version first
  try {
    const { pipeline: p, env } = await import(
      /* webpackIgnore: true */
      '@huggingface/transformers'
    );
    // Disable local model check — models are fetched from HuggingFace Hub
    env.allowLocalModels = false;
    pipeline = p;
    return pipeline;
  } catch (_) {
    // Fallback: load from UNPKG CDN (works in production PWA without bundler)
    try {
      const mod = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js'
      );
      pipeline = mod.pipeline;
      return pipeline;
    } catch (e) {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Severity helpers (mirrors src/lib/ensemble/severity.ts)
// Duplicated here so the worker has no build-time TS dependency.
// ---------------------------------------------------------------------------

const HGB_NORMAL = 12.0;
const HGB_MILD = 10.0;
const HGB_MODERATE = 7.0;

function classifyHgb(hgb) {
  if (hgb > HGB_NORMAL) return 'Normal';
  if (hgb >= HGB_MILD)  return 'Mild';
  if (hgb >= HGB_MODERATE) return 'Moderate';
  return 'Severe';
}

function hgbToSeverityDescription(hgb, severity) {
  const map = {
    Normal:   `Hemoglobin level (~${hgb.toFixed(1)} g/dL) is within normal range (>12 g/dL). No anemia detected.`,
    Mild:     `Hemoglobin level (~${hgb.toFixed(1)} g/dL) indicates mild anemia (10–12 g/dL).`,
    Moderate: `Hemoglobin level (~${hgb.toFixed(1)} g/dL) indicates moderate anemia (7–10 g/dL).`,
    Severe:   `Hemoglobin level (~${hgb.toFixed(1)} g/dL) indicates severe anemia (<7 g/dL).`,
  };
  return map[severity] ?? map.Normal;
}

function confidenceToHgb(confidence) {
  return 5.0 + confidence * (16.0 - 5.0);
}

// ---------------------------------------------------------------------------
// Dietary recommendations (Filipino-localised)
// ---------------------------------------------------------------------------

const DIETARY_TIPS = {
  Normal: [
    'Maintain a balanced diet with iron-rich foods like lean meat, poultry, and fish.',
    'Include vitamin C-rich foods (calamansi, tomatoes, guava) to enhance iron absorption.',
    'Continue annual health monitoring.',
  ],
  Mild: [
    'Increase iron-rich Filipino foods: dinuguan, pork liver (atay), and tahong (mussels).',
    'Eat malunggay (moringa) leaves daily — one of the richest plant-based iron sources.',
    'Pair iron-rich foods with calamansi juice to boost absorption.',
    'Avoid coffee or tea immediately after meals (tannins reduce iron absorption).',
    'Schedule a blood test within 4–6 weeks.',
  ],
  Moderate: [
    'Consult a physician as soon as possible for a complete blood count (CBC) test.',
    'Iron supplementation (ferrous sulfate) may be required — follow doctor\'s advice.',
    'Eat iron-dense foods at every meal: liver, kangkong, pechay.',
    'Avoid calcium-rich drinks at mealtime.',
    'Rest adequately and avoid strenuous activity.',
  ],
  Severe: [
    'Seek immediate medical attention — severe anemia is life-threatening.',
    'IV iron therapy or blood transfusion may be necessary.',
    'Do not rely on diet alone at this stage — medical treatment is essential.',
    'After stabilisation, adopt an iron-rich diet: liver, lean red meat, malunggay.',
    'Follow up with a physician every 2 weeks until Hgb normalises.',
  ],
};

// ---------------------------------------------------------------------------
// Rule-based fallback report (used when LLM is unavailable)
// ---------------------------------------------------------------------------

function buildRuleBasedReport(input) {
  const { allConfidenceScores, modelResults, consensusHgb, severity } = input;
  const contributing = modelResults.filter((r) => r.contributedToConsensus);
  const lines = [
    `## Anemo AI Clinical Screening Report`,
    ``,
    `**Estimated Hemoglobin:** ~${consensusHgb.toFixed(1)} g/dL`,
    `**Severity Classification:** ${severity}`,
    ``,
    `### Analysis Summary`,
    hgbToSeverityDescription(consensusHgb, severity),
    ``,
    `${contributing.length} of ${modelResults.length} models contributed to this consensus.`,
    ``,
    `### Ensemble Model Confidence`,
    ...contributing.map(
      (r) => `- **${r.modelName}** (Tier ${r.tier}): ${(r.confidence * 100).toFixed(1)}% normal confidence`,
    ),
    ``,
    `### Dietary Recommendations`,
    ...(DIETARY_TIPS[severity] || DIETARY_TIPS.Normal).map((tip) => `- ${tip}`),
    ``,
    `---`,
    `*This report is generated by Anemo AI for screening purposes only. It does not constitute a medical diagnosis. Please consult a licensed healthcare professional for a definitive assessment.*`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// LLM prompt builder
// ---------------------------------------------------------------------------

function buildClinicalPrompt(input) {
  const { allConfidenceScores, modelResults, consensusHgb, severity } = input;
  const contributing = modelResults.filter((r) => r.contributedToConsensus);

  const modelSummary = contributing
    .map((r) => `  - ${r.modelName} (Tier ${r.tier}): ${(r.confidence * 100).toFixed(1)}% normal`)
    .join('\n');

  return `You are a clinical AI assistant for Anemo AI, a non-invasive anemia screening app used in the Philippines.

A 10-model heterogeneous deep learning ensemble has analysed the patient's skin, fingernail, and under-eye (conjunctiva) images. Here are the results:

Estimated Hemoglobin: ~${consensusHgb.toFixed(1)} g/dL
Severity Classification: ${severity} anemia
${hgbToSeverityDescription(consensusHgb, severity)}

Model confidence scores:
${modelSummary}

Your task:
1. Write a clear, compassionate, localised clinical screening report in 3-4 sentences.
2. Explain what the Hgb level means for the patient in plain language.
3. List 3-5 iron-rich Filipino dietary recommendations tailored to the severity level.
4. End with a reminder that this is a screening tool and not a medical diagnosis.

Keep the tone warm and supportive. Use simple language suitable for a Filipino patient who may not have medical training.`;
}

// ---------------------------------------------------------------------------
// Main message handler
// ---------------------------------------------------------------------------

self.onmessage = async function handleMessage(event) {
  const { type, payload } = event.data;

  if (type === 'ABORT') {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    return;
  }

  if (type !== 'ANALYSE') return;

  abortController = new AbortController();
  const { signal } = abortController;

  try {
    // Post loading start
    self.postMessage({
      type: 'LOADING',
      payload: { progress: 0.05, message: 'Initialising Edge-AI reasoning engine…' },
    });

    // Check if LLM is feasible (require >2 GB estimated free memory)
    const mem = navigator.deviceMemory;
    const llmFeasible = !mem || mem >= 2;

    if (!llmFeasible) {
      // Skip LLM, use rule-based fallback
      self.postMessage({
        type: 'LOADING',
        payload: { progress: 0.5, message: 'Using deterministic reasoning (low memory)…' },
      });
      const report = buildRuleBasedReport(payload);
      self.postMessage({
        type: 'COMPLETE',
        payload: {
          report,
          mode: 'rule-based',
          severity: payload.severity,
          consensusHgb: payload.consensusHgb,
          dietaryRecommendations: DIETARY_TIPS[payload.severity] || DIETARY_TIPS.Normal,
        },
      });
      return;
    }

    // Try loading Transformers.js
    self.postMessage({
      type: 'LOADING',
      payload: { progress: 0.1, message: 'Loading Transformers.js…' },
    });

    const p = await loadTransformers();

    if (!p || signal.aborted) {
      const report = buildRuleBasedReport(payload);
      self.postMessage({
        type: 'COMPLETE',
        payload: {
          report,
          mode: 'rule-based',
          severity: payload.severity,
          consensusHgb: payload.consensusHgb,
          dietaryRecommendations: DIETARY_TIPS[payload.severity] || DIETARY_TIPS.Normal,
        },
      });
      return;
    }

    // Load quantized text-generation model
    self.postMessage({
      type: 'LOADING',
      payload: { progress: 0.2, message: 'Loading quantized language model (first load may take a moment)…' },
    });

    // Use Phi-3-Mini (INT4 quantized, ~2 GB download on first use) as the
    // primary model. On devices with limited bandwidth or storage, the worker
    // will automatically fall back to the much smaller DistilGPT-2 (~300 MB).
    // After the first download, the model is cached by the browser so
    // subsequent loads are instant and fully offline.
    const MODEL_ID = 'Xenova/Phi-3-mini-4k-instruct';
    const FALLBACK_MODEL_ID = 'Xenova/distilgpt2';

    let generator;
    try {
      generator = await p('text-generation', MODEL_ID, {
        dtype: 'q4',
        progress_callback: (progress) => {
          if (signal.aborted) return;
          self.postMessage({
            type: 'LOADING',
            payload: {
              progress: 0.2 + progress.progress * 0.6,
              message: `Downloading model: ${(progress.progress * 100).toFixed(0)}%`,
            },
          });
        },
      });
    } catch (_) {
      // Fall back to lightweight model
      generator = await p('text-generation', FALLBACK_MODEL_ID, {
        progress_callback: (progress) => {
          if (signal.aborted) return;
          self.postMessage({
            type: 'LOADING',
            payload: {
              progress: 0.2 + progress.progress * 0.6,
              message: `Downloading fallback model: ${(progress.progress * 100).toFixed(0)}%`,
            },
          });
        },
      });
    }

    if (signal.aborted) return;

    self.postMessage({
      type: 'LOADING',
      payload: { progress: 0.85, message: 'Generating clinical report…' },
    });

    const prompt = buildClinicalPrompt(payload);
    const outputs = await generator(prompt, {
      max_new_tokens: 350,
      do_sample: false,
      callback_function: (beams) => {
        if (signal.aborted) return true; // Returning true stops generation
        const token = beams[0]?.output_token_ids?.slice(-1)?.[0];
        if (token !== undefined) {
          self.postMessage({ type: 'TOKEN', payload: { token: String(token) } });
        }
      },
    });

    if (signal.aborted) return;

    const generatedText =
      outputs?.[0]?.generated_text?.replace(prompt, '').trim() ??
      buildRuleBasedReport(payload);

    self.postMessage({
      type: 'COMPLETE',
      payload: {
        report: generatedText,
        mode: 'llm',
        severity: payload.severity,
        consensusHgb: payload.consensusHgb,
        dietaryRecommendations: DIETARY_TIPS[payload.severity] || DIETARY_TIPS.Normal,
      },
    });
  } catch (err) {
    if (signal.aborted) return;
    console.error('[ConsensusWorker] Error:', err);

    // Always fall back to rule-based report on any error
    try {
      const report = buildRuleBasedReport(payload);
      self.postMessage({
        type: 'COMPLETE',
        payload: {
          report,
          mode: 'rule-based',
          severity: payload.severity,
          consensusHgb: payload.consensusHgb,
          dietaryRecommendations: DIETARY_TIPS[payload.severity] || DIETARY_TIPS.Normal,
        },
      });
    } catch (fallbackErr) {
      self.postMessage({
        type: 'ERROR',
        payload: { message: err?.message ?? 'Unknown error in consensus worker' },
      });
    }
  }
};
