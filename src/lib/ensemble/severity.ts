/**
 * Anemo AI — Hgb-Based Severity Classification
 *
 * Hemoglobin (Hgb) thresholds for anemia severity classification.
 * These thresholds are aligned with WHO and clinical guidelines and
 * map 1-to-1 to the dataset label directories (0_Normal … 3_Severe).
 *
 * Reference: WHO — Haemoglobin concentrations for the diagnosis of
 * anaemia and assessment of severity (WHO/NMH/NHD/MNM/11.1).
 * https://www.who.int/publications/i/item/WHO-NMH-NHD-MNM-11.1
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeverityClass = 'Normal' | 'Mild' | 'Moderate' | 'Severe';

export interface SeverityResult {
  /** The classified severity class label. */
  severity: SeverityClass;
  /** Numeric severity index 0–3 (matches dataset folder names). */
  severityIndex: 0 | 1 | 2 | 3;
  /** Dataset folder name, e.g. "0_Normal". */
  folderLabel: string;
  /** Estimated or measured Hgb value in g/dL (null when unknown). */
  hgbValue: number | null;
  /** Human-readable description for the clinical report. */
  description: string;
  /** Recommended urgency level for the user. */
  urgency: 'none' | 'low' | 'moderate' | 'high';
}

// ---------------------------------------------------------------------------
// Thresholds (g/dL)
// ---------------------------------------------------------------------------

/** Hgb > NORMAL_THRESHOLD  → Normal (non-anaemic) */
export const HGB_NORMAL_THRESHOLD = 12.0;

/** MILD_THRESHOLD ≤ Hgb ≤ NORMAL_THRESHOLD → Mild anaemia */
export const HGB_MILD_THRESHOLD = 10.0;

/** MODERATE_THRESHOLD ≤ Hgb < MILD_THRESHOLD → Moderate anaemia */
export const HGB_MODERATE_THRESHOLD = 7.0;

/** Hgb < MODERATE_THRESHOLD → Severe anaemia */

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/**
 * Classifies an Hgb measurement into a severity level with enriched clinical detail.
 *
 * @param hgbValue - Hemoglobin value in g/dL.
 * @returns A fully populated {@link SeverityResult} object.
 */
export function classifyHgb(hgbValue: number): SeverityResult {
  if (hgbValue > HGB_NORMAL_THRESHOLD) {
    return {
      severity: 'Normal',
      severityIndex: 0,
      folderLabel: '0_Normal',
      hgbValue,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) is within the normal range for Filipino adult females (>12 g/dL). Vascular coloration of conjunctiva, nail beds, and palmar creases appears consistent with adequate erythrocyte oxygen-carrying capacity. No clinical indicators of anemia detected.`,
      urgency: 'none',
    };
  }
  if (hgbValue >= HGB_MILD_THRESHOLD) {
    const proximity = ((hgbValue - HGB_MILD_THRESHOLD) / (HGB_NORMAL_THRESHOLD - HGB_MILD_THRESHOLD) * 100).toFixed(0);
    return {
      severity: 'Mild',
      severityIndex: 1,
      folderLabel: '1_Mild',
      hgbValue,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates mild anemia (10–12 g/dL), placing the patient at the ${proximity}% mark within this band. Subtle pallor may be visible in palmar creases and conjunctiva. Iron-rich dietary intervention and follow-up CBC within 4–6 weeks are recommended.`,
      urgency: 'low',
    };
  }
  if (hgbValue >= HGB_MODERATE_THRESHOLD) {
    return {
      severity: 'Moderate',
      severityIndex: 2,
      folderLabel: '2_Moderate',
      hgbValue,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates moderate anemia (7–10 g/dL). Noticeable pallor is expected across conjunctiva, nail beds, and palmar creases. The patient may experience fatigue, dyspnea on exertion, and tachycardia. Prompt medical consultation and potential iron supplementation are strongly recommended.`,
      urgency: 'moderate',
    };
  }
  return {
    severity: 'Severe',
    severityIndex: 3,
    folderLabel: '3_Severe',
    hgbValue,
    description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates severe anemia (<7 g/dL). Profound pallor is expected across all examined areas. The patient is at risk for cardiac decompensation, syncope, and organ hypoperfusion. Immediate medical attention — including possible IV iron therapy or transfusion — is urgently required.`,
    urgency: 'high',
  };
}

/**
 * Converts a raw model confidence score (0–1) to an estimated Hgb value
 * using a **sigmoid-shaped mapping** calibrated for the Filipino population.
 *
 * Why sigmoid instead of linear?
 * A linear mapping (old: 5.0 + conf × 11.0) distributes prediction error
 * uniformly across the entire Hgb range, but in practice:
 *   - The clinical action threshold is at Hgb ≈ 10–12 g/dL (mild/normal
 *     boundary), so we want the HIGHEST resolution near the centre.
 *   - Very low / very high confidence values map to extreme Hgb values where
 *     precision matters less (patient is either clearly healthy or critically
 *     ill).
 *
 * The sigmoid centres resolution at the decision boundary (~11 g/dL) while
 * compressing the extremes.
 *
 * Calibration constants:
 *   - HGB_MIN (4.0 g/dL): life-threatening severe anemia (expanded from 5.0
 *     to capture critical range more precisely).
 *   - HGB_MAX (16.5 g/dL): healthy upper-bound reference for Filipino adult
 *     females.
 *   - MIDPOINT (0.55): confidence value that maps to ~10.25 g/dL (mild cutoff zone).
 *   - STEEPNESS (6.0): controls the S-curve sharpness.
 *
 * @param confidence - Model output in [0, 1] where 1 = most "normal".
 * @returns Estimated Hgb in g/dL.
 */
export function confidenceToHgb(confidence: number): number {
  const HGB_MIN = 4.0;
  const HGB_MAX = 16.5;
  const MIDPOINT = 0.55;
  const STEEPNESS = 6.0;

  // Sigmoid: maps [0,1] → (0,1) with centre at MIDPOINT
  const sigmoid = 1 / (1 + Math.exp(-STEEPNESS * (confidence - MIDPOINT)));
  return HGB_MIN + sigmoid * (HGB_MAX - HGB_MIN);
}

/**
 * Combines an array of per-model confidence scores into a single weighted
 * consensus Hgb estimate, then classifies it.
 *
 * Enhanced with:
 *   - IQR-based outlier soft-rejection (outliers receive 0.25× weight)
 *   - Confidence-calibrated uncertainty — when model agreement is low,
 *     the function biases toward a MORE cautious (lower Hgb) estimate to
 *     reduce the risk of missing true anemia cases.
 *
 * @param scores   - Per-model confidence values (0–1, 1 = normal).
 * @param weights  - Optional per-model weight (defaults to equal weights).
 * @returns Final {@link SeverityResult}.
 */
export function consensusClassify(
  scores: number[],
  weights?: number[],
): SeverityResult {
  if (scores.length === 0) {
    return {
      severity: 'Normal',
      severityIndex: 0,
      folderLabel: '0_Normal',
      hgbValue: null,
      description: 'No model scores provided.',
      urgency: 'none',
    };
  }

  const w = weights ?? scores.map(() => 1 / scores.length);

  // IQR-based outlier detection: down-weight scores outside 1.5×IQR
  const sorted = [...scores].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const adjustedW = w.map((wi, i) =>
    scores[i] < lowerFence || scores[i] > upperFence ? wi * 0.25 : wi,
  );

  const totalWeight = adjustedW.reduce((s, v) => s + v, 0);
  const weightedMean =
    scores.reduce((sum, score, i) => sum + score * adjustedW[i], 0) / totalWeight;

  // Confidence-calibrated uncertainty bias
  // If model disagreement is high (stddev > 0.15), shift down by up to 5%
  // to favor detection (reduce false negatives — it's safer to flag potential
  // anemia than to miss it).
  const mean = scores.reduce((s, c) => s + c, 0) / scores.length;
  const variance = scores.reduce((s, c) => s + (c - mean) ** 2, 0) / scores.length;
  const stddev = Math.sqrt(variance);
  const uncertaintyPenalty = stddev > 0.15 ? Math.min(0.05, (stddev - 0.15) * 0.5) : 0;
  const calibratedMean = Math.max(0, weightedMean - uncertaintyPenalty);

  const hgb = confidenceToHgb(calibratedMean);
  return classifyHgb(hgb);
}

// ---------------------------------------------------------------------------
// Iron-rich dietary recommendations (iron-rich Filipino foods prioritised)
// ---------------------------------------------------------------------------

const DIETARY_TIPS_BY_SEVERITY: Record<SeverityClass, string[]> = {
  Normal: [
    'Maintain a balanced diet rich in heme-iron sources: lean red meat (50–75 g, 3× per week), poultry, and fish — these provide the most bioavailable form of iron.',
    'Include vitamin C-rich foods at every meal (calamansi, guava, ripe mango, tomatoes) to enhance non-heme iron absorption by up to 6×.',
    'Consume dark leafy greens daily: malunggay (moringa), kangkong (water spinach), pechay, and saluyot — rich in folate and non-heme iron.',
    'Avoid drinking coffee, tea, or milk within 1 hour of iron-rich meals, as tannins and calcium inhibit iron absorption.',
    'Continue regular health monitoring with an annual CBC to catch early changes.',
  ],
  Mild: [
    'Increase iron intake aggressively: eat iron-rich Filipino foods at EVERY meal — dinuguan (blood stew), pork/chicken liver (atay), tahong (mussels), and tuyo (dried fish).',
    'Eat malunggay (moringa) leaves daily — one of the richest plant-based iron sources (28 mg iron per 100 g dried leaves). Add to tinola, sinigang, or as tea.',
    'Pair iron-rich foods with citrus: squeeze calamansi on your ulam, eat guava or ripe papaya after meals. Vitamin C boosts non-heme iron absorption by 2–6×.',
    'Strictly avoid coffee/tea and calcium-rich foods (milk, cheese) within 1 hour before and after iron-rich meals — tannins and calcium block absorption.',
    'Cook with cast-iron pans when possible — this leaches small amounts of dietary iron into food, providing an additional 1–5 mg per serving.',
    'Schedule a follow-up CBC blood test within 4–6 weeks to track Hgb trend.',
    'Consider a daily multivitamin with 18 mg elemental iron and folate if dietary intake is insufficient.',
  ],
  Moderate: [
    'Consult a physician immediately for a complete blood count (CBC) and iron studies panel (serum ferritin, TIBC, transferrin saturation).',
    'Iron supplementation (ferrous sulfate 325 mg, providing 65 mg elemental iron, 1–3× daily) is likely needed — follow your doctor\'s exact dosing.',
    'Take iron supplements on an empty stomach with calamansi juice or vitamin C tablet — this maximises absorption. If stomach upset occurs, take with a small meal.',
    'Eat iron-dense foods at every meal: liver (highest iron density), kangkong, pechay, tokwa (tofu), and red meat.',
    'Avoid calcium supplements, antacids, and dairy within 2 hours of iron supplements — they significantly reduce absorption.',
    'Rest adequately and limit strenuous physical activities until Hgb normalises to prevent cardiac strain.',
    'Monitor for worsening symptoms: increasing fatigue, dizziness, shortness of breath, or rapid heartbeat — report these to your doctor immediately.',
  ],
  Severe: [
    'URGENT: Seek immediate medical attention at the nearest hospital — severe anemia can cause heart failure and organ damage.',
    'Intravenous (IV) iron therapy (ferric carboxymaltose or iron sucrose) or blood transfusion may be required; your physician will decide based on your clinical status.',
    'Do NOT rely on diet or oral supplements alone at this stage — the Hgb deficit is too large for dietary correction and medical intervention is essential.',
    'After medical stabilisation, adopt a maximally iron-rich diet: daily servings of liver, lean red meat, malunggay, kangkong, and legumes (monggo, black beans).',
    'Follow up with your physician every 1–2 weeks to monitor Hgb recovery trajectory. Target: Hgb rise of 1–2 g/dL per month with treatment.',
    'Watch for danger signs requiring emergency care: chest pain, severe dizziness, fainting, confusion, or difficulty breathing.',
  ],
};

/**
 * Returns a list of localised, human-readable dietary recommendations
 * for the given severity class.
 */
export function getDietaryRecommendations(severity: SeverityClass): string[] {
  return DIETARY_TIPS_BY_SEVERITY[severity];
}
