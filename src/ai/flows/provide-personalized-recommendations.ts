
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
  userProfile: z.string().describe('The user profile data, including age, gender, health history and crucially their location for finding nearby clinics.'),
});
export type PersonalizedRecommendationsInput = z.infer<
  typeof PersonalizedRecommendationsInputSchema
>;

const PersonalizedRecommendationsOutputSchema = z.object({
  recommendations: z.string().describe('Personalized health recommendations for the user, including advice on diet, home remedies, and lifestyle.'),
  riskScore: z.number().describe('Composite anemia risk score (0-100) based on the image analysis.'),
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
  prompt: `You are an AI health assistant specializing in anemia. Your task is to provide a risk assessment and personalized health recommendations based on image analysis results and user profile information.

**Input Data:**
-   **Image Analysis Summary:** {{{imageAnalysis}}}
-   **User Profile Information (includes clinical indicators):** {{{userProfile}}}

**Your Tasks:**

1.  **Calculate a Risk Score:**
    -   Analyze the combined results from the image analysis AND the clinical indicators (fatigue, cardiovascular strain, physical indicators).
    -   Assign a composite anemia risk score from 0 to 100.
        -   A score of **0-40** suggests **Low Risk**.
        -   A score of **41-70** suggests **Moderate Risk**.
        -   A score of **71-100** suggests **High Risk**.
    -   Base the score on the severity and number of anemia signs detected visually (e.g., pallor, pale conjunctiva) and reported clinically.
    -   Increase the score if the user reports 'Moderate' or 'Severe' fatigue, or 'High' cardiovascular strain.
    -   If the user's sex is 'Female' and their menstrual flow is 'Heavy', increase the risk score by 10 points.

2.  **Generate Personalized Recommendations:**
    -   Create a bulleted list of clear, actionable recommendations.
    -   **Clinical Context:** Address reported symptoms like fatigue or shortness of breath.
    -   **Dietary Advice:** Suggest specific, iron-rich foods commonly available in the Philippines (e.g., malunggay, kangkong, lean meats, beans). Mention Vitamin C sources to aid iron absorption.
    -   **Lifestyle and Home Remedies:** Provide simple lifestyle adjustments (e.g., rest, hydration) and safe home remedies.
    -   **When to See a Doctor:** Clearly state at what point a user should consult a healthcare professional. For moderate or high-risk scores, strongly advise a consultation.
    -   **For Women's Health:** If the user's sex is 'Female', add a section with recommendations related to menstrual health, especially if their flow is 'Heavy'. For example, suggest tracking their cycle, discussing heavy flow with a doctor, and ensuring adequate iron intake during their period.

**CRITICAL INSTRUCTIONS:**
-   Your entire response MUST be a valid JSON object that conforms to the output schema.
-   Do NOT include any text, explanations, or markdown outside of the JSON structure.
-   The 'recommendations' field must be a single string containing formatted bullet points (using '*' or '-').
`,
});

const providePersonalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'providePersonalizedRecommendationsFlow',
    inputSchema: PersonalizedRecommendationsInputSchema,
    outputSchema: PersonalizedRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
