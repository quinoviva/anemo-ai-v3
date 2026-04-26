'use server';

import { z } from 'zod';
import { ai, groqFallbackModels } from '@/ai/genkit';
import { CbcAnalysis } from '@/ai/schemas/cbc-report';
import { ImageAnalysisReport } from '@/ai/schemas/image-analysis-report';

const MedicalInfoSchema = z.object({
  sex: z.string().optional(),
  age: z.string().optional(),
  fatigue: z.string().optional(),
  cardiovascularStrain: z.string().optional(),
  physicalIndicators: z.string().optional(),
  menstrualContext: z.string().optional(),
});

const ValidationInputSchema = z.object({
  medicalInfo: MedicalInfoSchema,
  imageAnalysisReport: ImageAnalysisReport,
  cbcAnalysis: CbcAnalysis.optional(),
});

export type ValidateMultimodalResultsInput = z.infer<typeof ValidationInputSchema>;

const ValidationResultSchema = z.object({
  reliabilityScore: z.number().min(0).max(100),
  analysis: z.string(),
  discrepancyAlert: z.boolean(),
});

export type ValidateMultimodalResultsOutput = z.infer<typeof ValidationResultSchema>;

export async function validateMultimodalResults(
  input: ValidateMultimodalResultsInput
): Promise<ValidateMultimodalResultsOutput> {
  return validateMultimodalResultsFlow(input);
}

export const validateMultimodalResultsFlow = ai.defineFlow(
  {
    name: 'validateMultimodalResultsFlow',
    inputSchema: ValidationInputSchema,
    outputSchema: ValidationResultSchema,
  },
  async input => {
    let output: z.infer<typeof ValidationResultSchema> | undefined;
    
    const prompt = `
        **Objective:** You are the Anemo AI Multimodal Cross-Verification Engine. Your task is to perform a rigorous, multi-dimensional analysis that correlates visual anemia indicators with clinical lab data and symptomatic presentation to produce a high-accuracy Reliability Index.

        **Analysis Principle:** Medical screening reliability depends on CONVERGENT EVIDENCE — multiple independent data sources pointing to the same conclusion. Your reliability score must reflect the DEGREE OF CONVERGENCE across all available data channels.

        ═══════════════════════════════════════════════════════════════
        DATA CHANNEL 1: PATIENT SYMPTOMATIC PROFILE
        ═══════════════════════════════════════════════════════════════
        - **Sex:** ${input.medicalInfo.sex || 'Not specified'}
        - **Age:** ${input.medicalInfo.age || 'Not specified'}
        - **Menstrual Context:** ${input.medicalInfo.menstrualContext || 'Not applicable'}
        - **Fatigue Level:** ${input.medicalInfo.fatigue || 'Not specified'}
        - **Cardiovascular Strain:** ${input.medicalInfo.cardiovascularStrain || 'Not specified'}
        - **Physical Indicators:** ${input.medicalInfo.physicalIndicators || 'Not specified'}

        Symptomatic weighting rules:
        - Severe/Moderate fatigue + High cardiovascular strain → strong anemia corroboration (+15 reliability points if visual also positive)
        - Female + Heavy menstrual flow → elevated risk factor → lower reliability threshold needed for positive correlation
        - Young age (<25) + Severe fatigue → unusual, warrants higher scrutiny
        - No symptoms reported + Visual pallor detected → potential false positive from visual → reduce reliability by 10 points

        ═══════════════════════════════════════════════════════════════════════
        DATA CHANNEL 2: VISUAL ANALYSIS (AI Image Analysis)
        ═══════════════════════════════════════════════════════════════════════
        - **Conjunctiva Finding:** ${input.imageAnalysisReport.conjunctiva}
        - **Fingernail Finding:** ${input.imageAnalysisReport.fingernails}
        - **Skin/Palm Finding:** ${input.imageAnalysisReport.skin}

        Visual convergence assessment:
        - ALL 3 body parts show pallor → HIGH visual confidence (+25 points)
        - 2 of 3 show pallor → MODERATE visual confidence (+15 points)
        - 1 of 3 shows pallor → LOW visual confidence (+5 points, could be lighting artifact)
        - 0 of 3 show pallor → NEGATIVE visual (+0, visual suggests normal)
        - Conjunctiva is the GOLD STANDARD clinical indicator — weight it 2× vs nails/skin

        ═══════════════════════════════════════════════════════════════════════
        DATA CHANNEL 3: CLINICAL LAB DATA (CBC Report — if available)
        ═══════════════════════════════════════════════════════════════════════
        - **Hemoglobin:** ${input.cbcAnalysis?.hemoglobin || 'N/A'}
        - **RBC:** ${input.cbcAnalysis?.rbc || 'N/A'}

        Lab data rules (HIGHEST PRIORITY when available):
        - Hgb < 7.0 g/dL → SEVERE anemia confirmed by lab → reliability should be 85-100 regardless of visual
        - Hgb 7.0-9.9 g/dL → MODERATE anemia → reliability 70-95 depending on visual alignment
        - Hgb 10.0-11.9 g/dL → MILD anemia → reliability 60-85 depending on symptoms
        - Hgb ≥ 12.0 g/dL → NORMAL → if visual shows pallor, this is a DISCREPANCY
        - If NO lab data provided → reliability capped at 75 (visual-only assessment has inherent limitations)

        ═══════════════════════════════════════════════════════════════════════
        RELIABILITY INDEX CALCULATION
        ═══════════════════════════════════════════════════════════════════════

        Start with BASE SCORE:
        - Lab data available: Base = 50
        - No lab data: Base = 35

        ADD convergence points:
        - Visual-Lab agreement (both positive or both negative): +30
        - Visual-Symptom agreement: +10
        - Lab-Symptom agreement: +10
        - All 3 channels agree: additional +10 bonus
        - 3/3 body parts show consistent visual finding: +5

        SUBTRACT discrepancy points:
        - Visual-Lab disagreement (visual positive, lab normal OR visual negative, lab low): -25
        - Visual-Symptom disagreement: -10
        - Only 1 of 3 body parts shows pallor (unreliable visual): -10

        CLAMP to [0, 100].

        **Scoring brackets:**
        - **85-100 (High Reliability):** Strong multi-channel convergence. High confidence in the assessment.
        - **65-84 (Moderate Reliability):** Partial alignment. Assessment is likely correct but with some uncertainty.
        - **40-64 (Low-Moderate Reliability):** Mixed signals. Additional testing recommended.
        - **0-39 (Low Reliability):** Major discrepancy across channels. Results should not drive clinical decisions without further investigation.

        ═══════════════════════════════════════════════════════════════
        DISCREPANCY DETECTION & ALERT SYSTEM
        ═══════════════════════════════════════════════════════════════════════

        Set discrepancyAlert = true if ANY of:
        1. Reliability Index < 50
        2. Lab Hgb is NORMAL (≥12) but visual analysis shows Moderate/Severe pallor
        3. Lab Hgb is LOW (<10) but visual analysis shows no pallor
        4. Patient reports Severe fatigue + High cardiovascular strain but visual shows no pallor
        5. 2+ data channels directly contradict each other

        ═══════════════════════════════════════════════════════════════
        OUTPUT FORMAT
        ═══════════════════════════════════════════════════════════════════════

        **Analysis format:**
        Start with "CORRELATION [POSITIVE/NEGATIVE/MIXED]:" followed by:
        1. One sentence on visual-lab agreement status
        2. One sentence on symptomatic corroboration
        3. One sentence on clinical implication and recommended next step

        **Output (JSON):**
        {
          "reliabilityScore": <number 0-100>,
          "analysis": "CORRELATION [POSITIVE/NEGATIVE/MIXED]: [Multi-channel assessment]",
          "discrepancyAlert": <boolean>
        }
      `;

    try {
      const result = await ai.generate({
        config: { temperature: 0.0 },
        prompt,
        output: { schema: ValidationResultSchema },
      });
      output = result.output ?? undefined;
    } catch (geminiError: any) {
      console.warn('Gemini failed, falling back to Groq:', geminiError.message);
      
      for (const model of groqFallbackModels) {
        try {
          const groqResult = await ai.generate({
            model,
            config: { temperature: 0.0 },
            prompt,
            output: { schema: ValidationResultSchema },
          });
          output = groqResult.output ?? undefined;
          if (output) break;
        } catch (modelError: any) {
          console.warn(`Groq model ${model} failed:`, modelError.message);
        }
      }
    }
    
    if (!output) {
      throw new Error('All AI providers failed to generate validation results');
    }
    
    return output;
  },
);
