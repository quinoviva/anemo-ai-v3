'use server';

/**
 * @fileOverview A flow to analyze a Complete Blood Count (CBC) lab report image.
 *
 * - analyzeCbcReport - A function that analyzes a CBC report from an image using OCR.
 */

import { ai } from '@/ai/genkit';
import {
  AnalyzeCbcReportInput,
  AnalyzeCbcReportInputSchema,
  AnalyzeCbcReportOutput,
  AnalyzeCbcReportOutputSchema,
} from '@/ai/schemas/cbc-report';

export async function analyzeCbcReport(
  input: AnalyzeCbcReportInput
): Promise<AnalyzeCbcReportOutput> {
  return analyzeCbcReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCbcReportPrompt',
  input: { schema: AnalyzeCbcReportInputSchema },
  output: { schema: AnalyzeCbcReportOutputSchema },
  prompt: `You are an expert at reading Complete Blood Count (CBC) lab reports using Optical Character Recognition (OCR). Your task is to analyze the provided image and extract key information.

  **Instructions:**

  1.  **Scan the Image:** Analyze the image to identify text and values from the CBC report.
  2.  **Extract Key Parameters:** Focus on extracting the following key parameters. If not present, omit them.
      - Hemoglobin (HGB or Hb)
      - Hematocrit (HCT)
      - Red Blood Cell (RBC) count
      - Mean Corpuscular Volume (MCV)
      - Mean Corpuscular Hemoglobin (MCH)
  3.  **Populate Data:** For each parameter, extract its value, unit, and reference range. Determine if the value is normal and set 'isNormal'.
  4.  **Generate Summary:** Create a concise, one-sentence summary.
      - If Hemoglobin/Hematocrit are low: "Hemoglobin level appears below normal, suggesting possible anemia."
      - If all key values are normal: "All key CBC values appear to be within the normal range."
      - If not a valid report: "The uploaded image does not appear to be a valid CBC lab report." and clear the parameters array.
  
  **Crucially, do not add any medical advice or diagnosis. Emphasize that this is an AI interpretation and a healthcare professional must be consulted.**

  Image of the lab report: {{media url=photoDataUri}}`,
});

const analyzeCbcReportFlow = ai.defineFlow(
  {
    name: 'analyzeCbcReportFlow',
    inputSchema: AnalyzeCbcReportInputSchema,
    outputSchema: AnalyzeCbcReportOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
