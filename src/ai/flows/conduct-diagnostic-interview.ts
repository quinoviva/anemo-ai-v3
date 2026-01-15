'use server';

/**
 * @fileOverview This file defines a Genkit flow for conducting a diagnostic interview to assess anemia risk.
 *
 * The flow now returns a static list of questions to be presented to the user as a form.
 *
 * @interface ConductDiagnosticInterviewInput - Input schema for the diagnostic interview flow.
 * @interface ConductDiagnosticInterviewOutput - Output schema for the diagnostic interview flow.
 * @function conductDiagnosticInterview - The main function to start the diagnostic interview flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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

const staticQuestions = [
    "Have you been feeling unusually tired or weak lately?",
    "Do you experience shortness of breath, even with light activity?",
    "Have you noticed dizziness or lightheadedness?",
    "Do you often have headaches?",
    "Have you experienced chest pain or rapid heartbeat?",
    "Do you feel cold more often than usual, especially in your hands or feet?",
    "Have you noticed pale or yellowish skin?",
    "Do you have brittle nails or hair loss?",
    "Have you experienced difficulty concentrating or thinking clearly?",
];


const conductDiagnosticInterviewFlow = ai.defineFlow(
  {
    name: 'conductDiagnosticInterviewFlow',
    inputSchema: ConductDiagnosticInterviewInputSchema,
    outputSchema: ConductDiagnosticInterviewOutputSchema,
  },
  async (input) => {
    // This flow now returns a static list of questions.
    // The AI prompt has been removed to ensure consistency.
    return {
      questions: staticQuestions,
    };
  }
);
