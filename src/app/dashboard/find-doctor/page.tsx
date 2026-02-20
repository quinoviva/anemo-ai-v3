'use client';

import { useState, useEffect } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import {
  CardHeader,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Stethoscope, 
  Hospital, 
  HeartPulse, 
  Phone, 
  Clock, 
  Globe, 
  MapPin, 
  Database,
  ArrowUpRight,
  ShieldAlert,
  Navigation
} from 'lucide-react';
import HeartLoader from '@/components/ui/HeartLoader';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
  contact?: string;
  hours?: string;
  website?: string;
  notes?: string;
};

// --- Icons ---
const iconMap = {
    Hospital: <Hospital className="h-6 w-6 text-blue-500" />,
    Doctor: <Stethoscope className="h-6 w-6 text-emerald-500" />,
    Clinic: <HeartPulse className="h-6 w-6 text-rose-500" />,
}

// --- Custom CSS for Sidebar Animation ---
const customStyles = `
@keyframes spin-slow-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
.sidebar-ring {
  animation: spin-slow 30s linear infinite;
}
.sidebar-ring-reverse {
  animation: spin-slow-reverse 25s linear infinite;
}
`;

export default function FindDoctorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Clinic[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc(userDocRef);

  useEffect(() => {
    if (userData && userData.address && !hasSearched && !isSearching) {
        const location = userData.address.split('\n')[0].trim(); 
        setSearchQuery(location);
        handleSearchLogic(location);
    }
  }, [userData]); // Removed hasSearched and isSearching to prevent loop

  const handleSearchLogic = async (q: string) => {
    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await runFindNearbyClinics({ query: q });
      setResults(response.results);
    } catch (err) {
      console.error("Search Error:", err);
      toast({
        title: "Search Error",
        description: "Could not fetch results from the database.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: "Search query is empty",
        description: "Please enter a location to search.",
        variant: "destructive",
      });
      return;
    }
    handleSearchLogic(searchQuery);
  }

  const handleSeedDatabase = async () => {
    if (!user || !firestore) return;
    setIsSearching(true);
    toast({ title: "Seeding Database...", description: "Uploading provider data to Firestore." });
    
    try {
      const { IloiloHealthcareProviders } = await import('@/lib/iloilo-municipalities');
      const healthcareCollection = collection(firestore, 'healthcareProviders');
      
      for (const provider of IloiloHealthcareProviders) {
        const docId = provider.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const docRef = doc(healthcareCollection, docId);
        await setDoc(docRef, { ...provider, updatedAt: serverTimestamp() }, { merge: true });
      }

      toast({ title: "Success", description: "Database seeded successfully!" });
      handleSearchLogic(searchQuery || 'Iloilo');
    } catch (err) {
      console.error("Seeding Error:", err);
      toast({ title: "Seeding Failed", description: "Could not upload data. Please check your permissions.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-foreground">
      <style>{customStyles}</style>
      
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        
        {/* --- LEFT SIDEBAR (Search & Info) --- */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-4 space-y-6"
        >
           {/* Header Card */}
           <div className="rounded-[2.5rem] bg-gradient-to-br from-background to-background/50 border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-colors duration-700" />
              
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                       <MapPin className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-500">Global Network</span>
                 </div>
                 
                 <h1 className="text-4xl md:text-5xl font-light tracking-tighter mb-4">Find Care</h1>
                 <p className="text-muted-foreground leading-relaxed">
                    Locate top-rated clinics, hospitals, and specialists in your municipality. 
                    Example: <span className="text-foreground font-medium">"Pototan"</span>
                 </p>
              </div>

              {/* Custom Animation Element */}
              <div className="absolute -bottom-16 -left-16 w-48 h-48 border-[20px] border-blue-500/5 rounded-full sidebar-ring" />
              <div className="absolute -bottom-16 -left-16 w-32 h-32 border-[10px] border-emerald-500/5 rounded-full sidebar-ring-reverse" />
           </div>

           {/* Search Input Box */}
           <div className="rounded-[2rem] bg-background/60 backdrop-blur-xl border border-white/10 p-2 shadow-lg">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-grow group">
                    <div className="absolute inset-0 bg-blue-500/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-full" />
                    <Input
                        type="text"
                        placeholder="Search municipality..."
                        className="relative pl-6 pr-4 h-14 rounded-full bg-white/5 border-white/10 focus-visible:border-blue-500/50 focus-visible:ring-0 transition-all text-base shadow-inner"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button type="submit" disabled={isSearching} className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 shrink-0">
                    {isSearching ? <HeartLoader size={20} strokeWidth={3} /> : <Search className="h-5 w-5" />}
                </Button>
               </form>
           </div>
        </motion.div>

        {/* --- RIGHT CONTENT (Results Grid) --- */}
        <div className="lg:col-span-8 space-y-6">
           
           {/* Results Status Bar */}
           <div className="flex items-center justify-between px-4">
              <p className="text-sm font-medium text-muted-foreground">
                 {hasSearched ? `Found ${results.length} providers near "${searchQuery}"` : "Ready to search"}
              </p>
              {!userData?.address && (
                <Button onClick={handleSeedDatabase} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-2">
                    <Database className="h-3 w-3" />
                    Initialize DB
                </Button>
              )}
           </div>

           {/* Scrollable Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
              <AnimatePresence mode="popLayout">
                {isSearching ? (
                   Array.from({ length: 4 }).map((_, i) => (
                      <motion.div 
                        key={`skeleton-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        className="h-64 rounded-[2rem] bg-white/5 border border-white/10 animate-pulse"
                      />
                   ))
                ) : hasSearched && results.length > 0 ? (
                    results.map((clinic, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="group relative rounded-[2.5rem] bg-background/40 backdrop-blur-md border border-white/10 overflow-hidden hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1"
                      >
                         <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                         
                         <div className="p-8 h-full flex flex-col justify-between relative z-10">
                            <div>
                               <div className="flex justify-between items-start mb-6">
                                  <div className="flex items-center gap-4">
                                     <Avatar className="h-12 w-12 border border-white/10 bg-background shadow-lg group-hover:scale-110 transition-transform duration-500">
                                        <AvatarFallback className="bg-white/5">
                                          {iconMap[clinic.type]}
                                        </AvatarFallback>
                                     </Avatar>
                                     <div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                                            clinic.type === 'Hospital' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                            clinic.type === 'Clinic' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        }`}>
                                            {clinic.type}
                                        </span>
                                     </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground" asChild>
                                     <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name + ' ' + clinic.address)}`} target="_blank" rel="noopener noreferrer">
                                        <ArrowUpRight className="h-5 w-5" />
                                     </a>
                                  </Button>
                               </div>

                               <h3 className="text-xl font-medium tracking-tight mb-2 group-hover:text-blue-500 transition-colors">{clinic.name}</h3>
                               <p className="text-sm text-muted-foreground flex items-start gap-2 mb-4">
                                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 opacity-70" /> 
                                  <span className="line-clamp-2">{clinic.address}</span>
                               </p>
                            </div>


                            <div className="space-y-3 pt-6 border-t border-white/5">
                               {clinic.hours && (
                                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4 shrink-0 opacity-70" />
                                    <span>{clinic.hours}</span>
                                 </div>
                               )}
                               {clinic.contact && clinic.contact !== 'N/A' && (
                                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4 shrink-0 opacity-70" />
                                    <span className="font-mono">{clinic.contact}</span>
                                 </div>
                               )}
                            </div>
                            
                            {/* Hover Actions Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-background/90 backdrop-blur-xl border-t border-white/10 flex gap-2">
                                <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg" asChild>
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinic.name + ' ' + clinic.address)}`} target="_blank" rel="noopener noreferrer">
                                        <Navigation className="mr-2 h-4 w-4" /> Navigate
                                    </a>
                                </Button>
                                {clinic.website && clinic.website !== 'N/A' && (
                                    <Button variant="outline" size="icon" className="rounded-xl border-white/10 hover:bg-white/5" asChild>
                                        <a href={clinic.website} target="_blank" rel="noopener noreferrer">
                                            <Globe className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                         </div>
                      </motion.div>
                    ))
                ) : hasSearched ? (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="col-span-full py-20 text-center space-y-6"
                    >
                        <div className="w-24 h-24 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center mx-auto animate-spin-slow">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-muted-foreground">No providers found in "{searchQuery}"</p>
                            <p className="text-sm text-muted-foreground/60">Try searching for a larger municipality or "Iloilo City"</p>
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleSeedDatabase} variant="outline" className="rounded-full border-white/10 gap-2">
                                <Database className="h-4 w-4" /> Seed Database
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    // Empty State
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="col-span-full flex flex-col items-center justify-center h-[400px] text-center space-y-4 opacity-50"
                    >
                        <div className="p-6 rounded-full bg-white/5">
                            <MapPin className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-sm uppercase tracking-[0.2em]">Enter a location to begin</p>
                    </motion.div>
                )}
              </AnimatePresence>
           </div>

           {/* Emergency Section (Moved from Sidebar) */}
           <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[2.5rem] bg-gradient-to-br from-red-500/10 via-background to-background border border-red-500/20 p-8 md:p-12 shadow-2xl relative overflow-hidden group hover:border-red-500/40 transition-all duration-700"
           >
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-red-500/10 transition-colors" />
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 text-red-500 mb-2">
                       <div className="p-2 bg-red-500/10 rounded-lg">
                          <ShieldAlert className="h-6 w-6" />
                       </div>
                       <span className="text-sm font-bold uppercase tracking-[0.3em]">Critical Support</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-light tracking-tight">Need Immediate Assistance?</h3>
                    <p className="text-muted-foreground text-lg max-w-xl">
                       If you are experiencing severe symptoms like extreme dizziness, fainting, or chest pain, please contact emergency services immediately.
                    </p>
                 </div>
                 
                 <div className="flex flex-col items-center gap-4">
                    <Button size="lg" className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-pulse border-none">
                       <Phone className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-xs font-black uppercase tracking-widest text-red-500/60">Dial 911</span>
                 </div>
              </div>
           </motion.div>

        </div>
      </div>
    </div>
  );
}
