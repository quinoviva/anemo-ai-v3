import { config } from 'dotenv';
config();

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

import '@/ai/flows/generate-image-description.ts';
import '@/ai/flows/conduct-diagnostic-interview.ts';
import '@/ai/flows/provide-personalized-recommendations.ts';
import '@/ai/flows/answer-anemia-related-questions.ts';
import '@/ai/flows/find-nearby-clinics.ts';
import '@/ai/flows/analyze-cbc-report.ts';
import '@/ai/flows/validate-multimodal-results.ts';

genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});
