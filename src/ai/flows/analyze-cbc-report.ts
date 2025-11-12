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
  prompt: `You are an expert at reading Complete Blood Count (CBC) lab reports using Optical Character Recognition (OCR). Your task is to analyze the provided image and extract key information with very high accuracy.

  **CRITICAL Instructions:**

  1.  **Assess Image Validity:** Your first and most important task is to determine if the image is a valid CBC lab report.
      - If the image is **NOT a CBC report** (e.g., a photo of a cat, a landscape, or a different medical document), you MUST return the following JSON object and nothing else:
        \`\`\`json
        {
          "summary": "The uploaded image does not appear to be a valid CBC lab report.",
          "parameters": []
        }
        \`\`\`
      - If the image **IS a CBC report but is too blurry, dark, or unreadable**, you MUST return the following JSON object and nothing else:
        \`\`\`json
        {
          "summary": "The image is too blurry or unclear to analyze. Please upload a high-quality, well-lit photo of the report.",
          "parameters": []
        }
        \`\`\`
  
  2.  **If the Image is Valid and Readable:**
      - **Scan the Image:** Analyze the image to identify text and values from the CBC report.
      - **Extract Key Parameters:** Focus on extracting the following key parameters. If a parameter is not present, omit it from the results.
          - Hemoglobin (HGB or Hb)
          - Hematocrit (HCT)
          - Red Blood Cell (RBC) count
          - Mean Corpuscular Volume (MCV)
          - Mean Corpuscular Hemoglobin (MCH)
      - **Populate Data:** For each parameter found, extract its value, unit, and reference range. Determine if the value is within the normal range and set 'isNormal' accordingly.
      - **Generate Summary:** Based on your analysis, create a concise, one-sentence summary.
          - If Hemoglobin/Hematocrit are low: "Hemoglobin level appears below normal, suggesting possible anemia."
          - If all key values are normal: "All key CBC values appear to be within the normal range."
          
  **IMPORTANT:** Your final output MUST be a single, valid JSON object matching the requested schema. Do not include any explanatory text, markdown formatting, or anything outside of the JSON structure itself.

  Image of the lab report: {{media url=photoDataUri}}`,
});

const analyzeCbcReportFlow = ai.defineFlow(
  {
    name: 'analyzeCbcReportFlow',
    inputSchema: AnalyzeCbcReportInputSchema,
    outputSchema: AnalyzeCbcReportOutputSchema,
  },
  async input => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      prompt: prompt,
      input: input,
    });
    return output!;
  }
);
