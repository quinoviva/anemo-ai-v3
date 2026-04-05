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
    Normal:   `Hemoglobin level (~${hgb.toFixed(1)} g/dL) is within the normal range for Filipino adult females (>12 g/dL). Vascular coloration of examined body parts appears consistent with adequate erythrocyte oxygen-carrying capacity.`,
    Mild:     `Hemoglobin level (~${hgb.toFixed(1)} g/dL) indicates mild anemia (10–12 g/dL). Subtle pallor may be visible in palmar creases and conjunctiva. Dietary intervention with iron-rich Filipino foods and follow-up monitoring is recommended.`,
    Moderate: `Hemoglobin level (~${hgb.toFixed(1)} g/dL) indicates moderate anemia (7–10 g/dL). Noticeable pallor expected across conjunctiva, nail beds, and palmar creases. The patient may experience fatigue, dyspnea on exertion, and tachycardia. Medical consultation and iron supplementation are strongly recommended.`,
    Severe:   `Hemoglobin level (~${hgb.toFixed(1)} g/dL) indicates severe anemia (<7 g/dL). Profound pallor is expected. The patient is at risk for cardiac decompensation, syncope, and organ hypoperfusion. Immediate medical attention — including possible IV iron therapy or transfusion — is urgently required.`,
  };
  return map[severity] ?? map.Normal;
}

/**
 * Enhanced sigmoid-based confidence → Hgb mapping (mirrors severity.ts).
 * Centres resolution at the mild/normal decision boundary (~11 g/dL).
 */
function confidenceToHgb(confidence) {
  const HGB_MIN = 4.0;
  const HGB_MAX = 16.5;
  const MIDPOINT = 0.55;
  const STEEPNESS = 6.0;
  const sigmoid = 1 / (1 + Math.exp(-STEEPNESS * (confidence - MIDPOINT)));
  return HGB_MIN + sigmoid * (HGB_MAX - HGB_MIN);
}

// ---------------------------------------------------------------------------
// Dietary recommendations (Filipino-localised)
// ---------------------------------------------------------------------------

const DIETARY_TIPS = {
  Normal: [
    'Maintain a balanced diet rich in heme-iron: lean red meat (50-75g, 3× per week), poultry, and fish.',
    'Include vitamin C-rich foods at every meal (calamansi, guava, ripe mango, tomatoes) to enhance non-heme iron absorption by up to 6×.',
    'Consume dark leafy greens daily: malunggay (moringa), kangkong, pechay, saluyot.',
    'Avoid coffee/tea within 1 hour of meals — tannins inhibit iron absorption.',
    'Continue annual health monitoring with CBC.',
  ],
  Mild: [
    'Increase iron intake at EVERY meal: dinuguan, pork/chicken liver (atay), tahong (mussels), tuyo.',
    'Eat malunggay leaves daily — 28 mg iron per 100g dried. Add to tinola, sinigang, or drink as tea.',
    'Pair iron foods with citrus: squeeze calamansi on ulam, eat guava or papaya after meals.',
    'Avoid coffee/tea and calcium-rich foods within 1 hour of iron-rich meals.',
    'Cook with cast-iron pans to leach additional dietary iron (1-5 mg per serving).',
    'Schedule a follow-up CBC blood test within 4-6 weeks.',
    'Consider a daily multivitamin with 18 mg elemental iron and folate.',
  ],
  Moderate: [
    'Consult a physician immediately for CBC and iron studies panel (serum ferritin, TIBC).',
    'Iron supplementation (ferrous sulfate 325 mg, 1-3× daily) is likely needed — follow doctor\'s dosing.',
    'Take iron supplements on empty stomach with calamansi juice or vitamin C for maximum absorption.',
    'Eat iron-dense foods at every meal: liver, kangkong, pechay, tokwa, red meat.',
    'Avoid calcium supplements and antacids within 2 hours of iron supplements.',
    'Rest adequately and limit strenuous activity to prevent cardiac strain.',
    'Monitor for worsening symptoms: increasing fatigue, dizziness, rapid heartbeat.',
  ],
  Severe: [
    'URGENT: Seek immediate medical attention — severe anemia can cause heart failure.',
    'IV iron therapy or blood transfusion may be required by your physician.',
    'Do NOT rely on diet/oral supplements alone — the Hgb deficit requires medical intervention.',
    'After stabilisation: daily liver, lean red meat, malunggay, kangkong, legumes (monggo, black beans).',
    'Follow up every 1-2 weeks. Target: Hgb rise of 1-2 g/dL per month with treatment.',
    'Watch for danger signs: chest pain, severe dizziness, fainting, difficulty breathing.',
  ],
};

// ---------------------------------------------------------------------------
// Rule-based fallback report (used when LLM is unavailable)
// ---------------------------------------------------------------------------

function buildRuleBasedReport(input) {
  const { allConfidenceScores, modelResults, consensusHgb, severity } = input;
  const contributing = modelResults.filter((r) => r.contributedToConsensus);

  // Compute inter-model agreement
  const scores = contributing.map(r => r.confidence);
  const mean = scores.length > 0 ? scores.reduce((s, c) => s + c, 0) / scores.length : 0;
  const variance = scores.length > 1 ? scores.reduce((s, c) => s + (c - mean) ** 2, 0) / scores.length : 0;
  const agreement = Math.max(0, 100 - Math.sqrt(variance) * 400).toFixed(0);

  // Group models by tier
  const scouts = contributing.filter(r => r.tier === 1);
  const specialists = contributing.filter(r => r.tier === 2);
  const judges = contributing.filter(r => r.tier === 3);

  const lines = [
    `## Anemo AI Clinical Screening Report`,
    ``,
    `**Estimated Hemoglobin:** ~${consensusHgb.toFixed(1)} g/dL`,
    `**Severity Classification:** ${severity}`,
    `**Model Agreement:** ${agreement}%`,
    `**Models Contributing:** ${contributing.length} of ${modelResults.length}`,
    ``,
    `### Clinical Assessment`,
    hgbToSeverityDescription(consensusHgb, severity),
    ``,
    `### Ensemble Analysis Breakdown`,
    ``,
    `**Tier 1 — Quality Scouts** (Image quality & ROI validation)`,
    ...(scouts.length > 0
      ? scouts.map(r => `- ${r.modelName}: ${(r.confidence * 100).toFixed(1)}% quality score ${r.qualityApproved ? '✓ Approved' : '✗ Flagged'}`)
      : ['- No scout models ran']),
    ``,
    `**Tier 2 — Deep Specialists** (High-precision tissue analysis)`,
    ...(specialists.length > 0
      ? specialists.map(r => `- ${r.modelName}: ${(r.confidence * 100).toFixed(1)}% normal confidence → Hgb ≈ ${confidenceToHgb(r.confidence).toFixed(1)} g/dL`)
      : ['- No specialist models ran']),
    ``,
    `**Tier 3 — Global Judges** (Final Hgb estimation & consensus)`,
    ...(judges.length > 0
      ? judges.map(r => `- ${r.modelName}: ${(r.confidence * 100).toFixed(1)}% normal confidence → Hgb ≈ ${confidenceToHgb(r.confidence).toFixed(1)} g/dL`)
      : ['- No judge models ran']),
    ``,
    `### Dietary Recommendations`,
    ...(DIETARY_TIPS[severity] || DIETARY_TIPS.Normal).map((tip) => `- ${tip}`),
    ``,
    `---`,
    `*This report is generated by Anemo AI using a ${contributing.length}-model heterogeneous deep learning ensemble for screening purposes only. It does not constitute a medical diagnosis. Model agreement across the ensemble was ${agreement}%. Please consult a licensed healthcare professional for a definitive assessment and treatment plan.*`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// LLM prompt builder
// ---------------------------------------------------------------------------

function buildClinicalPrompt(input) {
  const { allConfidenceScores, modelResults, consensusHgb, severity } = input;
  const contributing = modelResults.filter((r) => r.contributedToConsensus);

  // Group by tier for structured presentation
  const scouts = contributing.filter(r => r.tier === 1);
  const specialists = contributing.filter(r => r.tier === 2);
  const judges = contributing.filter(r => r.tier === 3);

  const scoutSummary = scouts.length > 0
    ? scouts.map(r => `    - ${r.modelName}: ${(r.confidence * 100).toFixed(1)}% quality`).join('\n')
    : '    - No scouts ran';
  const specialistSummary = specialists.length > 0
    ? specialists.map(r => `    - ${r.modelName}: ${(r.confidence * 100).toFixed(1)}% normal → Hgb ≈ ${confidenceToHgb(r.confidence).toFixed(1)}`).join('\n')
    : '    - No specialists ran';
  const judgeSummary = judges.length > 0
    ? judges.map(r => `    - ${r.modelName}: ${(r.confidence * 100).toFixed(1)}% normal → Hgb ≈ ${confidenceToHgb(r.confidence).toFixed(1)}`).join('\n')
    : '    - No judges ran';

  // Compute agreement metric
  const scores = contributing.map(r => r.confidence);
  const mean = scores.length > 0 ? scores.reduce((s, c) => s + c, 0) / scores.length : 0;
  const variance = scores.length > 1 ? scores.reduce((s, c) => s + (c - mean) ** 2, 0) / scores.length : 0;
  const agreementPct = Math.max(0, 100 - Math.sqrt(variance) * 400).toFixed(0);

  return `You are the Anemo AI Clinical Report Writer — a compassionate, expert-level medical AI assistant for a non-invasive anemia screening app developed for the Filipino population.

CONTEXT: A ${contributing.length}-model heterogeneous deep learning ensemble has analysed the patient's skin (palm), fingernail beds, and under-eye (conjunctiva) images using convolutional neural networks and vision transformers.

═══════════════ ENSEMBLE RESULTS ═══════════════

Consensus Estimated Hemoglobin: ~${consensusHgb.toFixed(1)} g/dL
Severity Classification: ${severity}
Inter-Model Agreement: ${agreementPct}%
Models Contributing: ${contributing.length} of ${modelResults.length}

Tier 1 — Quality Scouts (image quality validation):
${scoutSummary}

Tier 2 — Deep Specialists (tissue analysis):
${specialistSummary}

Tier 3 — Global Judges (Hgb estimation):
${judgeSummary}

Clinical interpretation: ${hgbToSeverityDescription(consensusHgb, severity)}

═══════════════ YOUR TASK ═══════════════

Write a clear, compassionate, culturally-appropriate clinical screening report following this EXACT structure:

**1. Summary (2-3 sentences)**
- State the estimated Hgb and what it means in plain Filipino-English
- Mention the severity level and what the patient might be experiencing
- Note the model agreement level (high agreement = more reliable result)

**2. What This Means For You (2-3 sentences)**
- Explain in simple, warm language what anemia means for daily life
- FOR NORMAL: Reassure but emphasize maintaining healthy habits
- FOR MILD: Explain it's manageable with diet changes
- FOR MODERATE: Emphasize importance of seeing a doctor soon
- FOR SEVERE: Convey urgency without causing panic

**3. Recommended Actions (3-5 bullet points)**
- Specific, actionable steps tailored to the severity
- Include iron-rich Filipino foods: malunggay, kangkong, atay (liver), dinuguan, tahong, monggo
- Include vitamin C pairing advice (calamansi, guava)
- Include what to avoid (coffee/tea near meals)

**4. Important Reminders**
- This is a screening tool, not a medical diagnosis
- Recommend appropriate follow-up (CBC test, doctor visit)
- Provide encouragement

Keep the tone warm, supportive, and empowering. Use simple language suitable for a Filipino patient who may not have medical training. Avoid medical jargon except for "hemoglobin" and "anemia" which should be briefly explained.`;
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
