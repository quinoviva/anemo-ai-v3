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
    const simulatedResults: z.infer<typeof ClinicSchema>[] = [
        // Iloilo City - Private Hospitals
        { name: 'Iloilo Doctors’ Hospital', type: 'Hospital', address: 'West Timawa Avenue, Molo, Iloilo City', contact: '(033) 337-8621', hours: '24/7', website: 'https://www.iloilodoctorshospital.com.ph/', notes: 'Private, Tertiary. Offers comprehensive laboratory services.' },
        { name: 'The Medical City Iloilo', type: 'Hospital', address: 'Lopez Jaena St, Molo, Iloilo City', contact: '(033) 500-1000', hours: '24/7', website: 'https://themedicalcity.com/iloilo', notes: 'Private, Tertiary. Comprehensive laboratory and diagnostic imaging.' },
        { name: 'QualiMed Hospital Iloilo', type: 'Hospital', address: 'Donato Pison Ave, Mandurriao, Iloilo City', contact: '(033) 500-9254', hours: '24/7', website: 'https://qualimed.com.ph/iloilo/', notes: 'Private, Level 2. Full-service laboratory.' },
        { name: 'St. Paul’s Hospital Iloilo', type: 'Hospital', address: 'Gen. Luna St., Iloilo City Proper, Iloilo City', contact: '(033) 337-2741', hours: '24/7', website: 'https://sphiloilo.com/', notes: 'Private, Tertiary. Offers extensive laboratory and pathology services.' },
        { name: 'Iloilo Mission Hospital', type: 'Hospital', address: 'Lopez Jaena St., La Paz, Iloilo City', contact: '(033) 337-7702', hours: '24/7', website: 'https://imh.cpu.edu.ph/', notes: 'Private, Tertiary. Known for its laboratory and medical education.' },
        { name: 'Medicus Medical Center', type: 'Hospital', address: 'Pison Ave., Mandurriao, Iloilo City', contact: '(033) 321-7888', hours: '24/7', website: 'N/A', notes: 'Private, Level 2. Started as a diagnostic center, strong in laboratory services.' },
        { name: 'Metro Iloilo Hospital and Medical Center', type: 'Hospital', address: 'Metropolis Avenue, Jaro, Iloilo City', contact: '(033) 327-1111', hours: '24/7', website: 'https://metroiloilohospital.com/', notes: 'Private, Level 2. Equipped with modern laboratory facilities.' },

        // Iloilo City - Government Hospitals
        { name: 'Western Visayas Medical Center', type: 'Hospital', address: 'Q. Abeto St, Mandurriao, Iloilo City', contact: '(033) 321-2841', hours: '24/7', website: 'https://wvmc.doh.gov.ph/', notes: 'Government, Tertiary. Major regional hospital with a full laboratory.' },
        { name: 'West Visayas State University Medical Center', type: 'Hospital', address: 'E. Lopez St., Jaro, Iloilo City', contact: '(033) 320-2431', hours: '24/7', website: 'https://wvsu.edu.ph/medical-center/', notes: 'Government, Tertiary. State university hospital with complete laboratory services.' },

        // Iloilo City - Major Diagnostic Clinics
        { name: 'Medicus Diagnostic Center - Main', type: 'Clinic', address: 'Gen. Luna St., Iloilo City Proper, Iloilo City', contact: '(033) 335-0911', hours: 'Mon-Sat, 7am-5pm', website: 'N/A', notes: 'One of the largest and most established diagnostic centers in Iloilo.' },
        { name: 'Healthlink Laboratory and Diagnostic Center', type: 'Clinic', address: 'Infante Ave, Molo, Iloilo City', contact: '(033) 337-8848', hours: 'Mon-Sat, 7am-4pm', website: 'N/A', notes: 'Comprehensive laboratory tests, including blood work.' },
        { name: 'The Medical City Clinic - Atria', type: 'Clinic', address: 'Atria Park District, Mandurriao, Iloilo City', contact: 'N/A', hours: 'Mall Hours', website: 'N/A', notes: 'Outpatient clinic with laboratory and imaging services.' },
        { name: 'Hi-Precision Diagnostics Iloilo', type: 'Clinic', address: 'Benigno Aquino Ave, Mandurriao, Iloilo City', contact: '(033) 321-7554', hours: 'Mon-Sat, 6am-5pm', website: 'https://www.hi-precision.com.ph/', notes: 'Nationally recognized diagnostic center with a branch in Iloilo.' },
        { name: 'St. Elizabeth Medical and Diagnostic Center', type: 'Clinic', address: 'Jaro, Iloilo City', contact: 'N/A', hours: 'N/A', website: 'N/A', notes: 'Provides various laboratory and diagnostic procedures.' },

        // Iloilo Province - District Hospitals (Government)
        { name: 'Aleosan District Hospital', type: 'Hospital', address: 'Alimodian, Iloilo', contact: 'N/A', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Basic laboratory services.' },
        { name: 'Barotac Viejo District Hospital', type: 'Hospital', address: 'Barotac Viejo, Iloilo', contact: 'N/A', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Basic laboratory services.' },
        { name: 'Dr. Ricardo S. Provido Memorial District Hospital', type: 'Hospital', address: 'Calinog, Iloilo', contact: 'N/A', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Serves Calinog and surrounding areas.' },
        { name: 'Don Jose S. Monfort Medical Center Extension Hospital', type: 'Hospital', address: 'Barotac Nuevo, Iloilo', contact: '(033) 361-2651', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Equipped for primary laboratory tests.' },
        { name: 'Federico Roman Tirador, Sr. Memorial District Hospital', type: 'Hospital', address: 'Janiuay, Iloilo', contact: '(033) 531-8077', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Provides essential laboratory diagnostics.' },
        { name: 'Rep. Pedro G. Trono Memorial District Hospital', type: 'Hospital', address: 'Guimbal, Iloilo', contact: '(033) 315-5158', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Serves southern Iloilo.' },
        { name: 'Jesus M. Colmenares Memorial District Hospital', type: 'Hospital', address: 'Balasan, Iloilo', contact: '(033) 397-0402', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Serves northern Iloilo.' },
        { name: 'Lambunao District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo', contact: '(033) 533-7053', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Key hospital for central Iloilo.' },
        { name: 'Iloilo Provincial Hospital', type: 'Hospital', address: 'Pototan, Iloilo', contact: '(033) 529-8131', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Formerly Pototan District Hospital.' },
        { name: 'Ramon D. Duremdes District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo', contact: '(033) 361-2022', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
        { name: 'Ramon Tabiana Memorial District Hospital', type: 'Hospital', address: 'Cabatuan, Iloilo', contact: '(033) 522-8228', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
        { name: 'San Joaquin Mother and Child Hospital', type: 'Hospital', address: 'San Joaquin, Iloilo', contact: 'N/A', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Specializes in maternal and child health.' },
        { name: 'Sara District Hospital', type: 'Hospital', address: 'Sara, Iloilo', contact: 'N/A', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },

        // Iloilo Province - Private Hospitals & Clinics
        { name: 'Medicus Laboratory - Passi', type: 'Clinic', address: 'Passi City, Iloilo', contact: 'N/A', hours: 'N/A', website: 'N/A', notes: 'Branch of Medicus providing laboratory services in Passi City.' },
        { name: 'AMR Doctor\'s Hospital', type: 'Hospital', address: 'Miagao, Iloilo', contact: 'N/A', hours: 'N/A', website: 'N/A', notes: 'Private hospital in southern Iloilo.' },
        { name: 'Salubris Medical Center', type: 'Hospital', address: 'Miagao, Iloilo', contact: 'N/A', hours: 'N/A', website: 'N/A', notes: 'Private.' },
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
    try {
        const llmResponse = await ai.generate({
        prompt: `You are an expert local guide for Iloilo City and Province, Philippines. Your goal is to help users find the nearest and most relevant medical facilities.

        1. Call the 'searchForHealthcareProviders' tool to get a comprehensive list of all available healthcare providers.
        2. Analyze the user's query: "${input.query}"
        3. From the full list provided by the tool, select and return ONLY the results that are most relevant to the user's query. Match by name, address, or type. For example, if the user asks for "hospitals in Molo", you should return hospitals whose address contains "Molo". If the user asks for "lab tests", return clinics and hospitals with notes about laboratory services. If the query is empty or very generic like "Iloilo", return all results.
        `,
        model: 'googleai/gemini-1.5-flash',
        tools: [searchForHealthcareProviders],
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
        console.warn('AI filtering failed, returning all results. Error:', error);
        // Fallback: if AI fails, call the tool directly and return all results.
        return await searchForHealthcareProviders(input);
    }


    // Fallback for when no direct output is given and no error was caught.
    return { results: [] };
  }
);
