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
          thumbnails: thumbnails.filter(t => (t as any).data),
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
        text: `Anemia Risk Score: ${report.riskScore}/100 — ${report.anemiaType}. Confidence: ${report.confidenceScore}%.`,
        url: typeof window !== 'undefined' ? window.location.href : '',
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast({ title: "Report link copied to clipboard" });
      }
    } catch (e) { }
  };

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#040404',
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

  const getSeverityColors = (anemiaType: string) => {
    const lower = (anemiaType || '').toLowerCase();
    if (lower.includes('none') || lower.includes('normal'))
      return { borderL: 'border-l-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-400' };
    if (lower.includes('mild'))
      return { borderL: 'border-l-yellow-500', text: 'text-yellow-400', dot: 'bg-yellow-400' };
    if (lower.includes('moderate'))
      return { borderL: 'border-l-orange-500', text: 'text-orange-400', dot: 'bg-orange-400' };
    if (lower.includes('severe') || lower.includes('critical'))
      return { borderL: 'border-l-red-500', text: 'text-red-400', dot: 'bg-red-400' };
    return { borderL: 'border-l-primary', text: 'text-primary', dot: 'bg-primary' };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 space-y-12 min-h-[600px] relative overflow-hidden bg-[#040404]">
        <div className="absolute inset-0 bg-radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.2)_0%,transparent_70%) animate-pulse" />
        <HeartLoader size={120} strokeWidth={1} />
        <div className="text-center space-y-4 relative z-10 text-white">
          <h3 className="text-2xl md:text-3xl font-medium tracking-tight opacity-90">Generating Diagnostic Report</h3>
          <span className="text-[11px] font-bold tracking-widest uppercase text-primary/60">Neural Synchronization Active</span>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 w-full overflow-hidden px-4 md:px-0 bg-[#040404] text-left">

      {/* Top Action Bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center gap-6 glass-panel p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden isolate">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 z-0" />
        <div className="flex items-center gap-6 relative z-10 w-full sm:w-auto">
          <div className="w-16 h-16 rounded-[1.8rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="flex flex-col text-left">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">Diagnostic <span className="text-emerald-500 italic-font">Verified</span></h2>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest leading-none opacity-60">Security Session Active</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center sm:justify-end gap-3 w-full sm:w-auto relative z-10">
          <Button onClick={onReset} variant="outline" className="flex-1 sm:flex-none h-11 md:h-12 rounded-full px-6 text-[10px] md:text-xs font-black tracking-widest uppercase border-white/10 hover:bg-white/5 transition-all text-white/80">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> New Analysis
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1 sm:flex-none h-11 md:h-12 rounded-full px-6 text-[10px] md:text-xs font-black tracking-widest uppercase border-white/10 hover:bg-white/5 transition-all text-white/80">
            <Share2 className="w-3.5 h-3.5 mr-2" /> Share
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-full sm:w-auto h-11 md:h-12 rounded-full px-8 bg-primary text-primary-foreground text-[10px] md:text-xs font-black tracking-widest uppercase hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/40">
            {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Clinical PDF
          </Button>
        </div>
      </div>

      {/* Main Report Body */}
      <div ref={reportRef} data-print-report className="max-w-7xl mx-auto w-full bg-[#0a0a0a] border border-white/[0.03] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] rounded-[3.5rem] md:rounded-[4.5rem] relative isolate py-12 px-6 sm:p-16 md:p-20 lg:p-24 space-y-16 md:space-y-24 overflow-hidden">

        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:60px_60px] z-0 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -mr-40 -mt-40 pointer-events-none opacity-50" />

        {/* Clinical Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12 relative z-10 border-b border-white/[0.05] pb-16 md:pb-24">
          <div className="flex flex-col sm:flex-row items-center gap-10 text-center sm:text-left">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center shadow-2xl relative group">
              <HeartPulse className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-3">
                Anemo<span className="text-primary italic-font tracking-tight">Matrix</span>
              </h1>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <Badge variant="outline" className="px-3 h-6 border-primary/30 text-primary text-[9px] font-black tracking-widest uppercase">SYST_ILO_03</Badge>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 leading-none">Diagnostic Pulse</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right pt-4 md:pt-0 text-white/90">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Synchronization Trace</span>
            <p className="text-lg md:text-xl font-medium tracking-tight">{format(new Date(), 'PPP p')}</p>
            <div className="px-4 py-1 rounded-full bg-white/[0.02] border border-white/5 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">
              ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Primary Verdict Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 relative z-10">
          <div className={cn(
            "lg:col-span-8 p-10 md:p-14 lg:p-16 rounded-[3rem] md:rounded-[4rem] bg-white/[0.02] border border-white/5 border-l-[8px] flex flex-col justify-between relative overflow-hidden group shadow-2xl",
            getSeverityColors(report.anemiaType).borderL
          )}>
            <div className="absolute right-0 top-0 opacity-5 scale-150 translate-x-1/4 -translate-y-1/4 pointer-events-none">
              <Dna className="w-96 h-96 text-primary" />
            </div>
            <div className="flex items-center gap-4 mb-12 md:mb-20 relative z-10 transition-transform group-hover:translate-x-1">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20"><Zap className="w-6 h-6 text-primary" /></div>
              <span className="text-[11px] font-black text-primary/70 uppercase tracking-[0.3em] leading-none">Diagnostic Signature</span>
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse shadow-lg", getSeverityColors(report.anemiaType).dot)} />
                <span className={cn("text-[11px] font-black uppercase tracking-[0.25em]", getSeverityColors(report.anemiaType).text)}>
                  {report.anemiaType} Detected
                </span>
              </div>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] text-balance">
                {report.anemiaType.split(' ')[0]} <br className="md:hidden" /><span className="italic-font text-primary">{report.anemiaType.split(' ').slice(1).join(' ')}</span>
              </h3>
            </div>
          </div>

          <div className="lg:col-span-4 p-10 md:p-14 rounded-[3rem] md:rounded-[4rem] bg-amber-500/5 border border-amber-500/10 flex flex-col items-center justify-center text-center gap-10 relative isolate overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full scale-150 opacity-20 pointer-events-none" />
            <div className="relative isolate text-white">
              <h4 className={cn(
                "text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none transition-colors",
                report.confidenceScore >= 80 ? 'text-emerald-400' : report.confidenceScore >= 60 ? 'text-amber-400' : 'text-red-400'
              )}>
                {report.confidenceScore}<span className="text-3xl md:text-4xl text-amber-500 ml-1 italic-font">%</span>
              </h4>
              <div className="mt-4 flex gap-2 justify-center opacity-40">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-2.5 h-2.5 rounded-full transition-all", i <= Math.round(report.confidenceScore / 20) ? "bg-amber-400" : "bg-white/10")} />
                ))}
              </div>
            </div>
            <div className="space-y-4 relative z-10 flex flex-col items-center">
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-8 bg-amber-500/30" />
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-500/80">AI Confidence</span>
                <div className="h-px w-8 bg-amber-500/30" />
              </div>
              {report.confidenceScore >= 90 && (
                <div className="px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  Ultra-High Fidelity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visual Evidence Section */}
        <div className="space-y-12 relative z-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shrink-0"><LayoutGrid className="w-5 h-5 text-white/40" /></div>
              <h4 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-white shrink-0">Visual <span className="text-primary italic-font tracking-tight">Evidence</span></h4>
            </div>
            <div className="flex-1 h-px bg-white/5" />
            <button
              onClick={() => setComparisonMode(m => !m)}
              className={cn(
                "hidden sm:flex items-center gap-3 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-xl active:scale-95",
                comparisonMode
                  ? "bg-primary text-white border-primary shadow-primary/20"
                  : "glass-button border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              <Columns2 className="w-4 h-4" /> {comparisonMode ? 'Collapse View' : 'Diagnostic Mode'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14">
            {Object.entries(analyses).map(([key, value], idx) => (
              <div key={key} className="flex flex-col gap-8 group">
                <div className="aspect-square w-full rounded-[3rem] overflow-hidden border border-white/[0.05] shadow-3xl relative isolate bg-[#050505]">
                  {value.imageUrl && (
                    <img src={value.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent p-10 flex flex-col justify-end">
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.4em] mb-3 leading-none opacity-60">Sample Matrix 0{idx + 1}</span>
                    <h5 className="text-2xl md:text-3xl font-black text-white capitalize leading-none tracking-tight">{key.replace('-', ' ')}</h5>
                  </div>
                </div>
                <div className="px-4 space-y-4">
                  <p className="text-sm md:text-base text-muted-foreground/60 font-medium leading-relaxed italic border-l-[3px] border-primary/20 pl-6 text-balance">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Synthesis Section */}
        <div className="space-y-12 relative z-10 w-full pt-16 md:pt-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-white/[0.05]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shrink-0"><Search className="w-6 h-6 text-primary" /></div>
                <h4 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">Clinical <span className="text-primary italic-font tracking-tight">Synthesis</span></h4>
              </div>
              <p className="text-sm md:text-base font-medium text-muted-foreground/60 max-w-2xl leading-relaxed">
                Personalized therapeutic action plan derived from multimodal biometric analysis and correlation.
              </p>
            </div>
            <button
              onClick={handleCopyRecommendations}
              className="w-full lg:w-auto h-14 px-10 rounded-full glass-button border border-white/10 text-[11px] font-black uppercase tracking-[0.3em] text-white hover:bg-white/10 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
            >
              {copiedRec ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedRec ? 'Synthesis Copied' : 'Transfer Metadata'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Sidebar Stats */}
            <div className="lg:col-span-4 space-y-8">
              <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group shadow-2xl">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 block">System Calculus Recommendation</span>
                <p className="text-base md:text-lg text-white/90 font-medium leading-relaxed italic-font">
                  "Biometric spectral markers indicate an assessment of <strong>{report.riskScore}/100</strong> on the hematological risk matrix. Please prioritize the following therapeutic steps."
                </p>
              </div>
              <div className="aspect-[4/3] rounded-[3rem] bg-primary/5 border border-primary/20 p-10 flex flex-col items-center justify-center text-center gap-6 relative isolate shadow-3xl text-white">
                <div className="absolute inset-0 bg-primary/10 blur-[100px] pointer-events-none" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em] leading-none mb-2">Priority Vector</span>
                <div className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                  {getSeverityColors(report.anemiaType).text.includes('emerald') ? 'Routine Health'
                    : getSeverityColors(report.anemiaType).text.includes('yellow') ? 'Nutrient Sync'
                      : getSeverityColors(report.anemiaType).text.includes('orange') ? 'Clinical Opt.'
                        : 'Urgent Action'}
                </div>
              </div>
            </div>

            {/* Recommendations Content */}
            <div className="lg:col-span-8">
              <div className="p-10 md:p-14 lg:p-20 rounded-[3.5rem] md:rounded-[4.5rem] bg-white/[0.01] border border-border border-l-[10px] border-l-primary relative overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none text-primary"><Search className="w-96 h-96" /></div>
                <div className="relative z-10 space-y-10 text-left">
                  {report.recommendations.split('\n').filter(l => l.trim().length > 0).map((line, idx) => {
                    const isHeader = line.includes('**') && !line.startsWith('-') && !line.startsWith('* ');
                    const isBullet = line.startsWith('-') || line.startsWith('*');

                    if (isHeader) {
                      const cleanHeader = line.replace(/\*\*/g, '').replace(/^[A-G]\.\s*/, '').trim();
                      return (
                        <h6 key={idx} className="text-lg md:text-xl font-black text-primary uppercase tracking-widest mt-12 mb-6 border-b border-white/5 pb-6 leading-tight flex items-center gap-4">
                          <span className="w-2 h-8 bg-primary rounded-full" />
                          {cleanHeader}
                        </h6>
                      );
                    }
                    if (isBullet) {
                      const cleanBullet = line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '');
                      const parts = cleanBullet.split(':');
                      if (parts.length > 1 && parts[0].length < 50) {
                        return (
                          <div key={idx} className="flex gap-6 group/item py-4 px-6 rounded-3xl hover:bg-white/[0.04] transition-all -ml-6 text-white/90">
                            <div className="w-2 h-2 rounded-full bg-primary/40 mt-2.5 flex-shrink-0 group-hover/item:scale-150 transition-transform bg-primary" />
                            <div className="text-base md:text-lg leading-relaxed font-medium">
                              <strong className="text-primary font-black uppercase tracking-[0.2em] text-[11px] md:text-xs block mb-2">{parts[0].trim()}</strong>
                              {parts.slice(1).join(':').trim()}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="flex gap-6 py-3 ml-2 text-white/80">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-3 flex-shrink-0" />
                          <p className="text-base md:text-lg leading-relaxed font-medium">
                            {cleanBullet}
                          </p>
                        </div>
                      );
                    }
                    return <p key={idx} className="text-base md:text-lg text-white/40 leading-relaxed my-4 font-medium italic-font">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* lab report sync */}
          {labReport && (
            <div className="mt-24 p-10 md:p-14 lg:p-20 rounded-[3.5rem] bg-blue-500/5 border border-blue-500/10 space-y-12 relative overflow-hidden">
              <div className="flex items-center gap-6 text-white">
                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20"><FlaskConical className="w-8 h-8 text-blue-500" /></div>
                <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Clinical <span className="text-blue-500 italic-font">Pulse</span></h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {labReport.parameters.map((p, idx) => (
                  <div key={idx} className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-blue-500/10 flex flex-col gap-8 shadow-lg">
                    <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">{p.parameter}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black text-white">{p.value}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.unit}</span>
                    </div>
                    <div className={cn("px-4 py-2 rounded-full text-[9px] font-black tracking-widest text-center border",
                      p.isNormal ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                      {p.isNormal ? 'NOMINAL' : 'CRITICAL'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-24 p-10 md:p-14 lg:p-24 rounded-[3.5rem] md:rounded-[4.5rem] bg-red-950/20 border-t-[8px] border-red-600 relative isolate flex flex-col items-center gap-10 shadow-3xl overflow-hidden border-b border-red-950/40">
            <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 text-red-600 pointer-events-none"><ShieldAlert className="w-64 h-64 md:w-96 md:h-96" /></div>
            <div className="flex flex-col items-center gap-6 text-red-500 relative z-10 text-center">
              <div className="p-6 bg-red-600/10 rounded-[2rem] border border-red-600/20 shrink-0"><AlertCircle className="w-10 h-10" /></div>
              <h4 className="text-2xl md:text-3xl font-black uppercase tracking-[0.3em] leading-none">Diagnostic Safety Protocol</h4>
            </div>
            <p className="text-base md:text-lg text-red-200/60 leading-[1.8] font-medium max-w-5xl mx-auto text-center relative z-10 text-balance italic">
              "This matrix assessment is powered by high-fidelity spectral AI for preliminary screening purposes only. It is NOT a clinical diagnosis. Consultation with a board-certified hematologist and formal venous sampling is mandatory for therapeutic confirmation."
            </p>
          </div>
        </div>

        <footer className="text-center pt-24 pb-12 opacity-30 space-y-10 relative z-10 border-t border-white/[0.05] mt-24">
          <div className="flex flex-col items-center justify-center gap-8 group">
            <Cpu className="w-10 h-10 opacity-40 group-hover:opacity-100 transition-all text-primary duration-1000 scale-90 group-hover:scale-110" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.6em] leading-none text-white/50">Anemo</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Hematological Artificial Intelligence Matrix</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Comparison Mode Panel */}
      {comparisonMode && (
        <div className="max-w-7xl mx-auto w-full mt-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-primary/20 bg-primary/5 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-4 relative z-10 text-white">
          <div className="px-10 py-6 border-b border-primary/10 flex items-center gap-4 bg-primary/[0.02]">
            <Columns2 className="w-6 h-6 text-primary shrink-0" />
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-primary">Side-by-Side Diagnostic Parameter Matrix</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-primary/10">
            {Object.entries(analyses).map(([key, value], idx) => {
              const label = key === 'under-eye' ? 'Conjunctiva' : key === 'fingernails' ? 'Nailbed' : 'Skin';
              return (
                <div key={key} className="flex flex-col p-8 gap-6 hover:bg-white/[0.02] transition-colors">
                  <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={value.imageUrl!} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      <span>Node 0{idx + 1}</span>
                      <span>{label}</span>
                    </div>
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">AI Verdict</span>
                      <p className="text-base font-black text-white leading-tight uppercase truncate">{value.analysisResult}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
