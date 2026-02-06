export interface Clinic {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
  contact?: string;
  hours?: string;
  website?: string;
  notes?: string;
}

export const IloiloHealthcareProviders: Clinic[] = [
    // --- ILOILO CITY ---
    
    // Public Hospitals
    { name: 'Western Visayas Medical Center', type: 'Hospital', address: 'Q. Abeto St, Mandurriao, Iloilo City', contact: '(033) 321-2841', hours: '24/7', website: 'https://wvmc.doh.gov.ph/', notes: 'Government, Tertiary. Major regional hospital with full laboratory services.' },
    { name: 'West Visayas State University Medical Center', type: 'Hospital', address: 'E. Lopez St., Jaro, Iloilo City', contact: '(033) 320-2431', hours: '24/7', website: 'https://wvsu.edu.ph/medical-center/', notes: 'Government, Tertiary. University teaching hospital with complete diagnostics.' },
    
    // Private Hospitals
    { name: 'The Medical City Iloilo', type: 'Hospital', address: 'Locsin St., Brgy. Tap-oc, Molo, Iloilo City', contact: '(033) 500-1000', hours: '24/7', website: 'https://themedicalcity.com/iloilo', notes: 'Private, Tertiary. Comprehensive laboratory and diagnostic imaging.' },
    { name: 'Iloilo Doctors’ Hospital', type: 'Hospital', address: 'West Timawa Avenue, Molo, Iloilo City', contact: '(033) 337-8621', hours: '24/7', website: 'https://www.iloilodoctorshospital.com.ph/', notes: 'Private, Tertiary. Full-service medical facility.' },
    { name: 'St. Paul’s Hospital Iloilo', type: 'Hospital', address: 'Gen. Luna St., Iloilo City Proper, Iloilo City', contact: '(033) 337-2741', hours: '24/7', website: 'https://sphiloilo.com/', notes: 'Private, Tertiary. Extensive laboratory and pathology services.' },
    { name: 'Iloilo Mission Hospital', type: 'Hospital', address: 'Lopez Jaena St., La Paz, Iloilo City', contact: '(033) 337-7702', hours: '24/7', website: 'https://imh.cpu.edu.ph/', notes: 'Private, Tertiary. Established facility with strong diagnostics.' },
    { name: 'QualiMed Hospital Iloilo', type: 'Hospital', address: 'Donato Pison Ave, Mandurriao, Iloilo City', contact: '(033) 500-9254', hours: '24/7', website: 'https://qualimed.com.ph/iloilo/', notes: 'Private, Level 2. Full-service laboratory and specialized care.' },
    { name: 'Medicus Medical Center', type: 'Hospital', address: 'Pison Ave., Mandurriao, Iloilo City', contact: '(033) 321-7888', hours: '24/7', website: 'N/A', notes: 'Private, Level 2. Strong focus on laboratory and diagnostic services.' },
    { name: 'Metro Iloilo Hospital and Medical Center', type: 'Hospital', address: 'Metropolis Avenue, Jaro, Iloilo City', contact: '(033) 327-1111', hours: '24/7', website: 'https://metroiloilohospital.com/', notes: 'Private, Level 2. Modern laboratory facilities.' },
    { name: 'Asia Pacific Medical Center - Iloilo', type: 'Hospital', address: 'Jaro, Iloilo City', contact: 'N/A', hours: '24/7', website: 'https://apmciloilo.com/', notes: 'Private, Tertiary hospital.' },
    { name: 'Seamen\'s Hospital Iloilo', type: 'Hospital', address: 'Onate St., Mandurriao, Iloilo City', contact: '(033) 321-3520', hours: '24/7', website: 'N/A', notes: 'Private. Specializes in seafarer health services.' },

    // City Clinics
    { name: 'Medicus Diagnostic Center - Main', type: 'Clinic', address: 'G/F Lolita Bldg., Gen. Luna St., Iloilo City', contact: '+6333 335-1665', hours: 'Mon-Sat', website: 'N/A', notes: 'Primary diagnostic and laboratory hub.' },
    { name: 'Healthlink Iloilo Inc.', type: 'Clinic', address: '12 Mabini St, Brgy. San Agustin, Iloilo City', contact: '(033) 336-4098', hours: 'Mon-Sat', website: 'https://healthlinkiloilo.com/', notes: 'Full laboratory and diagnostic services.' },
    { name: 'Hi-Precision Diagnostics Iloilo', type: 'Clinic', address: 'Benigno Aquino Ave, Mandurriao, Iloilo City', contact: '(033) 321-7554', hours: 'Mon-Sat', website: 'https://www.hi-precision.com.ph/', notes: 'High-quality medical diagnostic laboratory.' },
    { name: 'Family Diagnostic Center', type: 'Clinic', address: 'J & B III Bldg., Quezon St., Iloilo City', contact: '+6333 508-0319', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic laboratory services.' },
    { name: 'MediCard Iloilo Clinic', type: 'Clinic', address: 'Festive Walk Parade 1B, Mandurriao, Iloilo City', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'HMO clinic with comprehensive lab tests.' },
    { name: 'Best Care Specialty Clinic', type: 'Clinic', address: '40-1-1N Quezon St., Iloilo City', contact: '+6333 337-2789', hours: 'Mon-Sat', website: 'N/A', notes: 'Specialized medical and diagnostic services.' },

    // --- ILOILO PROVINCE (DISTRICT & PUBLIC HOSPITALS) ---
    
    { name: 'Aleosan District Hospital', type: 'Hospital', address: 'Alimodian, Iloilo', contact: '(033) 331-1033', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Serves Alimodian, Leon, and San Miguel.' },
    { name: 'Governor Niel D. Tupas, Sr. District Hospital', type: 'Hospital', address: 'Barotac Viejo, Iloilo', contact: '+6333 323-6366', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'Don Valerio Palmares Sr. Memorial District Hospital', type: 'Hospital', address: 'Passi City, Iloilo', contact: '+6333 311-5453', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Major provincial facility.' },
    { name: 'Dr. Ricardo S. Provido Memorial District Hospital', type: 'Hospital', address: 'Calinog, Iloilo', contact: 'N/A', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'Dr. Ricardo Y. Ladrido Memorial District Hospital', type: 'Hospital', address: 'Lambunao, Iloilo', contact: '(033) 330-0559', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'Federico Roman Tirador Sr. Memorial District Hospital', type: 'Hospital', address: 'Janiuay, Iloilo', contact: '(033) 531-8506', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'Iloilo Provincial Hospital', type: 'Hospital', address: 'Pototan, Iloilo', contact: '(033) 529-7496', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Primary referral hospital for the province.' },
    { name: 'Jesus M. Colmenares Memorial District Hospital', type: 'Hospital', address: 'Balasan, Iloilo', contact: '(033) 397-0879', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Serves northern Iloilo.' },
    { name: 'Ramon D. Duremdes District Hospital', type: 'Hospital', address: 'Dumangas, Iloilo', contact: '+6333 361-2429', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'Ramon Tabiana Memorial District Hospital', type: 'Hospital', address: 'Cabatuan, Iloilo', contact: '+6333 522-8549', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'Rep. Pedro G. Trono Memorial Hospital', type: 'Hospital', address: 'Guimbal, Iloilo', contact: '+6333 315-5551', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Serves the first district.' },
    { name: 'Sara District Hospital', type: 'Hospital', address: 'Sara, Iloilo', contact: '+6333 327-0288', hours: '24/7', website: 'N/A', notes: 'Government, Level 1.' },
    { name: 'San Joaquin Mother and Child Hospital', type: 'Hospital', address: 'San Joaquin, Iloilo', contact: '(033) 314-7499', hours: '24/7', website: 'N/A', notes: 'Government, Level 1. Specialized in maternal health.' },
    { name: 'Don Jose S. Monfort Medical Center', type: 'Hospital', address: 'Barotac Nuevo, Iloilo', contact: '(033) 361-2651', hours: '24/7', website: 'N/A', notes: 'DOH-retained hospital.' },
    { name: 'Western Visayas Sanitarium and General Hospital', type: 'Hospital', address: 'Sta. Barbara, Iloilo', contact: '(033) 523-7888', hours: '24/7', website: 'N/A', notes: 'Government, General Hospital.' },

    // --- PROVINCIAL CLINICS & DIAGNOSTICS ---
    
    { name: 'Healthlink Guimbal', type: 'Clinic', address: 'Guimbal, Iloilo', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic and lab services.' },
    { name: 'Healthlink Balasan', type: 'Clinic', address: 'Balasan, Iloilo', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic and lab services.' },
    { name: 'Healthlink Cabatuan', type: 'Clinic', address: 'Cabatuan, Iloilo', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic and lab services.' },
    { name: 'Healthlink Pototan', type: 'Clinic', address: 'Pototan, Iloilo', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic and lab services.' },
    { name: 'Healthlink Passi', type: 'Clinic', address: 'Passi City, Iloilo', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic and lab services.' },
    { name: 'Medicus Passi', type: 'Clinic', address: 'Passi City, Iloilo', contact: 'N/A', hours: 'Mon-Sat', website: 'N/A', notes: 'Diagnostic laboratory.' },
    { name: 'UPV Health Service Unit', type: 'Clinic', address: 'Miag-ao, Iloilo', contact: 'N/A', hours: 'Office Hours', website: 'N/A', notes: 'Medical clinic for UP Visayas community.' },
    { name: 'Dingle LGU Laboratory', type: 'Clinic', address: 'Dingle, Iloilo', contact: 'N/A', hours: 'Office Hours', website: 'N/A', notes: 'LGU-managed diagnostic facility.' },
    { name: 'Igbaras Clinical Laboratory', type: 'Clinic', address: 'Igbaras, Iloilo', contact: 'N/A', hours: 'Office Hours', website: 'N/A', notes: 'Public diagnostic laboratory.' },
];
