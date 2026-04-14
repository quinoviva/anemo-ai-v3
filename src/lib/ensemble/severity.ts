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
export type UserSex = 'Male' | 'Female' | 'Other' | string;

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
  /** Thresholds used for this calculation. */
  thresholds: {
    normal: number;
    mild: number;
    moderate: number;
  };
}

// ---------------------------------------------------------------------------
// Thresholds (g/dL) - Reference: WHO
// ---------------------------------------------------------------------------

export const GET_THRESHOLDS = (sex?: UserSex) => {
  const isMale = sex?.toLowerCase() === 'male';
  return {
    normal: isMale ? 13.0 : 12.0,
    mild: isMale ? 11.0 : 10.0,
    moderate: 7.0,
  };
};

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/**
 * Classifies an Hgb measurement into a severity level with enriched clinical detail.
 *
 * @param hgbValue - Hemoglobin value in g/dL.
 * @param sex      - Optional user sex for gender-specific thresholds.
 * @returns A fully populated {@link SeverityResult} object.
 */
export function classifyHgb(hgbValue: number, sex?: UserSex): SeverityResult {
  const T = GET_THRESHOLDS(sex);
  const sexLabel = sex?.toLowerCase() === 'male' ? 'adult males' : 'adult females';

  if (hgbValue > T.normal) {
    return {
      severity: 'Normal',
      severityIndex: 0,
      folderLabel: '0_Normal',
      hgbValue,
      thresholds: T,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) is within the normal range for Filipino ${sexLabel} (>${T.normal} g/dL). Vascular coloration of conjunctiva, nail beds, and palmar creases appears consistent with adequate erythrocyte oxygen-carrying capacity. No clinical indicators of anemia detected.`,
      urgency: 'none',
    };
  }
  if (hgbValue >= T.mild) {
    const proximity = ((hgbValue - T.mild) / (T.normal - T.mild) * 100).toFixed(0);
    return {
      severity: 'Mild',
      severityIndex: 1,
      folderLabel: '1_Mild',
      hgbValue,
      thresholds: T,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates mild anemia (${T.mild}–${T.normal} g/dL), placing the patient at the ${proximity}% mark within this band. Subtle pallor may be visible in palmar creases and conjunctiva. Iron-rich dietary intervention and follow-up CBC within 4–6 weeks are recommended.`,
      urgency: 'low',
    };
  }
  if (hgbValue >= T.moderate) {
    return {
      severity: 'Moderate',
      severityIndex: 2,
      folderLabel: '2_Moderate',
      hgbValue,
      thresholds: T,
      description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates moderate anemia (${T.moderate}–${T.mild} g/dL). Noticeable pallor is expected across conjunctiva, nail beds, and palmar creases. The patient may experience fatigue, dyspnea on exertion, and tachycardia. Prompt medical consultation and potential iron supplementation are strongly recommended.`,
      urgency: 'moderate',
    };
  }
  return {
    severity: 'Severe',
    severityIndex: 3,
    folderLabel: '3_Severe',
    hgbValue,
    thresholds: T,
    description: `Hemoglobin level (${hgbValue.toFixed(1)} g/dL) indicates severe anemia (<${T.moderate} g/dL). Profound pallor is expected across all examined areas. The patient is at risk for cardiac decompensation, syncope, and organ hypoperfusion. Immediate medical attention — including possible IV iron therapy or transfusion — is urgently required.`,
    urgency: 'high',
  };
}

/**
 * Converts a raw model confidence score (0–1) to an estimated Hgb value.
 *
 * New Standard Calculation:
 * Hgb (g/dL) = 5.0 + confidence × 11.0
 *
 * @param confidence - Model output in [0, 1] where 1 = most "normal".
 * @returns Estimated Hgb in g/dL.
 */
export function confidenceToHgb(confidence: number): number {
  return 5.0 + (confidence * 11.0);
}

/**
 * Combines an array of per-model confidence scores into a single weighted
 * consensus Hgb estimate, then classifies it.
 */
export function consensusClassify(
  scores: number[],
  weights?: number[],
  sex?: UserSex
): SeverityResult {
  if (scores.length === 0) {
    return {
      severity: 'Normal',
      severityIndex: 0,
      folderLabel: '0_Normal',
      hgbValue: null,
      thresholds: GET_THRESHOLDS(sex),
      description: 'No model scores provided.',
      urgency: 'none',
    };
  }

  const w = weights ?? scores.map(() => 1 / scores.length);
  const totalWeight = w.reduce((s, v) => s + v, 0);
  const weightedMean = scores.reduce((sum, score, i) => sum + score * w[i], 0) / (totalWeight || 1);

  const hgb = confidenceToHgb(weightedMean);
  return classifyHgb(hgb, sex);
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
