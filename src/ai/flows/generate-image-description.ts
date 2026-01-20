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
    const {output} = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.0,
      },
      prompt: [
        {
          text: `You are an expert medical image analyst with a critical task. Your analysis must be consistent and 100% accurate according to the rules provided.

You will receive a photo of a specific body part: ${input.bodyPart}.

Your primary job is to determine if it is a valid image for anemia detection. A valid image must meet ALL of the following criteria. There are no exceptions.

1.  **Subject Requirement:** The image's main subject MUST be a clear, close-up view of the specified human body part: ${input.bodyPart}. If the picture is mostly showing this, it is valid.
2.  **Obstruction-Free Requirement:** The area in the image MUST BE COMPLETELY FREE of any substances that could alter its natural appearance. This includes, but is not limited to: makeup (for under-eye), nail polish/art (for fingernails), or heavy lotions/creams. The image must show the subject in its natural, bare state.

**Analysis Process:**

1.  **Validation:**
    - First, briefly describe the main subject of the image.
    - Next, you MUST determine if the image is valid by strictly applying the two rules above for the specified ${input.bodyPart}.
    - If the image's primary subject is anything other than the specified human body part, it is INVALID.
    - If the image shows the correct body part but has ANY obstructions (makeup, nail polish, etc.), it is INVALID.
    - Set the 'isValid' field to true or false.

2.  **Description and Analysis:**
    - **If the image is valid:**
        - Your description must confirm this clearly (e.g., "A clear, unobstructed photo of an under-eye area, suitable for analysis.").
        - Then, analyze the image for signs related to anemia for that specific body part. Provide a short, non-medical summary in the 'analysisResult' field.
          - For 'skin', look for pallor. Result example: "Mild pallor detected on the skin surface." or "Skin tone appears normal."
          - For 'under-eye', look for discoloration in the palpebral conjunctiva. Result example: "Slight reddish discoloration observed under the eyes." or "Under-eye area appears normal."
          - For 'fingernails', look at the nail bed color. Result example: "Fingernails appear pale." or "Fingernails appear normal with no visible signs of anemia."
    - **If the image is invalid:**
        - Your 'analysisResult' field MUST be "Analysis not performed."
        - The 'description' MUST explain why it's invalid. Examples:
          - "This is a photo of a car. To check for anemia, a clear, close-up picture of the ${input.bodyPart} is required."
          - "This photo of fingernails cannot be used because nail polish is present, which prevents an accurate analysis. Please upload a clear photo of bare fingernails."
          - "This photo of an under-eye area cannot be used because makeup is present. Please upload a clear photo without any makeup."

This is a critical step for a health application. Inconsistency is not acceptable. Apply these rules without deviation.`
        },
        {
          media: {
            url: input.photoDataUri
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
