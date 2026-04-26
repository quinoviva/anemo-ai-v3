import { gemini25FlashLite, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import oai from '@genkit-ai/compat-oai';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
    oai({
      name: 'groq',
      apiKey: GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
  ],
  model: gemini25FlashLite,
});

export { gemini25FlashLite as geminiActiveModel };
export const groqFallbackModels = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
];