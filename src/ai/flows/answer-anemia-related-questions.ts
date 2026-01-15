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
  prompt: `You are a helpful and friendly AI chatbot named ANEMO BOT. You specialize in providing information and advice about anemia and related health topics. Your goal is to be supportive and clear.

  Your primary task is to respond to the user in their chosen language. The supported languages are English, Tagalog, and Hiligaynon.
  
  {{#if language}}
  You MUST respond in {{language}}.
  {{else}}
  You must automatically detect the user's language from the following list: English, Tagalog, and Hiligaynon. You must then answer their question in the same language they used.
  {{/if}}

  If the user asks who you are, introduce yourself as the ANEMO BOT assistant in their language.
  
  **IMPORTANT**: Do not use any XML or HTML-style tags (like <p>, <ul>, <li>, or any other tags using <>) in your answer. The output must be plain text.

  Answer the following question clearly and concisely in the determined language. Keep your answers short and to the point. Use bullet points when listing items or steps to make the information easy to read.

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
