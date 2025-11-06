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
  prompt: `You are an expert medical image analyst.

You will receive a photo, and your primary job is to determine if it is a valid image for anemia detection. A valid image must contain a clear, close-up view of human skin, the under-eye area (lower palpebral conjunctiva), or fingernails, and must be free of any obstructions.

First, briefly describe the main subject of the image.

Next, analyze the image to determine if it is valid for anemia detection.
- A valid image must contain a clear view of skin, the under-eye area, or fingernails.
- The image MUST BE FREE of makeup, nail polish, or other coverings that could obscure the natural skin tone. If any of these are present, the image is NOT valid.

Based on this, set the 'isValid' field to true or false.

Finally, generate the description:
- If the image is valid, your description should confirm this (e.g., "A clear image of an under-eye area, suitable for analysis.").
- If the image contains makeup, nail polish, or other obstructions, you MUST set 'isValid' to false. Your description must explain why it's invalid. For example: "This appears to be an under-eye area, but the person is wearing makeup, which prevents an accurate analysis. Please upload a clear photo without any makeup."
- If the image is not a valid subject (e.g., it's a car, a landscape), you MUST set 'isValid' to false. Your description must explain why it's invalid. For example: "This is a photo of a car. For anemia analysis, a picture of skin, the under-eye area, or fingernails is required."

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
