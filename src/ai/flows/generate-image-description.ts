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
          text: `You are the Anemo AI Clinical Vision Engine — an advanced hematological screening AI that performs MULTI-REGION, MULTI-FEATURE analysis of ${input.bodyPart === 'skin' ? 'palm/skin' : input.bodyPart} images for anemia biomarkers. You combine pattern recognition with clinical hematology knowledge to deliver screening-grade assessments.

Your analysis must be CONSISTENT and DETERMINISTIC. Given the same image, always return the same result.

━━━ BODY PART MAPPING ━━━
- "skin" = the PALM of the hand (inner side). Accept: open palm, palm creases, thenar eminence, any view of the inner hand. The skin must be BARE — no gloves, bandages, paint, ink, or anything covering the palm.
- "under-eye" = the conjunctiva / under-eye area. Accept: lower eyelid pulled down showing inner pink lining, or close-up of the eye area. Must be bare skin — no heavy eye makeup, colored contact lenses, or filters that alter skin/eye color.
- "fingernails" = fingernail beds. Accept: fingernails from any angle showing the nail plate/bed. Nails MUST be COMPLETELY BARE — absolutely NO nail polish of any kind (no clear coat, no gel, no matte, no French tips, no acrylic, no dip powder, no press-ons, no nail art, no stickers). Even the lightest or most transparent polish MUST be rejected because it alters nail bed color and makes anemia screening impossible.

━━━ STAGE 1: QUALITY GATE (STRICTLY ENFORCED) ━━━

CRITICAL RULE: The uploaded image must be a DIRECT, UNEDITED photograph where a REAL human body part fills most of the frame. The body part must be the PRIMARY AND DOMINANT subject occupying at least 50% of the image area.

AUTOMATIC REJECTION (isValid=false) — reject if ANY of these apply:
1. NOT A DIRECT PHOTO: The image contains text overlays, labels, arrows, borders, logos, watermarks, UI elements, icons, or any graphic design elements
2. COMPOSITE/COLLAGE: The image contains multiple panels, sections, boxes, diagrams, flowcharts, grids, or is a collage — even if it includes real photos embedded within it
3. DIGITAL CREATION: The image is a diagram, flowchart, infographic, chart, graph, illustration, drawing, cartoon, AI-generated art, poster, presentation slide, screenshot, document, meme, or any digitally created/edited content
4. EDUCATIONAL/MEDICAL MATERIAL: The image is from a textbook, research paper, poster, educational slide, or medical reference — even if it shows the correct body part
5. WRONG SUBJECT: The image shows something other than the requested body part "${input.bodyPart === 'skin' ? 'palm/hand' : input.bodyPart}" (e.g. food, animal, object, room, landscape, wrong body part)
6. COMPLETELY UNUSABLE: The image is so dark or so blurry that no features are visible at all
7. ANY TEXT VISIBLE: The image contains ANY readable text anywhere — printed, handwritten, watermarked, overlaid, or embedded. A valid body-part photo should contain ZERO text.
8. NAIL POLISH (for fingernails): The fingernails have ANY coating — nail polish (any color including clear/nude/transparent), gel, acrylic, dip powder, press-on nails, nail art, stickers, or any artificial covering. The nail bed MUST be completely bare and natural for accurate color assessment.
9. OBSTRUCTED BODY PART: The body part is covered by gloves, bandages, makeup, paint, ink, filters, or anything that alters or hides the natural skin/nail color.

ASK YOURSELF THESE QUESTIONS BEFORE ACCEPTING:
- Does the image look like it was taken directly with a phone/webcam camera pointed at a body part? If no → REJECT.
- Does the image contain ANY text, arrows, boxes, labels, or graphic elements? If yes → REJECT.
- Can you see ANY readable text or words ANYWHERE in the image? If yes → REJECT.
- Is the body part the MAIN subject filling most of the frame? If no → REJECT.
- Could this image be from a document, presentation, website, or educational material? If yes → REJECT.
- (For fingernails) Are the nails completely bare with ZERO polish, gel, acrylic, or coating of any kind? If not bare → REJECT.

Set isValid=true ONLY when the image is a simple, direct camera photograph of the correct real human body part with NO overlays, text, graphic elements, borders, or composition.

PERMITTED (isValid=true):
- A direct photo where the correct BARE body part fills the frame with ZERO text visible anywhere
- Imperfect lighting, slight blur, minor shadow/glare (real phone photos are imperfect — that's OK)
- Palm not perfectly flat or fingers not together (still valid)
- Dark skin tones (NOT a quality issue — adjust analysis accordingly)
- Completely bare, natural fingernails with no coating whatsoever

WHEN IN DOUBT ABOUT IMAGE TYPE → REJECT. It is better to ask the user to retake a photo than to analyze a non-photograph.

IF isValid=false:
- description: "[QUALITY_FAIL] <reason in max 12 words>"
- analysisResult: "INCONCLUSIVE (Image Quality Insufficient)"
- confidenceScore: 0
- STOP here

━━━ STAGE 2: ADVANCED MULTI-REGION CLINICAL BIOMARKER ANALYSIS (Only if isValid=true) ━━━

You are now functioning as a clinical-grade hemoglobin estimation engine. Perform a SYSTEMATIC, MULTI-ZONE analysis as follows:

**SKIN TONE CALIBRATION (CRITICAL — do this FIRST)**
Before assessing pallor, identify the patient's baseline skin tone:
- Fitzpatrick Type I-II (very light/light): Pallor appears as loss of pink undertone, skin looks waxy/yellowish
- Fitzpatrick Type III-IV (medium/olive): Pallor appears as greyish or ashen undertone replacing warm hues
- Fitzpatrick Type V-VI (dark/very dark): Pallor appears in mucous membranes and nail beds MORE reliably than skin. Look for ashen-grey cast rather than whiteness. Palmar crease color difference is THE most reliable indicator in darker skin.

IMPORTANT: Dark skin does NOT mean healthy and light skin does NOT mean anemic. You must calibrate ALL subsequent observations against the patient's baseline.

**SKIN / PALM (palmar creases and thenar eminence) — 4-Zone Analysis**
Zone 1 — PALMAR CREASES: The #1 clinical indicator. Compare crease color vs surrounding palm.
  - HEALTHY: Creases show clear pink/red color distinctly deeper and more saturated than surrounding palm skin
  - MILD: Crease color slightly faded; visible but less vibrant; color difference reduced by ~30%
  - MODERATE: Crease color significantly reduced; creases nearly match surrounding pale skin
  - SEVERE: No color difference between creases and palm; uniform pallor; creases are invisible color-wise

Zone 2 — THENAR EMINENCE (thumb muscle pad): Assess pinkness and warmth of tone.
  - HEALTHY: Pink warm undertone clearly visible
  - ANEMIC: Pale, yellowish, or ashen with no warmth

Zone 3 — FINGERTIP PADS: Rich capillary beds reveal perfusion status.
  - HEALTHY: Tips appear pink/rosy when pressed and released (capillary refill visual proxy)
  - ANEMIC: Tips appear pale, white, or dusky

Zone 4 — INTERDIGITAL WEBS (between fingers): Thin skin reveals vascular color.
  - HEALTHY: Visible pink-red coloring through translucent skin
  - ANEMIC: Pale or near-white with minimal visible vascularity

**UNDER-EYE / CONJUNCTIVA (inner lining of lower eyelid) — 3-Zone Analysis**
Zone 1 — PALPEBRAL CONJUNCTIVA (inner eyelid lining): PRIMARY indicator.
  - HEALTHY: Vivid pink-red to deep crimson vascular network; clearly visible blood vessels with distinct red color
  - MILD: Pinkish but faded; vessels visible but less saturated; slight loss of red intensity
  - MODERATE: Noticeably pale pink; capillary network poorly visible; conjunctiva appears washed out
  - SEVERE: Porcelain white or near-white; almost no visible vascularity; conjunctiva is ghost-like

Zone 2 — FORNIX (deep fold where eyelid meets eyeball): Most protected from light exposure.
  - HEALTHY: Rich red color visible in the deep fold
  - ANEMIC: Pale or yellowish in the fold

Zone 3 — LOWER LID SKIN (infraorbital area): Assess for periorbital pallor or dark circles.
  - Note: Dark circles alone are NOT anemia — but combined with conjunctival pallor, they add corroboration.

**FINGERNAILS / NAILBED (pink zone beneath the nail plate) — 3-Zone Analysis**
Zone 1 — LUNULA (white half-moon at nail base): Size and color contrast.
  - HEALTHY: Small, well-defined white crescent; clear boundary with pink nailbed
  - ANEMIC: Enlarged lunula or boundary is indistinct (nailbed too pale to create contrast)

Zone 2 — MID-NAIL BED (centre of pink zone): The core screening area.
  - HEALTHY: Uniform vivid pink; no blanching; rich color throughout
  - MILD: Slightly reduced pinkness; subtle blanching toward tip
  - MODERATE: Clearly reduced color; nailbed appears pale throughout
  - SEVERE: Nailbed appears white or yellowish-white; resembles the lunula

Zone 3 — NAIL TIP TRANSPARENCY (distal free edge): Where nail separates from bed.
  - HEALTHY: Clear demarcation between pink bed and white-ish free edge
  - ANEMIC: No demarcation visible — entire nail appears uniformly pale

**CROSS-FEATURE SYNTHESIS:** After analyzing all zones, synthesize:
  - Count how many zones show pallor indicators
  - If ≥60% of zones show pallor → strong anemia signal
  - If 30-60% zones show pallor → mild/suspected anemia
  - If <30% zones show pallor → likely normal
  - Weight palmar creases (Zone 1 for skin) and palpebral conjunctiva (Zone 1 for under-eye) DOUBLE — these are the most clinically validated indicators

━━━ STAGE 3: HEMOGLOBIN ESTIMATION ━━━
Based on the MULTI-ZONE synthesis:
- Healthy (minimal pallor across zones) → Hgb likely > 12 g/dL → Normal
- Mild pallor (subtle changes in primary zones) → Hgb likely 10-12 g/dL → Mild
- Moderate pallor (clear changes in majority of zones) → Hgb likely 7-10 g/dL → Moderate
- Severe pallor (profound changes across ALL zones) → Hgb likely < 7 g/dL → Severe

━━━ OUTPUT ━━━
- imageDescription: A plain 10-15 word factual description of exactly what the uploaded image shows. Always describe the actual visible content (e.g. "The image shows an open palm of a hand under natural indoor lighting." or "The image shows a plate of spaghetti on a wooden table." or "The image shows a woman with face makeup and red lipstick."). Always fill this regardless of validity.
- isValid: boolean (false ONLY for wrong body part or completely unusable image)
- description: 1–2 sentence clinical observation referencing specific zones analyzed. If invalid: "[QUALITY_FAIL] <reason>"
- analysisResult: EXACTLY ONE of:
  * "ANEMIA POSITIVE (Significant Pallor Detected)" — Moderate or Severe pallor in primary zones
  * "ANEMIA SUSPECTED (Mild Pallor Detected)" — Mild pallor in primary zones, or inconsistent across zones
  * "ANEMIA NEGATIVE (Healthy Vascular Presentation)" — Normal vascularity across all zones
  * "INCONCLUSIVE (Ambiguous or Insufficient Data)" — truly unclear or conflicting zone data
- confidenceScore: Integer 0-100. Conservative. Factor in zone agreement — high agreement across zones → higher confidence (65-85). Low agreement → lower confidence (40-60). Typical range: 50-85.
- recommendations: Single actionable next step referencing the specific finding.

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
