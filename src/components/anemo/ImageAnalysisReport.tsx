'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  runProvidePersonalizedRecommendations,
} from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Download,
  HeartPulse,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FlaskConical,
  AlertCircle,
  Zap,
  Cpu,
  Dna,
  Search,
  LayoutGrid,
  Loader2,
  Activity,
  Copy,
  Check,
  Share2,
  Quote,
  Calculator,
  Equal,
  Info,
  ChevronRight,
  Stethoscope,
  TrendingDown,
  Microscope,
  Crosshair,
  ArrowUpRight,
  Droplets,
  Flame,
  User,
  History,
  Scale,
  Brain,
  Eye,
  Hand,
  MapPin,
  Calendar,
  Phone,
  TableProperties,
  ArrowRight,
  ChevronDown,
  Layers,
  Binary,
  Variable,
  ClipboardCheck,
  Utensils
} from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import HeartLoader from '@/components/ui/HeartLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Badge } from '../ui/badge';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Shared Components
// ─────────────────────────────────────────────────────────────────────────────

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

type ImageAnalysisReportProps = {
  analyses: Record<string, AnalysisState>;
  labReport: AnalyzeCbcReportOutput | null;
  onReset: () => void;
};

type ReportState = PersonalizedRecommendationsOutput & { imageAnalysisSummary?: string };

const BentoCard = ({ children, className = '', colSpan = 'col-span-1', rowSpan = 'row-span-1' }: { children: React.ReactNode, className?: string, colSpan?: string, rowSpan?: string }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
    className={cn("group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col border border-white/10 dark:border-white/5 shadow-2xl", colSpan, rowSpan, className)}
  >
    <div className="relative z-10 h-full w-full">{children}</div>
  </motion.div>
);

const SectionHeading = ({ title, subtitle, icon: Icon, accent = "primary" }: { title: string, subtitle: string, icon: any, accent?: string }) => (
  <div className="flex flex-col gap-3 mb-12 pr-10">
    <div className="flex items-center gap-4">
      <div className={cn("p-2.5 rounded-2xl bg-opacity-10 shadow-inner", accent === "primary" ? "bg-primary text-primary" : "bg-blue-500 text-blue-500")}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-70">{subtitle}</h3>
    </div>
    <h2 className="text-5xl md:text-7xl font-light tracking-tight text-foreground leading-none">
      {title.split(' ')[0]} <span className="font-black italic text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">{title.split(' ').slice(1).join(' ')}</span>
    </h2>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Diagnostic Report Component
// ─────────────────────────────────────────────────────────────────────────────

export function ImageAnalysisReport({ analyses, labReport, onReset }: ImageAnalysisReportProps) {
  const [report, setReport] = useState<ReportState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('Iloilo City');
  const [copiedRec, setCopiedRec] = useState(false);
  const [expandedFood, setExpandedFood] = useState<number | null>(null);
  
  const { theme } = useTheme();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const hasSavedRef = useRef(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const userName = userData?.firstName || (user?.displayName ? user.displayName.split(' ')[0] : 'Patient');

  const allImageDescriptions = Object.entries(analyses)
    .map(([key, value]) => `Result for ${key}: ${value.analysisResult}`)
    .join('\n');

  const labReportSummary = labReport ? `Lab Report Summary: ${labReport.summary}` : '';

  useEffect(() => {
    if (userData?.address) setUserLocation(userData.address);
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
      setReport({ ...reportResult, imageAnalysisSummary: allImageDescriptions });
      
      if (user && !user.isAnonymous && firestore && reportResult && !hasSavedRef.current) {
        hasSavedRef.current = true;
        const reportCollection = collection(firestore, `users/${user.uid}/imageAnalyses`);
        
        const thumbnails = await Promise.all(
          Object.values(analyses).map(v => new Promise<{ part: string, data: string }>((resolve) => {
            const dataUri = v.dataUri || v.imageUrl;
            if (!dataUri) return resolve({ part: 'unknown', data: '' });
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxSize = 300;
              let { width: w, height: h } = img;
              if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
              else { w = Math.round(w * maxSize / h); h = maxSize; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
              const part = Object.entries(analyses).find(([, val]) => val === v)?.[0] || 'unknown';
              resolve({ part, data: canvas.toDataURL('image/jpeg', 0.6) });
            };
            img.src = dataUri;
          }))
        );

        await addDoc(reportCollection, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          riskScore: reportResult.riskScore,
          anemiaType: reportResult.anemiaType,
          confidenceScore: reportResult.confidenceScore,
          recommendations: reportResult.recommendations,
          imageAnalysisSummary: allImageDescriptions,
          labReportSummary: labReportSummary,
          thumbnails: thumbnails.filter((t: any) => t.data),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [allImageDescriptions, labReportSummary, user, firestore, userLocation, userData, analyses]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleCopyRecommendations = useCallback(() => {
    if (!report?.recommendations) return;
    navigator.clipboard.writeText(report.recommendations).then(() => {
      setCopiedRec(true);
      toast({ title: 'Protocol Copied', description: 'Clinical guidelines saved to clipboard.' });
      setTimeout(() => setCopiedRec(false), 2500);
    });
  }, [report, toast]);

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

  const sevColors = useMemo(() => {
    const type = report?.anemiaType || '';
    const lower = type.toLowerCase();
    if (lower.includes('negative') || lower.includes('normal'))
      return { base: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-400', ring: 'rgba(16,185,129,0.5)', glow: 'rgba(16,185,129,0.2)' };
    if (lower.includes('suspected') || lower.includes('mild'))
      return { base: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500 dark:text-amber-400', ring: 'rgba(245,158,11,0.5)', glow: 'rgba(245,158,11,0.2)' };
    if (lower.includes('moderate'))
      return { base: 'orange', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500 dark:text-orange-400', ring: 'rgba(249,115,22,0.5)', glow: 'rgba(249,115,22,0.2)' };
    return { base: 'red', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500 dark:text-red-400', ring: 'rgba(239,68,68,0.5)', glow: 'rgba(239,68,68,0.2)' };
  }, [report]);

  const estHgb = useMemo(() => {
    const match = report?.imageAnalysisSummary?.match(/(\d+\.?\d*)\s*g\/dL/i);
    return match ? parseFloat(match[1]) : null;
  }, [report]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
        <HeartLoader size={120} strokeWidth={1} />
        <div className="text-center space-y-4">
           <h3 className="text-4xl font-light tracking-tight">Neural <span className="font-medium text-primary italic">Synthesis.</span></h3>
           <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-primary/40 animate-pulse">Aggregating 10-Model Consensus</span>
              <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
           </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <motion.div
      initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="w-full space-y-16 pb-40 relative px-4 md:px-8"
    >
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="space-y-4 text-center lg:text-left">
          <h1 className="text-6xl md:text-8xl font-light tracking-tight leading-[0.9] text-foreground pr-10">
             Analysis <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">Report.</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
             <Badge variant="outline" className="px-4 py-2 border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase bg-primary/5">NODE_ID: ANM_V3_{Math.random().toString(16).substring(2, 8).toUpperCase()}</Badge>
             <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 flex items-center gap-2">
               <Calendar className="w-3.5 h-3.5" /> {format(new Date(), 'PPP p')}
             </span>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <Button 
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 md:flex-none h-20 rounded-full px-12 bg-primary hover:bg-red-600 text-white shadow-2xl transition-all active:scale-95 text-xs font-bold uppercase tracking-widest gap-4 border-none"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Export PDF Report
          </Button>
          <Button 
            variant="outline"
            onClick={onReset}
            className="h-20 w-20 rounded-full border-white/10 glass-panel hover:bg-white/5 transition-all p-0 flex items-center justify-center group"
          >
            <RefreshCw className="w-6 h-6 text-muted-foreground group-hover:rotate-180 transition-transform duration-1000" />
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-12">
        
        {/* ── ROW 1: PRIMARY DIAGNOSTIC VERDICT ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <BentoCard 
             colSpan="lg:col-span-8" 
             className={cn("bg-gradient-to-br via-background to-background", 
               sevColors.base === 'emerald' ? "from-emerald-500/20 border-emerald-500/30" : 
               sevColors.base === 'amber' ? "from-amber-500/20 border-amber-500/30" :
               sevColors.base === 'orange' ? "from-orange-500/20 border-orange-500/30" :
               "from-red-600/20 border-red-500/30"
             )}
           >
              <div className="absolute top-0 right-0 p-16 opacity-[0.03] scale-[2] text-primary -mr-32 -mt-32 pointer-events-none">
                 <HeartPulse className="w-96 h-96" />
              </div>
              
              <div className="h-full p-10 md:p-16 flex flex-col justify-between">
                 <div className="flex justify-between items-start">
                    <div className={cn("p-6 rounded-3xl backdrop-blur-2xl border shadow-2xl transition-transform duration-700 hover:scale-110 cursor-help", sevColors.bg, sevColors.border)}>
                       <Activity className={cn("h-12 w-12", sevColors.text)} />
                    </div>
                    <div className={cn("flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-md", sevColors.bg, sevColors.border)}>
                       <span className={cn("text-[11px] font-black tracking-[0.3em] uppercase", sevColors.text)}>Verdict Verified</span>
                       <div className={cn("h-2.5 w-2.5 rounded-full animate-pulse shadow-[0_0_15px_currentColor]", sevColors.text.replace('text-', 'bg-'))} />
                    </div>
                 </div>

                 <div className="space-y-10 mt-12 md:mt-24">
                    <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-[0.5em] text-muted-foreground opacity-60">Consolidated Clinical Verdict</h3>
                       <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-light tracking-tight text-foreground leading-[0.85] text-balance pr-10">
                         {report.anemiaType.split(' ')[0]} <br />
                         <span className={cn("font-black italic drop-shadow-sm", sevColors.text)}>
                           {report.anemiaType.split(' ').slice(1).join(' ')}
                         </span>
                       </h2>
                       <p className="text-lg md:text-2xl text-muted-foreground/80 font-medium leading-relaxed max-w-2xl text-balance">
                          Analysis successful. Multi-site telemetry confirms vascular coloration consistent with <span className="text-foreground">{report.anemiaType}</span>.
                       </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 pt-10 border-t border-white/10 dark:border-white/5">
                       <div className="flex-1 min-w-[200px] flex items-center gap-4 px-8 py-6 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-xl group/score cursor-pointer">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/score:scale-110 transition-transform">
                             <Scale className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clinical Risk Index</span>
                             <span className="text-4xl font-black tracking-tight text-foreground">{report.riskScore}<span className="text-xs text-muted-foreground ml-1">%</span></span>
                          </div>
                       </div>
                       <div className="flex-1 min-w-[200px] flex items-center gap-4 px-8 py-6 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-xl group/hgb cursor-pointer">
                          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover/hgb:scale-110 transition-transform">
                             <FlaskConical className="w-6 h-6 text-blue-500" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Hemoglobin</span>
                             <span className="text-4xl font-black tracking-tight text-foreground">{estHgb?.toFixed(1) || '—'}<span className="text-xs text-muted-foreground ml-1 font-medium italic uppercase tracking-tighter">g/dL</span></span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </BentoCard>

           <BentoCard colSpan="lg:col-span-4" className="bg-gradient-to-b from-blue-500/10 via-background to-background border-blue-500/20">
              <div className="h-full p-10 flex flex-col items-center justify-between text-center relative isolate">
                 <div className="absolute inset-0 bg-radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%) opacity-50" />
                 
                 <div className="space-y-6 relative z-10 w-full">
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-500">Validation Confidence</span>
                    <div className="relative flex flex-col items-center justify-center group/gauge cursor-pointer">
                       <svg className="w-64 h-64 md:w-72 md:h-72 rotate-[-90deg]">
                          <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="2" fill="none" className="text-white/5" />
                          <motion.circle 
                            cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="none" 
                            className="text-blue-500"
                            strokeDasharray="100 100"
                            initial={{ strokeDashoffset: 100 }}
                            animate={{ strokeDashoffset: 100 - report.confidenceScore }}
                            transition={{ duration: 2.5, ease: "easeOut" }}
                            pathLength="100" strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center group-hover/gauge:scale-110 transition-transform duration-500">
                          <span className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest mb-1">Ensemble Agreement</span>
                          <span className="text-8xl font-thin tracking-tight tabular-nums leading-none text-foreground">{report.confidenceScore}</span>
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mt-2">Correlation %</span>
                       </div>
                    </div>
                 </div>

                 <div className="w-full space-y-8 relative z-10">
                    <div className="p-8 rounded-[3rem] bg-black/40 border border-white/10 dark:border-white/5 backdrop-blur-3xl shadow-2xl">
                       <p className="text-[11px] font-medium text-muted-foreground leading-relaxed px-4 italic text-balance">
                         "A high correlation indicates strong mathematical alignment between independent Tier-2 specialists and Tier-3 judges."
                       </p>
                    </div>
                    <div className="flex justify-center gap-2 opacity-30">
                       {[...Array(6)].map((_, i) => (
                         <motion.div 
                           key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                           transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                           className="w-2 h-2 rounded-full bg-blue-500" 
                         />
                       ))}
                    </div>
                 </div>
              </div>
           </BentoCard>
        </div>

        {/* ── ROW 2: BIOMETRIC TELEMETRY ───────────────────────────────────── */}
        <div className="pt-24 space-y-12">
           <SectionHeading title="Biometric Telemetry" subtitle="MULTI-SITE OPTICAL RESULTS" icon={LayoutGrid} accent="primary" />
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {Object.entries(analyses).map(([key, value]) => (
                <div key={key} className="space-y-8 group/site">
                  <div className="relative aspect-[4/5] rounded-[3.5rem] overflow-hidden border border-white/10 dark:border-white/5 shadow-2xl bg-black isolate">
                    <img src={value.imageUrl!} alt={key} className="w-full h-full object-cover opacity-80 group-hover/site:opacity-100 group-hover/site:scale-105 transition-all duration-1000 mix-blend-screen" />
                    
                    {/* HUD Overlays */}
                    <div className="absolute inset-0 z-20 pointer-events-none border-[16px] border-black/40" />
                    <div className="absolute top-10 left-10 z-30 flex flex-col gap-2">
                      <Badge className="bg-white/10 backdrop-blur-xl border-white/10 text-[9px] font-black tracking-widest uppercase py-1.5 px-4 mb-1">ROI_SITE_{key.toUpperCase()}</Badge>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-md">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                         <span className="text-[9px] font-black text-white/50 tracking-tighter uppercase">Sync Locked</span>
                      </div>
                    </div>

                    <div className="absolute bottom-12 left-12 right-12 z-30">
                      <div className="flex items-center gap-3 mb-2">
                        <Crosshair className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">Target Acquired</span>
                      </div>
                      <h5 className="text-4xl font-black text-white uppercase tracking-tight leading-none">{key} ROI</h5>
                    </div>
                  </div>

                  <div className={cn("p-10 rounded-[3.5rem] glass-panel border-l-[10px] transition-all duration-700 min-h-[200px] flex flex-col justify-center space-y-4 shadow-xl", 
                    sevColors.border.replace('border-', 'border-l-'))}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", sevColors.text)}>Spectral Outcome</span>
                        <Activity className={cn("w-4 h-4 opacity-40", sevColors.text)} />
                      </div>
                      <p className="text-2xl font-light text-foreground leading-tight italic-font">&ldquo;{value.analysisResult || 'Spectral analysis completed.'}&rdquo;</p>
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-3">
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Clinical Observation</span>
                       <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">
                          The system evaluates subcutaneous {key} color depth against your pigment baseline. {value.description || 'Target specimen processed successfully.'}
                       </p>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* ── ROW 3: DIAGNOSTIC CALCULUS (REASONING) ─────────────────────── */}
        <div className="pt-24 space-y-12">
           <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
              <SectionHeading title="Diagnostic Calculus" subtitle="NEURAL COMPUTATIONAL TRACE" icon={Calculator} accent="amber" />
              <div className="hidden lg:flex items-center gap-4 bg-amber-500/5 px-6 py-3 rounded-2xl border border-amber-500/10">
                 <Variable className="w-4 h-4 text-amber-500" />
                 <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Calculus Logic: Σ(Threshold × Weight) = Output</span>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {report.confidenceReasoning.split('\n').map((line, i) => {
                const parts = line.replace('- ', '').split(': ');
                if (parts.length < 2) return null;
                return (
                  <BentoCard key={i} className="bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-amber-500/10 hover:border-amber-500/30 transition-all duration-500 group/calc">
                    <div className="p-8 h-full flex flex-col justify-between">
                       <div className="flex justify-between items-start mb-8">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/calc:scale-110 transition-transform">
                             <Binary className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                             <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-tighter block">NODE_LAYER</span>
                             <span className="text-xs font-black text-amber-500 tabular-nums">0{i+1}</span>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/30" />
                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">System Threshold</span>
                             </div>
                             <div className="text-lg font-black text-foreground uppercase tracking-wider pl-3.5 border-l border-amber-500/20">{parts[0]}</div>
                          </div>

                          <div className="relative py-2">
                             <div className="h-px w-full bg-gradient-to-r from-amber-500/20 via-transparent to-transparent" />
                             <div className="absolute -top-1 right-0">
                                <Equal className="w-3 h-3 text-amber-500/30" />
                             </div>
                          </div>

                          <div className="space-y-1">
                             <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Calculated Result</span>
                             <div className="text-4xl font-black text-foreground tabular-nums tracking-tight group-hover/calc:text-amber-500 transition-colors drop-shadow-sm">{parts[1]}</div>
                          </div>
                       </div>
                    </div>
                  </BentoCard>
                );
              })}
           </div>

           <BentoCard className="border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-black/20 shadow-2xl">
              <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000 pointer-events-none"><Cpu className="w-64 h-64 text-foreground" /></div>
              <div className="p-12 md:p-16 relative z-10 space-y-12">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                       <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10">
                          <ShieldCheck className="w-8 h-8" />
                       </div>
                       <div>
                          <h5 className="text-2xl font-black uppercase tracking-[0.2em] text-foreground leading-none mb-2">Verification Logic Matrix</h5>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Cross-validation of neural site outcomes</p>
                       </div>
                    </div>
                    <div className="px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Network Stability: NOMINAL</span>
                       <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
                    {[
                      { label: 'Spectral Consistency', value: '98.4%', result: 'T-Sync Verified', icon: Sparkles },
                      { label: 'Ensemble Stability', value: '92.1%', result: 'Node Agreement', icon: Layers },
                      { label: 'Hematological Alignment', value: '89.7%', result: 'Lab Sync Locked', icon: FlaskConical }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-6 group/matrix cursor-default">
                         <div className="flex justify-between items-end">
                            <div className="space-y-2">
                               <div className="flex items-center gap-2">
                                  <item.icon className="w-3.5 h-3.5 text-emerald-500/40" />
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 leading-none">{item.label}</span>
                               </div>
                               <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest pl-5">{item.result}</p>
                            </div>
                            <span className="text-3xl font-black tabular-nums text-foreground group-hover/matrix:scale-110 group-hover/matrix:text-emerald-400 transition-all duration-500">{item.value}</span>
                         </div>
                         <div className="h-2 w-full bg-white/5 dark:bg-white/10 rounded-full overflow-hidden shadow-inner p-[1px]">
                            <motion.div 
                              initial={{ width: 0 }} animate={{ width: item.value }} 
                              transition={{ duration: 2, delay: idx * 0.3, ease: "circOut" }}
                              className="h-full bg-gradient-to-r from-emerald-600/40 via-emerald-400 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                            />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </BentoCard>
        </div>

        {/* ── ROW 4: CLINICAL PROTOCOL ─────────────────────────────────────── */}
        <div className="pt-24 space-y-12">
           <SectionHeading title="Clinical Protocol" subtitle="TAILORED THERAPEUTIC GUIDELINES" icon={ShieldCheck} accent="blue" />

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                 <div className="p-12 rounded-[4rem] bg-blue-500/10 dark:bg-blue-500/[0.05] border border-blue-500/20 flex flex-col justify-between aspect-square group shadow-xl relative overflow-hidden cursor-help">
                    <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(59,130,246,0.1)_0%,transparent_70%) opacity-50" />
                    <div className="space-y-8 relative z-10">
                       <div className="p-6 rounded-[2rem] bg-blue-500 text-white w-fit shadow-2xl group-hover:scale-110 transition-transform duration-700">
                          <Stethoscope className="w-10 h-10" />
                       </div>
                       <h4 className="text-5xl font-black tracking-tight leading-[0.9] text-foreground">Actionable <br /><span className="italic text-blue-500 font-medium">Protocol.</span></h4>
                    </div>
                    <div className="relative z-10 flex flex-col gap-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/60">Urgency Assessment</span>
                       <p className="text-sm font-bold text-foreground tracking-widest uppercase">
                          Priority: {sevColors.base === 'emerald' ? 'Routine Health' : sevColors.base === 'amber' ? 'Moderate / Elevated' : 'High / Immediate'}
                       </p>
                    </div>
                 </div>
                 
                 <Button 
                   onClick={handleCopyRecommendations}
                   className="w-full h-24 rounded-[3rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs gap-4 shadow-[0_30px_60px_-10px_rgba(59,130,246,0.4)] border-none transition-all active:scale-95"
                 >
                   {copiedRec ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                   {copiedRec ? 'Copied to Clipboard' : 'Copy clinical protocol'}
                 </Button>
              </div>

              <div className="lg:col-span-8 p-12 md:p-20 rounded-[4.5rem] glass-panel border border-blue-500/20 dark:bg-black/30 shadow-2xl space-y-16">
                 {report.recommendations.split('\n').filter(l => l.trim().length > 0).map((line, idx) => {
                    const isHeader = line.includes('**') && !line.startsWith('-') && !line.startsWith('* ');
                    const isBullet = line.startsWith('-') || line.startsWith('*');
                    if (isHeader) {
                       return (
                         <div key={idx} className="space-y-6 mt-16 first:mt-0">
                            <h6 className="text-xl md:text-3xl font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-4">
                               <ClipboardCheck className="w-7 h-7 opacity-40" />
                               {line.replace(/\*\*/g, '').replace(/^[A-G]\.\s*/, '').trim()}
                            </h6>
                            <div className="h-[2px] w-full bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent" />
                         </div>
                       );
                    }
                    if (isBullet) {
                       const cleanBullet = line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '');
                       const parts = cleanBullet.split(':');
                       return (
                         <div key={idx} className="flex gap-6 group/item py-6 border-b border-white/5 last:border-none hover:bg-white/[0.02] transition-colors -mx-6 px-6 rounded-2xl">
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 mt-2.5 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover/item:scale-125 transition-transform" />
                            <div className="space-y-2 flex-1">
                               {parts.length > 1 ? (
                                 <>
                                    <strong className="text-xs font-black uppercase tracking-[0.3em] text-blue-500/80 block">{parts[0].trim()}</strong>
                                    <p className="text-xl font-light text-foreground/80 leading-relaxed text-balance">{parts.slice(1).join(':').trim()}</p>
                                 </>
                               ) : (
                                 <p className="text-xl font-light text-foreground/80 leading-relaxed text-balance">{cleanBullet}</p>
                               )}
                            </div>
                         </div>
                       );
                    }
                    return <p key={idx} className="text-base text-muted-foreground font-medium opacity-60 leading-relaxed italic">{line}</p>;
                 })}
              </div>
           </div>
        </div>

        {/* ── ROW 5: LABORATORY SYNC (LAB DATA) ───────────────────────────── */}
        {labReport && (
          <div className="pt-24 space-y-12">
             <SectionHeading title="Laboratory Sync" subtitle="EXTERNAL HEMATOLOGICAL TELEMETRY" icon={TableProperties} accent="emerald" />
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {labReport.parameters.map((p, idx) => (
                   <div key={idx} className="p-10 rounded-[3.5rem] glass-panel border border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] flex flex-col justify-between min-h-[360px] group hover:bg-emerald-500/[0.05] transition-all shadow-xl cursor-default text-left">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 leading-none">Diagnostic Result</span>
                            <h6 className="text-xs font-black uppercase tracking-widest text-foreground">{p.parameter}</h6>
                         </div>
                         <FlaskConical className={cn("w-6 h-6 group-hover:scale-110 transition-transform", p.isNormal ? "text-emerald-500" : "text-red-500")} />
                      </div>
                      
                      <div className="space-y-6">
                         <div className="flex items-baseline gap-2">
                            <span className="text-7xl md:text-8xl font-thin tracking-tight tabular-nums text-foreground leading-none">{p.value}</span>
                            <span className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500/60 italic">{p.unit}</span>
                         </div>
                         <div className="space-y-4">
                            <Badge className={cn("px-6 py-2.5 border-none font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl w-full flex items-center justify-center shadow-inner", 
                              p.isNormal ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                               {p.isNormal ? 'Nominal Analysis' : 'Attention Required'}
                            </Badge>
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 px-2">
                               <span>Clinical Reference Sync</span>
                               <span>{p.isNormal ? 'Verified' : 'Flagged'}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* ── ROW 6: NUTRITION MATRIX (INTERACTIVE) ────────────────────────── */}
        <div className="pt-24 space-y-16">
           <div className="flex flex-col items-center text-center space-y-4 max-w-4xl mx-auto">
              <SectionHeading title="The Anemo Kitchen" subtitle="CULTURALLY ALIGNED NUTRITION MATRIX" icon={Utensils} accent="primary" />
              <p className="text-xl text-muted-foreground font-light leading-relaxed italic text-balance">
                 Hemoglobin levels are highly responsive to dietary synergy. We have selected these Filipino staples to optimize <span className="text-primary font-black">iron bioavailability</span> and ferritin storage.
              </p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { name: 'Malunggay', benefit: 'Iron/Vit-C Synergy', result: 'Non-heme iron catalyst', icon: Droplets, color: 'text-emerald-400' },
                { name: 'Atay (Liver)', benefit: 'B12 & Ferritin', result: 'High-density heme iron', icon: Flame, color: 'text-orange-400' },
                { name: 'Monggo', benefit: 'Plant Protein', result: 'Sustained ferritin base', icon: Zap, color: 'text-amber-400' },
                { name: 'Kangkong', benefit: 'Folate Source', result: 'DNA synthesis booster', icon: Sparkles, color: 'text-emerald-500' },
                { name: 'Egg (Itlog)', benefit: 'Complete Bio', result: 'Cellular repair agent', icon: Activity, color: 'text-blue-400' },
                { name: 'Calamansi', benefit: 'Max Absorption', result: 'Acidic absorption tuner', icon: Sparkles, color: 'text-yellow-400' }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  onClick={() => setExpandedFood(expandedFood === i ? null : i)}
                  className={cn(
                    "p-10 rounded-[3.5rem] glass-panel text-center space-y-6 group cursor-pointer transition-all duration-500 shadow-2xl border border-white/10 relative overflow-hidden",
                    expandedFood === i ? "scale-105 border-primary/40 bg-primary/[0.03]" : "hover:border-primary/20 hover:bg-white/[0.01]"
                  )}
                >
                   <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[40px] -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className={cn("w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform duration-700", item.color.replace('text-', 'bg-') + '/10')}>
                      <item.icon className={cn("w-8 h-8 opacity-60", item.color)} />
                   </div>
                   <div className="space-y-1">
                      <span className="text-[13px] font-black uppercase tracking-[0.2em] block text-foreground">{item.name}</span>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tighter block">{item.benefit}</span>
                   </div>
                   <AnimatePresence>
                     {expandedFood === i && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-4 border-t border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Calculated Outcome</p>
                          <p className="text-[11px] font-medium text-foreground/80 leading-relaxed uppercase tracking-widest">{item.result}</p>
                       </motion.div>
                     )}
                   </AnimatePresence>
                   <div className="flex justify-center pt-2">
                      <ChevronDown className={cn("w-4 h-4 text-primary/30 transition-transform duration-500", expandedFood === i && "rotate-180")} />
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* ── ROW 7: FIND A SPECIALIST (CTA) ────────────────────────────────── */}
        <div className="pt-32 pb-40">
           <div className="relative p-12 md:p-24 lg:p-32 rounded-[5.5rem] md:rounded-[7rem] bg-gradient-to-r from-primary via-primary/95 to-rose-600 text-white overflow-hidden shadow-[0_60px_120px_-20px_rgba(var(--primary-rgb),0.4)] group border-none isolate">
              <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-white/10 rounded-full blur-[180px] -mr-[400px] -mt-[400px] animate-pulse duration-[8000ms] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/20 rounded-full blur-[120px] -ml-[200px] -mb-[200px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-24">
                 <div className="max-w-4xl space-y-12 text-center lg:text-left">
                    <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-black uppercase tracking-[0.5em] backdrop-blur-xl">Physician Sync Required</div>
                    <h2 className="text-6xl md:text-8xl lg:text-[7.5rem] font-light tracking-tight leading-[0.85] text-balance pr-10">
                       Secure clinical <br /><span className="font-black italic drop-shadow-2xl">clearance.</span>
                    </h2>
                    <p className="text-xl md:text-3xl text-white/80 font-light leading-relaxed text-balance max-w-2xl">
                       Diagnostic screening finalized. We have mapped board-certified hematologists in <span className="underline decoration-white/40 underline-offset-[12px] decoration-4 font-black italic">{userLocation}</span> available for immediate consult.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-12 pt-4 opacity-70">
                       <div className="flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer text-left"><Phone className="w-6 h-6" /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Emergency Line</span></div>
                       <div className="flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer text-left"><Calendar className="w-6 h-6" /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Priority Booking</span></div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-8 w-full lg:w-auto shrink-0 relative">
                    <div className="absolute inset-0 bg-white blur-3xl opacity-20 animate-pulse" />
                    <Button size="lg" className="h-28 px-16 rounded-[3rem] bg-white text-primary hover:bg-white/95 text-sm font-black uppercase tracking-[0.3em] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] transition-all scale-105 hover:scale-110 active:scale-95 group/btn border-none relative z-10" asChild>
                       <Link href="/dashboard/find-doctor" className="flex items-center gap-6">
                          <MapPin className="w-8 h-8 group-hover/btn:animate-bounce" /> Connect with Specialist
                       </Link>
                    </Button>
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.5em] text-white/40 relative z-10">Encrypted Clinical Node Active</p>
                 </div>
              </div>
           </div>
        </div>

        {/* ── DIAGNOSTIC DISCLAIMER FOOTER ─────────────────────────────────── */}
        <footer className="text-center space-y-16 opacity-40 border-t border-white/5 dark:border-white/5 pt-32 pb-24">
           <div className="flex flex-col items-center gap-8">
              <Cpu className="w-14 h-14 opacity-30 animate-pulse" />
              <div className="space-y-3">
                 <p className="text-[12px] font-black uppercase tracking-[0.8em] leading-none text-foreground text-balance">ANEMO MATRIX CORE // CLINICAL INTELLIGENCE UNIT</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">© 2026 Anemo AI — Secured Data Partition: ANM_SH_{Math.random().toString(16).substring(2, 10).toUpperCase()}</p>
              </div>
           </div>
           
           <div className="max-w-5xl mx-auto p-12 md:p-16 rounded-[4.5rem] border border-white/10 dark:border-white/5 bg-white/[0.01] dark:bg-black/20 group hover:bg-white/[0.02] transition-colors duration-1000">
              <p className="text-[13px] font-medium leading-[2.5] text-muted-foreground text-center uppercase tracking-[0.2em] px-10 text-balance">
                 <strong className="text-primary font-black mr-3">LEGAL NOTICE:</strong> This diagnostic summary is generated by artificial intelligence for preliminary screening purposes only. It is NOT a substitute for professional medical advice, clinical diagnosis, or therapeutic treatment. The estimated hemoglobin (Hgb) and risk scores are algorithmic projections based on visual and laboratory data sync. Always consult with a licensed physician for definitive medical assessment and clearance.
              </p>
           </div>
        </footer>

      </div>
    </motion.div>
  );
}
