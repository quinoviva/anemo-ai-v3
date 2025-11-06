'use server';

/**
 * @fileOverview This file defines a Genkit flow for conducting a diagnostic interview to assess anemia risk.
 *
 * The flow now generates a list of questions at once based on initial data,
 * which are then presented to the user as a form.
 *
 * @interface ConductDiagnosticInterviewInput - Input schema for the diagnostic interview flow.
 * @interface ConductDiagnosticInterviewOutput - Output schema for the diagnostic interview flow.
 * @function conductDiagnosticInterview - The main function to start the diagnostic interview flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConductDiagnosticInterviewInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  profileData: z.record(z.any()).optional().describe('User profile data including age, gender etc.'),
  imageAnalysisResult: z.string().optional().describe('The result of the image analysis.'),
});
export type ConductDiagnosticInterviewInput = z.infer<
  typeof ConductDiagnosticInterviewInputSchema
>;

const ConductDiagnosticInterviewOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of questions to ask the user to build a health profile.'),
});
export type ConductDiagnosticInterviewOutput = z.infer<
  typeof ConductDiagnosticInterviewOutputSchema
>;

export async function conductDiagnosticInterview(
  input: ConductDiagnosticInterviewInput
): Promise<ConductDiagnosticInterviewOutput> {
  return conductDiagnosticInterviewFlow(input);
}

const diagnosticInterviewPrompt = ai.definePrompt({
  name: 'diagnosticInterviewPrompt',
  input: {schema: ConductDiagnosticInterviewInputSchema},
  output: {schema: ConductDiagnosticInterviewOutputSchema},
  prompt: `You are an AI assistant designed to generate a concise diagnostic questionnaire for anemia risk.

  Your goal is to generate a short list of 3 to 5 key questions to help determine a user's risk of having anemia.
  Consider the provided profile data and image analysis results when formulating the questions.
  The questions should be targeted and clinical.

  - If the user is female, ALWAYS ask about their menstrual cycle (e.g., "Describe your typical menstrual flow: light, medium, heavy?").
  - Ask about common anemia symptoms like fatigue, dizziness, or shortness of breath.
  - Ask about diet (e.g., "Are you vegetarian or vegan?").

  Here is the user's profile data: {{{profileData}}}
  Here is the image analysis result: {{{imageAnalysisResult}}}

  Generate a list of questions and format your response as a JSON object with a "questions" field containing an array of strings.
  `,
});

const conductDiagnosticInterviewFlow = ai.defineFlow(
  {
    name: 'conductDiagnosticInterviewFlow',
    inputSchema: ConductDiagnosticInterviewInputSchema,
    outputSchema: ConductDiagnosticInterviewOutputSchema,
  },
  async input => {
    const {output} = await diagnosticInterviewPrompt(input);
    return output!;
  }
);
