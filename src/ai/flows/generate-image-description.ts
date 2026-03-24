'use server';

/**
 * @fileOverview A flow to generate a description and analysis of an uploaded image.
 *
 * - generateImageDescription - A function that generates a description and analysis of an image.
 * - GenerateImageDescriptionInput - The input type for the generateImage-description function.
 * - GenerateImageDescriptionOutput - The return type for the generateImageDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateImageDescriptionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the area to be checked for anemia, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  bodyPart: z.enum(['skin', 'under-eye', 'fingernails']).describe("The specific body part in the photo."),
});
export type GenerateImageDescriptionInput = z.infer<typeof GenerateImageDescriptionInputSchema>;

const GenerateImageDescriptionOutputSchema = z.object({
  description: z.string().describe('A description of the image, including any warnings about makeup or other obstructions.'),
  isValid: z.boolean().describe('Whether the image is valid for anemia detection (a clear photo of the specified body part).'),
  analysisResult: z.string().describe('A non-medical summary of the analysis for the specific body part, e.g., "Mild pallor detected." or "No visible signs of anemia."'),
  confidenceScore: z.number().min(0).max(100).optional().describe('Confidence level of the AI analysis from 0-100.'),
  recommendations: z.string().optional().describe('Brief specific observation for this image.'),
});
export type GenerateImageDescriptionOutput = z.infer<typeof GenerateImageDescriptionOutputSchema>;

export async function generateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  return generateImageDescriptionFlow(input);
}

const generateImageDescriptionFlow = ai.defineFlow(
  {
    name: 'generateImageDescriptionFlow',
    inputSchema: GenerateImageDescriptionInputSchema,
    outputSchema: GenerateImageDescriptionOutputSchema,
  },
  async input => {
    let contentType = 'image/jpeg';
    if (input.photoDataUri.startsWith('data:')) {
      const match = input.photoDataUri.match(/^data:(image\/[a-z+]+);/);
      if (match) contentType = match[1];
    }

    const {output} = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      config: {
        temperature: 0.0,
      },
      prompt: [
        {
          text: `You are the Anemo Matrix Neural Diagnostic Core, utilizing advanced vision algorithms (mimicking EfficientNetB0 feature extraction) for hematological assessment.
          
Your mission is to perform a high-fidelity analysis of the user's ${input.bodyPart} for clinical signs of anemia.

### STAGE 1: NEURAL QUALITY GATE (CRITICAL)
Before any diagnostic work, verify the image state as if you were a pre-processing CNN:
1.  **Luminosity & Contrast**: Is the image bright enough? Is the contrast sufficient to see subtle color shifts? (Failed if too dark or washed out).
2.  **Obstruction Detection**: 
    *   **Under-eye**: Is it 100% free of eye makeup, eyeliner, or concealer?
    *   **Fingernails**: Is there ZERO nail polish, acrylics, or gel?
    *   **Skin**: Is it clean and free of heavy lotions/covering?
3.  **Target Lock**: Is the ${input.bodyPart} the primary subject and in sharp focus?

**IF QUALITY FAILS**: You MUST set 'isValid' to false. Provide a technical explanation in 'description' (e.g., "Spectral interference detected: Nail polish obstructing hemoglobin markers.").

### STAGE 2: SPECTRAL FEATURE EXTRACTION (Only if Valid)
Examine the following specific biomarkers for anemia:
1.  **Skin (Palm/Surface)**: Analyze the palmar creases. Significant loss of pinkish hue in the deep creases compared to the surrounding tissue is a high-confidence indicator of low Hemoglobin.
2.  **Under-eye (Conjunctiva)**: Inspect the palpebral conjunctiva (the inner lining of the lower eyelid). Look for 'porcelain-like' pallor or a yellowish tint vs a healthy, vibrant crimson/pink vascular network.
3.  **Fingernails (Ungual Bed)**: Evaluate the capillary refill zone. Loss of translucent pinkness or a 'blanched' appearance in the nail bed indicates potential hematological insufficiency.

### OUTPUT PROTOCOL:
*   **isValid**: Boolean (Strictly false for quality/obstruction issues).
*   **description**: Technical observation of the physiological state (e.g., "Reduced vascular density observed in conjunctiva region. Luminosity optimal.").
*   **analysisResult**: Choose ONE: "ANEMIA POSITIVE (Significant Pallor Detected)", "ANEMIA NEGATIVE (Healthy Vascular Presentation)", or "INCONCLUSIVE (Ambiguous Spectral Features)".
*   **confidenceScore**: 0-100 (Be conservative).
*   **recommendations**: A precise next step (e.g., "Confirm with CBC lab report for clinical validation.").`
        },
        {
          media: {
            url: input.photoDataUri,
            contentType: contentType
          }
        }
      ],
      output: {
        schema: GenerateImageDescriptionOutputSchema
      }
    });
    return output!;
  }
);
