import { z } from 'genkit';

const CbcParameterSchema = z.object({
  parameter: z
    .string()
    .describe('The name of the blood parameter (e.g., "Hemoglobin", "RBC").'),
  value: z.string().describe('The measured value from the report.'),
  unit: z
    .string()
    .describe('The unit of measurement (e.g., "g/dL", "10^6/uL").'),
  range: z
    .string()
    .describe('The normal reference range provided in the report.'),
  isNormal: z
    .boolean()
    .describe('Whether the value is within the normal range.'),
});

export const AnalyzeCbcReportInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the CBC lab report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeCbcReportInput = z.infer<typeof AnalyzeCbcReportInputSchema>;

export const AnalyzeCbcReportOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A simple, one-sentence summary of the overall result (e.g., "Hemoglobin level appears below normal, suggesting possible anemia." or "All CBC values are within normal range.").'
    ),
  parameters: z
    .array(CbcParameterSchema)
    .describe('An array of key CBC parameters found in the report.'),
});
export type AnalyzeCbcReportOutput = z.infer<
  typeof AnalyzeCbcReportOutputSchema
>;