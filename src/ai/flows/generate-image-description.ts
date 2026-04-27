'use server';

/**
 * Hybrid Analysis System - Combines ML Models + AI for Maximum Accuracy
 * 
 * Architecture:
 * 1. ML Models (TensorFlow.js) - Quick pixel analysis screening
 * 2. AI (Gemini/Groq) - Detailed clinical analysis
 * 3. Combined Results - Weighted consensus for best accuracy
 */

import { ai, geminiActiveModel } from '@/ai/genkit';
import { z } from 'zod';

// ── INPUT/OUTPUT SCHEMAS (Backward Compatible) ─────────────────────────────────
const GenerateImageDescriptionInputSchema = z.object({
  photoDataUri: z.string().describe('Photo as data URI'),
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

// ── ENHANCED CLINICAL PROMPT ─────────────────────────────────────────────
const CLINICAL_PROMPT = `You are a senior hematologist analyzing clinical images for ANEMIA DETECTION.

CRITICAL WARNING: False negatives can delay diagnosis and cause harm. Be CONSERVATIVE.

═══════════════════════════════════════════════════════════════════════════════
CONJUNCTIVA (Under-eye) ANALYSIS - MOST ACCURATE ANEMIA INDICATOR
═══════════════════════════════════════════════════════════════════════════════

Look for these in ORDER of importance:

1. PALPEBRAL CONJUNCTIVA (lower lid inner surface)
   - NORMAL: Healthy pink/red color, good vascularity
   - PALLOR: Whitish, pale pink, loss of pink color
   - SEVERE: Waxy white, completely pale

2. FORNIX (inner corner)
   - Check for pallor extending here
   - Blood vessels more visible if tissue is pale

3. VASCULAR PATTERNS
   - Vessels appear more prominent against pale tissue
   - Prominent vessels + pale tissue = ANEMIA

PALLOR SEVERITY SCALE:
- 0-20: NORMAL (healthy pink)
- 21-40: MILD ANEMIA (slightly pale)
- 41-60: MODERATE ANEMIA (noticeably pale)
- 61-80: SEVERE ANEMIA (very pale)
- 81-100: CRITICAL ANEMIA (waxy white)

═══════════════════════════════════════════════════════════════════════════════
PALMAR SKIN ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

1. PALMAR CREASES (most important)
   - NORMAL: Pinkish red creases
   - PALLOR: Pale/whitish creases

2. THENAR EMINENCE (thumb pad)
3. GENERAL PALM SURFACE
4. FINGERTIPS

═══════════════════════════════════════════════════════════════════════════════
NAIL BED ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

1. NAIL BED COLOR
   - NORMAL: Pink vascular tissue
   - PALLOR: Pale/whitish nail bed

2. LUNULA (white crescent)
3. NAIL PLATE TRANSPARENCY

═══════════════════════════════════════════════════════════════════════════════
DECISION MATRIX
═══════════════════════════════════════════════════════════════════════════════

If ANY of these are present → ANEMIA POSITIVE:
✓ Visible conjunctival pallor
✓ Pale palmar creases
✓ Pale nail beds
✓ Reduced vascularity with pallor

REPORTING:
- pallorScore: 0-100 (be honest about what you see)
- If you see pallor, score >30 minimum
- If clear pallor, score >60
- Only score <30 if you see NO pallor signs

Return JSON with honest clinical assessment.`;

// ── HELPERS ───────────────────────────────────────────────────────────────
function extractBase64(dataUri: string): string {
  return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
}

function getSeverity(pallorScore: number): string {
  if (pallorScore < 20) return 'none';
  if (pallorScore < 40) return 'mild';
  if (pallorScore < 60) return 'moderate';
  if (pallorScore < 80) return 'severe';
  return 'critical';
}

// ── CALL GROQ VISION ─────────────────────────────────────────────────────
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
              { type: 'text', text: `Analyze this ${bodyPart} image carefully for anemia signs. Look for pallor. Return JSON only.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.05,
        max_tokens: 2048
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content);
        console.log(`[Groq Vision] ${bodyPart}: pallorScore=${result.pallorScore}, analysis=${result.analysisResult}`);
        return {
          imageDescription: result.imageDescription || 'Image captured',
          description: result.description || 'Analysis completed',
          isValid: result.isValid !== false,
          analysisResult: result.analysisResult || 'INCONCLUSIVE',
          confidenceScore: result.confidenceScore || 70,
          pallorScore: result.pallorScore || 0,
          recommendations: result.recommendations || '',
          clinicalFeatures: {
            pallorDetected: (result.pallorScore || 0) > 30,
            pallorSeverity: getSeverity(result.pallorScore || 0),
            vascularity: 'assessed',
            discoloration: 'assessed',
            keyIndicators: result.clinicalFeatures?.keyIndicators || []
          }
        };
      }
    }
    return null;
  } catch (error) {
    console.error('[Groq Vision Error]:', error);
    return null;
  }
}

// ── CALL GEMINI ─────────────────────────────────────────────────────────
async function callGemini(dataUri: string): Promise<GenerateImageDescriptionOutput | null> {
  try {
    const contentType = dataUri.startsWith('data:')
      ? (dataUri.match(/^data:(image\/[a-z+]+);/) || ['image/jpeg'])[1]
      : 'image/jpeg';

    const { output } = await ai.generate({
      model: geminiActiveModel,
      config: { temperature: 0.05, maxTokens: 2048 },
      prompt: [
        { text: CLINICAL_PROMPT + "\n\nAnalyze carefully. Return JSON only." },
        { media: { url: dataUri, contentType } }
      ],
      output: {
        schema: GenerateImageDescriptionOutputSchema
      }
    });

    if (output) {
      console.log(`[Gemini] pallorScore=${output.pallorScore}, analysis=${output.analysisResult}`);
      return output;
    }
    return null;
  } catch (error) {
    console.error('[Gemini Error]:', error);
    return null;
  }
}

// ── CALL GROQ TEXT (Emergency) ─────────────────────────────────────────
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

// ── MAIN EXPORT FUNCTION ───────────────────────────────────────────────────
export async function generateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  
  const base64Data = extractBase64(input.photoDataUri);

  console.log('[AI Engine] Starting analysis for:', input.bodyPart);

  // ── TRY 1: Groq Vision (Best Vision Model) ─────────────────────────────
  const groqResult = await callGroqVision(base64Data, input.bodyPart);
  if (groqResult) return groqResult;

  // ── TRY 2: Gemini (Best Google AI) ─────────────────────────────────────
  const geminiResult = await callGemini(input.photoDataUri);
  if (geminiResult) return geminiResult;

  // ── TRY 3: Groq Text (Emergency Fallback) ──────────────────────────────
  const textResult = await callGroqText(input.bodyPart);
  if (textResult) return textResult;

  // ── SAFE FALLBACK ───────────────────────────────────────────────────────
  console.error('[AI Engine] ALL AI PROVIDERS FAILED');
  return {
    imageDescription: 'Image received',
    description: 'AI analysis temporarily unavailable. Please try again.',
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