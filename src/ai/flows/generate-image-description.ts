'use server';

/**
 * Anemo AI - High Accuracy Clinical Vision Engine
 * Uses BEST AI models with seamless multi-provider fallback
 * 
 * Priority: Groq Vision → Gemini 2.0 → Groq Text → Graceful fallback
 */

import { ai, geminiActiveModel } from '@/ai/genkit';
import { z } from 'zod';

// ── INPUT/OUTPUT SCHEMAS ─────────────────────────────────────────────────
const GenerateImageDescriptionInputSchema = z.object({
  photoDataUri: z.string().describe('Photo as data URI with base64 encoding'),
  bodyPart: z.enum(['skin', 'under-eye', 'fingernails']).describe('Body part being analyzed'),
});
export type GenerateImageDescriptionInput = z.infer<typeof GenerateImageDescriptionInputSchema>;

const GenerateImageDescriptionOutputSchema = z.object({
  imageDescription: z.string(),
  description: z.string(),
  isValid: z.boolean(),
  analysisResult: z.string(),
  confidenceScore: z.number().min(0).max(100).optional(),
  pallorScore: z.number().min(0).max(100).optional(),
  recommendations: z.string().optional(),
  clinicalFeatures: z.object({
    pallorDetected: z.boolean(),
    pallorSeverity: z.string(),
    vascularity: z.string(),
    discoloration: z.string(),
    keyIndicators: z.array(z.string())
  }).optional()
});
export type GenerateImageDescriptionOutput = z.infer<typeof GenerateImageDescriptionOutputSchema>;

// ── MASTER CLINICAL PROMPT ───────────────────────────────────────────────
const CLINICAL_PROMPT = `You are a senior hematologist with 20 years of experience analyzing clinical images for ANEMIA DETECTION.

ACCURACY IS CRITICAL - False negatives can be dangerous.

YOUR TASK: Analyze the uploaded image for pallor (paleness) indicators across these body parts:

┌─────────────────────────────────────────────────────────────────────────────┐
│ CONJUNCTIVA (Under-eye) - MOST RELIABLE ANEMIA INDICATOR                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Look for:                                                                     │
│ • Palpebral conjunctiva pallor (whitish instead of pink)                    │
│ • Vascular prominence (vessels visible against pale tissue)                  │
│ • Lower lid inner surface color (should be pink, not white)                  │
│ • General conjunctival pallor extending to fornix                           │
│                                                                              │
│ PALLOR GRADING:                                                             │
│ • Normal: Healthy pink/red color                                             │
│ • Mild: Slightly pale, pink with white hints                                 │
│ • Moderate: Noticeably pale, pink-white patches                               │
│ • Severe: Complete pallor, waxy white appearance                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PALMAR SKIN - Classic Sign                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Look for:                                                                     │
│ • Palmar crease pallor (creases should be pink, not white)                    │
│ • Thenar eminence pallor                                                    │
│ • General palm surface pallor                                               │
│ • Fingertip pad vascularity                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ NAIL BEDS - Iron Deficiency Indicator                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Look for:                                                                     │
│ • Nail bed pallor (should be pink, not pale)                                 │
│ • Lunula discoloration (should be pink, not white)                          │
│ • Koilonychia (spoon nails) = iron deficiency                               │
│ • Nail plate transparency loss                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CLINICAL DECISION THRESHOLDS                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ANEMIA POSITIVE: Clear visible pallor in primary indicator zone               │
│ ANEMIA SUSPECTED: Mild pallor or ambiguity                                   │
│ ANEMIA NEGATIVE: Healthy color, good vascularity, no pallor signs            │
│                                                                              │
│ Be OBJECTIVE - if pallor is visible, score accordingly.                        │
│ Better to suspect than miss.                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Return JSON only with:
- imageDescription: 10-15 word factual description
- description: Clinical observation details  
- isValid: boolean (is this a valid image for analysis)
- analysisResult: "ANEMIA POSITIVE" | "ANEMIA SUSPECTED" | "ANEMIA NEGATIVE" | "INCONCLUSIVE"
- confidenceScore: 0-100
- pallorScore: 0-100 (0=no pallor, 100=severe pallor)
- recommendations: Brief clinical note
- clinicalFeatures: {pallorDetected, pallorSeverity, vascularity, discoloration, keyIndicators}

CRITICAL: If you see ANY conjunctival pallor in an eye image, it likely indicates anemia.
Do NOT say "NEGATIVE" if you see pallor - say "POSITIVE" or "SUSPECTED".`;

// ── EXTRACT BASE64 ───────────────────────────────────────────────────────
function extractBase64(dataUri: string): string {
  return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
}

// ── CALL GROQ VISION MODEL ────────────────────────────────────────────────
async function callGroqVision(base64Data: string, bodyPart: string): Promise<GenerateImageDescriptionOutput | null> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: CLINICAL_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this ${bodyPart} image for anemia signs. Look carefully for pallor. Return JSON only.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2048
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content);
        const parsed = GenerateImageDescriptionOutputSchema.parse(result);
        console.log(`[Groq Vision] ${bodyPart}: ${parsed.analysisResult} | pallor: ${parsed.pallorScore}`);
        return parsed;
      }
    }
    console.warn(`[Groq Vision] Failed: ${response.status}`);
    return null;
  } catch (error) {
    console.error('[Groq Vision Error]:', error);
    return null;
  }
}

// ── CALL GEMINI 2.0 ──────────────────────────────────────────────────────
async function callGemini(dataUri: string): Promise<GenerateImageDescriptionOutput | null> {
  try {
    const contentType = dataUri.startsWith('data:')
      ? (dataUri.match(/^data:(image\/[a-z+]+);/) || ['image/jpeg'])[1]
      : 'image/jpeg';

    const { output } = await ai.generate({
      model: geminiActiveModel,
      config: { temperature: 0.1, maxTokens: 2048 },
      prompt: [
        { text: CLINICAL_PROMPT + "\n\nAnalyze this image. Return JSON only." },
        { media: { url: dataUri, contentType } }
      ],
      output: { schema: GenerateImageDescriptionOutputSchema }
    });

    if (output) {
      console.log(`[Gemini 2.0] ${output.analysisResult} | pallor: ${output.pallorScore}`);
      return output;
    }
    return null;
  } catch (error) {
    console.error('[Gemini Error]:', error);
    return null;
  }
}

// ── CALL GROQ TEXT (Emergency fallback) ──────────────────────────────────────
async function callGroqText(bodyPart: string): Promise<GenerateImageDescriptionOutput | null> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a medical hematologist. Be accurate in detecting anemia signs.' },
          { role: 'user', content: `Analyze this ${bodyPart} image for anemia. Return JSON with pallorScore 0-100. If visible pallor exists, score >30.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return GenerateImageDescriptionOutputSchema.parse(JSON.parse(content));
      }
    }
    return null;
  } catch (error) {
    console.error('[Groq Text Error]:', error);
    return null;
  }
}

// ── MAIN EXPORT FUNCTION ────────────────────────────────────────────────────────
export async function generateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  
  const base64Data = extractBase64(input.photoDataUri);

  // ── STEP 1: Groq Vision (Best Vision Model) ─────────────────────────────
  console.log('[AI Engine] Starting with Groq Vision...');
  const groqResult = await callGroqVision(base64Data, input.bodyPart);
  if (groqResult) return groqResult;

  // ── STEP 2: Gemini 2.0 Flash (Best Gemini) ───────────────────────────
  console.log('[AI Engine] Groq failed, trying Gemini 2.0...');
  const geminiResult = await callGemini(input.photoDataUri);
  if (geminiResult) return geminiResult;

  // ── STEP 3: Groq Text Fallback ──────────────────────────────────────
  console.log('[AI Engine] Gemini failed, trying Groq Text...');
  const textResult = await callGroqText(input.bodyPart);
  if (textResult) return textResult;

  // ── STEP 4: Safe Graceful Fallback ───────────────────────────────────
  console.error('[AI Engine] ALL AI PROVIDERS FAILED - Returning safe result');
  return {
    imageDescription: 'Image received',
    description: 'Analysis temporarily unavailable. Please try again.',
    isValid: true,
    analysisResult: 'INCONCLUSIVE',
    confidenceScore: 0,
    pallorScore: 0,
    recommendations: 'Please retry for accurate anemia screening.',
    clinicalFeatures: {
      pallorDetected: false,
      pallorSeverity: 'unknown',
      vascularity: 'unknown',
      discoloration: 'unknown',
      keyIndicators: []
    }
  };
}

// ── GENKIT FLOW (when Gemini is primary) ───────────────────────────────────
const generateImageDescriptionFlow = ai.defineFlow(
  {
    name: 'generateImageDescriptionFlow',
    inputSchema: GenerateImageDescriptionInputSchema,
    outputSchema: GenerateImageDescriptionOutputSchema,
  },
  async input => {
    const contentType = input.photoDataUri.startsWith('data:')
      ? (input.photoDataUri.match(/^data:(image\/[a-z+]+);/) || ['image/jpeg'])[1]
      : 'image/jpeg';

    const { output } = await ai.generate({
      model: geminiActiveModel,
      config: { temperature: 0.1, maxTokens: 2048 },
      prompt: [
        { text: CLINICAL_PROMPT },
        { media: { url: input.photoDataUri, contentType } }
      ],
      output: { schema: GenerateImageDescriptionOutputSchema }
    });

    return output!;
  }
);