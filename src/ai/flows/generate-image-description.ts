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
  description: z.string().describe('A description of the image.'),
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
  prompt: `You are an expert medical image analyst.

You will receive a photo, and your primary job is to determine if it is a valid image for anemia detection. A valid image must contain a clear, close-up view of human skin, the under-eye area (lower palpebral conjunctiva), or fingernails.

First, briefly describe the main subject of the image.

Next, analyze the image to determine if it is valid for anemia detection.
- If the image contains a clear view of skin, the under-eye area, or fingernails, set the 'isValid' field to true.
- If the image does NOT contain one of these valid subjects (e.g., it's a car, a landscape, an animal), set 'isValid' to false.

If the image is not valid, your description must explain why. For example: "This is a photo of a car. For anemia analysis, a picture of skin, the under-eye area, or fingernails is required."

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
