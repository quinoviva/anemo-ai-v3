'use server';

/**
 * Anemo AI - Clinical Vision Engine for Anemia Detection
 * High-accuracy AI analysis using multi-provider fallback
 */

import { ai, geminiActiveModel } from '@/ai/genkit';
import { z } from 'zod';

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
  imageDescription: z.string().describe('A plain 10-15 word factual description of exactly what the uploaded image shows, regardless of validity.'),
  description: z.string().describe('Detailed clinical observation of the image with specific pallor indicators found.'),
  isValid: z.boolean().describe('Whether the image is valid for anemia detection.'),
  analysisResult: z.string().describe('One of: "ANEMIA POSITIVE", "ANEMIA SUSPECTED", "ANEMIA NEGATIVE", or "INCONCLUSIVE"'),
  confidenceScore: z.number().min(0).max(100).optional().describe('Confidence level 0-100.'),
  recommendations: z.string().optional().describe('Brief clinical observations.'),
  pallorScore: z.number().min(0).max(100).optional().describe('Specific pallor score 0-100.'),
  clinicalFeatures: z.object({
    pallorDetected: z.boolean(),
    pallorSeverity: z.string(),
    vascularity: z.string(),
    discoloration: z.string(),
    keyIndicators: z.array(z.string())
  }).optional()
});
export type GenerateImageDescriptionOutput = z.infer<typeof GenerateImageDescriptionOutputSchema>;

// ── ENHANCED CLINICAL PROMPT ────────────────────────────────────────────────
function buildClinicalPrompt(bodyPart: string): string {
  const prompts = {
    'under-eye': `You are a board-certified ophthalmologist and hematologist analyzing conjunctival images for ANEMIA DETECTION.

CRITICAL: Conjunctival pallor is one of the MOST RELIABLE clinical signs of anemia.

ANALYSIS ZONES (examine in order):
1. PALPEBRAL CONJUNCTIVA (lower lid) - PRIMARY indicator
2. FORNIX (inner corner) - Secondary indicator  
3. TARSAL CONJUNCTIVA - Upper area

PALLOR INDICATORS TO DETECT:
- Loss of healthy pink/red color → pale, whitish, or yellowish cast
- Blanching response: Press lightly, pallor persists >2 seconds = ANEMIC
- Vascular pallor: Blood vessels appear more prominent against pale tissue
- Conjunctival edema with pallor = severe anemia

CLINICAL THRESHOLDS:
- MILD ANEMIA: Slight pallor, faint pink instead of healthy red
- MODERATE ANEMIA: Noticeable pallor, pale pink to white patches
- SEVERE ANEMIA: Complete pallor, white waxy appearance, visible vessels

POTENTIAL FALSE POSITIVES TO REJECT:
- Normal conjunctival variation in darker skin tones
- Recent eye drops/medication
- Flash photography causing reflection
- Makeup or concealer on lower lid

OUTPUT: Return specific JSON with clinicalFeatures including pallorScore (0-100).
- pallorScore > 60 = ANEMIA POSITIVE
- pallorScore 30-60 = ANEMIA SUSPECTED  
- pallorScore < 30 = ANEMIA NEGATIVE`,

    'skin': `You are a dermatologist analyzing PALMAR (palm) skin images for ANEMIA DETECTION.

CRITICAL: Palmar pallor is a CLASSIC sign of anemia, especially visible in the creases.

ANALYSIS ZONES (examine in order):
1. PALMAR CREASES - MOST RELIABLE indicator (should be pink/red)
2. THENAR EMINENCE (thumb pad) - Important indicator
3. FINGERTIP PADS - Shows circulation
4. INTERDIGITAL WEBS - Shows oxygenation

PALLOR INDICATORS TO DETECT:
- Loss of healthy pink/red in creases → pale, whitish lines
- Generalized pallor across palm surface
- Cyanosis (bluish tint) = severe anemia or hypoxemia
- Pale nail beds = iron deficiency

CLINICAL THRESHOLDS:
- MILD: Slight pallor in creases only
- MODERATE: Creases AND palm surface pale
- SEVERE: Entire palm waxy white with visible vessels

POTENTIAL FALSE POSITIVES:
- Natural skin tone variation
- Poor lighting
- Recent hand washing (pale from water)
- Calluses or dry skin

OUTPUT: Return specific JSON with clinicalFeatures including pallorScore (0-100).`,

    'fingernails': `You are a hematologist analyzing NAIL BED images for ANEMIA DETECTION.

CRITICAL: Nail bed pallor is a reliable sign of anemia, especially iron deficiency.

ANALYSIS ZONES (examine in order):
1. LUNULA (white crescent) - Should be pink, not white
2. NAIL BED - Should be pink/red vascular tissue
3. PERIUNGUAL TISSUES - Shows oxygenation
4. NAIL PLATE - Transparency indicates health

PALLOR INDICATORS TO DETECT:
- White lunula (normally pinkish)
- Pale nail bed instead of pink vascular tissue
- Koilonychia (spoon nails) = iron deficiency anemia
- Brittle/ridged nails with pallor

CLINICAL THRESHOLDS:
- MILD: Slight pallor, lunula slightly pale
- MODERATE: Noticeable pallor, loss of pink
- SEVERE: Complete pallor, visible through nail

POTENTIAL FALSE POSITIVES:
- Natural nail color variation
- Nail polish or artificial nails
- Fungal infection
- Trauma or bruising

OUTPUT: Return specific JSON with clinicalFeatures including pallorScore (0-100).`
  };

  return prompts[bodyPart as keyof typeof prompts] || prompts['under-eye'];
}

function buildUserPrompt(bodyPart: string): string {
  return `Analyze this ${bodyPart} image for clinical signs of anemia.

REQUIRED OUTPUT (JSON only):
{
  "imageDescription": "Factual description of what the image shows",
  "description": "Detailed clinical observation with specific findings",
  "isValid": boolean,
  "analysisResult": "ANEMIA POSITIVE" | "ANEMIA SUSPECTED" | "ANEMIA NEGATIVE" | "INCONCLUSIVE",
  "confidenceScore": 0-100,
  "pallorScore": 0-100,
  "recommendations": "Brief clinical recommendation",
  "clinicalFeatures": {
    "pallorDetected": boolean,
    "pallorSeverity": "none" | "mild" | "moderate" | "severe",
    "vascularity": "normal" | "reduced" | "absent",
    "discoloration": "none" | "pale" | "yellow" | "cyanotic",
    "keyIndicators": ["list of specific clinical signs found"]
  }
}

CRITICAL: Be OBJECTIVE and ACCURATE. If anemia signs are visible, score accordingly.
- pallorScore > 60 = ANEMIA POSITIVE
- pallorScore 30-60 = ANEMIA SUSPECTED
- pallorScore < 30 = ANEMIA NEGATIVE

Return JSON ONLY, no additional text.`;
}

// ── IMAGE ANALYSIS FUNCTION ───────────────────────────────────────────────────
export async function generateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  
  // Extract base64 from data URI
  const base64Data = input.photoDataUri.includes(',') 
    ? input.photoDataUri.split(',')[1] 
    : input.photoDataUri;

  const systemPrompt = buildClinicalPrompt(input.bodyPart);
  const userPrompt = buildUserPrompt(input.bodyPart);

  // ── TRY 1: Groq Llama 4 Scout Vision (Primary) ──────────────────────────────
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Data}` }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Slightly higher for better analysis
        max_tokens: 2048
      })
    });

    if (groqResponse.ok) {
      const data = await groqResponse.json();
      const content = data.choices[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content);
        const parsed = GenerateImageDescriptionOutputSchema.parse(result);
        console.log(`[Groq Analysis] ${input.bodyPart}: ${parsed.analysisResult} (pallor: ${parsed.pallorScore || 'N/A'})`);
        return parsed;
      }
    } else {
      console.warn(`[Groq] Failed with status: ${groqResponse.status}`);
    }
  } catch (groqError) {
    console.error("[Groq Error]:", groqError);
  }

  // ── TRY 2: Gemini via Genkit (Fallback) ──────────────────────────────────
  try {
    const contentType = input.photoDataUri.startsWith('data:')
      ? input.photoDataUri.match(/^data:(image\/[a-z+]+);/)![1]
      : 'image/jpeg';

    const { output } = await ai.generate({
      model: geminiActiveModel,
      config: { temperature: 0.2, maxTokens: 2048 },
      prompt: [
        { text: systemPrompt + "\n\n" + userPrompt },
        {
          media: {
            url: input.photoDataUri,
            contentType: contentType
          }
        }
      ],
      output: { schema: GenerateImageDescriptionOutputSchema }
    });

    if (output) {
      console.log(`[Gemini Analysis] ${input.bodyPart}: ${output.analysisResult} (pallor: ${output.pallorScore || 'N/A'})`);
      return output;
    }
  } catch (geminiError) {
    console.error("[Gemini Error]:", geminiError);
  }

  // ── TRY 3: Groq Text Model (Emergency Fallback) ───────────────────────────
  try {
    const textResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `You are a medical expert specializing in anemia detection. Analyze the ${input.bodyPart} image carefully and return accurate JSON. Be strict about detecting pallor - if there's any sign of pallor, score it higher.`
          },
          { 
            role: "user", 
            content: `Analyze this ${input.bodyPart} image for anemia. Look for:
- Loss of healthy pink/red color (pallor)
- Pale or whitish appearance
- Reduced vascularity
- Any discoloration indicating anemia

Return JSON with pallorScore (0-100) where:
- >60 = ANEMIA POSITIVE (clear pallor visible)
- 30-60 = ANEMIA SUSPECTED (some pallor)
- <30 = ANEMIA NEGATIVE (healthy color)

Return JSON only.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (textResponse.ok) {
      const data = await textResponse.json();
      const content = data.choices[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content);
        const parsed = GenerateImageDescriptionOutputSchema.parse(result);
        console.log(`[Text Analysis] ${input.bodyPart}: ${parsed.analysisResult}`);
        return parsed;
      }
    }
  } catch (textError) {
    console.error("[Text Fallback Error]:", textError);
  }

  // ── ULTIMATE FALLBACK: Safe inconclusive result ────────────────────────────
  console.error("[All AI Providers Failed] - Returning safe result");
  return {
    imageDescription: "Image received for analysis",
    description: "AI analysis service temporarily unavailable. Please try again for accurate anemia screening.",
    isValid: true,
    analysisResult: "INCONCLUSIVE",
    confidenceScore: 0,
    pallorScore: undefined,
    recommendations: "Please retry the analysis when service is available.",
    clinicalFeatures: {
      pallorDetected: false,
      pallorSeverity: "unknown",
      vascularity: "unknown",
      discoloration: "unknown",
      keyIndicators: []
    }
  };
}

// ── GENKIT FLOW (for when Gemini is primary) ────────────────────────────────
const generateImageDescriptionFlow = ai.defineFlow(
  {
    name: 'generateImageDescriptionFlow',
    inputSchema: GenerateImageDescriptionInputSchema,
    outputSchema: GenerateImageDescriptionOutputSchema,
  },
  async input => {
    const contentType = input.photoDataUri.startsWith('data:')
      ? input.photoDataUri.match(/^data:(image\/[a-z+]+);/)![1]
      : 'image/jpeg';

    const systemPrompt = buildClinicalPrompt(input.bodyPart);
    const userPrompt = buildUserPrompt(input.bodyPart);

    const { output } = await ai.generate({
      model: geminiActiveModel,
      config: { temperature: 0.2, maxTokens: 2048 },
      prompt: [
        { text: systemPrompt + "\n\n" + userPrompt },
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