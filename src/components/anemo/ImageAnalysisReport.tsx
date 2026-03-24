'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  runProvidePersonalizedRecommendations,
  runFindNearbyClinics,
} from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Download, 
  HeartPulse, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  FlaskConical,
  AlertCircle,
  Zap,
  TrendingUp,
  Award,
  Cpu,
  Dna,
  Terminal,
  Search,
  LayoutGrid,
  Loader2,
  Table,
  Hospital,
  Stethoscope,
  ExternalLink,
  Leaf,
  Activity,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import HeartLoader from '@/components/ui/HeartLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Badge } from '../ui/badge';

export type AnalysisState = {
  file: File | null;
  imageUrl: string | null;
  dataUri: string | null;
  calibrationMetadata: any | null;
  description: string | null;
  isValid: boolean;
  analysisResult: string | null;
  confidenceScore?: number;
  error: string | null;
  status: 'idle' | 'analyzing' | 'success' | 'error' | 'queued';
};

type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
};

type ImageAnalysisReportProps = {
  analyses: Record<string, AnalysisState>;
  labReport: AnalyzeCbcReportOutput | null;
  onReset: () => void;
};

export function ImageAnalysisReport({ analyses, labReport, onReset }: ImageAnalysisReportProps) {
  const [report, setReport] = useState<PersonalizedRecommendationsOutput | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('Iloilo City');
  const { theme } = useTheme();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  const hasSavedRef = useRef(false);

  const allImageDescriptions = Object.entries(analyses)
    .map(([key, value]) => `Result for ${key}: ${value.analysisResult}`)
    .join('\n');
  
  const labReportSummary = labReport ? `Lab Report Summary: ${labReport.summary}` : '';

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  useEffect(() => {
    if (userData) {
      if (userData.address) setUserLocation(userData.address);
    }
  }, [userData]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      let userProfileString = `User's location: ${userLocation}`;
      if (userData) {
        const medicalInfo = userData.medicalInfo || {};
        userProfileString = `Name: ${userData.firstName || ''} ${userData.lastName || ''}, Location: ${userData.address || 'Iloilo City'}, Conditions: ${medicalInfo.conditions || 'N/A'}`;
      }
      const reportResult = await runProvidePersonalizedRecommendations({
          imageAnalysis: allImageDescriptions,
          labReport: labReportSummary,
          userProfile: userProfileString,
      });
      setReport(reportResult);
      if (isOnline) {
          try {
            const clinicsResult = await runFindNearbyClinics({ query: userLocation });
            setClinics(clinicsResult.results.slice(0, 5));
          } catch (e) {
              console.warn("Clinic fetch failed", e);
          }
      }
      if (user && !user.isAnonymous && firestore && reportResult && !hasSavedRef.current) {
        hasSavedRef.current = true;
        const reportCollection = collection(firestore, `users/${user.uid}/imageAnalyses`);
        await addDoc(reportCollection, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          riskScore: reportResult.riskScore,
          anemiaType: reportResult.anemiaType,
          confidenceScore: reportResult.confidenceScore,
          recommendations: reportResult.recommendations,
          imageAnalysisSummary: allImageDescriptions,
          labReportSummary: labReportSummary,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [allImageDescriptions, labReportSummary, user, firestore, userLocation, isOnline, userData]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#040404' : '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfImgHeight);
      pdf.save(`ANEMO-REPORT-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: "Clinical Report Exported" });
    } catch (error) {
      toast({ title: "Export Error", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const getColorByPart = (part: string) => {
      if (part === 'skin') return 'amber';
      if (part === 'under-eye') return 'red';
      if (part === 'fingernails') return 'blue';
      return 'primary';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 md:p-24 space-y-16 min-h-[500px]">
        <HeartLoader size={100} strokeWidth={2.5} />
        <div className="text-center space-y-6">
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-[0.4em] text-foreground italic leading-none">Compiling Matrix</h3>
            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-primary/60 animate-pulse">Neural Thread Extraction...</p>
        </div>
      </div>
    );
  }
  
  if (!report) return null;

  return (
    <div className="space-y-16 md:space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 w-full overflow-hidden">
      
      {/* Refined Functional Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-10 glass-panel p-10 md:p-12 rounded-[2.8rem] border border-white/10 shadow-[-20px_-20px_60px_rgba(255,255,255,0.01),20px_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden isolate">
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] z-0" />
        
        <div className="flex items-center gap-8 relative z-10 w-full sm:w-auto">
            <div className="w-20 h-20 rounded-[2.2rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-2xl transition-transform hover:scale-110">
                <ShieldCheck className="w-12 h-12 text-emerald-500 drop-shadow-xl" />
            </div>
            <div className="flex flex-col text-left">
                <h2 className="text-[clamp(1.6rem,4vw,2.8rem)] font-black text-foreground uppercase tracking-tighter leading-none mb-3 italic">Telemetry Lock</h2>
                <span className="text-[11px] font-black text-emerald-500/80 uppercase tracking-[0.4em] italic leading-none opacity-80">Synchronized and Secure</span>
            </div>
        </div>

        <div className="flex gap-6 w-full sm:w-auto relative z-10">
            <Button onClick={onReset} variant="secondary" className="flex-1 sm:flex-none h-16 rounded-[1.8rem] px-10 text-[11px] font-black tracking-[0.4em] uppercase border border-white/10 hover:bg-white/5 transition-all shadow-xl">
                <RefreshCw className="w-5 h-5 mr-4" /> Reset
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isDownloading} className="flex-1 sm:flex-none h-16 rounded-[1.8rem] px-12 bg-primary text-white text-[11px] font-black tracking-[0.6em] uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_30px_80px_-15px_rgba(220,38,38,0.6)] group">
                {isDownloading ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Download className="w-6 h-6 mr-4 group-hover:-translate-y-2 transition-transform duration-500" />} Export PDF
            </Button>
        </div>
      </div>

      {/* Main High-Contrast Diagnostic Terminal */}
      <div ref={reportRef} className="bg-[#040404] border border-white/5 rounded-[3.5rem] md:rounded-[5.5rem] shadow-[-40px_-40px_100px_rgba(255,255,255,0.01),40px_40px_100px_rgba(0,0,0,0.8)] relative isolate w-full py-24 px-8 sm:p-24 md:p-32 lg:p-40 space-y-32 md:space-y-48 overflow-hidden">
          {/* Dashboard Uniform Noise & Grid */}
          <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:60px_60px] z-0" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay z-0" />
          
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[220px] -mr-60 -mt-60 pointer-events-none opacity-30 animate-slow-pulse" />
          <div className="absolute bottom-40 left-0 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[180px] -ml-40 opacity-20 pointer-events-none" />

          {/* High-Contrast Header */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-20 md:gap-32 relative z-10 border-b border-white/10 pb-24 md:pb-40">
              <div className="flex items-center gap-14 md:gap-20 w-full lg:w-auto text-left">
                  <div className="w-32 h-32 md:w-44 md:h-44 rounded-[3rem] bg-background/20 backdrop-blur-3xl border border-primary/30 flex items-center justify-center shadow-[0_40px_80px_-10px_rgba(0,0,0,0.6)] group relative isolate rotate-2">
                      <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-3xl opacity-40 group-hover:scale-125 transition-transform duration-1000" />
                      <HeartPulse className="h-16 w-16 md:h-24 md:w-24 text-primary relative z-10 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]" />
                  </div>
                  <div className="flex flex-col text-left">
                       <Badge variant="outline" className="w-fit px-6 h-10 mb-8 border-primary/40 text-primary text-[10px] font-black tracking-[0.4em] uppercase shadow-xl">TERMINAL-ILO-NX3</Badge>
                       <h1 className="text-[clamp(3rem,12vw,9rem)] font-black text-white tracking-tighter uppercase italic leading-[0.7] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">Anemo.<span className="text-primary italic-font">Matrix</span></h1>
                       <div className="mt-12 flex items-center gap-6">
                           <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                           <p className="text-[12px] md:text-sm font-black text-muted-foreground uppercase tracking-[0.6em] italic leading-none opacity-80">Neural Telemetry Point</p>
                       </div>
                  </div>
              </div>
              <div className="text-left md:text-right w-full lg:w-auto opacity-60 space-y-6 lg:mt-12">
                  <p className="text-[14px] font-black uppercase tracking-[0.8em] mb-4 leading-none text-muted-foreground">Log Sequence // X003</p>
                  <p className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-foreground">{format(new Date(), 'PPP')}</p>
              </div>
          </div>

          {/* Precision Result Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 relative z-10">
              {/* Verdict Card */}
              <div className="lg:col-span-8 p-16 md:p-20 lg:p-24 rounded-[3.5rem] md:rounded-[4.5rem] bg-gradient-to-br from-primary/10 via-[#050505] to-[#010101] border border-white/10 flex flex-col justify-between min-h-[400px] md:min-h-[550px] relative overflow-hidden group shadow-[-30px_-30px_100px_rgba(255,255,255,0.01),30px_30px_100px_rgba(0,0,0,1)]">
                  <div className="absolute top-0 right-0 p-20 opacity-[0.06] grayscale group-hover:rotate-12 group-hover:scale-125 transition-all duration-1000">
                     <Dna className="w-[500px] h-[500px] text-primary" />
                  </div>
                  <div className="flex items-center gap-8 mb-16 relative z-10">
                      <div className="p-5 bg-primary/20 rounded-2xl border border-primary/30 shadow-2xl"><Zap className="w-8 h-8 text-primary shadow-xl" /></div>
                      <span className="text-[13px] font-black text-primary/80 uppercase tracking-[0.6em] italic leading-none">High Fidelity Classification</span>
                  </div>
                  <div className="relative z-10 space-y-10">
                      <h3 className="text-[clamp(4.5rem,10vw,9.5rem)] font-black text-white tracking-tighter uppercase italic leading-[0.75] mb-12 drop-shadow-2xl">{report.anemiaType}</h3>
                      <div className="h-2 w-72 bg-gradient-to-r from-primary via-primary/40 to-transparent rounded-full mt-12" />
                  </div>
              </div>
              
              {/* Refined Score Indicie Card */}
              <div className="lg:col-span-4 p-16 md:p-20 lg:p-24 rounded-[3.5rem] md:rounded-[4.5rem] bg-gradient-to-b from-amber-500/10 via-[#050505] to-[#010101] border border-amber-500/30 flex flex-col items-center justify-center text-center gap-14 group transition-all duration-1000 shadow-2xl relative isolate overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:20px_20px]" />
                  <div className="relative isolate">
                      <div className="absolute inset-0 bg-amber-500/40 blur-[120px] rounded-full scale-150 animate-pulse opacity-40" />
                      <h4 className="relative text-[clamp(8rem,15vw,14rem)] font-[200] tracking-tighter italic leading-none text-white drop-shadow-[0_20px_50px_rgba(0,0,0,1)]">{report.confidenceScore}<span className="text-2xl md:text-5xl text-amber-500 opacity-60 ml-2 italic-font font-black">%</span></h4>
                  </div>
                  <div className="space-y-6 relative z-10">
                       <span className="text-[13px] font-black text-amber-500 uppercase tracking-[0.8em] italic leading-none opacity-80 block mb-6">Σ RELIABILITY SENSOR</span>
                       <div className="flex gap-4 justify-center">{[1,2,3,4,5,6].map(i => <div key={i} className="w-3.5 h-3.5 rounded-full bg-amber-500/40 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ animationDelay: `${i*150}ms` }} />)}</div>
                  </div>
              </div>
          </div>

          {/* Multimodal Section Enhancement */}
          <div className="space-y-24 relative z-10">
               <div className="flex items-center gap-12">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 shrink-0 shadow-lg"><LayoutGrid className="w-8 h-8 text-primary opacity-80" /></div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                    <h4 className="text-[clamp(1.5rem,4vw,3.2rem)] font-black uppercase tracking-[0.8em] italic whitespace-nowrap drop-shadow-md text-foreground">PARAMETER EXTRACTION</h4>
                    <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 sm:gap-20 lg:gap-24">
                    {Object.entries(analyses).map(([key, value], idx) => {
                        const sColor = getColorByPart(key);
                        return (
                            <div key={key} className="flex flex-col gap-12 group transition-all duration-700">
                                <div className={cn("aspect-[4/5] w-full rounded-[3.5rem] md:rounded-[4.5rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] group-hover:scale-[1.03] active:scale-95 transition-all duration-1000 relative isolate bg-black ring-1 ring-white/10")}>
                                    <img src={value.imageUrl!} className="w-full h-full object-cover grayscale transition-opacity duration-1000 group-hover:grayscale-0" />
                                    <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-black/90 to-transparent p-12 flex flex-col justify-end">
                                        <Badge variant="outline" className={cn("w-fit px-5 h-9 mb-6 border-white/20 font-black uppercase tracking-[0.4em] text-[10px] italic shadow-2xl", 
                                            sColor === 'amber' ? 'text-amber-500 border-amber-500/40 bg-amber-500/5' : 
                                            sColor === 'red' ? 'text-red-500 border-red-500/40 bg-red-500/5' : 'text-blue-500 border-blue-500/40 bg-blue-500/5')}>LOCK_PX0{idx+1}</Badge>
                                        <h5 className="text-[clamp(1.8rem,4vw,3.2rem)] font-black text-white uppercase italic tracking-tighter leading-none">{key.replace('-', ' ')}</h5>
                                    </div>
                                </div>
                                <div className={cn("px-10 py-4 space-y-6 text-left border-l-[6px] transition-all duration-700 md:min-h-[160px]", 
                                    sColor === 'amber' ? 'border-amber-500 shadow-[inset_15px_0_40px_-15px_rgba(245,158,11,0.1)]' : 
                                    sColor === 'red' ? 'border-red-500 shadow-[inset_15px_0_40px_-15px_rgba(239,68,68,0.1)]' : 
                                    'border-blue-500 shadow-[inset_15px_0_40px_-15px_rgba(59,130,246,0.1)]')}>
                                    <span className={cn("text-[clamp(13px,2vw,16px)] font-black uppercase tracking-[0.4em] block italic transition-colors leading-none", 
                                        sColor === 'amber' ? 'text-amber-500' : sColor === 'red' ? 'text-red-500' : 'text-blue-500')}>{value.analysisResult}</span>
                                    <p className="text-[clamp(14px,1.6vw,17px)] text-muted-foreground/80 font-black uppercase tracking-[0.15em] leading-[1.6] opacity-80 line-clamp-4 italic text-balance transition-opacity">
                                        {value.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
               </div>
          </div>

          {/* Deep Readability for Personalized Recommendations */}
          <div className="space-y-16 text-left relative z-10 max-w-[1200px]">
              <div className="flex items-center gap-10 opacity-60">
                  <Search className="w-8 h-8 text-primary shadow-xl" />
                  <span className="text-[14px] font-black uppercase tracking-[0.8em] leading-none mb-2">Neural Logic Synthesis</span>
              </div>
              <div className="p-16 md:p-24 lg:p-32 rounded-[4.5rem] md:rounded-[6.5rem] bg-gradient-to-br from-primary/5 via-[#020202] to-[#010101] border border-white/10 italic text-[clamp(2rem,6vw,4.5rem)] font-extralight text-foreground border-l-[16px] border-primary leading-[1.25] pl-20 md:pl-28 relative overflow-hidden shadow-[-40px_40px_100px_rgba(0,0,0,0.8)]">
                  <div className="absolute top-0 right-0 p-24 opacity-[0.04] scale-150 rotate-12 text-primary animate-slow-pulse"><Sparkles className="w-80 h-80 text-primary" /></div>
                  <div className="relative z-10 drop-shadow-xl text-balance">
                      "{report.recommendations.split('\n')[0].replace(/^[*-]\s*/, '')}"
                  </div>
              </div>
          </div>

          {/* High-Fidelity Lab Data Sync */}
          {labReport && (
                <div className="p-16 md:p-24 lg:p-40 rounded-[4.5rem] md:rounded-[7.5rem] bg-gradient-to-br from-blue-600/10 via-[#030303] to-[#010101] border border-blue-500/20 space-y-24 md:space-y-32 relative overflow-hidden isolate shadow-2xl ring-1 ring-white/5">
                    <div className="absolute inset-x-[-150px] blur-[180px] bg-blue-600/20 rounded-full opacity-30" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-16 text-left relative z-10 w-full border-b border-white/10 pb-20">
                        <div className="w-28 h-28 md:w-40 md:h-40 bg-blue-600/20 rounded-[3rem] flex items-center justify-center border border-blue-500/30 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-700">
                            <FlaskConical className="w-14 h-14 md:w-20 md:h-20 text-blue-500 drop-shadow-xl" />
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-[clamp(3rem,10vw,7rem)] font-black text-white tracking-tighter uppercase italic leading-[0.8] drop-shadow-2xl">Clinical <span className="text-blue-500 italic-font">Pulse</span></h3>
                            <p className="text-[14px] font-black text-blue-500 uppercase tracking-[0.8em] mt-8 italic opacity-80 leading-none">High Resolution Laboratory Sync</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-14 relative z-10">
                        {labReport.parameters.map((p, idx) => (
                            <div key={idx} className="bg-black/60 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-blue-500/10 flex flex-col gap-14 text-left group hover:border-blue-500/40 hover:bg-blue-900/10 transition-all duration-700 shadow-[-20px_20px_50px_rgba(0,0,0,0.6)]">
                                <div className="flex justify-between items-start opacity-50 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.4em] leading-none group-hover:text-blue-500 italic transition-colors mb-2">{p.parameter}</span>
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="w-5 h-5 text-blue-500" /></div>
                                </div>
                                <div className="flex items-baseline gap-3 relative">
                                    <span className="relative text-6xl lg:text-7xl font-black font-mono tracking-tighter leading-none group-hover:scale-110 transition-transform duration-1000 text-white drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">{p.value}</span>
                                    <span className="text-[12px] font-black text-muted-foreground/60 uppercase tracking-widest italic">{p.unit}</span>
                                </div>
                                <div className={cn("px-8 py-4 rounded-full text-[11px] font-black tracking-[0.6em] text-center shadow-2xl transition-all uppercase italic border", 
                                    p.isNormal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10")}>
                                    {p.isNormal ? 'NOMINAL-VAL' : 'CRITICAL-OOR'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          {/* High-Contrast Clinical Disclaimer */}
          <div className="p-20 md:p-32 lg:p-40 rounded-[4.5rem] md:rounded-[7.5rem] bg-[#110000] border-t-[12px] border-red-600 relative isolate flex flex-col items-center gap-16 shadow-[-40px_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent z-0 opacity-40" />
              <div className="absolute top-0 right-0 p-24 opacity-5 rotate-12 text-red-600"><ShieldAlert className="w-[500px] h-[500px]" /></div>
              
              <div className="flex flex-col items-center gap-10 text-red-500 relative z-10">
                  <div className="p-10 bg-red-600/20 rounded-[3.5rem] border border-red-600/40 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-slow-pulse"><AlertCircle className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_20px_rgba(239,68,68,1)]" /></div>
                  <h4 className="text-[clamp(2.5rem,6vw,6.5rem)] font-black uppercase tracking-[1em] italic leading-none drop-shadow-2xl">Medical Disclaimer</h4>
              </div>
              <p className="text-[clamp(14px,1.8vw,22px)] text-red-100/70 leading-[1.8] uppercase font-black tracking-[0.25em] max-w-[1000px] mx-auto text-center relative z-10 px-10 drop-shadow-xl italic text-balance">
                  Neural matrix node v3.6.2 performs diagnostic spectral interpretations for preliminary hematological screening only. Result is probabilistic. Venous validation at a certified institution is MANDATORY for clinical clearance. Consult a specialist immediately.
              </p>
          </div>

          {/* Abstract Matrix Footer */}
          <footer className="text-center pt-32 md:pt-48 pb-24 opacity-60 space-y-20 relative z-10 grayscale border-t border-white/10 mx-[-60px]">
               <div className="flex items-center justify-center gap-20 md:gap-40">
                   <div className="flex flex-col items-center gap-8 group hover:text-primary transition-all cursor-crosshair">
                       <Dna className="w-16 h-16 opacity-40 group-hover:opacity-100" />
                       <span className="text-[11px] font-black uppercase tracking-[0.6em] leading-none">Matrix Lock</span>
                   </div>
                   <div className="h-24 w-px bg-white/10" />
                   <div className="flex flex-col items-center gap-8 group hover:text-primary transition-all cursor-crosshair">
                       <Cpu className="w-16 h-16 opacity-40 group-hover:opacity-100" />
                       <span className="text-[11px] font-black uppercase tracking-[0.6em] leading-none">Node Sync</span>
                   </div>
               </div>
               <div className="space-y-8">
                    <p className="text-[11px] font-mono uppercase tracking-[0.8em] font-black italic">© 2026 Anemo Biometrics // ILOILO // Node-0xX3</p>
                    <div className="flex items-center justify-center gap-10 text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic">
                        <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <span>Core Online</span>
                        <Zap className="w-4 h-4 text-primary animate-pulse" />
                        <span>Signal Locked</span>
                    </div>
               </div>
          </footer>
      </div>
    </div>
  );
}
