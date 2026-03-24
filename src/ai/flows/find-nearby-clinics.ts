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
import { getAdminFirestore } from '@/lib/firebase-admin';

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

/**
 * Hardcoded list of healthcare providers in Iloilo and Panay Island.
 */
const ILOILO_PANAY_CLINICS: z.infer<typeof ClinicSchema>[] = [
  // Iloilo City - Private
  { name: 'The Medical City Iloilo', address: 'Locsin St, Molo, Iloilo City', type: 'Hospital', contact: '(033) 338 1505', hours: '24/7', website: 'https://www.themedicalcityiloilo.com' },
  { name: 'St. Paul’s Hospital Iloilo', address: 'General Luna St, Iloilo City Proper', type: 'Hospital', contact: '(033) 337 2741', hours: '24/7', website: 'https://sphiloilo.com' },
  { name: 'Iloilo Mission Hospital', address: 'Mission Rd, Jaro, Iloilo City', type: 'Hospital', contact: '(033) 320 0315', hours: '24/7', website: 'https://iloilomissionhospital.ph' },
  { name: 'Medicus Medical Center', address: 'Padi-an St, Mandurriao, Iloilo City', type: 'Hospital', contact: '(033) 330 2222', hours: '24/7' },
  { name: 'QualiMed Hospital Iloilo', address: 'Atria Park District, Mandurriao, Iloilo City', type: 'Hospital', contact: '(033) 501 4843', hours: '24/7' },
  { name: 'Metro Iloilo Hospital and Medical Center', address: 'Metropolis Ave, Jaro, Iloilo City', type: 'Hospital', contact: '(033) 327 1527', hours: '24/7' },
  { name: 'Iloilo Doctors’ Hospital', address: 'Infante St, Molo, Iloilo City', type: 'Hospital', contact: '(033) 337 7702', hours: '24/7' },
  { name: 'Amosup Seamen’s Hospital Iloilo', address: 'Oñate St, Mandurriao, Iloilo City', type: 'Hospital', contact: '(033) 321 3521', hours: '24/7' },

  // Iloilo City - Public
  { name: 'Western Visayas Medical Center', address: 'Q. Abeto St, Mandurriao, Iloilo City', type: 'Hospital', contact: '(033) 321 2841', hours: '24/7', notes: 'Government Tertiary Hospital' },
  { name: 'WVSU Medical Center', address: 'E. Lopez St, Jaro, Iloilo City', type: 'Hospital', contact: '(033) 320 2431', hours: '24/7', notes: 'Public University Hospital' },

  // Iloilo Province
  { name: 'Don Jose S. Monfort Medical Center', address: 'Dumangas, Iloilo', type: 'Hospital', contact: '(033) 361 2492', hours: '24/7' },
  { name: 'Aleosan District Hospital', address: 'Alimodian, Iloilo', type: 'Hospital', contact: '(033) 331 0184', hours: '24/7' },
  { name: 'Iloilo Provincial Hospital', address: 'Pototan, Iloilo', type: 'Hospital', contact: '(033) 529 8161', hours: '24/7' },
  { name: 'Sara District Hospital', address: 'Sara, Iloilo', type: 'Hospital', contact: '(033) 392 0106', hours: '24/7' },
  { name: 'Guimbal District Hospital', address: 'Guimbal, Iloilo', type: 'Hospital', contact: '(033) 315 5288', hours: '24/7' },

  // Panay Island (Capiz, Aklan, Antique)
  { name: 'Roxas Memorial Provincial Hospital', address: 'Arnaldo Blvd, Roxas City, Capiz', type: 'Hospital', contact: '(036) 621 0233', hours: '24/7' },
  { name: 'Capiz Emmanuel Hospital', address: 'Roxas City, Capiz', type: 'Hospital', contact: '(036) 621 0441', hours: '24/7' },
  { name: 'Dr. Rafael S. Tumbokon Memorial Hospital', address: 'Kalibo, Aklan', type: 'Hospital', contact: '(036) 268 4066', hours: '24/7' },
  { name: 'St. Gabriel Medical Center', address: 'Kalibo, Aklan', type: 'Hospital', contact: '(036) 268 2211', hours: '24/7' },
  { name: 'Angel Salazar Memorial General Hospital', address: 'San Jose, Antique', type: 'Hospital', contact: '(036) 540 9140', hours: '24/7' },

  // Clinics
  { name: 'Medicus Health Partners - SM City Iloilo', address: 'SM City Iloilo, Mandurriao', type: 'Clinic', contact: '(033) 320 9431', hours: '10:00 AM - 9:00 PM' },
  { name: 'HealthWay Medical - Festive Walk Mall', address: 'Festive Walk, Mandurriao, Iloilo City', type: 'Clinic', contact: '(033) 330 1445', hours: '9:00 AM - 8:00 PM' },
];

export const findNearbyClinics = ai.defineFlow(
  {
    name: 'findNearbyClinics',
    inputSchema: FindNearbyClinicsInputSchema,
    outputSchema: FindNearbyClinicsOutputSchema,
  },
  async (input) => {
      // Filter the hardcoded list based on the search query (case-insensitive)
      const query = input.query.toLowerCase();
      const filteredResults = ILOILO_PANAY_CLINICS.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query) ||
          p.type.toLowerCase().includes(query)
      );

      // If query is empty or "all", return everything (capped at 10)
      if (query === '' || query === 'all' || query === 'iloilo') {
          return { results: ILOILO_PANAY_CLINICS.slice(0, 15) };
      }

      return { results: filteredResults };
  }
);
