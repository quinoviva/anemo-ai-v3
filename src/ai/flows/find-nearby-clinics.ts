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
    // Iloilo City
    { name: 'Iloilo Doctors’ Hospital', type: 'Hospital', address: 'West Timawa Avenue, Molo, Iloilo City' },
    { name: 'The Medical City Iloilo', type: 'Hospital', address: 'Lopez Jaena St, Molo, Iloilo City' },
    { name: 'QualiMed Hospital Iloilo', type: 'Hospital', address: 'Donato Pison Ave, Mandurriao, Iloilo City' },
    { name: 'Iloilo Mission Hospital', type: 'Hospital', address: 'Mission Rd, Jaro, Iloilo City' },
    { name: 'St. Paul\'s Hospital Iloilo', type: 'Hospital', address: 'General Luna St, Iloilo City Proper' },
    { name: 'Western Visayas Medical Center', type: 'Hospital', address: 'Q. Abeto St, Mandurriao, Iloilo City' },
    { name: 'West Visayas State University Medical Center', type: 'Hospital', address: 'E. Lopez St, Jaro, Iloilo City' },
    { name: 'Medicus Medical Center', type: 'Hospital', address: 'Mandurriao, Iloilo City' },
    { name: 'Dr. Zaxius Berina, MD (Internal Medicine)', type: 'Doctor', address: 'Medicus Medical Center, Mandurriao, Iloilo City' },
    { name: 'AnemoCare Clinic', type: 'Clinic', address: 'Jaro, Iloilo City' },
    { name: 'MedicPro Medical Clinic', type: 'Clinic', address: 'La Paz, Iloilo City' },
    { name: 'Healthlink E-Clinic', type: 'Clinic', address: 'Mandurriao, Iloilo City' },
    
    // Iloilo Province
    { name: 'Don Jose S. Monfort Medical Center Extension Hospital', type: 'Hospital', address: 'Barotac Nuevo, Iloilo' },
    { name: 'Aleosan District Hospital', type: 'Hospital', address: 'Alimodian, Iloilo' },
    { name: 'Barotac Viejo District Hospital', type: 'Hospital', address: 'Barotac Viejo, Iloilo' },
    { name: 'Dumangas District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo' },
    { name: 'Guimbal District Hospital', type: 'Hospital', address: 'Guimbal, Iloilo' },
    { name: 'Jesus M. Colmenares Memorial District Hospital', type: 'Hospital', address: 'Balasan, Iloilo' },
    { name: 'Lambunao District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo' },
    { name: 'Passi City District Hospital', type: 'Hospital', address: 'Passi City, Iloilo' },
    { name: 'Pototan District Hospital', type: 'Hospital', address: 'Pototan, Iloilo' },
    { name: 'Ramon D. Duremdes District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo' },
    { name: 'Ramon Tabiana Memorial District Hospital', type: 'Hospital', address: 'Cabatuan, Iloilo' },
    { name: 'San Joaquin Mother and Child Hospital', type: 'Hospital', address: 'San Joaquin, Iloilo' },
    { name: 'Sara District Hospital', type: 'Hospital', address: 'Sara, Iloilo' },
    { name: 'Federico Roman Tirador Sr. Memorial District Hospital', type: 'Hospital', address: 'Janiuay, Iloilo' },
    { name: 'Dr. Ricardo S. Provido Sr. Memorial District Hospital', type: 'Hospital', address: 'Calinog, Iloilo' },
    { name: 'Dr. Ricardo Y. Ladrido Memorial District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo' },
    { name: 'Iloilo Provincial Hospital', type: 'Hospital', address: 'Pototan, Iloilo' },
  ];

const prompt = ai.definePrompt({
  name: 'findNearbyClinicsPrompt',
  input: {schema: FindNearbyClinicsInputSchema},
  output: {schema: FindNearbyClinicsOutputSchema},
  prompt: `You are an expert local guide for Iloilo City and Province, Philippines. Your goal is to help users find the nearest and most relevant medical facilities (hospitals, clinics, doctors) based on their search query.

You have access to the following list of known healthcare providers:
${JSON.stringify(allClinics, null, 2)}

Analyze the user's query: "{{query}}"

Based on the query, return a list of the most relevant results from the provided list. Consider location names, districts, and landmarks mentioned in the query to determine relevance. If the query is vague, return a general list of providers in Iloilo City. If no relevant results are found, return an empty list.
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
