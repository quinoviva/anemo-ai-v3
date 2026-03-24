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
        backgroundColor: theme === 'dark' ? '#020202' : '#ffffff',
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
      <div className="flex flex-col items-center justify-center p-10 md:p-20 space-y-12 min-h-[400px]">
        <HeartLoader size={80} strokeWidth={2.5} />
        <div className="text-center space-y-4">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-foreground italic">Compiling Telemetry</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">Neural Path Extraction...</p>
        </div>
      </div>
    );
  }
  
  if (!report) return null;

  return (
    <div className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-10 duration-700 w-full overflow-hidden">
      
      {/* Precision UI Action Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-8 glass-panel p-8 md:p-10 rounded-3xl md:rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden isolate">
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] z-0" />
        
        <div className="flex items-center gap-6 relative z-10 w-full sm:w-auto">
            <div className="w-16 h-16 rounded-[1.8rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group hover:rotate-6 transition-all">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="flex flex-col text-left">
                <h2 className="text-[clamp(1.4rem,4vw,2.4rem)] font-black text-foreground uppercase tracking-tight leading-none mb-2">Sync Locked</h2>
                <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest italic leading-none opacity-80">Telemetry Ready</span>
            </div>
        </div>

        <div className="flex gap-4 w-full sm:w-auto relative z-10">
            <Button onClick={onReset} variant="secondary" className="flex-1 sm:flex-none h-14 rounded-2xl px-8 text-[10px] font-black tracking-widest uppercase border border-white/10 hover:bg-white/5 transition-all">
                <RefreshCw className="w-5 h-5 mr-3" /> Reset
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isDownloading} className="flex-1 sm:flex-none h-14 rounded-2xl px-10 bg-primary text-white text-[10px] font-black tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_-10px_rgba(220,38,38,0.5)] group">
                {isDownloading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Download className="w-5 h-5 mr-3 group-hover:-translate-y-1 transition-transform" />} Export
            </Button>
        </div>
      </div>

      {/* Main High-Fidelity Diagnostic Terminal */}
      <div ref={reportRef} className="bg-background border border-white/5 rounded-[2.5rem] md:rounded-[4.5rem] shadow-2xl relative isolate w-full py-16 px-6 sm:p-16 md:p-24 lg:p-32 space-y-24 md:space-y-40 overflow-hidden">
          {/* Dashboard Uniform Noise & Grid */}
          <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:60px_60px] z-0" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay z-0" />
          
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px] -mr-40 -mt-40 pointer-events-none opacity-40" />
          <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[140px] -ml-20 opacity-30 pointer-events-none" />

          {/* Clinical Protocol Header */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 md:gap-24 relative z-10 border-b border-white/10 pb-20 md:pb-32">
              <div className="flex items-center gap-10 md:gap-14 w-full lg:w-auto text-left">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-background/40 glass-panel border border-primary/20 flex items-center justify-center shadow-xl rotate-3 shrink-0 relative isolate">
                      <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-2xl opacity-40 animate-pulse" />
                      <HeartPulse className="h-14 w-14 md:h-20 md:w-20 text-primary relative z-10" />
                  </div>
                  <div className="flex flex-col text-left">
                       <Badge variant="outline" className="w-fit px-5 py-1.5 mb-6 border-primary/40 text-primary text-[9px] font-black tracking-widest uppercase">NODE-ILOILO-PANAY</Badge>
                       <h1 className="text-[clamp(2.5rem,10vw,7rem)] font-black text-foreground tracking-tighter uppercase italic leading-[0.8]">Anemo.<span className="text-primary italic-font">Matrix</span></h1>
                       <div className="mt-8 flex items-center gap-4">
                           <Activity className="w-5 h-5 text-emerald-500" />
                           <p className="text-[11px] md:text-[13px] font-black text-muted-foreground uppercase tracking-[0.4em] italic leading-none opacity-60">Neural Telemetry</p>
                       </div>
                  </div>
              </div>
              <div className="text-left md:text-right w-full lg:w-auto opacity-40 space-y-4">
                  <p className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.4em] mb-2 leading-none">Log Sequence Point</p>
                  <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">{format(new Date(), 'PPP')}</p>
              </div>
          </div>

          {/* Primary Result Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 relative z-10">
              {/* Verdict Card */}
              <div className="lg:col-span-8 p-12 md:p-16 lg:p-20 rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-primary/10 via-background to-background glass-panel border border-white/5 flex flex-col justify-between min-h-[350px] md:min-h-[450px] relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-16 opacity-[0.05] grayscale group-hover:rotate-12 transition-transform duration-1000">
                     <Dna className="w-80 h-80 text-primary" />
                  </div>
                  <div className="flex items-center gap-6 mb-12 flex-wrap relative z-10">
                      <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20"><Zap className="w-6 h-6 text-primary" /></div>
                      <span className="text-[12px] font-black text-primary uppercase tracking-[0.4em] italic">Hematological Diagnosis</span>
                  </div>
                  <div className="relative z-10 space-y-6">
                      <h3 className="text-[clamp(3rem,8vw,7.5rem)] font-black text-foreground tracking-tighter uppercase italic leading-[0.8] drop-shadow-2xl">{report.anemiaType}</h3>
                      <div className="h-1.5 w-48 bg-gradient-to-r from-primary to-transparent rounded-full mt-10" />
                  </div>
              </div>
              
              {/* Score Indicie Card */}
              <div className="lg:col-span-4 p-12 md:p-16 lg:p-20 rounded-[3rem] md:rounded-[4rem] bg-gradient-to-b from-amber-500/10 via-background to-background glass-panel border border-amber-500/20 flex flex-col items-center justify-center text-center gap-10 group transition-all duration-700 shadow-2xl">
                  <div className="relative">
                      <div className="absolute inset-0 bg-amber-500/40 blur-[100px] rounded-full scale-150 animate-pulse" />
                      <h4 className="relative text-[clamp(6rem,12vw,11rem)] font-[100] tracking-tighter italic leading-none text-foreground drop-shadow-2xl">{report.confidenceScore}<span className="text-xl md:text-3xl text-amber-500 opacity-40 ml-1">%</span></h4>
                  </div>
                  <div className="space-y-4">
                       <span className="text-[12px] font-black text-amber-500 uppercase tracking-[0.4em] italic leading-none opacity-80">Precision Score</span>
                       <div className="flex gap-3 justify-center">{[1,2,3,4,5].map(i => <div key={i} className="w-3 h-3 rounded-full bg-amber-500/30 animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}</div>
                  </div>
              </div>
          </div>

          {/* Multimodal Spectral Lock Grid */}
          <div className="space-y-16 relative z-10">
               <div className="flex items-center gap-8">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shrink-0"><LayoutGrid className="w-6 h-6 text-primary opacity-60" /></div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                    <h4 className="text-[clamp(1.2rem,4vw,2.4rem)] font-black uppercase tracking-[0.6em] italic whitespace-nowrap drop-shadow-sm">Parameter Extraction</h4>
                    <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-14 lg:gap-16">
                    {Object.entries(analyses).map(([key, value], idx) => {
                        const sColor = getColorByPart(key);
                        return (
                            <div key={key} className="flex flex-col gap-10 group">
                                <div className={cn("aspect-[4/5] w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-white/5 shadow-2xl group-hover:scale-[1.02] active:scale-95 transition-all duration-700 relative isolate bg-background/40")}>
                                    <img src={value.imageUrl!} className="w-full h-full object-cover grayscale transition-opacity duration-1000" />
                                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent p-10 flex flex-col justify-end">
                                        <Badge variant="outline" className={cn("w-fit px-4 h-8 mb-4 border-primary/20 font-black uppercase tracking-widest text-[9px]", 
                                            sColor === 'amber' ? 'text-amber-500 border-amber-500/30' : 
                                            sColor === 'red' ? 'text-red-500 border-red-500/30' : 'text-blue-500 border-blue-500/30')}>PROTOCOL-PX0{idx+1}</Badge>
                                        <h5 className="text-[clamp(1.5rem,3vw,2.5rem)] font-black text-white uppercase italic tracking-tighter leading-none">{key.replace('-', ' ')}</h5>
                                    </div>
                                </div>
                                <div className={cn("px-8 py-2 space-y-4 text-left border-l-4 transition-all", 
                                    sColor === 'amber' ? 'border-amber-500' : sColor === 'red' ? 'border-red-500' : 'border-blue-500')}>
                                    <span className={cn("text-[clamp(11px,2vw,14px)] font-black uppercase tracking-widest block italic opacity-80", 
                                        sColor === 'amber' ? 'text-amber-500' : sColor === 'red' ? 'text-red-500' : 'text-blue-500')}>{value.analysisResult}</span>
                                    <p className="text-[clamp(13px,1.5vw,16px)] text-muted-foreground font-bold uppercase tracking-[0.1em] leading-relaxed opacity-60 line-clamp-4 italic text-balance">
                                        {value.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
               </div>
          </div>

          {/* Clinical Verdict Synthesis */}
          <div className="space-y-12 text-left relative z-10 max-w-6xl">
              <div className="flex items-center gap-8 opacity-40">
                  <Search className="w-6 h-6 text-primary" />
                  <span className="text-[12px] font-black uppercase tracking-[0.5em] leading-none">Diagnostic Logic Lock</span>
              </div>
              <div className="p-12 md:p-20 lg:p-28 rounded-[3.5rem] md:rounded-[5.5rem] bg-gradient-to-br from-primary/5 via-background to-background glass-panel border border-white/10 italic text-[clamp(1.8rem,5vw,3.8rem)] font-extralight text-foreground border-l-[12px] border-primary leading-[1.3] pl-16 md:pl-24 relative overflow-hidden shadow-2xl drop-shadow-2xl">
                  <div className="absolute top-0 right-0 p-16 opacity-[0.03] scale-150 rotate-12 text-primary animate-slow-pulse"><Sparkles className="w-64 h-64 text-primary" /></div>
                  "{report.recommendations.split('\n')[0].replace(/^[*-]\s*/, '')}"
              </div>
          </div>

          {/* Clinical Lab Sync */}
          {labReport && (
                <div className="p-12 md:p-20 lg:p-32 rounded-[4rem] md:rounded-[6rem] bg-gradient-to-br from-blue-600/10 via-background/60 to-background glass-panel border border-blue-500/20 space-y-16 md:space-y-24 relative overflow-hidden isolate shadow-2xl">
                    <div className="absolute inset-x-[-100px] blur-[140px] bg-blue-600/10 rounded-full opacity-40" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-12 text-left relative z-10 w-full border-b border-white/10 pb-16">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-blue-600/20 rounded-[2.5rem] flex items-center justify-center border border-blue-500/30 shrink-0 shadow-lg">
                            <FlaskConical className="w-12 h-12 md:w-16 md:h-16 text-blue-500" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-[clamp(2.5rem,8vw,5.5rem)] font-black text-foreground tracking-tighter uppercase italic leading-[0.85]">Clinical <span className="text-blue-500 italic-font">Fibre</span></h3>
                            <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-4 italic opacity-80 leading-none">Integrated Laboratory Diagnostic Protocol</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 relative z-10">
                        {labReport.parameters.map((p, idx) => (
                            <div key={idx} className="bg-background/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-blue-500/10 flex flex-col gap-10 text-left group hover:border-blue-500/40 transition-all duration-700 shadow-xl">
                                <div className="flex justify-between items-start opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none group-hover:text-blue-500 italic">{p.parameter}</span>
                                    <Activity className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex items-baseline gap-2 relative">
                                    <span className="relative text-5xl lg:text-6xl font-black font-mono tracking-tighter leading-none group-hover:scale-105 transition-transform duration-700 drop-shadow-xl">{p.value}</span>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">{p.unit}</span>
                                </div>
                                <div className={cn("px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest text-center shadow-lg transition-all uppercase", 
                                    p.isNormal ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20")}>
                                    {p.isNormal ? 'NOMINAL' : 'CRITICAL'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          {/* Institutional Warning Block */}
          <div className="p-16 md:p-24 lg:p-32 rounded-[4rem] md:rounded-[6rem] bg-red-950/50 border-t-8 border-red-600 relative isolate flex flex-col items-center gap-12 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent z-0" />
              <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 text-red-600 animate-slow-pulse"><ShieldAlert className="w-[400px] h-[400px]" /></div>
              
              <div className="flex flex-col items-center gap-8 text-red-500 relative z-10">
                  <div className="p-8 bg-red-600/20 rounded-[2.5rem] border border-red-600/30 animate-pulse transition-all shadow-2xl shadow-red-600/30"><AlertCircle className="w-12 h-12 md:w-16 md:h-16 drop-shadow-xl" /></div>
                  <h4 className="text-[clamp(1.8rem,5vw,4.5rem)] font-black uppercase tracking-[0.8em] italic leading-none drop-shadow-2xl">Medical Disclaimer</h4>
              </div>
              <p className="text-[clamp(12px,1.5vw,18px)] text-red-50/70 leading-[1.8] uppercase font-black tracking-[0.2em] max-w-[90%] mx-auto text-center relative z-10 px-6 drop-shadow-xl italic text-balance">
                  Neural assessment node v3.4.1 performs diagnostic spectral interpretations for preliminary hematological screening. Output is probabilistic only. Venous diagnosis at node ILO-PANAY is mandatory for official medical clearance. Consult your institution specialist immediately.
              </p>
          </div>

          {/* Abstract Footer */}
          <footer className="text-center pt-24 md:pt-40 pb-20 opacity-40 space-y-16 relative z-10 grayscale border-t border-white/5 mx-[-40px]">
               <div className="flex items-center justify-center gap-16 md:gap-32">
                   <div className="flex flex-col items-center gap-6 group hover:text-primary transition-all cursor-crosshair">
                       <Dna className="w-12 h-12" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none">Matrix Lock</span>
                   </div>
                   <div className="h-16 w-px bg-white/10" />
                   <div className="flex flex-col items-center gap-6 group hover:text-primary transition-all cursor-crosshair">
                       <Cpu className="w-12 h-12" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none">Node Synapse</span>
                   </div>
               </div>
               <div className="space-y-6">
                    <p className="text-[10px] font-mono uppercase tracking-widest font-black">© 2026 Anemo Biometrics // ILOILO // Node-01</p>
                    <div className="flex items-center justify-center gap-6 text-[9px] font-black uppercase tracking-widest opacity-40 italic">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Core Online</span>
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span>Signal Lock</span>
                    </div>
               </div>
          </footer>

      </div>
    </div>
  );
}
