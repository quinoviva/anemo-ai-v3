'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeCbcReportInputSchema = z.object({
  photoDataUri: z.string(),
});

const AnalyzeCbcReportOutputSchema = z.object({
  summary: z.string(),
  parameters: z.array(
    z.object({
      parameter: z.string(),
      value: z.string(),
      unit: z.string(),
      range: z.string(),
      isNormal: z.boolean(),
    })
  ),
});

export type AnalyzeCbcReportInput = z.infer<typeof AnalyzeCbcReportInputSchema>;
export type AnalyzeCbcReportOutput = z.infer<typeof AnalyzeCbcReportOutputSchema>;

/**
 * Analyze CBC report
 * Supports multiple image formats and PDFs
 * Generates summary including anemia status
 */
export const analyzeCbcReport = ai.defineFlow(
  {
    name: 'analyzeCbcReport',
    inputSchema: AnalyzeCbcReportInputSchema,
    outputSchema: AnalyzeCbcReportOutputSchema,
  },
  async (input: AnalyzeCbcReportInput) => {
    const validatedInput = AnalyzeCbcReportInputSchema.parse(input);

    let contentType = 'image/jpeg'; // default
    const uri = validatedInput.photoDataUri.toLowerCase();

    if (uri.startsWith('data:')) {
      const match = uri.match(/^data:(image\/[a-z+]+|application\/pdf);/);
      if (match) contentType = match[1];
    } else if (uri.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (uri.endsWith('.png')) {
      contentType = 'image/png';
    } else if (uri.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (uri.endsWith('.bmp')) {
      contentType = 'image/bmp';
    } else if (uri.endsWith('.webp')) {
      contentType = 'image/webp';
    }

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      config: {
        temperature: 0.0,
      },
      prompt: [
        {
          text: `
You are an expert medical AI specializing in reading Complete Blood Count (CBC)
laboratory reports using Optical Character Recognition (OCR).

CRITICAL RULES:

1. Validate the Image:
   - If the image is NOT a CBC lab report, respond with:
     summary: "The uploaded image does not appear to be a valid CBC lab report."
     parameters: []

   - If the image IS unreadable (blurry, dark, cropped):
     summary: "The image is too blurry or unclear to analyze. Please upload a high-quality, well-lit photo of the report."
     parameters: []

2. If valid, extract ONLY these parameters if present:
   • Hemoglobin (HGB or Hb)
   • Hematocrit (HCT)
   • Red Blood Cell (RBC)
   • Mean Corpuscular Volume (MCV)
   • Mean Corpuscular Hemoglobin (MCH)

3. For each parameter:
   • Extract value, unit, reference range, isNormal

4. Generate a one-sentence summary including anemia status:
   - If Hemoglobin or Hematocrit is below normal, include:
     "Patient may have anemia."
   - If all key values are normal, include:
     "Patient shows no signs of anemia."
   - Always include the general summary of CBC results.

5. DO NOT guess missing values.
6. DO NOT fabricate ranges.
7. Output MUST strictly match the schema.
          `.trim(),
        },
        {
          media: {
            url: validatedInput.photoDataUri,
            contentType: contentType,
          },
        },
      ],
      output: { schema: AnalyzeCbcReportOutputSchema },
    });

    return {
      summary:
        output?.summary ??
        'An unexpected error occurred while analyzing the CBC report.',
      parameters: output?.parameters ?? [],
    };
  }
);
