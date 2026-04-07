
'use server';

/**
 * @fileOverview A flow for providing personalized health recommendations based on image analysis and user input.
 *
 * - providePersonalizedRecommendations - A function that generates personalized health advice.
 * - PersonalizedRecommendationsInput - The input type for the providePersonalizedRecommendations function.
 * - PersonalizedRecommendationsOutput - The return type for the providePersonalizedRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedRecommendationsInputSchema = z.object({
  imageAnalysis: z.string().describe('A summary of the analysis from the three uploaded images (skin, under-eye, fingernails).'),
  labReport: z.string().optional().describe('A summary of the extracted data from a CBC lab report.'),
  userProfile: z.string().describe('The user profile data, including age, gender, health history and crucially their location for finding nearby clinics.'),
});
export type PersonalizedRecommendationsInput = z.infer<
  typeof PersonalizedRecommendationsInputSchema
>;

const PersonalizedRecommendationsOutputSchema = z.object({
  recommendations: z.string().describe('Personalized health recommendations for the user, including advice on diet, home remedies, and lifestyle.'),
  riskScore: z.number().describe('Composite anemia risk score (0-100) based on the image analysis and lab report.'),
  anemiaType: z.string().describe('The likely type of anemia or "Negative" if not detected.'),
  confidenceScore: z.number().describe('A score from 0-100 representing the certainty of the assessment.'),
});
export type PersonalizedRecommendationsOutput = z.infer<
  typeof PersonalizedRecommendationsOutputSchema
>;

export async function providePersonalizedRecommendations(
  input: PersonalizedRecommendationsInput
): Promise<PersonalizedRecommendationsOutput> {
  return providePersonalizedRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedRecommendationsPrompt',
  input: {schema: PersonalizedRecommendationsInputSchema},
  output: {schema: PersonalizedRecommendationsOutputSchema},
  prompt: `You are an advanced AI hematology assistant specializing in iron-deficiency anemia screening for the Filipino population. You combine clinical intelligence with culturally-appropriate dietary science to produce PRECISE, ACTIONABLE assessments.

**Input Data:**
-   **Image Analysis Summary:** {{{imageAnalysis}}}
-   **Lab Report Summary (OCR Extracted):** {{{labReport}}}
-   **User Profile Information (includes clinical indicators):** {{{userProfile}}}

══════════════════════════════════════════════════════════════
TASK 1: ANEMIA TYPE IDENTIFICATION & CONFIDENCE SCORING
══════════════════════════════════════════════════════════════

Determine the type and confidence using this decision tree:

**Step 1 — Is lab data available?**
  - YES → Lab data is the PRIMARY determinant (images are supplementary)
  - NO → Visual analysis is the PRIMARY determinant (cap confidence at 75)

**Step 2 — Classify anemia type:**
  - Hgb low + MCV low (<80 fL) → "Iron Deficiency Anemia" (most common in Filipino females)
  - Hgb low + MCV normal (80-100 fL) → "Normocytic Anemia" (could be chronic disease, acute blood loss)
  - Hgb low + MCV high (>100 fL) → "Vitamin B12/Folate Deficiency Anemia" (megaloblastic)
  - Hgb normal + Visual pallor detected → "Borderline / Pre-Anemic State"
  - Hgb normal + Visual normal → "Negative"
  - No lab + Visual pallor → "Suspected Iron Deficiency Anemia" (most statistically likely in PH population)

**Step 3 — Confidence calibration:**
  - Lab confirms + Visual confirms + Symptoms match → 85-95%
  - Lab confirms + Visual unclear → 70-85%
  - No lab + Visual confirms + Symptoms match → 55-75%
  - No lab + Visual confirms + No symptoms → 40-60%
  - Contradictory data → 20-40%

══════════════════════════════════════════════════════════════
TASK 2: COMPOSITE RISK SCORE (0-100)
══════════════════════════════════════════════════════════════

Calculate using this weighted formula:

**Base Score from Visual Analysis (0-40 points):**
  - Severe pallor across all 3 body parts: 35-40 points
  - Moderate pallor: 25-34 points
  - Mild pallor: 10-24 points
  - No pallor: 0-9 points

**Lab Report Modifier (0-35 points):**
  - Hgb < 7 g/dL: +35 (severe)
  - Hgb 7-9.9: +25 (moderate)
  - Hgb 10-11.9: +15 (mild)
  - Hgb ≥ 12 or no lab: +0
  - LOW RBC count or LOW Hematocrit: additional +5

**Symptom Modifier (0-25 points):**
  - Severe fatigue: +10
  - Moderate fatigue: +5
  - High cardiovascular strain (shortness of breath, tachycardia): +8
  - Physical indicators (brittle nails, hair loss, pica): +5
  - Female + Heavy menstrual flow: +10
  - Female + Normal menstrual flow: +2

**Final score = Base + Lab + Symptoms (capped at 100)**

══════════════════════════════════════════════════════════════
TASK 3: PERSONALIZED RECOMMENDATIONS
══════════════════════════════════════════════════════════════

Generate a comprehensive, structured recommendation using these sections:

**A. Understanding Your Results** (2-3 sentences in simple language)
  - Explain what the Hgb level means
  - If lab values are provided, explain each abnormal value simply
  - Relate visual findings to clinical significance

**B. Iron-Rich Filipino Diet Plan** (specific to severity)
  - For MILD: Focus on dietary intervention
    * Breakfast: Malunggay omelette or champorado with tablea
    * Lunch: Sinigang na baboy with kangkong + squeeze of calamansi
    * Dinner: Dinuguan OR adobong atay + 1 cup steamed kangkong
    * Snacks: Boiled monggo, tokwa, tablespoon of peanut butter
  - For MODERATE: Dietary + supplementation
    * Same diet plan PLUS iron supplement instructions
    * Timing: Take iron 1 hour before meals OR 2 hours after on empty stomach
    * Pair with: 1 glass calamansi juice or ripe guava
  - For SEVERE: Emergency first, diet after stabilisation

**C. Iron Absorption Boosters & Blockers**
  - BOOSTERS: Vitamin C (calamansi, guava, ripe mango), meat factor (heme iron from red meat enhances non-heme absorption)
  - BLOCKERS: Coffee/tea (wait 1 hour after meals), calcium/milk (separate from iron by 2 hours), phytates (reduce with soaking/sprouting beans)

**D. Lifestyle Adjustments**
  - Rest guidance based on severity
  - Exercise modifications
  - Hydration recommendations

**E. When to See a Doctor** (severity-adapted)
  - MILD: Follow-up CBC in 4-6 weeks
  - MODERATE: See doctor within 1-2 weeks for iron studies panel
  - SEVERE: Go to hospital / ER immediately

**F. For Women's Health** (only if sex is Female)
  - Menstrual tracking advice
  - Additional iron needs during menstruation
  - When heavy flow warrants gynecological consultation

**CRITICAL INSTRUCTIONS:**
-   Your entire response MUST be a valid JSON object that conforms to the output schema.
-   Do NOT include any text, explanations, or markdown outside of the JSON structure.
-   The 'recommendations' field must be a single string containing formatted bullet points (using '*' or '-').
-   Respond ONLY with a valid JSON object matching the schema. Do not include markdown code fences, explanations, or extra text outside the JSON.
`,
});

const providePersonalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'providePersonalizedRecommendationsFlow',
    inputSchema: PersonalizedRecommendationsInputSchema,
    outputSchema: PersonalizedRecommendationsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input, { config: { temperature: 0.2 } });
      if (!output) throw new Error("Gemini output was null");
      return output;
    } catch (err: any) {
      console.warn("⚠️ [Silent Fallback] Gemini API Failed (Likely 429). Routing to Llama 3.2 Vision via Groq...", err.message);
      
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
          throw new Error("Gemini quota exceeded and GROQ_API_KEY is not defined in your environment variables for fallback!");
      }

      const fallbackPrompt = `You are an advanced AI hematology assistant specializing in iron-deficiency anemia screening for the Filipino population. You combine clinical intelligence with culturally-appropriate dietary science to produce PRECISE, ACTIONABLE assessments.

**Input Data:**
- Image Analysis Summary: ${input.imageAnalysis}
- Lab Report Summary: ${input.labReport || "N/A"}
- User Profile: ${input.userProfile}

Determine the Anemia type, confidence score, calculate a risk index (0-100), and provide personalized health recommendations following the rules for a Filipino diet plan (include meals like malunggay, champorado, etc.).

CRITICAL RULE: Revolve your response ONLY with valid JSON exactly matching this structure. Do not include markdown code fences or conversational text:
{
  "recommendations": "Provide formatting with simple points",
  "riskScore": 85,
  "anemiaType": "Iron Deficiency Anemia",
  "confidenceScore": 90
}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: fallbackPrompt }],
              temperature: 0.2,
              response_format: { type: "json_object" }
          })
      });

      if (!res.ok) {
          const errText = await res.text();
          console.error("Groq fallback error:", errText);
          throw new Error(`Both Gemini and Groq fallback failed. Groq error: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      
      return parsed as PersonalizedRecommendationsOutput;
    }
  }
);
