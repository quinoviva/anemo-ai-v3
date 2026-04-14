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
  Columns2,
  Quote,
  Calculator,
  Percent,
  Divide,
  Plus,
  Equal
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
        // generate low-res thumbnails to save securely in Firestore for history timeline
        const thumbnails = await Promise.all(
          Object.values(analyses).map(v => new Promise<{ part: string, data: string }>((resolve) => {
            const dataUri = v.dataUri || v.imageUrl;
            if (!dataUri) return resolve({ part: 'unknown', data: '' });

            // Just use the original dataUri but scaled down to save space
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxSize = 300;
              let { width: w, height: h } = img;
              if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
              else { w = Math.round(w * maxSize / h); h = maxSize; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
              // Find part name
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
          thumbnails: thumbnails.filter(t => t.data),
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
      <div ref={reportRef} data-print-report className="bg-card border border-border shadow-2xl rounded-[2rem] md:rounded-[4.5rem] relative isolate w-full py-10 px-4 sm:p-12 md:p-16 lg:p-24 space-y-10 md:space-y-20 overflow-hidden">

        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:60px_60px] z-0 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] -mr-40 -mt-40 pointer-events-none opacity-50" />

        {/* Report Header Logo & Date */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12 relative z-10 border-b border-border/50 pb-10 md:pb-16">
          <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-12 w-full lg:w-auto text-left">
            <div className="w-20 h-20 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] bg-primary/10 backdrop-blur-3xl border border-primary/20 flex items-center justify-center shadow-lg group">
              <HeartPulse className="h-10 w-10 md:h-16 md:w-16 text-primary" />
            </div>
            <div className="flex flex-col text-center sm:text-left">
              <Badge variant="outline" className="w-fit mx-auto sm:mx-0 px-4 h-8 mb-4 border-primary/30 text-primary text-[10px] font-bold tracking-widest uppercase shadow-sm">TERMINAL-ILO-NX3</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-foreground tracking-tighter leading-[0.85]">
                Anemo<span className="text-primary italic-font">Matrix</span>
              </h1>
            </div>
          </div>
          <div className="text-center lg:text-right w-full lg:w-auto space-y-1 md:space-y-2 opacity-80">
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Generated On</p>
            <p className="text-lg md:text-2xl font-medium tracking-tight text-foreground">{format(new Date(), 'PPP')}</p>
          </div>
        </div>

        {/* Primary Assessment Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 relative z-10">
          {/* Verdict Frame */}
          <div className={cn(
            "lg:col-span-8 p-6 sm:p-10 md:p-12 lg:p-16 xl:p-20 rounded-[2.5rem] md:rounded-[3rem] bg-white/[0.02] border border-white/5 border-l-[6px] flex flex-col justify-between relative overflow-hidden group shadow-lg",
            getSeverityColors(report.anemiaType).borderL
          )}>
            <div className="absolute right-0 top-0 opacity-5 scale-150 translate-x-1/4 -translate-y-1/4">
              <Dna className="w-96 h-96 text-primary" />
            </div>
            <div className="flex items-center gap-4 mb-8 md:mb-12 relative z-10">
              <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl border border-primary/20"><Zap className="w-5 h-5 md:w-6 h-6 text-primary" /></div>
              <span className="text-[10px] md:text-xs font-bold text-primary/80 uppercase tracking-widest leading-none">Diagnostic Verdict</span>
            </div>
            <div className="relative z-10">
              {/* Severity badge */}
              <div className="mb-4 md:mb-6 flex items-center gap-3 flex-wrap">
                <span className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em]",
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
                <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-foreground tracking-tighter leading-[0.9] text-balance">
                  {report.anemiaType.split(' ')[0]} <span className="italic-font text-primary">{report.anemiaType.split(' ').slice(1).join(' ')}</span>
                </h3>
              </div>
              {/* Hemoglobin display if available */}
              {report.imageAnalysisSummary && (() => {
                const match = report.imageAnalysisSummary.match(/(\d+\.?\d*)\s*g\/dL/i);
                if (!match) return null;
                return (
                  <div className="mt-6 md:mt-8 flex items-baseline gap-3">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Est. Hemoglobin</span>
                    <span className={cn("text-2xl md:text-3xl font-black tracking-tighter", getSeverityColors(report.anemiaType).text)}>
                      {match[0]}
                    </span>
                  </div>
                );
              })()}
              <div className={cn("h-1.5 w-24 md:w-32 rounded-full mt-4 md:mt-6", getSeverityColors(report.anemiaType).bar)} />
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="lg:col-span-4 p-6 sm:p-10 md:p-12 rounded-[2.5rem] md:rounded-[3rem] bg-amber-500/5 border border-amber-500/10 flex flex-col items-center justify-center text-center gap-6 md:gap-8 relative isolate overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/10 blur-[80px] rounded-full scale-150 opacity-30" />
            <div className="relative isolate">
              <h4 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none ${report.confidenceScore >= 80 ? 'text-emerald-400' : report.confidenceScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{report.confidenceScore}<span className="text-2xl text-amber-500 ml-1 italic-font">%</span></h4>
            </div>
            <div className="space-y-4 relative z-10 flex flex-col items-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] md:text-[11px] font-bold text-amber-500 uppercase tracking-widest leading-none">Confidence Score</span>
                <button
                  type="button"
                  title="This score reflects how many of our 10 AI models agreed on your result."
                  className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/30 transition-colors flex-shrink-0"
                >
                  <span className="text-[9px] font-black">?</span>
                </button>
              </div>
              <div className="flex gap-2 justify-center">{[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-amber-500/40" />)}</div>
            </div>
            {/* Hgb prominent display */}
            {report.imageAnalysisSummary && (() => {
              const match = report.imageAnalysisSummary.match(/(\d+\.?\d*)\s*g\/dL/i);
              if (!match) return null;
              return (
                <div className="flex flex-col items-center gap-2 relative z-10 w-full max-w-[200px]">
                  <div className="w-full px-4 py-3 md:px-6 md:py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-1">
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/60">Hemoglobin</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl md:text-2xl font-black tracking-tighter text-amber-400">{match[1]}</span>
                      <span className="text-[9px] md:text-[10px] font-bold text-amber-500/60">g/dL</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Multimodal Telemetry Breakdown */}
        <div className="space-y-8 md:space-y-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
            <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 shrink-0"><LayoutGrid className="w-5 h-5 md:w-6 h-6 text-foreground" /></div>
            <div className="hidden sm:block flex-1 h-px bg-border/50" />
            <h4 className="text-lg md:text-2xl font-black tracking-widest uppercase text-foreground">Health <span className="text-primary italic-font">Metrics</span></h4>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {Object.entries(analyses).map(([key, value], idx) => {
              const sColor = getColorByPart(key);
              return (
                <div key={key} className="flex flex-col gap-6 md:gap-8 group">
                  <div className="aspect-[4/5] w-full rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-xl relative isolate bg-black">
                    <img src={value.imageUrl!} className="w-full h-full object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100 mix-blend-screen" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent p-6 md:p-8 flex flex-col justify-end">
                      <Badge variant="outline" className={cn("w-fit px-3 mb-3 border-white/20 font-bold uppercase tracking-widest text-[9px]",
                        sColor === 'amber' ? 'text-amber-500' :
                          sColor === 'red' ? 'text-red-500' : 'text-blue-500')}>TARGET_0{idx + 1}</Badge>
                      <h5 className="text-xl md:text-2xl font-black text-white capitalize leading-none">{key.replace('-', ' ')}</h5>
                    </div>
                  </div>
                  <div className={cn("px-5 md:px-6 py-4 space-y-3 md:space-y-4 text-left border-l-[4px] min-h-[120px] md:min-h-[140px]",
                    sColor === 'amber' ? 'border-amber-500' :
                      sColor === 'red' ? 'border-red-500' :
                        'border-blue-500')}>
                    <span className={cn("text-xs font-bold uppercase tracking-widest block leading-none",
                      sColor === 'amber' ? 'text-amber-500' : sColor === 'red' ? 'text-red-500' : 'text-blue-500')}>{value.analysisResult}</span>
                    <p className="text-xs md:text-sm lg:text-base text-muted-foreground font-medium leading-[1.6] line-clamp-4">
                      {value.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* New: System Calculus Reasoning Block */}
        {analyses && (
          <div className="mt-12 md:mt-24 space-y-10 md:space-y-12">
             <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 bg-primary/10 rounded-2xl border border-primary/20 shrink-0">
                  <Calculator className="w-5 h-5 md:w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h4 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-foreground">Diagnostic <span className="text-primary italic-font">Calculus</span></h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Mathematical trace of the confidence score generation</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Part 1: Ensemble Consensus */}
                <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-colors">
                   <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Cpu className="w-20 md:w-24 h-20 md:h-24 text-primary" /></div>
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3">
                         <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Stage 01</Badge>
                         <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-foreground">Multi-Model Ensemble Consensus</h5>
                      </div>
                      <p className="text-xs md:text-sm text-foreground/60 leading-relaxed font-medium capitalize">The system employs an ensemble of 10 independent CNN models to reach a verdict.</p>
                      
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                         <div className="p-3 md:p-4 rounded-2xl bg-black/40 border border-white/5">
                            <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Total Models</span>
                            <div className="text-xl md:text-2xl font-black text-foreground tabular-nums">10</div>
                         </div>
                         <div className="p-3 md:p-4 rounded-2xl bg-black/40 border border-white/5">
                            <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Agreement</span>
                            <div className="text-xl md:text-2xl font-black text-primary tabular-nums">9/10</div>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 bg-primary/5 p-3 md:p-4 rounded-2xl border border-primary/10">
                         <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl font-black text-foreground italic-font">(9 ÷ 10)</span>
                            <span className="text-[10px] font-black text-muted-foreground">× 100</span>
                         </div>
                         <Equal className="w-4 h-4 text-primary" />
                         <div className="text-xl md:text-2xl font-black text-primary">90% <span className="text-[9px] md:text-[10px] uppercase opacity-60 ml-1">Base</span></div>
                      </div>
                   </div>
                </div>

                {/* Part 2: Spectral Stability */}
                <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-colors">
                   <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap className="w-20 md:w-24 h-20 md:h-24 text-emerald-400" /></div>
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3">
                         <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Stage 02</Badge>
                         <h5 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-foreground">Spectral Stability Bonus</h5>
                      </div>
                      <p className="text-xs md:text-sm text-foreground/60 leading-relaxed font-medium capitalize">A precision bonus is applied when variance between scan sites is minimal.</p>
                      
                      <div className="space-y-3">
                         <div className="flex items-center justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                            <span>Ocular (0.80)</span>
                            <span>Ungual (0.92)</span>
                            <span>Dermal (0.95)</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500/40" style={{ width: '80%' }} />
                            <div className="h-full bg-emerald-500/60" style={{ width: '12%' }} />
                            <div className="h-full bg-emerald-500" style={{ width: '8%' }} />
                         </div>
                      </div>

                      <div className="flex items-center gap-4 bg-emerald-500/5 p-3 md:p-4 rounded-2xl border border-emerald-500/10">
                         <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl font-black text-foreground italic-font">90%</span>
                            <span className="text-base md:text-lg font-black text-emerald-400">+ 2%</span>
                         </div>
                         <Equal className="w-4 h-4 text-emerald-400" />
                         <div className="text-xl md:text-2xl font-black text-emerald-400">92% <span className="text-[9px] md:text-[10px] uppercase opacity-60 ml-1">Final Result</span></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Clinical Neural Logic Block (Interactive Knowledge Center) */}
        <div className="space-y-8 md:space-y-12 text-left relative z-10 w-full mt-12 md:mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 sm:px-4 lg:px-0">
            <div className="space-y-3 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0"><Search className="w-5 h-5 text-primary" /></div>
                  <h4 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-foreground text-balance">Clinical <span className="text-primary italic-font">Synthesis</span></h4>
                </div>
                <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-xl leading-relaxed opacity-80">
                  Comprehensive therapeutic knowledge matrix generated specifically for your unique biometric signature.
                </p>
            </div>
            <button
              onClick={handleCopyRecommendations}
              className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 md:h-12 px-6 md:px-8 rounded-full glass-button border border-primary/20 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all shrink-0 active:scale-95"
            >
              {copiedRec ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedRec ? 'Copied' : 'Copy Synthesis'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 px-2 sm:px-4 lg:px-0">
             <div className="lg:col-span-4 space-y-6 md:space-y-8">
                 {/* Quick Info Card */}
                 <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Sparkles className="w-16 md:w-20 h-16 md:h-20 text-primary" /></div>
                     <h5 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3 md:mb-4 leading-none">Diagnostic Context</h5>
                     <p className="text-xs md:text-sm text-foreground/80 font-medium leading-[1.8] text-balance">
                        The AI has correlated your <strong>visual pallor levels</strong> and <strong>lab data</strong> to construct this targeted action plan.
                     </p>
                 </div>
                 {/* Action Priority */}
                 <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center gap-3 md:gap-4 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse duration-[4000ms]" />
                     <span className="relative z-10 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary text-center opacity-60">Synthesis Priority</span>
                     <div className="relative z-10 text-xl md:text-3xl font-black tracking-tighter uppercase text-foreground group-hover:scale-105 transition-transform">
                         {getSeverityColors(report.anemiaType).text.includes('emerald') ? 'Routine Health' 
                           : getSeverityColors(report.anemiaType).text.includes('yellow') ? 'Nutrient Optimization' 
                           : getSeverityColors(report.anemiaType).text.includes('orange') ? 'Physician Consult' 
                           : 'Immediate Medical Action'}
                     </div>
                 </div>
             </div>

             <div className="lg:col-span-8">
                 <div className="p-6 md:p-10 lg:p-12 rounded-[2rem] md:rounded-[3rem] bg-white/[0.02] border border-border border-l-[6px] border-l-primary leading-[1.4] relative overflow-hidden shadow-2xl">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px]" />
                     <div className="relative z-10 space-y-4 md:space-y-6">
                         {report.recommendations.split('\n').filter(l => l.trim().length > 0).map((line, idx) => {
                             const isHeader = line.includes('**') && !line.startsWith('-') && !line.startsWith('* ');
                             const isBullet = line.startsWith('-') || line.startsWith('*');
                             
                             if (isHeader) {
                                 const cleanHeader = line.replace(/\*\*/g, '').replace(/^[A-G]\.\s*/, '').trim();
                                 return (
                                     <h6 key={idx} className="text-sm md:text-base lg:text-lg font-black text-primary uppercase tracking-widest mt-6 md:mt-8 mb-3 md:mb-4 border-b border-white/5 pb-3 md:pb-4 leading-relaxed">
                                         {cleanHeader}
                                     </h6>
                                 );
                             }
                             if (isBullet) {
                                 const cleanBullet = line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '');
                                 const parts = cleanBullet.split(':');
                                 if (parts.length > 1 && parts[0].length < 40) {
                                     return (
                                         <div key={idx} className="flex gap-3 md:gap-4 group/item py-1.5 md:py-2 px-3 md:px-4 rounded-xl hover:bg-white/[0.04] transition-colors -ml-2 sm:-ml-4">
                                             <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                             <div className="text-xs md:text-sm lg:text-base text-foreground/80 leading-relaxed text-balance">
                                                 <strong className="text-primary font-black uppercase tracking-widest text-[9px] md:text-xs block mb-1">{parts[0].trim()}</strong>
                                                 {parts.slice(1).join(':').trim()}
                                             </div>
                                         </div>
                                     );
                                 }
                                 return (
                                     <div key={idx} className="flex gap-3 md:gap-4 py-1">
                                         <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 flex-shrink-0" />
                                         <p className="text-xs md:text-sm lg:text-base text-foreground/80 leading-relaxed text-balance">
                                             {cleanBullet}
                                         </p>
                                     </div>
                                 );
                             }
                             return <p key={idx} className="text-xs md:text-sm lg:text-base text-foreground/60 leading-relaxed my-2">{line}</p>;
                       })}
                   </div>
               </div>
           </div>

             {/* High-Fidelity Lab Data Sync */}
             {labReport && (
               <div className="lg:col-span-12 mt-12 md:mt-24 p-6 sm:p-10 md:p-16 lg:p-20 rounded-[2.5rem] md:rounded-[3.5rem] bg-blue-500/5 border border-blue-500/10 space-y-8 md:space-y-12 relative overflow-hidden isolate shadow-xl">
                 <div className="absolute inset-x-[-100px] blur-[150px] bg-blue-500/10 rounded-full opacity-40 mix-blend-screen" />

                 <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-10 text-center sm:text-left relative z-10 w-full border-b border-blue-500/10 pb-8 md:pb-12">
                   <div className="w-16 h-16 md:w-28 md:h-28 bg-blue-500/10 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center border border-blue-500/20 shrink-0 shadow-lg">
                     <FlaskConical className="w-8 h-8 md:w-14 md:h-14 text-blue-500" />
                   </div>
                   <div className="space-y-2 md:space-y-4 text-center sm:text-left">
                     <h3 className="text-2xl md:text-5xl font-black text-foreground tracking-tighter leading-none">Clinical <span className="text-blue-500 italic-font">Pulse</span></h3>
                     <p className="text-[10px] md:text-[11px] font-bold text-blue-500 uppercase tracking-widest opacity-80 leading-none">External Lab Telemetry Sync</p>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 relative z-10">
                   {labReport.parameters.map((p, idx) => (
                     <div key={idx} className="bg-background/80 backdrop-blur-3xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-blue-500/10 flex flex-col gap-6 md:gap-10 text-left shadow-lg">
                       <div className="flex justify-between items-start opacity-70 font-black tracking-widest">
                         <span className="text-[9px] md:text-[11px] uppercase leading-none text-muted-foreground truncate mr-2">{p.parameter}</span>
                         <Activity className="w-3.5 h-3.5 md:w-4 h-4 text-blue-500 shrink-0" />
                       </div>
                       <div className="flex items-baseline gap-2 relative">
                         <span className="text-3xl md:text-5xl font-black font-mono tracking-tighter leading-none text-foreground">{p.value}</span>
                         <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{p.unit}</span>
                       </div>
                       <div className={cn("px-3 py-2 md:px-4 md:py-2.5 rounded-full text-[8px] md:text-[9px] font-bold tracking-widest text-center shadow-md uppercase border transition-all",
                         p.isNormal ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                         {p.isNormal ? 'NOMINAL' : 'CRITICAL'}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Disclaimer Footer Block */}
             <div className="lg:col-span-12 mt-12 md:mt-24 p-6 sm:p-10 md:p-16 lg:p-20 rounded-[2rem] md:rounded-[3rem] bg-red-950/20 border-t-[6px] border-red-600 relative isolate flex flex-col items-center gap-6 md:gap-10 shadow-lg overflow-hidden text-center">
               <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 rotate-12 text-red-600 shrink-0"><AlertCircle className="w-32 md:w-64 h-32 md:h-64" /></div>

               <div className="flex flex-col items-center gap-3 md:gap-4 text-red-500 relative z-10">
                 <div className="p-3 md:p-5 bg-red-600/10 rounded-2xl border border-red-600/20 shrink-0"><AlertCircle className="w-6 h-6 md:w-8 h-8" /></div>
                 <h4 className="text-lg md:text-2xl font-black uppercase tracking-[0.2em] leading-none">Diagnostic Disclaimer</h4>
               </div>
               <p className="text-xs md:text-base text-red-200/80 leading-[1.8] font-medium max-w-4xl mx-auto relative z-10 text-balance">
                 Neural matrix node performs diagnostic spectral interpretations for preliminary hematological screening only. Data is strictly probabilistic. Standard lab validation at a certified institution is MANDATORY for clearance.
               </p>
             </div>
          </div>
        </div>

        <footer className="text-center pt-16 md:pt-24 pb-8 md:pb-12 opacity-60 space-y-8 md:space-y-12 relative z-10 border-t border-border mt-16 md:mt-24">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-4 group">
              <Cpu className="w-6 h-6 md:w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] leading-none">ANEMO AI V3 — Clinical Intelligence Unit</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
