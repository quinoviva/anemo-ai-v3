'use server';
/**
 * @fileOverview An AI flow to find nearby clinics and hospitals using verified local data.
 *
 * - findNearbyClinics - A function that returns a list of healthcare providers based on a search query.
 * - FindNearbyClinicsInput - The input type for the findNearbyClinics function.
 * - FindNearbyClinicsOutput - The return type for the findNearbyClinics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as admin from 'firebase-admin';

const ClinicSchema = z.object({
  name: z.string().describe('The name of the hospital, clinic, or doctor.'),
  address: z.string().describe('The address of the location.'),
  type: z.enum(['Hospital', 'Doctor', 'Clinic']).describe('The type of healthcare provider.'),
  contact: z.string().optional().describe('Contact number of the provider.'),
  hours: z.string().optional().describe('Operating hours.'),
  website: z.string().optional().describe('The official website.'),
  notes: z.string().optional().describe('Additional notes or specialties.'),
});

const FindNearbyClinicsInputSchema = z.object({
  query: z.string().describe("The user's search query for a location or address, e.g., 'hospitals in Iloilo City' or 'clinics near Molo'"),
});
export type FindNearbyClinicsInput = z.infer<typeof FindNearbyClinicsInputSchema>;

const FindNearbyClinicsOutputSchema = z.object({
  results: z.array(ClinicSchema).describe('A list of relevant clinics, hospitals, or doctors found in the database.'),
});
export type FindNearbyClinicsOutput = z.infer<typeof FindNearbyClinicsOutputSchema>;

// Initialize Firebase Admin for server-side access
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'studio-5574929814-ea244'
  });
}

const db = admin.firestore();

/**
 * Tool to retrieve healthcare providers from Firestore.
 */
const getHealthcareProvidersFromDb = ai.defineTool(
  {
    name: 'getHealthcareProvidersFromDb',
    description: 'Retrieves the list of hospitals and clinics from the Firestore database.',
    inputSchema: z.object({}),
    outputSchema: z.array(ClinicSchema),
  },
  async () => {
    const snapshot = await db.collection('healthcareProviders').get();
    return snapshot.docs.map(doc => doc.data() as z.infer<typeof ClinicSchema>);
  }
);


export async function findNearbyClinics(
  input: FindNearbyClinicsInput
): Promise<FindNearbyClinicsOutput> {
  return findNearbyClinicsFlow(input);
}


const findNearbyClinicsFlow = ai.defineFlow(
  {
    name: 'findNearbyClinicsFlow',
    inputSchema: FindNearbyClinicsInputSchema,
    outputSchema: FindNearbyClinicsOutputSchema,
  },
  async (input) => {
    try {
        const llmResponse = await ai.generate({
        prompt: `You are an intelligent healthcare assistant for Iloilo, Philippines.
        
        Your task:
        1. Access the verified list of healthcare providers using the 'getHealthcareProvidersFromDb' tool.
        2. Filter this list based on the user's query: "${input.query}".
        3. Return the most relevant results from the database.
        
        Guidelines:
        - If the user searches for a specific municipality (e.g., "Pototan", "Passi", "Molo"), return all facilities matching that location.
        - If the user searches for a type (e.g., "Hospital", "Diagnostic Center"), filter accordingly.
        - If the query implies a need (e.g., "blood test", "CBC"), look for facilities with "laboratory" or "diagnostic" in their notes.
        - Prioritize clarity and accuracy.
        `,
        model: 'googleai/gemini-flash-latest',
        tools: [getHealthcareProvidersFromDb],
        output: {
            schema: FindNearbyClinicsOutputSchema,
        },
        });
        
        const output = llmResponse.output;
        if(output) {
          return {
            results: output.results,
          };
        }
    } catch (error) {
        console.error('Flow failed:', error);
        // Fallback to basic filtering if AI fails
        const snapshot = await db.collection('healthcareProviders').get();
        const all = snapshot.docs.map(doc => doc.data() as z.infer<typeof ClinicSchema>);
        const filtered = all.filter(p => 
            p.name.toLowerCase().includes(input.query.toLowerCase()) || 
            p.address.toLowerCase().includes(input.query.toLowerCase())
        );
        return { results: filtered };
    }

    return { results: [] };
  }
);
