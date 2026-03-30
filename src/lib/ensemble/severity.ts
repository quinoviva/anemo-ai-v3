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
 * Classifies an Hgb measurement into a severity level.
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
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) is within normal range. No signs of anemia detected.`,
      urgency: 'none',
    };
  }
  if (hgbValue >= HGB_MILD_THRESHOLD) {
    return {
      severity: 'Mild',
      severityIndex: 1,
      folderLabel: '1_Mild',
      hgbValue,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates mild anemia (10–12 g/dL). Dietary improvements and monitoring are advised.`,
      urgency: 'low',
    };
  }
  if (hgbValue >= HGB_MODERATE_THRESHOLD) {
    return {
      severity: 'Moderate',
      severityIndex: 2,
      folderLabel: '2_Moderate',
      hgbValue,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates moderate anemia (7–10 g/dL). Medical consultation is recommended.`,
      urgency: 'moderate',
    };
  }
  return {
    severity: 'Severe',
    severityIndex: 3,
    folderLabel: '3_Severe',
    hgbValue,
    description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates severe anemia (<7 g/dL). Immediate medical attention is required.`,
    urgency: 'high',
  };
}

/**
 * Converts a raw model confidence score (0–1) to an estimated Hgb value
 * using a linear mapping calibrated for the Filipino population range.
 *
 * The mapping used here is intentionally conservative:
 *   confidence = 0.0  →  Hgb ≈ 5.0 g/dL  (very severe)
 *   confidence = 1.0  →  Hgb ≈ 16.0 g/dL (healthy upper bound)
 *
 * This should be replaced with a regression head trained on actual Hgb
 * measurements once labelled data is available.
 *
 * Calibration notes:
 *   - HGB_MIN (5.0 g/dL): corresponds to life-threatening severe anemia;
 *     below this level emergency transfusion is typically required.
 *   - HGB_MAX (16.0 g/dL): healthy upper-bound reference for the Filipino
 *     adult female population (males may reach ~18 g/dL, but the female
 *     range is used as the primary screening target for this application).
 *
 * @param confidence - Model output in [0, 1] where 1 = most "normal".
 * @returns Estimated Hgb in g/dL.
 */
export function confidenceToHgb(confidence: number): number {
  const HGB_MIN = 5.0;
  const HGB_MAX = 16.0;
  return HGB_MIN + confidence * (HGB_MAX - HGB_MIN);
}

/**
 * Combines an array of per-model confidence scores into a single weighted
 * consensus Hgb estimate, then classifies it.
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

  // Validate weights: must have the same length as scores, every element must
  // be finite, and the total must be > 0.  Fall back to equal weights when
  // the provided weights are invalid to avoid NaN/Infinity propagation.
  const equalWeights = scores.map(() => 1 / scores.length);
  const useEqualWeights =
    !weights ||
    weights.length !== scores.length ||
    !weights.every(Number.isFinite) ||
    weights.reduce((s, v) => s + v, 0) <= 0;

  const w = useEqualWeights ? equalWeights : weights!;
  const totalWeight = w.reduce((s, v) => s + v, 0);
  const weightedMean =
    scores.reduce((sum, score, i) => sum + score * w[i], 0) / totalWeight;

  const hgb = confidenceToHgb(weightedMean);
  return classifyHgb(hgb);
}

// ---------------------------------------------------------------------------
// Iron-rich dietary recommendations (iron-rich Filipino foods prioritised)
// ---------------------------------------------------------------------------

const DIETARY_TIPS_BY_SEVERITY: Record<SeverityClass, string[]> = {
  Normal: [
    'Maintain a balanced diet rich in iron sources like lean red meat, poultry, and fish.',
    'Include vitamin C-rich foods (calamansi, tomatoes, guava) to enhance non-heme iron absorption.',
    'Continue regular health monitoring at least once a year.',
  ],
  Mild: [
    'Increase intake of iron-rich Filipino foods: dinuguan (blood stew), pork liver (atay), and tahong (mussels).',
    'Eat malunggay (moringa) leaves regularly — one of the richest plant-based iron sources.',
    'Pair iron-rich foods with calamansi juice or other vitamin C sources to boost absorption.',
    'Avoid drinking coffee or tea immediately after meals as tannins reduce iron absorption.',
    'Consider a blood test within 4–6 weeks to monitor Hgb levels.',
  ],
  Moderate: [
    'Consult a physician as soon as possible for a complete blood count (CBC) test.',
    'Iron supplementation (ferrous sulfate) may be prescribed — follow your doctor\'s advice.',
    'Prioritise iron-dense foods at every meal: liver, kangkong (water spinach), pechay (bok choy).',
    'Avoid calcium-rich drinks at mealtime — calcium competes with iron absorption.',
    'Rest adequately and avoid strenuous activities until Hgb normalises.',
  ],
  Severe: [
    'Seek immediate medical attention — severe anemia can be life-threatening.',
    'Intravenous iron therapy or blood transfusion may be necessary; your doctor will advise.',
    'Do not rely on diet alone at this stage — medical treatment is essential.',
    'After stabilisation, adopt an iron-rich diet: daily servings of liver, lean red meat, and malunggay.',
    'Follow up with your physician every 2 weeks until Hgb reaches safe levels.',
  ],
};

/**
 * Returns a list of localised, human-readable dietary recommendations
 * for the given severity class.
 */
export function getDietaryRecommendations(severity: SeverityClass): string[] {
  return DIETARY_TIPS_BY_SEVERITY[severity];
}
