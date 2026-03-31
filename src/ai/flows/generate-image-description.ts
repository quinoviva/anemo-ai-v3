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
          text: `You are the Anemo AI Clinical Vision Engine — a specialized hematological screening system trained to detect anemia biomarkers from ${input.bodyPart} images with clinical-grade precision.

Your analysis must be CONSISTENT and DETERMINISTIC. Given the same image, you must always return the same result.

━━━ STAGE 1: QUALITY GATE (Run First — All Other Stages Depend On This) ━━━

Evaluate the image on these EXACT criteria:

1. LUMINOSITY: Is the image bright enough to see subtle color differences? (Fail if underexposed OR overexposed)
2. FOCUS: Is the target area sharply in focus? (Fail if blurry)
3. OBSTRUCTION:
   - Under-eye/conjunctiva: Must be 100% free of makeup, eyeliner, eyeshadow, mascara, or concealer
   - Fingernails: Must have ZERO nail polish, gel nails, acrylic nails, or artificial extensions
   - Skin/palm: Must be clean, free of lotion residue or heavy coverage
4. CORRECT BODY PART: The image MUST show the requested body part (${input.bodyPart}). If it shows something else — a room, face, pet, food, or different body part — IMMEDIATELY set isValid=false.

IF ANY QUALITY CHECK FAILS:
- Set isValid=false
- In description, write EXACTLY: "[QUALITY_FAIL] <Specific reason in max 12 words>"
- Set analysisResult to "INCONCLUSIVE (Image Quality Insufficient)"
- Set confidenceScore to 0
- STOP — do not attempt clinical analysis

━━━ STAGE 2: CLINICAL BIOMARKER ANALYSIS (Only if isValid=true) ━━━

Analyze the following SPECIFIC biomarkers based on body part:

**UNDER-EYE / CONJUNCTIVA (palpebral conjunctiva — the inner lining of the lower eyelid)**
PRIMARY INDICATOR: Color of the vascular bed
- HEALTHY (Non-Anemic): Vivid pink-red to deep crimson vascular network; clearly visible blood vessels
- MILD ANEMIA: Pinkish but faded; less defined capillary network; slight pallor near corners
- MODERATE ANEMIA: Noticeably pale pink; capillary network poorly visible; yellowish or whitish tinge
- SEVERE ANEMIA: Porcelain white or near-white; almost no visible vascularity; stark pallor

**FINGERNAILS / NAILBED (the pink zone beneath the nail plate)**
PRIMARY INDICATOR: Capillary refill appearance + color of the translucent nail bed
- HEALTHY (Non-Anemic): Vivid pink under nail plate; brisk imagined capillary refill; uniform color
- MILD ANEMIA: Slightly reduced pinkness; subtle blanching toward nail tip
- MODERATE ANEMIA: Clearly reduced color; nail bed appears pale or light pink throughout
- SEVERE ANEMIA: Nail bed appears white, yellowish-white, or opaque with no visible pink

**SKIN / PALM (specifically the palmar creases and thenar eminence)**
PRIMARY INDICATOR: Color depth of palmar creases vs surrounding skin
- HEALTHY (Non-Anemic): Palmar creases show clear pink/red color distinctly deeper than surrounding palm
- MILD ANEMIA: Crease color slightly faded; still visible but less vibrant than in healthy palm
- MODERATE ANEMIA: Crease color significantly reduced; near match with pale surrounding skin
- SEVERE ANEMIA: No color difference between creases and palm; uniform pallor throughout

━━━ STAGE 3: HEMOGLOBIN ESTIMATION HEURISTIC ━━━

Based on your biomarker analysis, estimate the likely Hgb range:
- Healthy presentation → Hgb likely > 12 g/dL → Normal
- Mild pallor → Hgb likely 10-12 g/dL → Mild
- Moderate pallor → Hgb likely 7-10 g/dL → Moderate
- Severe pallor → Hgb likely < 7 g/dL → Severe

━━━ OUTPUT PROTOCOL ━━━

Return exactly these fields:
- isValid: boolean (false ONLY for quality failures or wrong body part)
- description: If valid — 1 sentence clinical observation (e.g., "Moderate pallor noted in palpebral conjunctiva with reduced vascular definition"). If invalid — "[QUALITY_FAIL] <specific reason>"
- analysisResult: Choose EXACTLY ONE of these strings:
  * "ANEMIA POSITIVE (Significant Pallor Detected)" — for Moderate or Severe findings
  * "ANEMIA SUSPECTED (Mild Pallor Detected)" — for Mild findings  
  * "ANEMIA NEGATIVE (Healthy Vascular Presentation)" — for Normal findings
  * "INCONCLUSIVE (Ambiguous or Insufficient Data)" — only when truly unclear
- confidenceScore: Integer 0-100. Be conservative. Do NOT exceed 85 unless evidence is extremely clear. Typical range: 55-80.
- recommendations: Single actionable next step. E.g., "Correlate with CBC hemoglobin test for clinical confirmation." or "Resubmit image with better lighting."

CRITICAL: Be CONSISTENT. The same image should always produce the same result.
Respond ONLY with a valid JSON object matching the schema. Do not include markdown code fences, explanations, or extra text outside the JSON.`
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
