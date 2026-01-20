'use server';
/**
 * @fileOverview A chatbot AI agent that answers questions about anemia.
 *
 * - answerAnemiaQuestion - A function that answers questions about anemia.
 * - AnswerAnemiaQuestionInput - The input type for the answerAnemiaQuestion function.
 * - AnswerAnemiaQuestionOutput - The return type for the answerAnemiaQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AnswerAnemiaQuestionInputSchema = z.object({
  question: z.string().describe('The question about anemia or related health topics.'),
  language: z.enum(['english', 'tagalog', 'hiligaynon']).optional().describe('The language to respond in. If not provided, it will be auto-detected.'),
});
export type AnswerAnemiaQuestionInput = z.infer<typeof AnswerAnemiaQuestionInputSchema>;

const AnswerAnemiaQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about anemia.'),
});
export type AnswerAnemiaQuestionOutput = z.infer<typeof AnswerAnemiaQuestionOutputSchema>;

export async function answerAnemiaQuestion(input: AnswerAnemiaQuestionInput): Promise<AnswerAnemiaQuestionOutput> {
  return answerAnemiaQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerAnemiaQuestionPrompt',
  input: {schema: AnswerAnemiaQuestionInputSchema},
  output: {schema: AnswerAnemiaQuestionOutputSchema},
  prompt: `You are a helpful, empathetic, and knowledgeable AI health assistant named ANEMO BOT. You specialize in anemia awareness, detection, and management. Your goal is to provide clear, accurate, and supportive information.

  **Context:** The user is interacting with you via a chat interface. They might be concerned about their health or the health of a loved one.

  **Language Instructions:**
  {{#if language}}
  You MUST respond in {{language}}.
  {{else}}
  Detect the language of the user's input (English, Tagalog, or Hiligaynon) and respond in the SAME language.
  {{/if}}

  **Response Guidelines:**
  1.  **Be Empathetic:** Use a supportive and kind tone.
  2.  **Be Concise:** Keep answers short and easy to read. Avoid long walls of text.
  3.  **Use Formatting:**
      *   Use **bold** for key terms or important warnings.
      *   Use bullet points ( - ) for lists of symptoms, foods, or steps.
  4.  **Disclaimer:** If the user asks for a medical diagnosis or treatment plan, kindly remind them that you are an AI and they should consult a healthcare professional for specific medical advice.
  5.  **I Don't Know:** If you don't know the answer, admit it and suggest they speak to a doctor.

  **Persona:**
  If asked, introduce yourself as ANEMO BOT, your friendly anemia information assistant.

  Question: {{{question}}}
`,
});

const answerAnemiaQuestionFlow = ai.defineFlow(
  {
    name: 'answerAnemiaQuestionFlow',
    inputSchema: AnswerAnemiaQuestionInputSchema,
    outputSchema: AnswerAnemiaQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
