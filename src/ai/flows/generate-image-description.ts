'use server';

/**
 * Anemo AI - STRICT Validation + HIGH Accuracy
 * 
 * VALIDATION RULES (In Order):
 * 1. Only 3 body parts accepted: palm, under-eye, fingernails
 * 2. NO makeup, filters, or obstructions allowed
 * 3. NO wrong body parts
 * 4. Clinical analysis for actual anemia detection
 */

import { z } from 'zod';
import { ai, geminiActiveModel } from '@/ai/genkit';

// ── SCHEMAS ───────────────────────────────────────────────────────────────
const InputSchema = z.object({
  photoDataUri: z.string(),
  bodyPart: z.enum(['skin', 'under-eye', 'fingernails']),
});
export type Input = z.infer<typeof InputSchema>;
export type GenerateImageDescriptionInput = Input;

const OutputSchema = z.object({
  imageDescription: z.string(),
  description: z.string(),
  isValid: z.boolean(),
  analysisResult: z.string(),
  confidenceScore: z.number(),
  pallorScore: z.number(),
  recommendations: z.string(),
  clinicalFeatures: z.object({
    pallorDetected: z.boolean(),
    pallorSeverity: z.string(),
    vascularity: z.string(),
    discoloration: z.string(),
    keyIndicators: z.array(z.string())
  })
});
export type Output = z.infer<typeof OutputSchema>;
export type GenerateImageDescriptionOutput = Output;

// ── STRICT VALIDATION PROMPT ────────────────────────────────────────────
const STRICT_VALIDATION = {
  'skin': `STRICT VALIDATION - PALM/SKIN IMAGE

You MUST REJECT (isValid: false) if ANY of these:
✗ Makeup, foundation, concealer on palm
✗ Nail polish or artificial nails in frame
✗ Filters, effects, or edited images
✗ Face, eyes, or head in image
✗ Under-eye or conjunctiva
✗ Fingernails or toes
✗ Any clothing, jewelry on palm
✗ Blurry, dark, or unreadable image
✗ Non-human subjects (pets, objects)

You MUST ACCEPT (isValid: true) ONLY if:
✓ Clear palm/hand palm image
✓ Natural skin tone visible
✓ Palmar creases visible
✓ No makeup, polish, or filters
✓ Good lighting

Return JSON: {"isValid": boolean, "rejectionReason": "specific reason if invalid"}`,

  'under-eye': `STRICT VALIDATION - UNDER-EYE/CONJUNCTIVA IMAGE

You MUST REJECT (isValid: false) if ANY of these:
✗ Eye makeup, mascara, eyeliner on lower lid
✗ Concealer or foundation on under-eye area
✗ Filters, effects, or edited images
✗ Full face selfie without under-eye visible
✗ Palm, hand, or skin elsewhere
✗ Fingernails
✗ Blurry or dark image
✗ Contact lenses visible
✗ Non-human subjects

You MUST ACCEPT (isValid: true) ONLY if:
✓ Clear under-eye area with conjunctiva visible
✓ No makeup on lower lid
✓ Natural skin tone
✓ Good lighting
✓ Inner eyelid visible

Return JSON: {"isValid": boolean, "rejectionReason": "specific reason if invalid"}`,

  'fingernails': `STRICT VALIDATION - FINGERNAIL IMAGE

You MUST REJECT (isValid: false) if ANY of these:
✗ Nail polish, gel, or acrylic nails
✗ Fake nails or nail art
✗ Makeup on hands
✗ Filters or edited images
✗ Face, eyes, or under-eye
✗ Palm without nails visible
✗ Toenails (must be fingernails)
✗ Blurry or dark image
✗ Bandages or band-aids on nails
✗ Non-human subjects

You MUST ACCEPT (isValid: true) ONLY if:
✓ Clear fingernails with nail beds visible
✓ No polish, makeup, or artificial nails
✓ Natural nail color
✓ Good lighting
✓ At least 1-2 nails clearly visible

Return JSON: {"isValid": boolean, "rejectionReason": "specific reason if invalid"}`
};

// ── CLINICAL ANALYSIS PROMPTS ─────────────────────────────────────────
const CLINICAL_ANALYSIS = {
  'skin': `CLINICAL ANALYSIS - PALM FOR ANEMIA

WARNING: False negatives can delay critical diagnosis. Be CONSERVATIVE.

EXAMINE PALM CAREFULLY:
1. Palmar Creases (MOST IMPORTANT)
   - Normal: Pink to red lines
   - Anemia: Pale, whitish creases
   
2. Thenar Eminence (thumb pad)
   - Normal: Healthy pink
   - Anemia: Pale, ashen

3. Overall Palm Color
   - Normal: Pinkish-tan
   - Anemia: Pale, waxy, grayish

PALLOR SCORING:
- 0-20: Healthy pink - NO ANEMIA
- 21-40: Slightly pale - MILD ANEMIA
- 41-60: Noticeably pale - MODERATE ANEMIA
- 61-80: Very pale - SEVERE ANEMIA
- 81-100: Waxy white - CRITICAL ANEMIA

RULES:
- If ANY pallor visible → minimum score 50
- If creases are pale → minimum score 60
- Only score <30 if clearly healthy pink

Return JSON with honest pallorScore (0-100) and analysisResult.`,

  'under-eye': `CLINICAL ANALYSIS - CONJUNCTIVA FOR ANEMIA

WARNING: Conjunctival pallor is ONE OF THE MOST RELIABLE anemia signs.

EXAMINE CONJUNCTIVA CAREFULLY:
1. Lower Lid Inner Surface (Palpebral Conjunctiva)
   - Normal: Pink to red
   - Anemia: White, pale pink, yellowish
   
2. Fornix (inner corner)
   - Check for pallor extension

3. Vascular Pattern
   - Vessels more visible against pale tissue = ANEMIA

PALLOR SCORING:
- 0-20: Healthy pink conjunctiva - NO ANEMIA
- 21-40: Slightly pale - MILD ANEMIA
- 41-60: Noticeably pale - MODERATE ANEMIA
- 61-80: Very pale - SEVERE ANEMIA  
- 81-100: Waxy white - CRITICAL ANEMIA

RULES:
- If ANY conjunctival pallor → minimum score 55
- If clear pallor + visible vessels → minimum score 70
- Only score <30 if clearly healthy pink

Return JSON with honest pallorScore (0-100) and analysisResult.`,

  'fingernails': `CLINICAL ANALYSIS - NAIL BEDS FOR ANEMIA

EXAMINE NAILS CAREFULLY:
1. Nail Beds (under nail)
   - Normal: Pink vascular tissue
   - Anemia: Pale, whitish nail beds
   
2. Lunula (white crescent)
   - Normal: Pinkish
   - Anemia: White or absent

3. Nail Plate
   - Koilonychia (spoon nails) = Iron deficiency
   - Brittle nails with pallor

PALLOR SCORING:
- 0-20: Healthy pink nails - NO ANEMIA
- 21-40: Slightly pale - MILD ANEMIA
- 41-60: Noticeably pale - MODERATE ANEMIA
- 61-80: Very pale - SEVERE ANEMIA
- 81-100: White nail beds - CRITICAL ANEMIA

RULES:
- If ANY nail bed pallor → minimum score 50
- If Koilonychia visible → minimum score 65
- Only score <30 if clearly healthy pink

Return JSON with honest pallorScore (0-100) and analysisResult.`
};

// ── HELPERS ───────────────────────────────────────────────────────────
function extractBase64(dataUri: string): string {
  return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
}

function getSeverity(score: number): string {
  if (score < 20) return 'none';
  if (score < 40) return 'mild';
  if (score < 60) return 'moderate';
  return 'severe';
}

function getAnalysisResult(pallorScore: number): string {
  if (pallorScore > 60) return 'ANEMIA POSITIVE';
  if (pallorScore >= 30) return 'ANEMIA SUSPECTED';
  return 'ANEMIA NEGATIVE';
}

// ── STEP 1: STRICT VALIDATION ────────────────────────────────────────
async function strictValidate(base64: string, bodyPart: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: STRICT_VALIDATION[bodyPart as keyof typeof STRICT_VALIDATION] },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'STRICT VALIDATION: Check if this image meets ALL requirements. Return JSON only.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.02,
        max_tokens: 256
      })
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content);
        console.log(`[VALIDATION] ${bodyPart}: isValid=${result.isValid}, reason=${result.rejectionReason}`);
        return {
          isValid: result.isValid === true,
          reason: result.rejectionReason
        };
      }
    }
  } catch (e) {
    console.error('[Validation Error]:', e);
  }
  return { isValid: true }; // Don't block on errors
}

// ── STEP 2: CLINICAL ANALYSIS ─────────────────────────────────────────
async function analyzeClinical(base64: string, bodyPart: string): Promise<Output | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: CLINICAL_ANALYSIS[bodyPart as keyof typeof CLINICAL_ANALYSIS] },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this ${bodyPart} for anemia. Look for pallor. Return honest JSON with pallorScore.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.02,
        max_tokens: 2048
      })
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const r = JSON.parse(content);
        const pallorScore = r.pallorScore || 50;
        
        console.log(`[CLINICAL] ${bodyPart}: pallorScore=${pallorScore}, result=${getAnalysisResult(pallorScore)}`);
        
        return {
          imageDescription: r.imageDescription || `${bodyPart} image`,
          description: r.description || 'Analysis complete',
          isValid: true,
          analysisResult: getAnalysisResult(pallorScore),
          confidenceScore: r.confidenceScore || 85,
          pallorScore,
          recommendations: r.recommendations || 'Continue monitoring',
          clinicalFeatures: {
            pallorDetected: pallorScore > 30,
            pallorSeverity: getSeverity(pallorScore),
            vascularity: pallorScore > 50 ? 'reduced' : 'normal',
            discoloration: pallorScore > 40 ? 'pale' : 'none',
            keyIndicators: r.clinicalFeatures?.keyIndicators || []
          }
        };
      }
    }
  } catch (e) {
    console.error('[Clinical Error]:', e);
  }
  return null;
}

// ── GEMINI FALLBACK ─────────────────────────────────────────────────
async function analyzeWithGemini(dataUri: string): Promise<Output | null> {
  try {
    const ct = dataUri.startsWith('data:')
      ? (dataUri.match(/^data:(image\/[a-z+]+);/) || ['image/jpeg'])[1]
      : 'image/jpeg';

    const { output } = await ai.generate({
      model: geminiActiveModel,
      config: { temperature: 0.02, maxTokens: 2048 },
      prompt: [
        { text: 'Analyze for anemia pallor. If any pallor visible, score minimum 50. Return JSON with pallorScore 0-100.' },
        { media: { url: dataUri, contentType: ct } }
      ],
      output: { schema: OutputSchema }
    });

    if (output) {
      return {
        ...output,
        analysisResult: getAnalysisResult(output.pallorScore || 50),
        clinicalFeatures: output.clinicalFeatures || {
          pallorDetected: (output.pallorScore || 0) > 30,
          pallorSeverity: getSeverity(output.pallorScore || 0),
          vascularity: 'assessed',
          discoloration: 'assessed',
          keyIndicators: []
        }
      };
    }
  } catch (e) {
    console.error('[Gemini Error]:', e);
  }
  return null;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────
export async function generateImageDescription(input: Input): Promise<Output> {
  const base64 = extractBase64(input.photoDataUri);
  const bodyPart = input.bodyPart;

  console.log('[Anemo AI] Processing:', bodyPart);

  // ── STEP 1: STRICT VALIDATION ───────────────────────────────────
  console.log('[Step 1] Strict validation...');
  const validation = await strictValidate(base64, bodyPart);
  
  if (!validation.isValid) {
    console.log('[Step 1] REJECTED:', validation.reason);
    
    const bodyPartName = bodyPart === 'skin' ? 'palm/skin' : bodyPart === 'under-eye' ? 'under-eye area' : 'fingernails';
    
    return {
      imageDescription: 'Invalid image',
      description: `Image rejected: ${validation.reason || 'Does not meet requirements for ' + bodyPartName}`,
      isValid: false,
      analysisResult: 'INVALID_IMAGE',
      confidenceScore: 0,
      pallorScore: 0,
      recommendations: `Please upload a CLEAR, NATURAL image of your ${bodyPartName} without makeup, filters, or nail polish.`,
      clinicalFeatures: {
        pallorDetected: false,
        pallorSeverity: 'none',
        vascularity: 'unknown',
        discoloration: 'unknown',
        keyIndicators: []
      }
    };
  }
  console.log('[Step 1] Passed ✓');

  // ── STEP 2: CLINICAL ANALYSIS ─────────────────────────────────────
  console.log('[Step 2] Clinical analysis...');
  
  let result = await analyzeClinical(base64, bodyPart);
  
  if (!result) {
    console.log('[Step 2] Trying Gemini...');
    result = await analyzeWithGemini(input.photoDataUri);
  }

  if (result) {
    console.log(`[Step 2] Result: ${result.analysisResult} (pallor: ${result.pallorScore})`);
    return result;
  }

  // ── STEP 3: ALL FAILED ────────────────────────────────────────────
  console.error('[Step 3] All AI failed');
  return {
    imageDescription: 'Analysis unavailable',
    description: 'Please try again with a clearer image.',
    isValid: true,
    analysisResult: 'INCONCLUSIVE',
    confidenceScore: 0,
    pallorScore: 0,
    recommendations: 'Ensure good lighting and try again.',
    clinicalFeatures: {
      pallorDetected: false,
      pallorSeverity: 'unknown',
      vascularity: 'unknown',
      discoloration: 'unknown',
      keyIndicators: []
    }
  };
}