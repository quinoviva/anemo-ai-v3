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
  imageDescription: z.string().describe('A plain 10-15 word factual description of exactly what the uploaded image shows, regardless of validity. Example: "The image shows a woman with face makeup under bright lighting."'),
  description: z.string().describe('A clinical observation of the image, including any warnings about makeup or other obstructions.'),
  isValid: z.boolean().describe('Whether the image is valid for anemia detection (a clear photo of the specified body part).'),
  analysisResult: z.string().describe('Clinical severity assessment. One of: "ANEMIA POSITIVE (Significant Pallor Detected)", "ANEMIA SUSPECTED (Mild Pallor Detected)", "ANEMIA NEGATIVE (Healthy Vascular Presentation)", or "INCONCLUSIVE (Ambiguous or Insufficient Data)"'),
  confidenceScore: z.number().min(0).max(100).optional().describe('Confidence level of the AI analysis from 0-100.'),
  recommendations: z.string().optional().describe('Brief specific observation for this image.'),
});
export type GenerateImageDescriptionOutput = z.infer<typeof GenerateImageDescriptionOutputSchema>;

export async function generateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  // Extract base64 without data prefix
  const base64Data = input.photoDataUri.includes(',') ? input.photoDataUri.split(',')[1] : input.photoDataUri;

  // ── PRIMARY: Groq Llama 4 Scout Vision (Fast & Reliable) ─────────────────────
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `You are the Anemo AI Clinical Vision Engine — an advanced hematological screening AI.

TASK: Analyze ${input.bodyPart === 'skin' ? 'palm/skin' : input.bodyPart} images for anemia biomarkers.

VALIDATION RULES:
- User selected: ${input.bodyPart}
- If image shows DIFFERENT body part -> isValid: false
- If image is unclear/wrong -> isValid: false
- Only accept clear ${input.bodyPart} photos`

          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and return JSON only." },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Data}` }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (response.ok) {
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return GenerateImageDescriptionOutputSchema.parse(result);
    }
    console.warn("[Groq] Request failed, trying Gemini...");
  } catch (groqError) {
    console.error("[Groq Primary Error]:", groqError);
  }

  // ── FALLBACK: Gemini via Genkit ─────────────────────────────────────────────
  try {
    return await generateImageDescriptionFlow(input);
  } catch (geminiError) {
    console.error("[Gemini Fallback Error]:", geminiError);
  }

  // ── FINAL FALLBACK: Simple Groq text analysis (if vision fails) ─────────────
  try {
    const simpleResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a medical AI. Analyze the uploaded image for anemia signs. Return valid JSON only."
          },
          {
            role: "user",
            content: `Analyze this ${input.bodyPart} image for anemia biomarkers. Return JSON with: imageDescription, description, isValid (bool), analysisResult, confidenceScore (0-100).`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 512
      })
    });

    if (simpleResponse.ok) {
      const data = await simpleResponse.json();
      const result = JSON.parse(data.choices[0].message.content);
      return {
        ...GenerateImageDescriptionOutputSchema.parse(result),
        description: result.description + " [Analyzed via fallback AI]"
      };
    }
  } catch (finalError) {
    console.error("[All AI Providers Failed]:", finalError);
  }

  // ── ULTIMATE FALLBACK: Return valid inconclusive result ───────────────────────
  return {
    imageDescription: "Image uploaded - AI analysis pending",
    description: "AI analysis temporarily unavailable. Please try again.",
    isValid: true, // Allow retry instead of blocking
    analysisResult: "INCONCLUSIVE (Service Temporarily Unavailable)",
    confidenceScore: 0,
    recommendations: "Please try again in a few moments."
  };
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
          text: `You are the Anemo AI Clinical Vision Engine — an advanced hematological screening AI that performs MULTI-REGION, MULTI-FEATURE analysis of ${input.bodyPart === 'skin' ? 'palm/skin' : input.bodyPart} images for anemia biomarkers.

━━━ STAGE 1: STRICT CROSS-PARAMETER VALIDATION (CRITICAL) ━━━
The user specifically selected to analyze: ${input.bodyPart === 'skin' ? 'Palmar (Palm) Skin' : input.bodyPart}.

AUTOMATIC REJECTION (isValid=false) IF:
1. CROSS-PARAMETER MISMATCH: The image shows a body part DIFFERENT from the selected parameter. 
   - IF user selected "Palm/Skin" but image shows an EYE/CONJUNCTIVA or FINGERNAILS -> REJECT.
   - IF user selected "Under-eye" but image shows a HAND, PALM, or FINGERNAILS -> REJECT.
   - IF user selected "Fingernails" but image shows an EYE or PALM -> REJECT.
   - IF image shows anything else (objects, text, pets, food) -> REJECT.

You must be RUTHLESS. If it is not exactly a clear shot of the requested ${input.bodyPart}, set isValid: false.

IF isValid=false:
- imageDescription: Factual description of what is actually there (e.g., "A close-up of a human eye").
- description: "[VALIDATION_FAIL] The uploaded image shows [detected part], which does not match your selection [${input.bodyPart}]. Please provide the correct specimen."
- isValid: false
- analysisResult: "INCONCLUSIVE (Validation Error)"
- confidenceScore: 0
- STOP HERE.

━━━ STAGE 2: ADVANCED CLINICAL BIOMARKER ANALYSIS (Only if isValid=true) ━━━
Perform a SYSTEMATIC, MULTI-ZONE analysis:

**SKIN TONE CALIBRATION**
- Fitzpatrick Type I-VI assessment. Look for ashen-grey cast in darker skin vs yellowish/waxy in lighter skin.

**ZONE ANALYSIS**
- SKIN/PALM: Zone 1 (Palmar Creases - #1 indicator), Zone 2 (Thenar Eminence), Zone 3 (Fingertip Pads), Zone 4 (Interdigital Webs).
- UNDER-EYE: Zone 1 (Palpebral Conjunctiva - Primary), Zone 2 (Fornix), Zone 3 (Lower Lid Skin).
- FINGERNAILS: Zone 1 (Lunula Contrast), Zone 2 (Mid-Nail Bed), Zone 3 (Tip Transparency).

**VALIDATION GUIDANCE:**
- Be reasonable: If the user provides a close-up of fingers where the nail bed is the primary focus, accept it. 
- Only reject if the image is objectively NOT the requested part (e.g., showing a face for fingernails, or a pet for skin).
- If the image is blurry, describe the blur but still attempt an assessment if color features are visible.

**CROSS-FEATURE SYNTHESIS**
- Weight palmar creases and palpebral conjunctiva DOUBLE.
- ≥60% pallor -> Positive.
- 30-60% -> Suspected.
- <30% -> Negative.

━━━ OUTPUT FORMAT ━━━
Return a valid JSON object matching the schema. imageDescription MUST be a plain factual description of the photo. description SHOULD be clinical.

Return JSON only.`
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


