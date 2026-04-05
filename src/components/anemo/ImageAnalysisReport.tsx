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
  Cpu,
  Dna,
  Search,
  LayoutGrid,
  Loader2,
  Activity,
  ShieldAlert,
  Copy,
  Check,
  Share2,
  Columns2
} from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import HeartLoader from '@/components/ui/HeartLoader';
import { motion } from 'framer-motion';
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

type ReportState = PersonalizedRecommendationsOutput & { imageAnalysisSummary?: string };

export function ImageAnalysisReport({ analyses, labReport, onReset }: ImageAnalysisReportProps) {
  const [report, setReport] = useState<ReportState | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('Iloilo City');
  const [copiedRec, setCopiedRec] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  const hasSavedRef = useRef(false);

  const handleCopyRecommendations = useCallback(() => {
    if (!report?.recommendations) return;
    navigator.clipboard.writeText(report.recommendations).then(() => {
      setCopiedRec(true);
      toast({ title: 'Copied!', description: 'Recommendations copied to clipboard.' });
      setTimeout(() => setCopiedRec(false), 2500);
    });
  }, [report, toast]);

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
      setReport({ ...reportResult, imageAnalysisSummary: allImageDescriptions });
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

  const handleShare = async () => {
    if (!report) return;
    try {
      const shareData = {
        title: `Anemo AI Diagnostic Report`,
        text: `Anemia Risk Score: ${report.riskScore}/100 — ${report.anemiaType}. Est. Hgb: ${report.imageAnalysisSummary?.match(/(\d+\.?\d*)\s*g\/dL/i)?.[0] ?? 'N/A'}. Confidence: ${report.confidenceScore}%.`,
        url: typeof window !== 'undefined' ? window.location.href : '',
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast({ title: "Report link copied to clipboard" });
      }
    } catch (e) {
      // ignore AbortError
    }
  };

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

  const getSeverityColors = (anemiaType: string) => {
    const lower = (anemiaType || '').toLowerCase();
    if (lower.includes('none') || lower.includes('normal'))
      return { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', borderL: 'border-l-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-400', bar: 'bg-emerald-500/40' };
    if (lower.includes('mild'))
      return { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', borderL: 'border-l-yellow-500', text: 'text-yellow-400', dot: 'bg-yellow-400', bar: 'bg-yellow-500/40' };
    if (lower.includes('moderate'))
      return { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', borderL: 'border-l-orange-500', text: 'text-orange-400', dot: 'bg-orange-400', bar: 'bg-orange-500/40' };
    if (lower.includes('severe') || lower.includes('critical'))
      return { badge: 'bg-red-500/15 text-red-400 border-red-500/30', borderL: 'border-l-red-500', text: 'text-red-400', dot: 'bg-red-400', bar: 'bg-red-500/40' };
    return { badge: 'bg-primary/15 text-primary border-primary/30', borderL: 'border-l-primary', text: 'text-primary', dot: 'bg-primary', bar: 'bg-primary/40' };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 space-y-12 min-h-[600px] relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.05)_0%,transparent_70%) animate-pulse" />
        <HeartLoader size={120} strokeWidth={1} />
        <div className="text-center space-y-4 relative z-10">
            <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground opacity-90">Generating Diagnostic Report</h3>
            <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest uppercase text-primary/40">Neural Synchronization Active</span>
                <div className="h-[1px] w-12 bg-primary/20" />
            </div>
        </div>
      </div>
    );
  }
  
  if (!report) return null;

  return (
    <div className="space-y-8 md:space-y-16 lg:space-y-20 animate-in fade-in zoom-in duration-1000 w-full overflow-hidden">
      
      {/* Functional Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-8 glass-panel p-6 md:p-10 rounded-[2.5rem] border border-white/10 shadow-xl relative overflow-hidden isolate">
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] z-0" />
        
        <div className="flex items-center gap-6 relative z-10 w-full sm:w-auto">
            <div className="w-16 h-16 rounded-[1.8rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="flex flex-col text-left">
                <h2 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-1">Telemetry <span className="text-emerald-500 italic-font">Lock</span></h2>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest leading-none">Verified Secure Session</span>
            </div>
        </div>

        <div className="flex gap-4 w-full sm:w-auto relative z-10">
            <Button onClick={onReset} variant="outline" className="flex-1 sm:flex-none h-14 rounded-full px-8 text-xs font-bold tracking-widest uppercase border-white/10 hover:bg-white/5 transition-all shadow-md">
                <RefreshCw className="w-4 h-4 mr-3" /> Reset
            </Button>
            <Button onClick={handleShare} variant="outline" className="flex-1 sm:flex-none h-14 rounded-full px-8 text-xs font-bold tracking-widest uppercase border-white/10 hover:bg-white/5 transition-all shadow-md">
                <Share2 className="w-4 h-4 mr-3" /> Share
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isDownloading} className="flex-1 sm:flex-none h-14 rounded-full px-8 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-primary/20 ring-1 ring-primary/40 group">
                {isDownloading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Download className="w-5 h-5 mr-3 group-hover:-translate-y-1 transition-transform" />} Export PDF
            </Button>
        </div>
      </div>

      {/* Main Print/Report Container */}
      <div ref={reportRef} data-print-report className="bg-card border border-border shadow-2xl rounded-[3rem] md:rounded-[4.5rem] relative isolate w-full py-16 px-8 sm:p-20 md:p-24 lg:p-32 space-y-12 md:space-y-24 overflow-hidden">
          
          <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:60px_60px] z-0 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] -mr-40 -mt-40 pointer-events-none opacity-50" />

          {/* Report Header Logo & Date */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10 border-b border-border/50 pb-16">
              <div className="flex items-center gap-8 md:gap-12 w-full lg:w-auto text-left">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-primary/10 backdrop-blur-3xl border border-primary/20 flex items-center justify-center shadow-lg group">
                       <HeartPulse className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                  </div>
                  <div className="flex flex-col text-left">
                       <Badge variant="outline" className="w-fit px-4 h-8 mb-4 border-primary/30 text-primary text-[10px] font-bold tracking-widest uppercase shadow-sm">TERMINAL-ILO-NX3</Badge>
                       <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-foreground tracking-tighter leading-[0.85]">
                         Anemo<span className="text-primary italic-font">Matrix</span>
                       </h1>
                  </div>
              </div>
              <div className="text-left md:text-right w-full lg:w-auto space-y-2 opacity-80">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Generated On</p>
                  <p className="text-xl md:text-2xl font-medium tracking-tight text-foreground">{format(new Date(), 'PPP')}</p>
              </div>
          </div>

          {/* Primary Assessment Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
              {/* Verdict Frame */}
              <div className={cn(
                "lg:col-span-8 p-6 md:p-12 lg:p-16 xl:p-20 rounded-[3rem] bg-white/[0.02] border border-white/5 border-l-[6px] flex flex-col justify-between relative overflow-hidden group shadow-lg",
                getSeverityColors(report.anemiaType).borderL
              )}>
                  <div className="absolute right-0 top-0 opacity-5 scale-150 translate-x-1/4 -translate-y-1/4">
                     <Dna className="w-96 h-96 text-primary" />
                  </div>
                  <div className="flex items-center gap-4 mb-12 relative z-10">
                      <div className="p-3 bg-primary/10 rounded-xl border border-primary/20"><Zap className="w-6 h-6 text-primary" /></div>
                      <span className="text-xs font-bold text-primary/80 uppercase tracking-widest leading-none">Diagnostic Verdict</span>
                  </div>
                  <div className="relative z-10">
                      {/* Severity badge */}
                      <div className="mb-6 flex items-center gap-3 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.25em]",
                          getSeverityColors(report.anemiaType).badge
                        )}>
                          <span className={cn("w-2 h-2 rounded-full", getSeverityColors(report.anemiaType).dot)} />
                          {report.anemiaType}
                        </span>
                        {/moderate|severe|critical/i.test(report.anemiaType) && (
                          <span className="animate-pulse inline-flex h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_rgba(255,0,68,0.8)]" />
                        )}
                      </div>
                      <div className="flex items-end gap-4 flex-wrap">
                        <h3 className="text-4xl md:text-5xl lg:text-7xl font-black text-foreground tracking-tighter leading-[0.9] text-balance">
                           {report.anemiaType.split(' ')[0]} <span className="italic-font text-primary">{report.anemiaType.split(' ').slice(1).join(' ')}</span>
                        </h3>
                      </div>
                      {/* Hemoglobin display if available */}
                      {report.imageAnalysisSummary && (() => {
                        const match = report.imageAnalysisSummary.match(/(\d+\.?\d*)\s*g\/dL/i);
                        if (!match) return null;
                        return (
                          <div className="mt-8 flex items-baseline gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Est. Hemoglobin</span>
                            <span className={cn("text-3xl font-black tracking-tighter", getSeverityColors(report.anemiaType).text)}>
                              {match[0]}
                            </span>
                          </div>
                        );
                      })()}
                      <div className={cn("h-1.5 w-32 rounded-full mt-6", getSeverityColors(report.anemiaType).bar)} />
                  </div>
              </div>
              
              {/* Confidence Indicator */}
              <div className="lg:col-span-4 p-6 md:p-12 lg:p-16 rounded-[3rem] bg-amber-500/5 border border-amber-500/10 flex flex-col items-center justify-center text-center gap-8 relative isolate overflow-hidden">
                  <div className="absolute inset-0 bg-amber-500/10 blur-[80px] rounded-full scale-150 opacity-30" />
                  <div className="relative isolate">
                      <h4 className={`text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-none ${report.confidenceScore >= 80 ? 'text-emerald-400' : report.confidenceScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{report.confidenceScore}<span className="text-2xl text-amber-500 ml-1 italic-font">%</span></h4>
                  </div>
                  <div className="space-y-4 relative z-10 flex flex-col items-center">
                       <div className="flex items-center justify-center gap-2">
                         <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest leading-none">Confidence Score</span>
                         <button
                           type="button"
                           title="This score reflects how many of our 10 AI models agreed on your result. 90% means 9 out of 10 models reached the same diagnosis — higher is more reliable."
                           className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/30 transition-colors flex-shrink-0"
                           aria-label="Confidence score explanation"
                         >
                           <span className="text-[9px] font-black">?</span>
                         </button>
                       </div>
                       <div className="flex gap-2 justify-center">{[1,2,3,4,5].map(i => <div key={i} className="w-2 h-2 rounded-full bg-amber-500/40" />)}</div>
                       {report.confidenceScore >= 80 && (
                         <p className="text-[9px] text-amber-500/60 font-bold uppercase tracking-widest">
                           {Math.round(report.confidenceScore / 10)}/10 models agreed
                         </p>
                       )}
                  </div>
                  {/* Hgb prominent display */}
                  {report.imageAnalysisSummary && (() => {
                    const match = report.imageAnalysisSummary.match(/(\d+\.?\d*)\s*g\/dL/i);
                    if (!match) return null;
                    return (
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <div className="px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-1">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/60">Hemoglobin</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black tracking-tighter text-amber-400">{match[1]}</span>
                            <span className="text-[10px] font-bold text-amber-500/60">g/dL</span>
                          </div>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(match[0]); }}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-full glass-button border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-500/60 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                          title="Copy Hgb value"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          Copy
                        </button>
                      </div>
                    );
                  })()}
              </div>
          </div>

          {/* Multimodal Telemetry Breakdown */}
          <div className="space-y-8 md:space-y-16 relative z-10">
               <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shrink-0"><LayoutGrid className="w-6 h-6 text-foreground" /></div>
                    <div className="flex-1 h-px bg-border/50" />
                    <h4 className="text-lg md:text-2xl font-black tracking-widest uppercase text-foreground">Parameter <span className="text-primary italic-font">Telemetry</span></h4>
                    <div className="flex-1 h-px bg-border/50" />
                    <button
                      onClick={() => setComparisonMode(m => !m)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                        comparisonMode
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "glass-button border-primary/20 text-primary hover:bg-primary/10"
                      )}
                    >
                      <Columns2 className="w-3.5 h-3.5" /> {comparisonMode ? 'Normal View' : 'Compare Mode'}
                    </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {Object.entries(analyses).map(([key, value], idx) => {
                        const sColor = getColorByPart(key);
                        return (
                            <div key={key} className="flex flex-col gap-8 group">
                                <div className="aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-xl relative isolate bg-black">
                                    <img src={value.imageUrl!} className="w-full h-full object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100 mix-blend-screen" />
                                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent p-8 flex flex-col justify-end">
                                        <Badge variant="outline" className={cn("w-fit px-3 mb-3 border-white/20 font-bold uppercase tracking-widest text-[9px]", 
                                            sColor === 'amber' ? 'text-amber-500' : 
                                            sColor === 'red' ? 'text-red-500' : 'text-blue-500')}>TARGET_0{idx+1}</Badge>
                                        <h5 className="text-xl md:text-2xl font-black text-white capitalize leading-none">{key.replace('-', ' ')}</h5>
                                    </div>
                                </div>
                                <div className={cn("px-6 py-4 space-y-4 text-left border-l-[4px] min-h-[140px]", 
                                    sColor === 'amber' ? 'border-amber-500' : 
                                    sColor === 'red' ? 'border-red-500' : 
                                    'border-blue-500')}>
                                    <span className={cn("text-xs font-bold uppercase tracking-widest block leading-none", 
                                        sColor === 'amber' ? 'text-amber-500' : sColor === 'red' ? 'text-red-500' : 'text-blue-500')}>{value.analysisResult}</span>
                                    <p className="text-sm md:text-base text-muted-foreground font-medium leading-[1.6] line-clamp-4">
                                        {value.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
               </div>

               {/* Comparison Mode Panel */}
               {comparisonMode && (
                 <div className="mt-8 rounded-[2.5rem] border border-primary/20 bg-primary/5 overflow-hidden">
                   {/* Header */}
                   <div className="px-8 py-5 border-b border-primary/10 flex items-center gap-4">
                     <Columns2 className="w-5 h-5 text-primary" />
                     <span className="text-sm font-black uppercase tracking-widest text-primary">Side-by-Side Parameter Analysis</span>
                   </div>
                   {/* 3-column comparison */}
                   <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-primary/10">
                     {Object.entries(analyses).map(([key, value], idx) => {
                       const colors = [
                         { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', ring: 'ring-amber-500/30' },
                         { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', ring: 'ring-blue-500/30' },
                         { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-500', ring: 'ring-rose-500/30' },
                       ][idx] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white', ring: 'ring-white/10' };
                       const label = key === 'under-eye' ? 'Conjunctiva' : key === 'fingernails' ? 'Nailbed' : 'Skin';
                       const verdict = value.analysisResult || 'N/A';
                       const isNormal = /normal/i.test(verdict);
                       return (
                         <div key={key} className="flex flex-col">
                           {/* Image */}
                           <div className="relative aspect-square overflow-hidden">
                             {value.imageUrl ? (
                               <img
                                 src={value.imageUrl}
                                 alt={label}
                                 className="w-full h-full object-cover"
                                 loading="lazy"
                               />
                             ) : (
                               <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                 <span className="text-white/20 text-xs uppercase tracking-widest">No Image</span>
                               </div>
                             )}
                             {/* Overlay label */}
                             <div className={cn("absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent")}>
                               <span className={cn("text-[10px] font-black uppercase tracking-widest", colors.text)}>
                                 {String(idx + 1).padStart(2, '0')} — {label}
                               </span>
                             </div>
                           </div>
                           {/* Result panel */}
                           <div className={cn("p-5 flex-1 space-y-3", colors.bg)}>
                             <div className="flex items-center justify-between">
                               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">AI Verdict</span>
                               <span className={cn(
                                 "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                 isNormal ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"
                               )}>
                                 {isNormal ? '✓ Normal' : '⚠ Abnormal'}
                               </span>
                             </div>
                             <p className={cn("text-sm font-black tracking-tight", colors.text)}>{verdict}</p>
                             <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                               {value.description || 'No description available.'}
                             </p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                   {/* Summary row */}
                   <div className="px-8 py-5 border-t border-primary/10 flex flex-wrap items-center gap-6">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overall Assessment</span>
                     <div className="flex gap-3 flex-wrap">
                       {Object.entries(analyses).map(([key, value]) => {
                         const label = key === 'under-eye' ? 'Conjunctiva' : key === 'fingernails' ? 'Nailbed' : 'Skin';
                         const isNormal = /normal/i.test(value.analysisResult || '');
                         return (
                           <span key={key} className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                             isNormal ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"
                           )}>
                             {label}: {value.analysisResult || 'N/A'}
                           </span>
                         );
                       })}
                     </div>
                     <span className="ml-auto text-[10px] text-muted-foreground italic">
                       Hgb: {report.imageAnalysisSummary?.match(/(\d+\.?\d*)\s*g\/dL/i)?.[0] ?? 'Est. from ensemble'}
                     </span>
                   </div>
                 </div>
               )}
          </div>

          {/* Clinical Neural Logic Block */}
          <div className="space-y-12 text-left relative z-10 max-w-5xl">
              <div className="flex items-center gap-6 opacity-80 px-2 lg:px-0">
                  <Search className="w-6 h-6 text-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest leading-none">Logic Synthesis</span>
              </div>
              <div className="p-6 md:p-10 lg:p-20 rounded-[2.5rem] md:rounded-[3rem] bg-white/[0.02] border border-border border-l-[8px] border-l-primary leading-[1.4] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 scale-150 rotate-12 text-primary"><Sparkles className="w-64 h-64 text-primary" /></div>
                  <button
                    onClick={handleCopyRecommendations}
                    title="Copy recommendations"
                    className="absolute top-4 right-4 z-20 p-2.5 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
                  >
                    {copiedRec
                      ? <Check className="w-4 h-4 text-primary" />
                      : <Copy className="w-4 h-4 text-primary/60" />
                    }
                  </button>
                  <div className="relative z-10 text-xl md:text-3xl font-medium text-foreground italic-font tracking-tight">
                      "{report.recommendations.split('\n')[0].replace(/^[*-]\s*/, '')}"
                  </div>
              </div>
          </div>

          {/* High-Fidelity Lab Data Sync */}
          {labReport && (
                <div className="p-6 md:p-12 lg:p-24 rounded-[2.5rem] md:rounded-[3.5rem] bg-blue-500/5 border border-blue-500/10 space-y-12 md:space-y-16 relative overflow-hidden isolate shadow-xl">
                    <div className="absolute inset-x-[-100px] blur-[150px] bg-blue-500/10 rounded-full opacity-40 mix-blend-screen" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-10 text-left relative z-10 w-full border-b border-blue-500/10 pb-12">
                        <div className="w-20 h-20 md:w-28 md:h-28 bg-blue-500/10 rounded-[2rem] flex items-center justify-center border border-blue-500/20 shrink-0 shadow-lg">
                            <FlaskConical className="w-10 h-10 md:w-14 md:h-14 text-blue-500" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter leading-none">Clinical <span className="text-blue-500 italic-font">Pulse</span></h3>
                            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest opacity-80 leading-none">External Lab Telemetry Sync</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        {labReport.parameters.map((p, idx) => (
                            <div key={idx} className="bg-background/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-blue-500/10 flex flex-col gap-10 text-left shadow-lg">
                                <div className="flex justify-between items-start opacity-70">
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{p.parameter}</span>
                                    <Activity className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex items-baseline gap-2 relative">
                                    <span className="text-4xl md:text-5xl font-black font-mono tracking-tighter leading-none text-foreground">{p.value}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{p.unit}</span>
                                </div>
                                <div className={cn("px-4 py-2.5 rounded-full text-[9px] font-bold tracking-widest text-center shadow-md uppercase border", 
                                    p.isNormal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                                    {p.isNormal ? 'NOMINAL' : 'CRITICAL'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          {/* Disclaimer Footer Block */}
          <div className="p-8 md:p-12 lg:p-20 rounded-[2.5rem] md:rounded-[3rem] bg-red-950/20 border-t-[6px] border-red-600 relative isolate flex flex-col items-center gap-8 md:gap-10 shadow-lg">
              <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 rotate-12 text-red-600"><ShieldAlert className="w-48 h-48 md:w-64 md:h-64" /></div>
              
              <div className="flex flex-col items-center gap-6 text-red-500 relative z-10">
                  <div className="p-6 bg-red-600/10 rounded-3xl border border-red-600/20"><AlertCircle className="w-10 h-10 md:w-12 md:h-12" /></div>
                  <h4 className="text-xl md:text-3xl font-black uppercase tracking-widest leading-none">Disclaimer</h4>
              </div>
              <p className="text-sm md:text-base text-red-200/80 leading-[1.8] font-medium max-w-4xl mx-auto text-center relative z-10">
                  Neural matrix node performs diagnostic spectral interpretations for preliminary hematological screening only. Data is strictly probabilistic. Standard lab validation at a certified institution is MANDATORY for clearance.
              </p>
          </div>

          <footer className="text-center pt-20 pb-12 opacity-60 space-y-12 relative z-10 border-t border-border mx-[-30px]">
               <div className="flex items-center justify-center gap-16">
                   <div className="flex flex-col items-center gap-4">
                       <Dna className="w-8 h-8 opacity-40" />
                       <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Matrix Lock</span>
                   </div>
                   <div className="h-12 w-px bg-white/10" />
                   <div className="flex flex-col items-center gap-4">
                       <Cpu className="w-8 h-8 opacity-40" />
                       <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Node Sync</span>
                   </div>
               </div>
          </footer>
      </div>
    </div>
  );
}
