'use server';
/**
 * @fileOverview An AI flow to find nearby clinics and hospitals using a dynamic search tool.
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
  results: z.array(ClinicSchema).describe('A list of relevant clinics, hospitals, or doctors found via search.'),
});
export type FindNearbyClinicsOutput = z.infer<typeof FindNearbyClinicsOutputSchema>;

// This is a mock tool. In a real application, this would use a real search API.
// For this context, we will simulate the search by providing a few results
// to demonstrate the tool-use functionality.
const searchForHealthcareProviders = ai.defineTool(
  {
    name: 'searchForHealthcareProviders',
    description: 'Searches for real-world healthcare providers (hospitals, clinics, doctors) based on a location query. Provides up-to-date details.',
    inputSchema: FindNearbyClinicsInputSchema,
    outputSchema: FindNearbyClinicsOutputSchema,
  },
  async ({query}) => {
    // In a real implementation, this would call a Google Maps/Places API
    // or a similar service. For now, we return a small, static list to
    // simulate a successful API call.
    console.log(`Simulating search for: ${query}`);
    const simulatedResults = [
        // Iloilo City - Private Hospitals
        { name: 'Iloilo Doctors’ Hospital', type: 'Hospital', address: 'West Timawa Avenue, Molo, Iloilo City', contact: '(033) 337-8621', hours: '24/7', website: 'https://www.iloilodoctorshospital.com.ph/', notes: 'Private, Tertiary' },
        { name: 'The Medical City Iloilo', type: 'Hospital', address: 'Lopez Jaena St, Molo, Iloilo City', contact: '(033) 500-1000', hours: '24/7', website: 'https://themedicalcity.com/iloilo', notes: 'Private, Tertiary' },
        { name: 'QualiMed Hospital Iloilo', type: 'Hospital', address: 'Donato Pison Ave, Mandurriao, Iloilo City', contact: '(033) 500-9254', hours: '24/7', website: 'https://qualimed.com.ph/iloilo/', notes: 'Private, Level 2' },
        { name: 'St. Paul’s Hospital Iloilo', type: 'Hospital', address: 'Gen. Luna St., Iloilo City Proper, Iloilo City', contact: '(033) 337-2741', hours: '24/7', website: 'https://sphiloilo.com/', notes: 'Private, Tertiary' },
        { name: 'Iloilo Mission Hospital', type: 'Hospital', address: 'Lopez Jaena St., La Paz, Iloilo City', contact: '(033) 337-7702', hours: '24/7', website: 'https://imh.cpu.edu.ph/', notes: 'Private, Tertiary' },
        { name: 'Medicus Medical Center', type: 'Hospital', address: 'Pison Ave., Mandurriao, Iloilo City', contact: '(033) 321-7888', hours: '24/7', website: 'N/A', notes: 'Private, Level 2' },
        { name: 'Metro Iloilo Hospital and Medical Center', type: 'Hospital', address: 'Metropolis Avenue, Jaro, Iloilo City', contact: '(033) 327-1111', hours: '24/7', website: 'https://metroiloilohospital.com/', notes: 'Private, Level 2' },

        // Iloilo City - Government Hospitals
        { name: 'Western Visayas Medical Center', type: 'Hospital', address: 'Q. Abeto St, Mandurriao, Iloilo City', contact: '(033) 321-2841', hours: '24/7', website: 'https://wvmc.doh.gov.ph/', notes: 'Government, Tertiary' },
        { name: 'West Visayas State University Medical Center', type: 'Hospital', address: 'E. Lopez St., Jaro, Iloilo City', contact: '(033) 320-2431', hours: '24/7', website: 'https://wvsu.edu.ph/medical-center/', notes: 'Government, Tertiary' },

        // Iloilo Province - District Hospitals (Government)
        { name: 'Aleosan District Hospital', type: 'Hospital', address: 'Alimodian, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Barotac Viejo District Hospital', type: 'Hospital', address: 'Barotac Viejo, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Dr. Ricardo S. Provido Memorial District Hospital', type: 'Hospital', address: 'Calinog, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Don Jose S. Monfort Medical Center Extension Hospital', type: 'Hospital', address: 'Barotac Nuevo, Iloilo', contact: '(033) 361-2651', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Federico Roman Tirador, Sr. Memorial District Hospital', type: 'Hospital', address: 'Janiuay, Iloilo', contact: '(033) 531-8077', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Guimbal District Hospital', type: 'Hospital', address: 'Guimbal, Iloilo', contact: '(033) 315-5158', hours: '24/7', notes: 'Government, Level 1. Also known as Rep. Pedro G. Trono Memorial District Hospital.' },
        { name: 'Jesus M. Colmenares Memorial District Hospital', type: 'Hospital', address: 'Balasan, Iloilo', contact: '(033) 397-0402', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Lambunao District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo', contact: '(033) 533-7053', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Passi City District Hospital', type: 'Hospital', address: 'Passi City, Iloilo', contact: '(033) 536-8029', hours: '24/7', notes: 'Government, Level 1. Serves Passi City and nearby towns.' },
        { name: 'Pototan District Hospital', type: 'Hospital', address: 'Pototan, Iloilo', contact: '(033) 529-8131', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Ramon D. Duremdes District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo', contact: '(033) 361-2022', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'Ramon Tabiana Memorial District Hospital', type: 'Hospital', address: 'Cabatuan, Iloilo', contact: '(033) 522-8228', hours: '24/7', notes: 'Government, Level 1' },
        { name: 'San Joaquin Mother and Child Hospital', type: 'Hospital', address: 'San Joaquin, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government, Level 1. Specializes in maternal and child health.' },
        { name: 'Sara District Hospital', type: 'Hospital', address: 'Sara, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government, Level 1' },

        // Iloilo Province - Private Hospitals & Clinics
        { name: 'AMR Doctor\'s Hospital', type: 'Hospital', address: 'Miagao, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'Mediprime Medical Clinic and Diagnostic Center', type: 'Clinic', address: 'Barotac Nuevo, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'Salubris Medical Center', type: 'Hospital', address: 'Miagao, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'St. Elizabeth Medical and Diagnostic Center', type: 'Clinic', address: 'Dingle, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'The Medical City Clinic', type: 'Clinic', address: 'Pavia, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'Tiu Clinic And Hospital', type: 'Hospital', address: 'Tigbauan, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'Well-family-Midwife-Clinic', type: 'Clinic', address: 'Estancia, Iloilo', contact: 'N/A', hours: 'N/A', notes: 'Private' },
        { name: 'Leganes Medical Clinic', type: 'Clinic', address: 'Leganes, Iloilo', contact: 'N_A', hours: 'N_A', notes: 'Private' },

    ];
    
    // The tool now returns the full list, and the AI will filter it.
    return { results: simulatedResults };
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
    const llmResponse = await ai.generate({
      prompt: `You are an expert local guide for Iloilo City and Province, Philippines. Your goal is to help users find the nearest and most relevant medical facilities.

      1. Call the 'searchForHealthcareProviders' tool to get a comprehensive list of all available healthcare providers.
      2. Analyze the user's query: "${input.query}"
      3. From the full list provided by the tool, select and return ONLY the results that are most relevant to the user's query. Match by name, address, or type. For example, if the user asks for "hospitals in Molo", you should return hospitals whose address contains "Molo". If the query is empty or very generic like "Iloilo", return all results.
      `,
      model: 'googleai/gemini-2.5-flash',
      tools: [searchForHealthcareProviders],
      output: {
        schema: FindNearbyClinicsOutputSchema,
      },
    });
    
    // The model should decide whether to call the tool or return a direct answer based on the prompt.
    if(llmResponse.output) {
      return llmResponse.output;
    }

    // Fallback for when no direct output is given.
    return { results: [] };
  }
);

    
