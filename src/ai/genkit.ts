import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import oai from '@genkit-ai/compat-oai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
    oai({
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: 'https://api.groq.com/openai/v1',
    }),
  ],
  model: gemini15Flash,
});

export const geminiActiveModel = gemini15Flash;

export const AI_MODELS = {
  groq: {
    vision: 'meta-llama/llama-4-scout-17b-16e-instruct',
    text: 'llama-3.3-70b-versatile',
  },
  gemini: 'gemini-2.0-flash',
};