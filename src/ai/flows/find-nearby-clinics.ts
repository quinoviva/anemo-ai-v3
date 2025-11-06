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
  contact: z.string().optional().describe('Contact number of the provider.'),
  hours: z.string().optional().describe('Operating hours.'),
  website: z.string().optional().describe('The official website.'),
  notes: z.string().optional().describe('Additional notes or specialties.'),
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
    { name: 'Iloilo Doctors’ Hospital', type: 'Hospital', address: 'West Timawa Avenue, Molo, Iloilo City', contact: '(033) 337-8621', hours: '24/7', website: 'http://www.iloilodoctorshospital.com.ph/', notes: 'Leading private hospital in the region.' },
    { name: 'The Medical City Iloilo', type: 'Hospital', address: 'Lopez Jaena St, Molo, Iloilo City', contact: '(033) 500-1000', hours: '24/7', website: 'https://www.themedicalcity.com/iloilo', notes: 'Tertiary care hospital with comprehensive services.' },
    { name: 'QualiMed Hospital Iloilo', type: 'Hospital', address: 'Donato Pison Ave, Mandurriao, Iloilo City', contact: '(033) 500-9254', hours: '24/7', website: 'https://qualimed.com.ph/iloilo/', notes: 'Part of the Ayala Land and Mercado General Hospital network.' },
    { name: 'Iloilo Mission Hospital', type: 'Hospital', address: 'Mission Rd, Jaro, Iloilo City', contact: '(033) 320-0327', hours: '24/7', website: 'https://imh.cpu.edu.ph/', notes: 'The first Protestant hospital in the Philippines.' },
    { name: 'St. Paul\'s Hospital Iloilo', type: 'Hospital', address: 'General Luna St, Iloilo City Proper', contact: '(033) 337-2741', hours: '24/7', website: 'https://sphiloilo.com/', notes: 'A heritage hospital providing holistic healthcare.' },
    { name: 'Western Visayas Medical Center', type: 'Hospital', address: 'Q. Abeto St, Mandurriao, Iloilo City', contact: '(033) 321-2841', hours: '24/7', website: 'https://wvmc.doh.gov.ph/', notes: 'A DOH-retained tertiary teaching and training hospital.' },
    { name: 'West Visayas State University Medical Center', type: 'Hospital', address: 'E. Lopez St, Jaro, Iloilo City', contact: '(033) 320-2431', hours: '24/7', website: 'https://wvsu.edu.ph/medical-center/', notes: 'A state-owned tertiary hospital and teaching institution.' },
    { name: 'Medicus Medical Center', type: 'Hospital', address: 'Mandurriao, Iloilo City', contact: '(033) 321-7821', hours: '24/7', website: 'https://www.medicus.com.ph/', notes: 'Comprehensive medical services.' },
    { name: 'MedicPro Medical Clinic', type: 'Clinic', address: 'La Paz, Iloilo City', contact: '(033) 320-5678', hours: 'Mon-Fri: 8AM-6PM', notes: 'General consultation and laboratory services.' },
    { name: 'Healthlink E-Clinic', type: 'Clinic', address: 'Festive Walk Mall, Mandurriao, Iloilo City', contact: '(033) 501-4433', hours: 'Daily: 10AM-7PM', notes: 'Telemedicine and in-person consultations.' },
    
    // Iloilo Province
    { name: 'Don Jose S. Monfort Medical Center Extension Hospital', type: 'Hospital', address: 'Barotac Nuevo, Iloilo', contact: '(033) 361-2244', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Aleosan District Hospital', type: 'Hospital', address: 'Alimodian, Iloilo', contact: '(033) 501-1035', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Barotac Viejo District Hospital', type: 'Hospital', address: 'Barotac Viejo, Iloilo', contact: '(033) 362-0059', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Dumangas District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo', contact: '(033) 361-2022', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Guimbal District Hospital', type: 'Hospital', address: 'Guimbal, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Jesus M. Colmenares Memorial District Hospital', type: 'Hospital', address: 'Balasan, Iloilo', contact: '(033) 397-0402', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Lambunao District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo', contact: '(033) 533-7053', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Passi City District Hospital', type: 'Hospital', address: 'Passi City, Iloilo', contact: '(033) 536-8029', hours: '24/7', notes: 'Serves Passi City and nearby towns.' },
    { name: 'Pototan District Hospital', type: 'Hospital', address: 'Pototan, Iloilo', contact: '(033) 529-8131', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Ramon D. Duremdes District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo', contact: '(033) 361-2022', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Ramon Tabiana Memorial District Hospital', type: 'Hospital', address: 'Cabatuan, Iloilo', contact: '(033) 522-8250', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'San Joaquin Mother and Child Hospital', type: 'Hospital', address: 'San Joaquin, Iloilo', contact: 'N/A', hours: '24/7', notes: 'Specializes in maternal and child health.' },
    { name: 'Sara District Hospital', type: 'Hospital', address: 'Sara, Iloilo', contact: '(033) 392-0145', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Federico Roman Tirador Sr. Memorial District Hospital', type: 'Hospital', address: 'Janiuay, Iloilo', contact: '(033) 531-8071', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Dr. Ricardo S. Provido Sr. Memorial District Hospital', type: 'Hospital', address: 'Calinog, Iloilo', contact: '(033) 525-1038', hours: '24/7', notes: 'Government district hospital.' },
    { name: 'Dr. Ricardo Y. Ladrido Memorial District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo', contact: '(033) 533-7053', hours: '24/7', notes: 'Also known as Lambunao District Hospital.' },
    { name: 'Iloilo Provincial Hospital', type: 'Hospital', address: 'Pototan, Iloilo', contact: '(033) 529-8131', hours: '24/7', notes: 'Provincial government hospital.' },
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

    