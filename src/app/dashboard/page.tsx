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
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`group relative overflow-hidden rounded-[2rem] glass-panel glass-panel-hover flex flex-col ${colSpan} ${rowSpan} ${className}`}
  >
    <div className="relative z-10 h-full w-full">
      {children}
    </div>
  </motion.div>
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
    <div className="relative w-full">
      
      {/* --- Main Content --- */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full space-y-16"
      >
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9]">
              {welcomeMessage}
              <span className="text-primary animate-pulse">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
              WELCOME TO ANEMO
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants}>
              <div className="text-right hidden md:block">
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_theme(colors.emerald.500)]" />
                      <span className="text-sm font-medium">System Optimal</span>
                  </div>
              </div>
          </motion.div>
        </div>

        {/* --- Bento Grid Layout --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 auto-rows-[minmax(220px,auto)]">
          
          {/* 1. HERO: Start New Analysis (Dominant) */}
          <BentoCard 
            colSpan="md:col-span-4 lg:col-span-4" 
            rowSpan="row-span-2"
            className="bg-gradient-to-br from-primary/10 via-background/40 to-background border-primary/20 cursor-pointer group"
            onClick={() => window.location.href = '/dashboard/analysis'}
          >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />
              
              <div className="relative z-10 h-full p-10 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="p-4 bg-background/50 rounded-full backdrop-blur-md border border-primary/10">
                        <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:rotate-45 transition-all duration-500" />
                  </div>
                  
                  <div className="max-w-xl space-y-6">
                      <h2 className="text-5xl md:text-6xl font-light tracking-tighter text-foreground">
                          Start Analysis
                      </h2>
                      <p className="text-lg text-muted-foreground font-light leading-relaxed">
                          Utilize our advanced CNN models to detect potential signs of anemia through non-invasive image analysis. Precision healthcare at your fingertips.
                      </p>
                      <div className="flex items-center gap-4 pt-4">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary border-b border-primary pb-1">Initialize Scan</span>
                      </div>
                  </div>
              </div>
          </BentoCard>

          {/* 2. Latest Stats (Vertical Strip) */}
          <BentoCard colSpan="md:col-span-2 lg:col-span-2" rowSpan="row-span-2" className="p-8 justify-between bg-card/30">
            <div className="flex justify-between items-start">
               <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Risk Score</h3>
               <Activity className="h-5 w-5 text-primary" />
            </div>

            <div className="flex flex-col items-center justify-center space-y-6 my-8">
               {latestImage ? (
                  <>
                     <div className="relative">
                        <span className="text-8xl font-thin tracking-tighter text-foreground">
                           {latestImage.riskScore}
                        </span>
                        <span className="absolute top-4 -right-4 text-lg text-muted-foreground font-light">%</span>
                     </div>
                     <Progress value={latestImage.riskScore} className="h-2 w-full max-w-[140px] bg-secondary" indicatorClassName="bg-primary shadow-[0_0_15px_theme(colors.primary.DEFAULT)]" />
                     <p className="text-sm text-muted-foreground text-center px-4">
                        Analysis from {format(latestImage.createdAt.toDate(), 'MMM d')}
                     </p>
                  </>
               ) : (
                  <div className="text-center space-y-2 opacity-50">
                     <span className="text-6xl font-thin">--</span>
                     <p className="text-xs uppercase tracking-widest">No Data</p>
                  </div>
               )}
            </div>
            
            <Button variant="ghost" className="w-full justify-between group/btn hover:bg-transparent px-0" asChild>
                <Link href="/dashboard/history">
                    <span className="text-xs font-bold uppercase tracking-widest">Full History</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover/btn:translate-x-1 transition-transform" />
                </Link>
            </Button>
          </BentoCard>

          {/* 3. AI Assistant */}
          <BentoCard colSpan="md:col-span-2 lg:col-span-3" className="p-8 justify-between hover:bg-blue-500/5 transition-colors duration-500">
             <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                    <MessageSquare className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-medium tracking-tight">AI Assistant</h3>
                    <p className="text-sm text-muted-foreground mt-1">Chat with our health intelligence.</p>
                 </div>
             </div>
             <div className="flex justify-end mt-4">
                <Button variant="outline" className="rounded-full border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-500 transition-colors" asChild>
                    <Link href="/dashboard/chatbot">Open Chat</Link>
                </Button>
             </div>
          </BentoCard>

          {/* 4. Find Care */}
          <BentoCard colSpan="md:col-span-2 lg:col-span-3" className="p-8 justify-between hover:bg-emerald-500/5 transition-colors duration-500">
             <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                        <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-medium tracking-tight">Find Care</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1 max-w-[150px]">{location}</p>
                    </div>
                </div>
                <div className="flex -space-x-3">
                    {clinics.slice(0,3).map((c, i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold shadow-sm">
                        {c.name[0]}
                    </div>
                    ))}
                </div>
             </div>
             <div className="flex justify-end mt-4">
                <Button variant="outline" className="rounded-full border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors" asChild>
                    <Link href="/dashboard/find-doctor">Locate Clinics</Link>
                </Button>
             </div>
          </BentoCard>

          {/* 5. Cycle Tracker (Conditional) */}
          {userSex === 'Female' && (
             <BentoCard colSpan="md:col-span-4 lg:col-span-6" className="p-8 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent">
                <div className="flex flex-col md:flex-row gap-8 items-center h-full">
                   <div className="md:w-1/3 space-y-4">
                      <div className="flex items-center gap-2 text-rose-500">
                         <Calendar className="h-5 w-5" />
                         <span className="font-bold text-xs uppercase tracking-widest">Cycle Correlation</span>
                      </div>
                      <h3 className="text-3xl font-light tracking-tight">Hormonal Insights</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                         Visualize how your cycle phases correlate with your hemoglobin levels to understand your body's rhythm.
                      </p>
                      <CycleLogForm trigger={<Button variant="outline" className="rounded-full border-rose-500/20 text-rose-500 hover:bg-rose-500/10">Log Cycle</Button>} />
                   </div>
                   <div className="flex-1 w-full h-[200px] glass-panel rounded-xl flex items-center justify-center overflow-hidden">
                      {(cbcHistory && cbcHistory.length > 0) || (cycleLogs && cycleLogs.length > 0) ? (
                         <MenstrualCycleCorrelator 
                             labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
                             cycleLogs={cycleLogs || []} 
                             variant="compact"
                         />
                      ) : (
                         <div className="text-center opacity-40">
                            <p className="text-xs uppercase tracking-widest">Insufficient Data</p>
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