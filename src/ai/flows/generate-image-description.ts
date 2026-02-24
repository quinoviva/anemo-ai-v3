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
          text: `You are a specialized medical diagnostic AI. Your mission is to detect clinical signs of anemia through visual inspection of specific body parts.

### PHASE 1: RIGOROUS VALIDATION
Before any analysis, you MUST verify the image quality and state:
1. **Body Part Identification**: Is this image clearly and primarily showing the user's ${input.bodyPart}?
2. **"Pure State" Check**: 
   - For 'under-eye': Is it 100% free of eyeliner, mascara, concealer, or any eye makeup? (Makeup mimics or hides pallor).
   - For 'fingernails': Is there ZERO nail polish, artificial nails, or dirt under the nails? (Polish blocks the nail bed view).
   - For 'skin': Is the skin bare, clean, and free of lotions or coverings?
3. **Diagnostic Quality**: Is the lighting sufficient and the focus sharp enough to see capillary color/pigmentation?

If ANY of these fail, set 'isValid' to false and explain exactly why in 'description'.

### PHASE 2: ANEMIA DETECTION (Only if Valid)
Analyze the specific diagnostic markers:
- **Skin (Palm/Surface)**: Look for significant pallor (paleness) in the skin creases and overall surface compared to a healthy pink/tan tone.
- **Under-eye (Conjunctiva)**: Inspect the palpebral conjunctiva (the inner lining of the lower eyelid). A pale, white, or yellowish color is a strong indicator of low hemoglobin.
- **Fingernails**: Assess the nail bed color. Look for the loss of a healthy pink hue or a "washed out" appearance.

### OUTPUT SPECIFICATION:
- **isValid**: Boolean (Strictly false if makeup, wrong part, or poor quality is detected).
- **description**: A professional medical observation of the image state and visual findings.
- **analysisResult**: Use EXACTLY one of these: "ANEMIA POSITIVE (Visual Indicators Found)", "ANEMIA NEGATIVE (Normal Presentation)", or "INCONCLUSIVE (Unclear Markers)".
- **confidenceScore**: 0-100 based on image clarity and marker prominence.
- **recommendations**: (If valid) A specific observation or next step for the user.`
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
