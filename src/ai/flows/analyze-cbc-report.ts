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
  prompt: `You are an expert at reading Complete Blood Count (CBC) lab reports using Optical Character Recognition (OCR). Your task is to analyze the provided image of a lab report and extract key information.

  **Instructions:**

  1.  **Scan the Image:** Analyze the image provided to identify text and values from the CBC report.
  2.  **Extract Key Parameters:** Focus on extracting the following key parameters. If they are not present, omit them from the result.
      - Hemoglobin (HGB or Hb)
      - Hematocrit (HCT)
      - Red Blood Cell (RBC) count
      - Mean Corpuscular Volume (MCV)
      - Mean Corpuscular Hemoglobin (MCH)
  3.  **Populate the Data:** For each parameter you find, extract its value, unit, and the reference range provided on the report. Determine if the value is within the normal range and set the 'isNormal' flag accordingly.
  4.  **Generate a Summary:** Based on your analysis, create a concise, one-sentence summary.
      - If Hemoglobin or Hematocrit levels are below the normal range, the summary should be something like: "Hemoglobin level appears below normal, suggesting possible anemia."
      - If all key parameters are within their normal ranges, the summary should be: "All key CBC values appear to be within the normal range."
      - If the image is not a valid lab report, the summary should state: "The uploaded image does not appear to be a valid CBC lab report." and the parameters array should be empty.

  **Crucially, do not add any medical advice or interpretation beyond stating whether the values are within the provided normal range and generating the required summary.**

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