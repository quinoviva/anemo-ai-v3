'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  runProvidePersonalizedRecommendations,
  runFindNearbyClinics,
} from '@/app/actions';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Download, 
  FileText, 
  Hospital, 
  Stethoscope, 
  HeartPulse, 
  MapPin, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  ChevronRight,
  RefreshCw,
  Clock,
  User,
  ExternalLink,
  Flame,
  Leaf,
  FlaskConical,
  AlertCircle,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award
} from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import { AnemoLoading } from '../ui/anemo-loading';
import HeartLoader from '@/components/ui/HeartLoader';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const [userName, setUserName] = useState('');
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
      if (userData.firstName) setUserName(`${userData.firstName} ${userData.lastName}`);
    }
  }, [userData]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);

    try {
      let userProfileString = `User's location: ${userLocation}`;
      if (userData) {
        const data = userData;
        const medicalInfo = data.medicalInfo || {};
        userProfileString = `
            Name: ${data.firstName || ''} ${data.lastName || ''}
            Location: ${data.address || 'Iloilo City'}
            Sex: ${medicalInfo.sex || 'N/A'}
            Conditions: ${medicalInfo.conditions || 'N/A'}
        `;
      }

      if (!isOnline) throw new Error("Offline");
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
              console.warn("Failed to fetch clinics", e);
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
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({
        title: "Intelligence Compilation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [allImageDescriptions, labReportSummary, user, firestore, userLocation, toast, isOnline, userData]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(input, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#020202',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfImgHeight);
      pdf.save(`ANEMO-INTELLIGENCE-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Encryption Complete",
        description: "Your health intelligence PDF has been exported.",
      });

    } catch (error) {
      toast({
        title: "PDF Render Failed",
        description: "Neural rendering engine encountered an error.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8">
        <div className="relative">
            <div className="absolute inset-[-40px] bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            <AnemoLoading />
        </div>
        <div className="text-center space-y-4 relative z-10">
          <h3 className="text-4xl font-black uppercase tracking-[0.4em] text-foreground">Synthesizing Results</h3>
          <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.3em] animate-pulse">Running diagnostic models & clinical correlation...</p>
        </div>
      </div>
    );
  }
  
  if (!report) return null;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-background/20 border border-primary/10 p-6 rounded-[3rem] backdrop-blur-[60px] shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-[0.3em] leading-none">Diagnostic Intelligence</h2>
                <p className="text-[10px] text-primary font-black uppercase tracking-[0.5em] mt-2 animate-pulse">Status: Clinical Evaluation Complete</p>
            </div>
        </div>
        <div className="flex gap-4 relative z-10">
            <Button onClick={onReset} variant="ghost" className="h-14 rounded-2xl px-8 text-[11px] font-black tracking-[0.3em] uppercase hover:bg-background/40 text-muted-foreground hover:text-foreground transition-all">
                <RefreshCw className="w-5 h-5 mr-3" />
                New Sequence
            </Button>
            <Button 
                onClick={handleDownloadPdf} 
                disabled={isDownloading}
                className="h-14 rounded-2xl px-10 bg-primary text-primary-foreground font-black text-[11px] tracking-[0.4em] uppercase hover:opacity-90 hover:scale-105 transition-all shadow-[0_20px_40px_rgba(var(--primary),0.3)] group"
            >
                {isDownloading ? <HeartLoader size={16} strokeWidth={3} className="mr-3" /> : <Download className="w-5 h-5 mr-3 group-hover:-translate-y-1 transition-transform" />}
                Export PDF
            </Button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="relative group">
        <div className="absolute inset-[-100px] bg-primary/10 blur-[200px] rounded-full opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity duration-1000" />
        
        <div 
          ref={reportRef} 
          className="bg-background border border-primary/10 rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.2)] relative z-10"
        >
            {/* Header Identity */}
            <div className="h-48 bg-gradient-to-r from-primary/30 via-muted/50 to-transparent p-16 flex items-center justify-between border-b border-primary/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10" />
                <div className="flex items-center gap-10 relative z-10">
                    <div className="w-24 h-24 rounded-3xl bg-background border border-primary/30 flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.2)] rotate-3">
                        <HeartPulse className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-tighter uppercase leading-none">AnemoCheck<span className="text-primary italic">AI</span></h1>
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.6em] mt-3">Advanced Clinical Diagnostics Suite</p>
                    </div>
                </div>
                <div className="text-right hidden md:block relative z-10">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-2">Diagnostic Timestamp</p>
                    <p className="text-xl font-black text-foreground uppercase tracking-tighter">{format(new Date(), 'PPP')}</p>
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">Encrypted Node</span>
                    </div>
                </div>
            </div>

            <div className="p-16 space-y-24">
                {/* Score Section: Three Vectors */}
                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Anemia Type */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="space-y-6 p-10 rounded-[3rem] bg-muted/20 border border-primary/5 relative group overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-primary/40" />
                        <div className="flex items-center gap-4 text-primary">
                            <Zap className="w-6 h-6" />
                            <span className="text-[11px] font-black uppercase tracking-[0.4em]">Verdict</span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase leading-tight">{report.anemiaType}</h2>
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Detected Classification</p>
                        </div>
                    </motion.div>

                    {/* Risk Score */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="space-y-8 p-10 rounded-[3rem] bg-muted/20 border border-primary/5 relative group overflow-hidden flex flex-col justify-center"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-primary">
                                <TrendingUp className="w-6 h-6" />
                                <span className="text-[11px] font-black uppercase tracking-[0.4em]">Risk Vector</span>
                            </div>
                            <span className="text-5xl font-black text-foreground tracking-tighter">{report.riskScore}<span className="text-xl text-muted-foreground ml-2">/100</span></span>
                        </div>
                        <div className="space-y-3">
                            <Progress value={report.riskScore} className="h-4 bg-muted rounded-full overflow-hidden" />
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
                                <span>Optimal</span>
                                <span>Critical</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Confidence Score */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="space-y-6 p-10 rounded-[3rem] bg-muted/20 border border-primary/5 relative group overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-2 h-full bg-blue-500/40" />
                        <div className="flex items-center gap-4 text-blue-500">
                            <Award className="w-6 h-6" />
                            <span className="text-[11px] font-black uppercase tracking-[0.4em]">Confidence</span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-6xl font-black text-foreground tracking-tighter">{report.confidenceScore}<span className="text-2xl text-muted-foreground">%</span></h2>
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Neural Precision Index</p>
                        </div>
                    </motion.div>
                </div>

                {/* Description Grid */}
                <div className="p-12 rounded-[4rem] bg-muted/10 border border-primary/10 backdrop-blur-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
                    <div className="flex items-center gap-6 mb-8 relative z-10">
                        <div className="p-4 bg-primary/10 rounded-2xl">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-[0.3em]">Neural Insight</h3>
                    </div>
                    <div className="space-y-8 relative z-10">
                        <p className="text-2xl text-foreground font-light tracking-tight leading-relaxed italic border-l-4 border-primary pl-10 py-2">
                            "{report.recommendations.split('\n')[0].replace(/^[*-]\s*/, '')}"
                        </p>
                    </div>
                </div>

                {/* Multimodal Parameters */}
                <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-8">
                         <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-4">
                            <Layers className="w-6 h-6 text-primary" />
                            Diagnostic Samples
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Sensors Aligned</div>
                            <span className="px-4 py-1.5 rounded-full bg-muted border border-primary/10 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Quantum Encrypted</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {Object.entries(analyses).map(([key, value], idx) => (
                            <motion.div 
                                key={key} 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.15 }}
                                className="p-10 rounded-[3.5rem] border border-primary/10 bg-muted/10 space-y-10 group transition-all duration-700 hover:bg-muted/20 hover:border-primary/30 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-2 border-primary/5 relative shadow-2xl">
                                    <img src={value.imageUrl!} alt={key} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                    <div className="absolute top-6 left-6 px-4 py-1.5 rounded-xl bg-background/80 backdrop-blur-xl border border-primary/10">
                                        <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">{key.replace('-', ' ')}</span>
                                    </div>
                                    <div className={cn(
                                        "absolute bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl",
                                        value.analysisResult?.toUpperCase().includes('POSITIVE') ? "bg-red-500" : "bg-emerald-500"
                                    )}>
                                         <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                </div>
                                <div className="space-y-4 px-2 relative z-10">
                                    <p className={cn(
                                        "text-[12px] font-black uppercase tracking-[0.4em] mb-1",
                                        value.analysisResult?.toUpperCase().includes('POSITIVE') ? "text-red-500" : 
                                        value.analysisResult?.toUpperCase().includes('NEGATIVE') ? "text-emerald-500" : "text-primary"
                                    )}>
                                        {value.analysisResult}
                                    </p>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-bold uppercase tracking-widest opacity-60 line-clamp-3">{value.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Lab Integration Panel */}
                {labReport && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="p-16 rounded-[4.5rem] border border-blue-500/20 bg-blue-500/[0.03] backdrop-blur-[80px] relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[200px] pointer-events-none" />
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 relative z-10">
                            <div className="flex items-center gap-10">
                                <div className="w-24 h-24 bg-blue-500/20 rounded-[2.5rem] border border-blue-500/30 flex items-center justify-center shadow-2xl animate-float">
                                    <FlaskConical className="w-12 h-12 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-5xl font-black text-foreground tracking-tighter uppercase leading-none">Vascular <span className="text-blue-500">Sync</span></h3>
                                    <p className="text-[12px] font-black text-blue-500 uppercase tracking-[0.5em] mt-4">CBC Laboratory Integrity Core Active</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
                            {labReport.parameters.map((p, idx) => (
                                <div key={idx} className="bg-background/80 backdrop-blur-3xl p-10 rounded-[3rem] border border-primary/5 group hover:border-blue-500/50 transition-all duration-700 hover:-translate-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-6 group-hover:text-blue-500 transition-colors">{p.parameter}</p>
                                    <div className="flex items-baseline gap-2 mb-8">
                                        <span className="text-5xl font-black text-foreground tracking-tighter">{p.value}</span>
                                        <span className="text-[11px] font-black text-muted-foreground uppercase">{p.unit}</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            whileInView={{ width: p.isNormal ? '100%' : '40%' }}
                                            className={cn("h-full rounded-full transition-all duration-1000", p.isNormal ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]")} 
                                        />
                                    </div>
                                    <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] mt-5", p.isNormal ? "text-emerald-500" : "text-red-500")}>
                                        {p.isNormal ? 'NOMINAL LEVEL' : 'CRITICAL OFFSET'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
                
                {/* Recommendations Grid */}
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Home Remedies */}
                    <div className="space-y-12">
                        <div className="flex items-center gap-6 border-b border-primary/10 pb-8">
                             <div className="p-4 bg-emerald-500/10 rounded-2xl">
                                <Leaf className="w-8 h-8 text-emerald-500" />
                             </div>
                             <h3 className="text-2xl font-black text-foreground uppercase tracking-[0.4em]">Home Remedies</h3>
                        </div>
                        <div className="grid gap-10">
                            <div className="p-12 rounded-[4rem] bg-emerald-500/[0.03] border border-emerald-500/10 group hover:border-emerald-500/30 transition-all duration-700 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                <h4 className="text-[12px] font-black text-emerald-100 bg-emerald-500 px-6 py-2 rounded-full uppercase tracking-[0.5em] mb-10 inline-block">
                                    Holistic Recovery Matrix
                                </h4>
                                <ul className="space-y-8">
                                    {[
                                        { title: 'Iron Infusion (Dietary)', desc: 'Prioritize Malunggay, Spinach, and Lean Meats daily.' },
                                        { title: 'Vitamin C Synergy', desc: 'Squeeze calamansi or lemon into iron meals to triple absorption.' },
                                        { title: 'Dark Molasses Boost', desc: '1 tsp of blackstrap molasses in warm water nightly.' },
                                        { title: 'Hydration Cycle', desc: 'Avoid tea/coffee during meals as tannins block iron uptake.' }
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-8 group/item">
                                            <div className="mt-1 w-5 h-5 rounded-full border-2 border-emerald-500/40 flex items-center justify-center p-1 group-hover/item:border-emerald-500 transition-colors">
                                                <div className="w-full h-full rounded-full bg-emerald-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-xl text-foreground font-black tracking-tighter uppercase block">{item.title}</span>
                                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest leading-relaxed">{item.desc}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Nearby Support */}
                    <div className="space-y-12">
                        <div className="flex items-center gap-6 border-b border-primary/10 pb-8">
                             <div className="p-4 bg-primary/10 rounded-2xl">
                                <MapPin className="w-8 h-8 text-primary" />
                             </div>
                             <h3 className="text-2xl font-black text-foreground uppercase tracking-[0.4em]">Care Network</h3>
                        </div>
                        <div className="space-y-6">
                            {clinics.map((clinic, index) => (
                                <motion.div 
                                    key={index} 
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ x: 10, scale: 1.02 }}
                                    className="flex items-center gap-8 p-10 rounded-[3rem] bg-muted/10 border border-primary/10 hover:border-primary/40 transition-all group cursor-pointer shadow-xl backdrop-blur-md"
                                >
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-background border border-primary/10 flex items-center justify-center group-hover:border-primary/60 transition-all shadow-2xl scale-110">
                                        {clinic.type === 'Hospital' ? <Hospital className="w-8 h-8 text-primary" /> : <Stethoscope className="w-8 h-8 text-primary" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-2xl font-black text-foreground tracking-tighter truncate leading-none mb-2">{clinic.name}</p>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.3em] font-black truncate opacity-60">
                                            {clinic.address}
                                        </p>
                                    </div>
                                    <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-12">
                                        <ExternalLink className="w-6 h-6 text-primary" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legal Protocol */}
                <div className="p-16 rounded-[4.5rem] bg-red-500/[0.03] border border-red-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-red-500/20" />
                    <div className="flex items-center gap-6 mb-10 text-red-500">
                        <AlertCircle className="w-8 h-8" />
                        <span className="text-[14px] font-black uppercase tracking-[0.5em]">Clinical Use Protocol</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed uppercase font-black tracking-[0.1em] text-justify opacity-60">
                        The Anemo diagnostic pipeline utilizes neural networks for hemological interpretation of ocular and dermal markers. This insight is probabilistic and should not serve as late-stage clinical diagnosis. Cross-reference with standard venous blood analysis for definitive verification.
                    </p>
                </div>
            </div>

            {/* Deep Footer */}
            <div className="p-20 bg-muted/20 border-t border-primary/10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[1.5em] relative z-10 animate-pulse">Bio-Health Signal Transmission Active • Distributed Neural Network • © 2026</p>
            </div>
        </div>
      </div>
    </div>
  );
}

function Layers(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-8.58 3.91a2 2 0 0 0-1.66 0L2.6 10.25a1 1 0 0 0 0 1.83Z" />
        <path d="m2.6 12.08 8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-8.58 3.91a2 2 0 0 0-1.66 0L2.6 10.25a1 1 0 0 0 0 1.83Z" />
        <path d="m2.6 17.08 8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-8.58 3.91a2 2 0 0 0-1.66 0L2.6 15.25a1 1 0 0 0 0 1.83Z" />
      </svg>
    )
  }
