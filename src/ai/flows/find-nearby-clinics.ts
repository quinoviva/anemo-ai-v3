'use server';
/**
 * @fileOverview An AI flow to find nearby clinics and hospitals.
 *
 * - findNearbyClinics - A function that returns a list of healthcare providers based on a search query.
 * - FindNearbyClinicsInput - The input type for the findNearbyClinics function.
 * - FindNearbyClinicsOutput - The return type for the findNearbyClinics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClinicSchema = z.object({
  name: z.string().describe('The name of the hospital, clinic, or doctor.'),
  address: z.string().describe('The address of the location.'),
  type: z.enum(['Hospital', 'Doctor', 'Clinic']).describe('The type of healthcare provider.'),
});

const FindNearbyClinicsInputSchema = z.object({
  query: z.string().describe('The user\'s search query for a location or address.'),
});
export type FindNearbyClinicsInput = z.infer<typeof FindNearbyClinicsInputSchema>;

const FindNearbyClinicsOutputSchema = z.object({
  results: z.array(ClinicSchema).describe('A list of relevant clinics, hospitals, or doctors.'),
});
export type FindNearbyClinicsOutput = z.infer<typeof FindNearbyClinicsOutputSchema>;

export async function findNearbyClinics(
  input: FindNearbyClinicsInput
): Promise<FindNearbyClinicsOutput> {
  return findNearbyClinicsFlow(input);
}

const allClinics = [
    {
      name: 'Iloilo Doctors’ Hospital',
      type: 'Hospital',
      address: 'West Timawa Avenue, Molo, Iloilo City',
    },
    {
      name: 'The Medical City Iloilo',
      type: 'Hospital',
      address: 'Lopez Jaena St, Molo, Iloilo City',
    },
    {
      name: 'Dr. Zaxius Berina, MD (Internal Medicine)',
      type: 'Doctor',
      address: 'Medicus Medical Center, Mandurriao, Iloilo City',
    },
    {
      name: 'AnemoCare Clinic',
      type: 'Clinic',
      address: 'Jaro, Iloilo City',
    },
    {
      name: 'QualiMed Hospital Iloilo',
      type: 'Hospital',
      address: 'Donato Pison Ave, Mandurriao, Iloilo City',
    },
    {
      name: 'Iloilo Mission Hospital',
      type: 'Hospital',
      address: 'Mission Rd, Jaro, Iloilo City',
    },
  ];

const prompt = ai.definePrompt({
  name: 'findNearbyClinicsPrompt',
  input: {schema: FindNearbyClinicsInputSchema},
  output: {schema: FindNearbyClinicsOutputSchema},
  prompt: `You are an expert local guide for Iloilo City, Philippines. Your goal is to help users find the nearest and most relevant medical facilities (hospitals, clinics, doctors) based on their search query.

You have access to the following list of known healthcare providers:
${JSON.stringify(allClinics, null, 2)}

Analyze the user's query: "{{query}}"

Based on the query, return a list of the most relevant results from the provided list. Consider location names, districts, and landmarks mentioned in the query to determine relevance. If the query is vague, return a general list. If no relevant results are found, return an empty list.
`,
});

const findNearbyClinicsFlow = ai.defineFlow(
  {
    name: 'findNearbyClinicsFlow',
    inputSchema: FindNearbyClinicsInputSchema,
    outputSchema: FindNearbyClinicsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
