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
        { name: 'Iloilo Doctors’ Hospital', type: 'Hospital', address: 'West Timawa Avenue, Molo, Iloilo City', contact: '(033) 337-8621', hours: '24/7', website: 'https://www.iloilodoctorshospital.com.ph/', notes: 'Leading private hospital in the region.' },
        { name: 'The Medical City Iloilo', type: 'Hospital', address: 'Lopez Jaena St, Molo, Iloilo City', contact: '(033) 500-1000', hours: '24/7', website: 'https://themedicalcity.com/iloilo', notes: 'Tertiary care hospital with comprehensive services.' },
        { name: 'QualiMed Hospital Iloilo', type: 'Hospital', address: 'Donato Pison Ave, Mandurriao, Iloilo City', contact: '(033) 500-9254', hours: '24/7', website: 'https://qualimed.com.ph/iloilo/', notes: 'Part of the Ayala Land and Mercado General Hospital network.' },
        { name: 'Western Visayas Medical Center', type: 'Hospital', address: 'Q. Abeto St, Mandurriao, Iloilo City', contact: '(033) 321-2841', hours: '24/7', website: 'https://wvmc.doh.gov.ph/', notes: 'A DOH-retained tertiary teaching and training hospital.' },
        { name: 'St. Paul’s Hospital Iloilo', type: 'Hospital', address: 'Gen. Luna St., Iloilo City Proper, Iloilo City', contact: '(033) 337-2741', hours: '24/7', website: 'https://sphiloilo.com/', notes: 'A private Catholic hospital managed by the Sisters of Saint Paul of Chartres.'},
        { name: 'Iloilo Mission Hospital', type: 'Hospital', address: 'Lopez Jaena St., La Paz, Iloilo City', contact: '(033) 337-7702', hours: '24/7', website: 'https://imh.cpu.edu.ph/', notes: 'The first Protestant and American hospital in the Philippines.'},
        { name: 'West Visayas State University Medical Center', type: 'Hospital', address: 'E. Lopez St., Jaro, Iloilo City', contact: '(033) 320-2431', hours: '24/7', website: 'https://wvsu.edu.ph/medical-center/', notes: 'A government-owned hospital and the primary teaching hospital of West Visayas State University.'},
        { name: 'Medicus Medical Center', type: 'Hospital', address: 'Pison Ave., Mandurriao, Iloilo City', contact: '(033) 321-7888', hours: '24/7', website: 'N/A', notes: 'A modern medical facility in Mandurriao.'},
        { name: 'Health-Pro Medical, Diagnostic and Wellness Center', type: 'Clinic', address: 'La Paz, Iloilo City', contact: 'N/A', hours: 'N/A', website: 'N/A', notes: 'Offers various diagnostic services.'},
        { name: 'The Health Centrum', type: 'Clinic', address: 'Jaro, Iloilo City', contact: 'N/A', hours: 'N/A', website: 'N/A', notes: 'A multi-specialty clinic.'},
        { name: 'Aleosan District Hospital', type: 'Hospital', address: 'Alimodian, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Barotac Viejo District Hospital', type: 'Hospital', address: 'Barotac Viejo, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Dr. Ricardo S. Provido Memorial District Hospital', type: 'Hospital', address: 'Calinog, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Don Jose S. Monfort Medical Center Extension Hospital', type: 'Hospital', address: 'Barotac Nuevo, Iloilo', contact: '(033) 361-2651', hours: '24/7', notes: 'A DOH-retained hospital.' },
        { name: 'Federico Roman Tirador, Sr. Memorial District Hospital', type: 'Hospital', address: 'Janiuay, Iloilo', contact: '(033) 531-8077', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Guimbal District Hospital', type: 'Hospital', address: 'Guimbal, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Jesus M. Colmenares Memorial District Hospital', type: 'Hospital', address: 'Balasan, Iloilo', contact: '(033) 397-0402', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Lambunao District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo', contact: '(033) 533-7053', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Passi City District Hospital', type: 'Hospital', address: 'Passi City, Iloilo', contact: '(033) 536-8029', hours: '24/7', notes: 'Serves Passi City and nearby towns.' },
        { name: 'Pototan District Hospital', type: 'Hospital', address: 'Pototan, Iloilo', contact: '(033) 529-8131', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Ramon D. Duremdes District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo', contact: '(033) 361-2022', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'Ramon Tabiana Memorial District Hospital', type: 'Hospital', address: 'Cabatuan, Iloilo', contact: '(033) 522-8228', hours: '24/7', notes: 'Government district hospital.' },
        { name: 'San Joaquin Mother and Child Hospital', type: 'Hospital', address: 'San Joaquin, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Specializes in maternal and child health.' },
        { name: 'Sara District Hospital', type: 'Hospital', address: 'Sara, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government district hospital.' },
    ];
    return { results: simulatedResults.filter(r => r.address.toLowerCase().includes(query.toLowerCase()) || r.name.toLowerCase().includes(query.toLowerCase())) };
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

      Use the 'searchForHealthcareProviders' tool to find real-time information based on the user's query.

      User query: "${input.query}"

      Analyze the user's query and use the search tool to get a list of providers. Then, return the results from the tool directly. Do not make up information.
      `,
      model: 'googleai/gemini-2.5-flash',
      tools: [searchForHealthcareProviders],
      output: {
        schema: FindNearbyClinicsOutputSchema,
      },
    });

    const toolResponse = llmResponse.toolRequests;

    if (toolResponse.length > 0 && toolResponse[0].name === 'searchForHealthcareProviders') {
        const searchResult = await searchForHealthcareProviders(toolResponse[0].input);
        return searchResult;
    }
    
    // If the model decides not to use the tool, or provides a direct answer.
    if(llmResponse.output) {
      return llmResponse.output;
    }

    // Fallback for when no tool is called and no direct output is given.
    return { results: [] };
  }
);
