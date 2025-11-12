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

  1.  **Assess Image Quality:** First, determine if the image is a clear, well-lit, and readable photo of a CBC lab report.
  2.  **Scan the Image:** Analyze the image to identify text and values from the CBC report.
  3.  **Extract Key Parameters:** Focus on extracting the following key parameters. If a parameter is not present, omit it from the results.
      - Hemoglobin (HGB or Hb)
      - Hematocrit (HCT)
      - Red Blood Cell (RBC) count
      - Mean Corpuscular Volume (MCV)
      - Mean Corpuscular Hemoglobin (MCH)
  4.  **Populate Data:** For each parameter found, extract its value, unit, and reference range. Determine if the value is within the normal range and set 'isNormal' accordingly.
  5.  **Generate Summary:** Based on your analysis, create a concise, one-sentence summary.
      - If the image is not a valid CBC report: "The uploaded image does not appear to be a valid CBC lab report." and ensure the parameters array is empty.
      - If the image is blurry or unreadable: "The image is too blurry or unclear to analyze. Please upload a high-quality, well-lit photo of the report." and ensure the parameters array is empty.
      - If Hemoglobin/Hematocrit are low: "Hemoglobin level appears below normal, suggesting possible anemia."
      - If all key values are normal: "All key CBC values appear to be within the normal range."
  
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
