'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Activity, 
  Camera, 
  MessageSquare, 
  Plus, 
  ChevronRight, 
  MapPin, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight 
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { runFindNearbyClinics } from '@/app/actions';

// UI Components
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Anemo Components
import dynamic from 'next/dynamic';
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { HealthTipCard } from '@/components/anemo/HealthTipCard';

// Dynamic Imports
const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });
const ChatbotPopup = dynamic(() => import('@/components/anemo/ChatbotPopup').then(mod => mod.ChatbotPopup), { ssr: false });
const MenstrualCycleCorrelator = dynamic(() => import('@/components/anemo/MenstrualCycleCorrelator').then(mod => mod.MenstrualCycleCorrelator), { ssr: false });

// --- Animation Variants ---
const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50, damping: 20 } },
};

// --- Helper Components ---
const BentoCard = ({ 
  children, 
  className = '', 
  colSpan = 'col-span-1', 
  rowSpan = 'row-span-1',
  onClick
}: { 
  children: React.ReactNode, 
  className?: string, 
  colSpan?: string, 
  rowSpan?: string,
  onClick?: () => void
}) => (
  <motion.div 
    variants={itemVariants}
    whileHover={{ y: -6, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-xl transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 dark:bg-black/20 dark:shadow-black/50 ${colSpan} ${rowSpan} ${className}`}
  >
    {/* Inner Glow/Shine Effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(255,255,255,0.03)] rounded-[2rem] pointer-events-none" />
    
    <div className="relative z-10 h-full">
      {children}
    </div>
  </motion.div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <motion.h3 
    variants={itemVariants} 
    className="mb-4 text-2xl font-semibold tracking-tighter text-foreground/90"
  >
    {children}
  </motion.h3>
);

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { scrollY } = useScroll();
  
  // Data State
  const [clinics, setClinics] = useState<any[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [location, setLocation] = useState('Iloilo City');
  const [userSex, setUserSex] = useState<string>('');

  // Queries
  const cycleLogsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/cycle_logs`), orderBy('startDate', 'desc'), limit(5));
  }, [user, firestore]);

  const labReportsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/labReports`), orderBy('createdAt', 'desc'), limit(5));
  }, [user, firestore]);

  const imageAnalysesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/imageAnalyses`), orderBy('createdAt', 'desc'), limit(1));
  }, [user, firestore]);

  const { data: cycleLogs } = useCollection<any>(cycleLogsQuery);
  const { data: cbcHistory } = useCollection<any>(labReportsQuery);
  const { data: imageAnalyses } = useCollection<any>(imageAnalysesQuery);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  // Effects
  useEffect(() => {
    if (userData) {
      if (userData.address) setLocation(userData.address);
      if (userData.medicalInfo?.sex) setUserSex(userData.medicalInfo.sex);
    }
  }, [userData]);

  useEffect(() => {
    const fetchClinics = async () => {
      setIsLoadingClinics(true);
      try {
        const response = await runFindNearbyClinics({ query: location });
        setClinics(response.results);
      } catch (error) { console.error(error); } 
      finally { setIsLoadingClinics(false); }
    };
    fetchClinics();
  }, [location]);

  const latestImage = imageAnalyses?.[0];
  const welcomeMessage = user?.displayName ? `Hello, ${user.displayName.split(' ')[0]}` : 'Welcome back';

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      
      {/* --- ColorBends Background --- */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <ColorBends
          colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
          rotation={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          transparent
          autoRotate={0}
          color=""
        />
        
        {/* Cinematic Noise Overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay contrast-150 brightness-100"></div>
      </div>

      {/* --- Main Content --- */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full px-4 md:px-8 py-10 space-y-10"
      >
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
          <motion.div variants={itemVariants} className="space-y-2">
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter text-balance bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {welcomeMessage}
              <span className="text-primary">.</span>
            </h1>
            <p className="text-xl text-muted-foreground/80 font-light tracking-wide max-w-lg">
              Your daily health command center.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex gap-3">
             <Button size="lg" className="rounded-full px-8 h-14 text-base shadow-xl shadow-primary/25 hover:shadow-primary/50 transition-all duration-500 hover:-translate-y-1 bg-gradient-to-r from-primary to-rose-600 border-0" asChild>
               <Link href="/dashboard/analysis">
                 <Camera className="mr-2 h-5 w-5" /> New Analysis
               </Link>
             </Button>
          </motion.div>
        </div>

        {/* --- Bento Grid Layout --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. Main Stats Card (Latest Result) - Medium/Large */}
          <BentoCard colSpan="md:col-span-2 lg:col-span-3" className="flex flex-col justify-between p-8 bg-gradient-to-br from-card to-secondary/50">
            <div className="flex justify-between items-start">
              <div>
                 <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Latest Scan</Badge>
                    <span className="text-xs text-muted-foreground">
                      {latestImage ? format(latestImage.createdAt.toDate(), 'MMM d') : 'No data'}
                    </span>
                 </div>
                 <h2 className="text-2xl font-bold tracking-tight">Risk Score</h2>
              </div>
              <Activity className="h-6 w-6 text-primary/80" />
            </div>

            <div className="flex-1 flex flex-col justify-center py-6">
               {latestImage ? (
                  <div className="space-y-4">
                     <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black tracking-tighter text-primary">
                           {latestImage.riskScore}
                        </span>
                        <span className="text-xl text-muted-foreground font-medium">/ 100</span>
                     </div>
                     <Progress value={latestImage.riskScore} className="h-3 bg-secondary" indicatorClassName="bg-gradient-to-r from-primary to-purple-500" />
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center text-center opacity-60">
                     <p>No analysis performed yet.</p>
                  </div>
               )}
            </div>
             {latestImage && (
              <Button variant="ghost" size="sm" className="w-fit p-0 h-auto hover:bg-transparent hover:text-primary transition-colors" asChild>
                <Link href="/dashboard/history" className="flex items-center text-xs font-medium text-muted-foreground">
                    View History <ChevronRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </BentoCard>

          {/* 2. Start New Analysis - Medium/Large (Primary Action) */}
          <BentoCard colSpan="md:col-span-2 lg:col-span-3" className="relative p-8 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex flex-col justify-center items-start overflow-hidden group cursor-pointer" onClick={() => window.location.href = '/dashboard/analysis'}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl transition-transform group-hover:scale-110" />
              <div className="relative z-10 space-y-4">
                  <div className="p-3 bg-white/20 w-fit rounded-2xl backdrop-blur-md">
                      <Camera className="h-8 w-8 text-white" />
                  </div>
                  <div>
                      <h2 className="text-3xl font-bold tracking-tight mb-1">New Analysis</h2>
                      <p className="text-primary-foreground/80 max-w-xs">
                          Check for anemia signs instantly using your camera.
                      </p>
                  </div>
                  <Button variant="secondary" size="lg" className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all" asChild>
                      <Link href="/dashboard/analysis">Start Scan <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
              </div>
          </BentoCard>

          {/* 3. AI Assistant - Small/Medium */}
          <BentoCard colSpan="md:col-span-2 lg:col-span-2" className="bg-gradient-to-b from-blue-500/5 to-purple-500/5 p-6 flex flex-col justify-between">
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-500/10 w-fit rounded-xl text-blue-500">
                    <MessageSquare className="h-5 w-5" />
                 </div>
                 <h3 className="font-bold text-lg">AI Assistant</h3>
             </div>
             <p className="text-sm text-muted-foreground mb-4">
                Questions about symptoms? Ask our health AI.
             </p>
             <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" asChild>
                <Link href="/dashboard/chatbot">Chat Now</Link>
             </Button>
          </BentoCard>

          {/* 4. Nearby Care - Small/Medium */}
          <BentoCard colSpan="md:col-span-1 lg:col-span-2" className="p-6 relative group flex flex-col justify-between">
             <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Nearby</span>
             </div>
             <div>
                <h3 className="text-lg font-bold mb-1">Find Care</h3>
                <p className="text-xs text-muted-foreground mb-3 truncate">
                    {location}
                </p>
             </div>
             <div className="flex items-center justify-between">
                 <div className="flex -space-x-2 overflow-hidden">
                    {clinics.slice(0,3).map((c, i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-primary/10 border border-background flex items-center justify-center text-[8px] text-primary font-bold">
                        {c.name[0]}
                    </div>
                    ))}
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                    <Link href="/dashboard/find-doctor"><ArrowUpRight className="h-4 w-4" /></Link>
                </Button>
             </div>
          </BentoCard>

           {/* 5. Daily Insight - Small/Medium */}
          <BentoCard colSpan="md:col-span-1 lg:col-span-2" className="p-6 bg-amber-500/5 border-amber-500/10 flex flex-col">
             <div className="flex items-center gap-2 mb-3 text-amber-600">
                <Sparkles className="h-4 w-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Insight</span>
             </div>
             <div className="flex-1 flex items-center">
                 <HealthTipCard variant="minimal" />
             </div>
          </BentoCard>

          {/* 6. Cycle Tracker (Conditional) - Full Width */}
          {userSex === 'Female' && (
             <BentoCard colSpan="md:col-span-4 lg:col-span-6" className="p-0 overflow-hidden bg-gradient-to-r from-pink-500/5 to-rose-500/5 min-h-[250px]">
                <div className="p-6 h-full flex flex-col md:flex-row gap-6">
                   <div className="md:w-1/3 space-y-4 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-rose-500">
                         <Calendar className="h-5 w-5" />
                         <span className="font-bold text-sm uppercase tracking-wider">Cycle Trends</span>
                      </div>
                      <h3 className="text-2xl font-bold">Health Correlation</h3>
                      <p className="text-sm text-muted-foreground">
                         Visualizing the impact of your menstrual cycle on your hemoglobin levels.
                      </p>
                      <CycleLogForm trigger={<Button variant="outline" className="rounded-full w-fit">Log Symptoms</Button>} />
                   </div>
                   <div className="flex-1 w-full h-full min-h-[200px] relative bg-white/40 dark:bg-black/20 rounded-xl border border-white/20 backdrop-blur-sm p-2">
                      {(cbcHistory && cbcHistory.length > 0) || (cycleLogs && cycleLogs.length > 0) ? (
                         <MenstrualCycleCorrelator 
                             labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
                             cycleLogs={cycleLogs || []} 
                             variant="compact"
                         />
                      ) : (
                         <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                            No correlation data available yet.
                         </div>
                      )}
                   </div>
                </div>
             </BentoCard>
          )}

        </div>
      </motion.div>
      
      <ChatbotPopup />
    </div>
  );
}