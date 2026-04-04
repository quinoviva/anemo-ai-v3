'use server';

/**
 * @fileOverview A flow to generate a description and analysis of an uploaded image.
 *
 * - generateImageDescription - A function that generates a description and analysis of an image.
 * - GenerateImageDescriptionInput - The input type for the generateImage-description function.
 * - GenerateImageDescriptionOutput - The return type for the generateImageDescription function.
 */

import {ai, geminiActiveModel as gemini15Flash} from '@/ai/genkit';
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
  analysisResult: z.string().describe('Clinical severity assessment. One of: "ANEMIA POSITIVE (Significant Pallor Detected)", "ANEMIA SUSPECTED (Mild Pallor Detected)", "ANEMIA NEGATIVE (Healthy Vascular Presentation)", or "INCONCLUSIVE (Ambiguous or Insufficient Data)"'),
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
      model: gemini15Flash,
      config: {
        temperature: 0.1,
      },
      prompt: [
        {
          text: `You are the Anemo AI Clinical Vision Engine — a hematological screening assistant that analyzes ${input.bodyPart === 'skin' ? 'palm/skin' : input.bodyPart} images for anemia biomarkers.

Your analysis must be CONSISTENT. Given the same image, always return the same result.

━━━ BODY PART MAPPING ━━━
- "skin" = the PALM of the hand (inner side). Accept: open palm, palm creases, thenar eminence, any view of the inner hand.
- "under-eye" = the conjunctiva / under-eye area. Accept: lower eyelid pulled down showing inner pink lining, or close-up of the eye area.
- "fingernails" = fingernail beds. Accept: fingernails from any angle showing the nail plate/bed.

━━━ STAGE 1: QUALITY GATE ━━━

You MUST be LENIENT. Real users take photos with phone cameras in normal home/office lighting.

Set isValid=false ONLY if:
- The image shows a COMPLETELY WRONG subject (a room, food, animal, text, object, or a body part that does NOT match "${input.bodyPart === 'skin' ? 'palm/hand' : input.bodyPart}")
- The image is so dark that NO features are distinguishable at all
- The image is so blurry that NO details can be made out at all

Set isValid=true if:
- The correct body part is visible, even partially
- The image has any usable lighting (even imperfect indoor lighting)
- The image is reasonably clear (slight blur is OK — phone cameras are imperfect)
- There is minor shadow, glare, or uneven lighting (this is normal)
- The palm is not perfectly flat or fingers not perfectly together (still analyze it)
- Skin tone is dark (dark skin is NOT a quality issue — adjust your analysis accordingly)

IMPORTANT: When in doubt, set isValid=true and proceed with analysis. A slightly imperfect image analyzed is better than rejecting a valid photo.

IF isValid=false:
- description: "[QUALITY_FAIL] <reason in max 12 words>"
- analysisResult: "INCONCLUSIVE (Image Quality Insufficient)"
- confidenceScore: 0
- STOP here

━━━ STAGE 2: CLINICAL BIOMARKER ANALYSIS (Only if isValid=true) ━━━

**SKIN / PALM (palmar creases and thenar eminence)**
- HEALTHY: Palmar creases show clear pink/red color distinctly deeper than surrounding palm
- MILD ANEMIA: Crease color slightly faded; still visible but less vibrant
- MODERATE ANEMIA: Crease color significantly reduced; near match with pale surrounding skin
- SEVERE ANEMIA: No color difference between creases and palm; uniform pallor

**UNDER-EYE / CONJUNCTIVA (inner lining of lower eyelid)**
- HEALTHY: Vivid pink-red to deep crimson vascular network; clearly visible blood vessels
- MILD ANEMIA: Pinkish but faded; less defined capillary network
- MODERATE ANEMIA: Noticeably pale pink; capillary network poorly visible
- SEVERE ANEMIA: Porcelain white or near-white; almost no visible vascularity

**FINGERNAILS / NAILBED (pink zone beneath the nail plate)**
- HEALTHY: Vivid pink under nail plate; uniform color
- MILD ANEMIA: Slightly reduced pinkness; subtle blanching toward nail tip
- MODERATE ANEMIA: Clearly reduced color; nail bed appears pale throughout
- SEVERE ANEMIA: Nail bed appears white or yellowish-white; no visible pink

━━━ STAGE 3: HEMOGLOBIN ESTIMATION ━━━
- Healthy → Hgb likely > 12 g/dL → Normal
- Mild pallor → Hgb likely 10-12 g/dL → Mild
- Moderate pallor → Hgb likely 7-10 g/dL → Moderate
- Severe pallor → Hgb likely < 7 g/dL → Severe

━━━ OUTPUT ━━━
- isValid: boolean (false ONLY for wrong body part or completely unusable image)
- description: 1 sentence clinical observation. If invalid: "[QUALITY_FAIL] <reason>"
- analysisResult: EXACTLY ONE of:
  * "ANEMIA POSITIVE (Significant Pallor Detected)" — Moderate or Severe
  * "ANEMIA SUSPECTED (Mild Pallor Detected)" — Mild
  * "ANEMIA NEGATIVE (Healthy Vascular Presentation)" — Normal
  * "INCONCLUSIVE (Ambiguous or Insufficient Data)" — truly unclear
- confidenceScore: Integer 0-100. Conservative. Typical range: 55-80.
- recommendations: Single actionable next step.

Respond ONLY with a valid JSON object. No markdown, no extra text.`
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
