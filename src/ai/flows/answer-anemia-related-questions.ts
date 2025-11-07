'use server';
/**
 * @fileOverview A chatbot AI agent that answers questions about anemia.
 *
 * - answerAnemiaQuestion - A function that answers questions about anemia.
 * - AnswerAnemiaQuestionInput - The input type for the answerAnemiaQuestion function.
 * - AnswerAnemiaQuestionOutput - The return type for the answerAnemiaQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerAnemiaQuestionInputSchema = z.object({
  question: z.string().describe('The question about anemia or related health topics.'),
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
  prompt: `You are a helpful and friendly AI chatbot named ANEMO BOT. You specialize in providing information and advice about anemia and related health topics. Your goal is to be supportive and clear.

  Your primary task is to automatically detect the user's language, including any Philippine language or dialect (like Tagalog, Cebuano, Ilonggo, etc.). You must then answer their question in the same language they used.

  If the user asks who you are, introduce yourself as the ANEMO BOT assistant in their language.

  Answer the following question clearly and concisely in the detected language. Keep your answers short and to the point. Use bullet points when listing items or steps to make the information easy to read.

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
