'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
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
  ArrowUpRight,
  Droplets
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import HeartLoader from '@/components/ui/HeartLoader';

// Anemo Components
import dynamic from 'next/dynamic';
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { HealthTipCard } from '@/components/anemo/HealthTipCard';
import { WaterReminder } from '@/components/anemo/WaterReminder';
import '@/app/dashboard/games/iron-catcher/thumbnail.css';

// Dynamic Imports
const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });
const ChatbotPopup = dynamic(() => import('@/components/anemo/ChatbotPopup').then(mod => mod.ChatbotPopup), { ssr: false });
const MenstrualCycleCorrelator = dynamic(() => import('@/components/anemo/MenstrualCycleCorrelator').then(mod => mod.MenstrualCycleCorrelator), { ssr: false });
const NutritionTicker = dynamic(() => import('@/components/anemo/NutritionTicker').then(mod => mod.NutritionTicker), { ssr: false });
const ClinicBackground = dynamic(() => import('@/components/ui/ClinicBackground').then(mod => mod.ClinicBackground), { ssr: false });

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
    className={`group relative overflow-hidden rounded-[2.5rem] glass-panel glass-panel-hover flex flex-col ${colSpan} ${rowSpan} ${className}`}
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
  const [showWaterReminder, setShowWaterReminder] = useState(false);

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
    const checkWaterSetting = () => {
        const enabled = localStorage.getItem('waterReminderEnabled') === 'true';
        setShowWaterReminder(enabled);
    };
    
    checkWaterSetting();
    window.addEventListener('storage', checkWaterSetting);
    
    return () => window.removeEventListener('storage', checkWaterSetting);
  }, []);

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

  const userName = user?.displayName ? user.displayName.split(' ')[0] : null;
  const latestImage = imageAnalyses?.[0];

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
            <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-4">
              <span className="opacity-80">Hello,</span>
              <AnimatePresence mode="wait">
                {userName ? (
                  <motion.span
                    key="name"
                    initial={{ opacity: 0, y: 30, filter: 'blur(15px)', scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                    transition={{ 
                      duration: 1, 
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.2
                    }}
                    whileHover={{ 
                      scale: 1.03,
                      filter: "brightness(1.1)",
                      transition: { duration: 0.4, ease: "easeOut" }
                    }}
                    className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400 drop-shadow-sm cursor-default relative group"
                  >
                    {userName}
                    {/* Premium Underline Glow */}
                    <motion.span 
                      className="absolute -bottom-2 left-0 w-0 h-1.5 bg-gradient-to-r from-primary to-rose-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:w-full transition-all duration-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                      layoutId="underline"
                    />
                  </motion.span>
                ) : (
                  <motion.span
                    key="fallback"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    className="font-medium italic"
                  >
                    Guest
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="text-primary animate-pulse">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
              ANEMO INTELLIGENCE
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants}>
              <div className="text-right hidden md:block">
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">System Status</p>
                  <div className="flex items-center justify-end gap-2 mt-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_15px_theme(colors.emerald.500)] animate-pulse" />
                      <span className="text-sm font-medium tracking-tight">Active Engine</span>
                  </div>
              </div>
          </motion.div>
        </div>

        {/* --- Info Section (Ultra Premium Redesign) --- */}
        <motion.div 
          variants={itemVariants} 
          className="relative group rounded-[2.5rem] p-10 md:p-14 overflow-hidden isolate"
        >
            {/* Dynamic Background Mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/80 via-background to-background z-0" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay z-0" />
            
            {/* Animated Glow Orbs */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8000ms] group-hover:bg-red-500/40 transition-colors" />
            <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[140px] mix-blend-screen" />

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[200%] animate-[shimmer_8s_infinite] pointer-events-none z-10" />

            {/* Abstract 3D Icon Composition */}
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none z-0 transform group-hover:scale-110 group-hover:rotate-6">
                <Activity className="h-[400px] w-[400px] text-red-500" />
            </div>

            <div className="relative z-20 flex flex-col md:flex-row gap-10 items-start md:items-center justify-between">
                <div className="space-y-8 max-w-3xl">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="font-bold text-[10px] uppercase tracking-[0.25em] text-red-400">New Protocol Available</span>
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-5xl md:text-6xl font-light tracking-tighter text-foreground leading-[0.95]">
                            Understanding Anemia <br />
                            <span className="font-serif italic text-red-500/90">& Your Health.</span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed text-lg md:text-xl font-light max-w-2xl text-balance">
                            Unveil the silent markers of anemia with precision. Anemo leverages <span className="text-foreground font-medium">neural diagnostics</span> to decode your hematological data into personalized health protocols.
                        </p>
                    </div>
                </div>

                <Button 
                    size="lg" 
                    className="relative overflow-hidden rounded-full h-20 px-10 group/btn bg-foreground text-background hover:bg-red-600 hover:text-white transition-all duration-500 shadow-2xl hover:shadow-[0_20px_50px_-10px_rgba(220,38,38,0.5)] border border-white/10" 
                    asChild
                >
                    <Link href="/dashboard/about-anemia" className="flex items-center gap-4">
                        <div className="flex flex-col items-start text-left">
                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 group-hover/btn:opacity-100 transition-opacity">Explore</span>
                            <span className="text-lg font-medium tracking-tight">Access Guide</span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-red-600 transition-all duration-500">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </Link>
                </Button>
            </div>
        </motion.div>

        {/* --- Bento Grid Layout --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 auto-rows-[minmax(240px,auto)]">
          
          {/* 1. HERO: Start New Analysis (Deep Red/Crimson Theme) */}
          <BentoCard 
            colSpan="col-span-1 md:col-span-4 lg:col-span-4" 
            rowSpan="row-span-2"
            className="bg-gradient-to-br from-red-600/30 via-background to-background border-red-500/30 cursor-pointer group overflow-hidden shadow-[0_20px_60px_-15px_rgba(220,38,38,0.15)]"
            onClick={() => window.location.href = '/dashboard/analysis'}
          >
              {/* Ultra Modern Radial Blur */}
              <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-red-600/40 rounded-full blur-[160px] group-hover:bg-red-600/50 transition-colors duration-1000 mix-blend-multiply dark:mix-blend-screen" />
              <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-[140px]" />
              
              <div className="relative z-10 h-full p-12 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="p-5 bg-red-600/10 rounded-3xl backdrop-blur-xl border border-red-500/20 shadow-2xl shadow-red-500/20 group-hover:scale-110 transition-transform duration-700">
                        <Camera className="h-10 w-10 text-red-500" />
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-red-600/10 border border-red-500/20 shadow-lg shadow-red-500/10 backdrop-blur-md">
                      <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-red-500">Live Feed</span>
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_theme(colors.red.500)]" />
                    </div>
                  </div>
                  
                  <div className="max-w-xl space-y-8">
                      <h2 className="text-7xl md:text-9xl font-light tracking-tighter text-foreground leading-none drop-shadow-sm">
                          Visual <span className="font-medium text-red-600 italic">Scan</span>
                      </h2>
                      <p className="text-2xl text-muted-foreground font-extralight leading-relaxed max-w-lg">
                          Neural analysis for hematological markers via non-invasive imaging.
                      </p>
                      <div className="flex items-center gap-8 pt-6">
                        <Button className="rounded-full px-14 py-9 bg-red-600 hover:bg-red-500 text-white shadow-[0_20px_50px_-10px_rgba(220,38,38,0.5)] transition-all duration-500 hover:scale-105 active:scale-95 text-sm font-bold tracking-[0.2em] uppercase border-none ring-offset-2 ring-red-600/20">
                          Launch Analysis
                        </Button>
                        <div className="h-px w-40 bg-gradient-to-r from-red-500/60 to-transparent" />
                      </div>
                  </div>
              </div>
          </BentoCard>

          {/* 2. Risk Score (Premium Gold/Amber Theme) */}
          <BentoCard 
            colSpan="col-span-1 md:col-span-2 lg:col-span-2" 
            rowSpan="row-span-2" 
            className="p-10 justify-between bg-gradient-to-b from-amber-500/30 via-background to-background border-amber-500/30 group shadow-[0_20px_60px_-15px_rgba(245,158,11,0.15)]"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] -mr-40 -mt-40 mix-blend-screen" />
            
            <div className="relative z-10 flex justify-between items-start">
               <div className="space-y-1">
                 <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Insight</h3>
                 <p className="text-sm font-medium tracking-tight text-muted-foreground">Anemia Risk Index</p>
               </div>
               <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                 <TrendingUp className="h-5 w-5 text-amber-500" />
               </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center space-y-12 my-10">
               {latestImage ? (
                  <>
                     <div className="relative">
                        <div className="absolute inset-0 bg-amber-500/40 blur-[100px] rounded-full scale-150 animate-pulse duration-[3000ms]" />
                        <span className="relative text-[10rem] font-thin tracking-tighter text-foreground leading-none drop-shadow-2xl">
                           {latestImage.riskScore}
                        </span>
                        <div className="absolute top-10 -right-10 flex items-center justify-center">
                           <div className="h-6 w-6 rounded-full bg-red-500 animate-pulse shadow-[0_0_25px_rgba(239,68,68,1)]" />
                        </div>
                     </div>
                     <div className="w-full space-y-4">
                       <div className="h-2 w-full bg-amber-500/10 rounded-full overflow-hidden backdrop-blur-sm border border-amber-500/10">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${latestImage.riskScore}%` }}
                           transition={{ duration: 2, ease: "easeOut" }}
                           className="h-full bg-amber-500 shadow-[0_0_25px_theme(colors.amber.500)]" 
                         />
                       </div>
                       <div className="flex justify-between text-[10px] uppercase tracking-[0.4em] font-black text-muted-foreground/60">
                         <span>Normal</span>
                         <span>Critical</span>
                       </div>
                     </div>
                  </>
               ) : (
                  <div className="text-center space-y-6 py-12 opacity-50">
                     <div className="w-32 h-32 rounded-full border border-dashed border-amber-500/60 flex items-center justify-center mx-auto bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                       <Activity className="h-14 w-14 text-amber-500" />
                     </div>
                     <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500">Awaiting Calibration</p>
                  </div>
               )}
            </div>
            
            <Button variant="ghost" className="relative z-10 w-full justify-between group/btn hover:bg-amber-500/10 rounded-3xl h-18 border border-amber-500/20 transition-all px-8 py-6 backdrop-blur-sm" asChild>
                <Link href="/dashboard/history">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Historical Data</span>
                    <div className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 group-hover/btn:bg-amber-500 group-hover/btn:text-white transition-all shadow-lg shadow-amber-500/10">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                </Link>
            </Button>
          </BentoCard>

          {/* 3. AI Assistant (Deep Indigo/Blue Theme) */}
          <BentoCard 
            colSpan="col-span-1 md:col-span-2 lg:col-span-3" 
            className="p-12 justify-between bg-gradient-to-br from-blue-600/30 via-background to-background border-blue-500/30 hover:border-blue-500/50 transition-all duration-700 group overflow-hidden shadow-[0_20px_60px_-15px_rgba(37,99,235,0.15)]"
          >
             <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[140px] group-hover:bg-blue-600/35 transition-colors duration-700 mix-blend-screen" />
             
             <div className="relative z-10 flex items-center gap-8">
                 <div className="p-6 rounded-[2rem] bg-blue-600/10 text-blue-500 border border-blue-500/20 group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-blue-500/20">
                    <MessageSquare className="h-10 w-10" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-3xl font-light tracking-tight">Anemo Bot</h3>
                    <p className="text-sm text-muted-foreground font-light tracking-widest uppercase">AI Health Intelligence</p>
                 </div>
             </div>
             
             <div className="relative z-10 flex justify-between items-end mt-16">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-4 border-background bg-blue-500/20 backdrop-blur-md shadow-lg" />
                  ))}
                </div>
                <Button variant="outline" className="rounded-full border-blue-500/20 bg-blue-500/5 hover:bg-blue-600 text-blue-500 hover:text-white transition-all duration-500 px-12 py-8 text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-500/5 hover:shadow-blue-500/30" asChild>
                    <Link href="/dashboard/chatbot" className="flex items-center gap-3">
                      Start Session <Sparkles className="h-4 w-4" />
                    </Link>
                </Button>
             </div>
          </BentoCard>

          {/* 4. Find Care (Deep Emerald/Teal Theme) */}
          <BentoCard 
            colSpan="col-span-1 md:col-span-2 lg:col-span-3" 
            className="p-12 justify-between bg-gradient-to-br from-emerald-600/30 via-background to-background border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-700 group shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)]"
          >
             <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-[100px] -mr-32 -mt-32 mix-blend-screen" />

             <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-8">
                    <div className="p-6 rounded-[2rem] bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 group-hover:-rotate-12 transition-all duration-500 shadow-xl shadow-emerald-500/20">
                        <MapPin className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-light tracking-tight">Nearby Clinics</h3>
                        <p className="text-sm text-muted-foreground font-light tracking-wide flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                          {location}
                        </p>
                    </div>
                </div>
             </div>
             
             <div className="relative z-10 flex justify-between items-center mt-16">
                <div className="flex items-center gap-4">
                    {isLoadingClinics ? (
                       <HeartLoader size={24} strokeWidth={2.5} />
                    ) : (
                        <div className="flex -space-x-5">
                          {clinics.slice(0,4).map((c, i) => (
                            <div key={i} className="h-14 w-14 rounded-full bg-background border-4 border-emerald-500/10 flex items-center justify-center text-sm font-bold shadow-2xl ring-4 ring-background/50 hover:z-50 transition-all hover:scale-110 cursor-pointer uppercase text-emerald-600 dark:text-emerald-400">
                                {c.name[0]}
                            </div>
                          ))}
                        </div>
                    )}
                </div>
                <Button variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-600 text-emerald-500 hover:text-white transition-all duration-500 px-12 py-8 text-xs font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/30" asChild>
                    <Link href="/dashboard/find-doctor">Locate Care</Link>
                </Button>
             </div>
          </BentoCard>

          {/* 5. Cycle Tracker (Conditional) - Rose Theme */}
          {userSex === 'Female' && (
             <BentoCard 
                colSpan="col-span-1 md:col-span-4 lg:col-span-6" 
                className="p-12 bg-gradient-to-r from-rose-500/20 via-transparent to-transparent border border-rose-500/20 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.1)]"
             >
                <div className="flex flex-col md:flex-row gap-12 items-center h-full">
                   <div className="md:w-1/3 space-y-6">
                      <div className="flex items-center gap-3 text-rose-500">
                         <Calendar className="h-6 w-6" />
                         <span className="font-bold text-xs uppercase tracking-[0.2em]">Cycle Correlation</span>
                      </div>
                      <h3 className="text-4xl font-light tracking-tight">Hormonal Insights</h3>
                      <p className="text-muted-foreground leading-relaxed text-lg">
                         Visualize how your cycle phases correlate with your hemoglobin levels to understand your body's rhythm.
                      </p>
                      <CycleLogForm trigger={<Button variant="outline" className="rounded-full border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white h-12 px-8 uppercase tracking-widest text-xs font-bold">Log Cycle</Button>} />
                   </div>
                   <div className="flex-1 w-full h-[250px] glass-panel rounded-[2rem] flex items-center justify-center overflow-hidden shadow-inner border border-rose-500/10">
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

          {/* Water Reminder (Blue Theme Container) */}
          <BentoCard 
            colSpan="col-span-1 md:col-span-2 lg:col-span-3" 
            className="p-0 border-blue-500/30 overflow-visible shadow-[0_30px_80px_-20px_rgba(59,130,246,0.3)] bg-gradient-to-br from-blue-600/20 via-blue-900/5 to-background relative group"
          >
             <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-500/30 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[5000ms]" />
             <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-500/20 rounded-full blur-[100px] mix-blend-screen" />
             <WaterReminder />
          </BentoCard>

          {/* 6. Iron Catcher Game (Strong Premium Red Theme) */}
          <BentoCard 
             colSpan="col-span-1 md:col-span-2 lg:col-span-3" 
             className="game-thumbnail-container relative border-none cursor-pointer group overflow-hidden bg-background shadow-[0_40px_100px_-20px_rgba(220,38,38,0.5)]"
             onClick={() => window.location.href = '/dashboard/games/iron-catcher'}
          >
             {/* Premium Red Gradient Background - Deeper & Richer */}
             <div className="absolute inset-0 bg-gradient-to-br from-red-800 via-rose-900 to-black transition-all duration-700 group-hover:scale-105" />
             
             {/* Dynamic Noise Texture */}
             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
             
             {/* Radial Glows - Enhanced for Ultra Premium Look */}
             <div className="absolute top-[-50%] right-[-20%] w-[120%] h-[120%] bg-red-600/60 rounded-full blur-[160px] mix-blend-screen animate-pulse duration-[4000ms]" />
             <div className="absolute bottom-[-30%] left-[-10%] w-[80%] h-[80%] bg-orange-600/40 rounded-full blur-[140px] mix-blend-screen" />

             <div className="relative z-10 h-full p-10 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                   <div className="p-4 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl group-hover:bg-white/20 transition-all duration-500">
                      <ArrowUpRight className="h-8 w-8 text-white group-hover:rotate-45 transition-transform duration-500" />
                   </div>
                   <Badge className="bg-black/60 backdrop-blur-md hover:bg-black/80 text-white border border-white/10 uppercase tracking-[0.3em] text-[10px] px-4 py-2 font-black shadow-xl">Arcade</Badge>
                </div>

                <div className="flex items-center justify-center py-6 relative">
                     {/* 3D Cell Representation */}
                     <div className="relative group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                        <div className="absolute inset-0 bg-red-500 blur-[100px] opacity-100 animate-pulse" />
                        <div className="w-44 h-44 bg-gradient-to-br from-red-600 to-rose-950 rounded-full flex items-center justify-center shadow-[0_30px_80px_-15px_rgba(220,38,38,0.9)] border-t border-white/50 relative z-10 overflow-hidden ring-4 ring-white/10">
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                           <div className="w-28 h-28 bg-rose-950/50 rounded-full shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)] blur-[2px]" />
                        </div>
                     </div>
                </div>

                <div className="space-y-8 text-center">
                   <div className="space-y-2">
                      <h3 className="text-5xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">Iron Catcher</h3>
                      <p className="text-red-100 text-xs font-bold uppercase tracking-[0.4em] drop-shadow-lg">Hemoglobin Rush</p>
                   </div>
                   
                   <Button variant="secondary" className="w-full rounded-full font-bold shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] bg-white text-red-600 hover:bg-red-50 hover:text-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 h-16 uppercase tracking-[0.2em] text-xs border-0">
                      Start Game
                   </Button>
                </div>
             </div>
          </BentoCard>

        </div>

        {/* --- Nutrition Ticker (Infinite Scroll) --- */}
        <motion.div variants={itemVariants} className="pt-8 -mx-6 md:-mx-12 lg:-mx-20 overflow-hidden">
           <div className="flex items-center gap-4 mb-8 px-6 md:px-12 lg:px-20">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="flex items-center gap-2 text-primary/60">
                 <Sparkles className="h-4 w-4" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Nutritional Protocol</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
           </div>
           <NutritionTicker />
        </motion.div>

      </motion.div>
      
      <ChatbotPopup />
    </div>
  );
}