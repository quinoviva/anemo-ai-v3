'use server';

import {z} from 'zod';
import {ai} from '@/ai/genkit';
import {CbcAnalysis} from '@/ai/schemas/cbc-report';
import {ImageAnalysisReport} from '@/ai/schemas/image-analysis-report';

const MedicalInfoSchema = z.object({
  sex: z.string().optional(),
  fatigue: z.string().optional(),
  cardiovascularStrain: z.string().optional(),
  physicalIndicators: z.string().optional(),
});

const ValidationInputSchema = z.object({
  medicalInfo: MedicalInfoSchema,
  imageAnalysisReport: ImageAnalysisReport,
  cbcAnalysis: CbcAnalysis,
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
    const {output} = await ai.generate({
      config: {
        temperature: 0.0,
      },
      prompt: `
        **Objective:** Cross-verify visual anemia indicators with clinical lab data to provide a deterministic Reliability Index.

        **User Profile (Symptomatic Context):**
        - **Sex:** ${input.medicalInfo.sex || 'Not specified'}
        - **Fatigue Level:** ${input.medicalInfo.fatigue || 'Not specified'}
        - **Cardiovascular Strain:** ${input.medicalInfo.cardiovascularStrain || 'Not specified'}
        - **Physical Indicators:** ${input.medicalInfo.physicalIndicators || 'Not specified'}

        **Visual Analysis (ImageAnalysisReport):**
        - **Conjunctiva:** ${input.imageAnalysisReport.conjunctiva}
        - **Fingernails:** ${input.imageAnalysisReport.fingernails}
        - **Skin:** ${input.imageAnalysisReport.skin}

        **Clinical Data (CBC Report):**
        - **Hemoglobin:** ${input.cbcAnalysis.hemoglobin}
        - **RBC:** ${input.cbcAnalysis.rbc}

        **Task:**
        1.  **Multimodal Correlation:** Rigorously compare the visual physical markers against the clinical CBC values.
        2.  **Calculate Reliability Index (Score 0-100):** 
            -   **High Score (80-100):** Strong alignment (e.g., Pale conjunctiva + Low Hemoglobin + Fatigue).
            -   **Moderate Score (50-79):** Partial alignment or inconclusive visual data with borderline lab results.
            -   **Low Score (0-49):** Major discrepancy (e.g., Normal visual appearance but Critically Low Hemoglobin, or vice versa).
        3.  **Discrepancy Detection:** 
            -   If the **Reliability Index is below 50**, you MUST set "discrepancyAlert" to true. 
            -   This will trigger a high-priority UI alert (ShieldAlert).
        4.  **Analysis:** Provide a concise, clinical explanation. Start with "CORRELATION POSITIVE" if markers align for anemia, or "CORRELATION NEGATIVE" if they align for health.

        **Output Format (JSON):**
        {
          "reliabilityScore": <number>,
          "analysis": "CORRELATION [POSITIVE/NEGATIVE]: [Explanation]",
          "discrepancyAlert": <boolean>
        }
      `,
      output: {
        schema: ValidationResultSchema
      }
    });
    return output!;
  },
);
