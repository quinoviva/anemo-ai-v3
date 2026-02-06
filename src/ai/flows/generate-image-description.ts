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
          text: `You are a medical image validator. You will receive a photo intended to represent the human: ${input.bodyPart}.

### VALIDATION RULES:
1. **Body Part Match**: Is this actually a photo of ${input.bodyPart}? 
2. **Bare State**: For 'under-eye', there must be NO eye makeup, eyeliner, or mascara. For 'fingernails', there must be NO nail polish or artificial nails. For 'skin', it must be bare skin (palm preferred).
3. **Quality**: Is the image clear and showing a significant portion of the area (not just a tiny zoomed-in blur)?

### ANALYSIS RULES:
If the image passes validation, analyze it for signs of anemia:
- **Skin (Palm)**: Check for significant pallor (paleness) in the skin creases.
- **Under-eye**: Check for paleness in the palpebral conjunctiva.
- **Fingernails**: Check for a pale nail bed or loss of the healthy pink color.

### OUTPUT FORMAT:
You must return a JSON object with:
- **isValid**: true/false
- **description**: A brief explanation of what you see. If invalid, explain exactly why (e.g., "Makeup detected").
- **analysisResult**: "Anemia Signs Detected", "Normal Range", or "Inconclusive".
- **confidenceScore**: A number from 0 to 100 representing your certainty.
- **recommendations**: (Only if valid) Short specific observation.`
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
