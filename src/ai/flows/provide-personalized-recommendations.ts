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
  imageAnalysis: z.string().describe('The analysis of the image uploaded by the user.'),
  interviewResponses: z.string().describe('The user\'s answers to the diagnostic questionnaire, formatted as a string of Q&A pairs.'),
  userProfile: z.string().describe('The user profile data, including age, gender, and health history.'),
  menstrualDetails: z
    .string()
    .optional()
    .describe('Details about the user menstrual cycle, only if the user is female.'),
});
export type PersonalizedRecommendationsInput = z.infer<
  typeof PersonalizedRecommendationsInputSchema
>;

const PersonalizedRecommendationsOutputSchema = z.object({
  recommendations: z.string().describe('Personalized health recommendations for the user.'),
  riskScore: z.number().describe('Composite anemia risk score based on all inputs.'),
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
  prompt: `You are an AI health assistant that provides personalized health recommendations to users based on their image analysis, interview responses, user profile, and menstrual details (if applicable).

  Analyze the following information to generate tailored health recommendations. Also provide an overall anemia risk score (0-100), where a higher score indicates a higher risk.

  Image Analysis: {{{imageAnalysis}}}
  Questionnaire Answers: {{{interviewResponses}}}
  User Profile: {{{userProfile}}}
  Menstrual Details (if applicable): {{{menstrualDetails}}}

  Provide clear, concise, and actionable advice. The recommendations should be formatted as a bulleted or numbered list. Include lifestyle, dietary, and when to consult a doctor. For female users, give more tailored insights based on menstrual-related data.

  Output the risk score and recommendations in a JSON format.
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
