'use server';

/**
 * @fileOverview A flow to generate a description of an uploaded image.
 *
 * - generateImageDescription - A function that generates a description of an image.
 * - GenerateImageDescriptionInput - The input type for the generateImageDescription function.
 * - GenerateImageDescriptionOutput - The return type for the generateImageDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageDescriptionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the area to be checked for anemia, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateImageDescriptionInput = z.infer<typeof GenerateImageDescriptionInputSchema>;

const GenerateImageDescriptionOutputSchema = z.object({
  description: z.string().describe('A description of the image, including any warnings about makeup or other obstructions.'),
  isValid: z.boolean().describe('Whether the image is valid for anemia detection (skin, under-eye, or fingernail).'),
});
export type GenerateImageDescriptionOutput = z.infer<typeof GenerateImageDescriptionOutputSchema>;

export async function generateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  return generateImageDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateImageDescriptionPrompt',
  input: {schema: GenerateImageDescriptionInputSchema},
  output: {schema: GenerateImageDescriptionOutputSchema},
  prompt: `You are an expert medical image analyst with a critical task. Your analysis must be consistent and 100% accurate according to the rules provided.

You will receive a photo. Your primary job is to determine if it is a valid image for anemia detection. A valid image must meet ALL of the following criteria. There are no exceptions.

1.  **Subject Requirement:** The image's main subject MUST be a clear, close-up view of one of the following: human skin, the lower under-eye area (palpebral conjunctiva), or fingernails. If the picture is mostly showing one of these, it is valid, even if other objects are in the background.
2.  **Obstruction-Free Requirement:** The area in the image MUST BE COMPLETELY FREE of any substances that could alter its natural appearance. This includes, but is not limited to: makeup, nail polish, lotions, creams, or any other coverings.

Your analysis process is as follows:

First, briefly describe the main subject of the image.

Next, you MUST determine if the image is valid by strictly applying the two rules above.
- If the image's primary subject is a car, a landscape, an animal, or anything other than human skin, under-eye, or fingernails, it is INVALID.
- If the image shows skin, under-eye, or fingernails but has ANY makeup, nail polish, or other coverings, it is INVALID.

Based on this strict analysis, set the 'isValid' field to true or false.

Finally, generate the description based on your finding:
- If the image is valid, your description must confirm this clearly (e.g., "A clear, unobstructed photo of an under-eye area, suitable for analysis.").
- If the image is invalid because of the subject matter, you MUST explain why. For example: "This is a photo of a car. To check for anemia, a clear, close-up picture of skin, the under-eye area, or fingernails is required."
- If the image is invalid because of obstructions, you MUST explain why. For example: "This photo of an under-eye area cannot be used because makeup is present, which prevents an accurate analysis. Please upload a clear photo without any makeup."

This is a critical step for a health application. Inconsistency is not acceptable. Apply these rules without deviation.

Image: {{media url=photoDataUri}}`,
});

const generateImageDescriptionFlow = ai.defineFlow(
  {
    name: 'generateImageDescriptionFlow',
    inputSchema: GenerateImageDescriptionInputSchema,
    outputSchema: GenerateImageDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
