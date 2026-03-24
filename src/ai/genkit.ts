import { gemini25FlashLite, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Configure a Genkit instance
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: gemini25FlashLite,
});

export { gemini25FlashLite as geminiActiveModel };