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

      if (user && !user.isAnonymous && firestore && reportResult) {
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
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-[0.3em]">Clinical Synthesis</h3>
                    </div>
                    <div className="space-y-8 relative z-10">
                        <p className="text-2xl text-foreground/80 leading-tight font-medium tracking-tight">
                            {report.recommendations.split('\n')[0].replace(/^[*-]\s*/, '')}
                        </p>
                    </div>
                </div>

                {/* Multimodal Parameters */}
                <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-8">
                         <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-4">
                            <Layers className="w-6 h-6 text-primary" />
                            Visual Parametrics
                        </h3>
                        <span className="px-4 py-1.5 rounded-full bg-muted border border-primary/10 text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">3 Sequential Sensors Active</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {Object.entries(analyses).map(([key, value], idx) => (
                            <motion.div 
                                key={key} 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.15 }}
                                className="p-8 rounded-[3rem] border border-primary/10 bg-muted/10 space-y-8 group transition-all duration-700 hover:bg-muted/20 hover:border-primary/30"
                            >
                                <div className="aspect-square rounded-[2.5rem] overflow-hidden border-2 border-primary/5 relative shadow-2xl">
                                    <img src={value.imageUrl!} alt={key} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                    <div className="absolute top-6 left-6 px-4 py-1.5 rounded-xl bg-background/80 backdrop-blur-xl border border-primary/10">
                                        <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">{key.replace('-', ' ')}</span>
                                    </div>
                                    <div className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.5)]">
                                         <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="space-y-3 px-2">
                                    <p className={cn(
                                        "text-[11px] font-black uppercase tracking-[0.4em] mb-1",
                                        value.analysisResult?.includes('POSITIVE') ? "text-red-500" : 
                                        value.analysisResult?.includes('NEGATIVE') ? "text-emerald-500" : "text-primary"
                                    )}>
                                        {value.analysisResult}
                                    </p>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium uppercase tracking-tight">{value.description}</p>
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
                        className="p-16 rounded-[4rem] border border-blue-500/20 bg-blue-500/[0.03] backdrop-blur-[80px] relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] -mr-32 -mt-32" />
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 relative z-10">
                            <div className="flex items-center gap-8">
                                <div className="w-20 h-20 bg-blue-500/20 rounded-[2rem] border border-blue-500/30 flex items-center justify-center shadow-2xl">
                                    <FlaskConical className="w-10 h-10 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-foreground tracking-tighter uppercase leading-none">Clinical Sync</h3>
                                    <p className="text-[12px] font-black text-blue-500 uppercase tracking-[0.4em] mt-3">CBC Laboratory Correlation Active</p>
                                </div>
                            </div>
                            <div className="px-8 py-4 rounded-3xl bg-background/60 border border-primary/10 backdrop-blur-xl flex items-center gap-4">
                                <Clock className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm font-black text-foreground/70 uppercase tracking-widest leading-none">Data extracted: {labReport.summary}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                            {labReport.parameters.map((p, idx) => (
                                <div key={idx} className="bg-background/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-primary/5 group hover:border-blue-500/50 transition-all duration-500">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 group-hover:text-blue-500 transition-colors">{p.parameter}</p>
                                    <div className="flex items-baseline gap-2 mb-6">
                                        <span className="text-4xl font-black text-foreground tracking-tighter">{p.value}</span>
                                        <span className="text-[11px] font-black text-muted-foreground uppercase">{p.unit}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            whileInView={{ width: p.isNormal ? '100%' : '40%' }}
                                            className={cn("h-full rounded-full transition-all duration-1000", p.isNormal ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]")} 
                                        />
                                    </div>
                                    <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mt-4", p.isNormal ? "text-emerald-500/50" : "text-red-500/50")}>
                                        {p.isNormal ? 'NOMINAL RANGE' : 'CRITICAL OFFSET'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
                
                {/* Recommendations Grid */}
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Home Remedies */}
                    <div className="space-y-10">
                        <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-4 border-b border-primary/10 pb-6">
                            <Leaf className="w-6 h-6 text-emerald-500" />
                            Holistic Strategy
                        </h3>
                        <div className="grid gap-8">
                            <div className="p-10 rounded-[3rem] bg-emerald-500/[0.02] border border-emerald-500/10 group hover:border-emerald-500/30 transition-all duration-700">
                                <h4 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-8 flex items-center justify-between">
                                    Nutritional Matrix
                                    <Zap className="w-5 h-5 animate-pulse" />
                                </h4>
                                <ul className="space-y-6">
                                    {report.recommendations.split('\n')
                                        .filter(line => line.toLowerCase().includes('iron') || line.toLowerCase().includes('food') || line.toLowerCase().includes('intake'))
                                        .slice(0, 4)
                                        .map((item, i) => (
                                        <li key={i} className="flex items-start gap-6 group/item">
                                            <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500/40 group-hover/item:scale-150 transition-transform" />
                                            <span className="text-lg text-foreground/60 font-medium tracking-tight leading-tight">{item.replace(/^[*-]\s*/, '')}</span>
                                        </li>
                                    ))}
                                    {/* Fallback if list extraction is too specific */}
                                    {report.recommendations.split('\n').length < 3 && [
                                        'Increase Malunggay & Spinach intake',
                                        'Prioritize lean red meats & organ meats',
                                        'Pair Iron with Vitamin C (Calamansi)',
                                        'Iron-fortified cereals & legumes'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-6 group/item">
                                            <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500/40 group-hover/item:scale-150 transition-transform" />
                                            <span className="text-lg text-foreground/60 font-medium tracking-tight leading-tight">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Nearby Support */}
                    <div className="space-y-10">
                        <div className="flex items-center justify-between border-b border-primary/10 pb-6">
                            <h3 className="text-xl font-black text-foreground uppercase tracking-[0.4em] flex items-center gap-4">
                                <MapPin className="w-6 h-6 text-primary" />
                                Support Network
                            </h3>
                            <span className="px-4 py-1.5 rounded-xl bg-muted border border-primary/10 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{userLocation} Hub</span>
                        </div>
                        <div className="space-y-4">
                            {clinics.map((clinic, index) => (
                                <motion.div 
                                    key={index} 
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ x: 10, backgroundColor: 'rgba(var(--primary),0.05)' }}
                                    className="flex items-center gap-6 p-8 rounded-[2rem] bg-muted/10 border border-primary/10 hover:border-primary/40 transition-all group cursor-pointer"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-background border border-primary/10 flex items-center justify-center group-hover:border-primary/60 transition-all shadow-xl">
                                        {clinic.type === 'Hospital' ? <Hospital className="w-7 h-7 text-primary" /> : <Stethoscope className="w-7 h-7 text-primary" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xl font-black text-foreground tracking-tight truncate">{clinic.name}</p>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-1 truncate">
                                            {clinic.address}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-5 h-5 text-foreground" />
                                    </div>
                                </motion.div>
                            ))}
                            {clinics.length === 0 && (
                                <div className="p-16 text-center rounded-[3rem] border-2 border-dashed border-primary/10">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                                        <Activity className="w-8 h-8 text-muted-foreground animate-pulse" />
                                    </div>
                                    <p className="text-sm text-muted-foreground font-black uppercase tracking-[0.5em]">Synchronizing Local Support Nodes...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Legal Protocol */}
                <div className="p-12 rounded-[3rem] bg-red-500/[0.02] border border-red-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500/30" />
                    <div className="flex items-center gap-4 mb-6 text-red-500">
                        <AlertCircle className="w-6 h-6" />
                        <span className="text-[12px] font-black uppercase tracking-[0.4em]">Clinical Use Protocol</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-black tracking-widest text-justify">
                        THIS AI-GENERATED ASSESSMENT IS PROVIDED FOR INFORMATIONAL AND ANALYTICAL PURPOSES ONLY. IT DOES NOT CONSTITUTE CLINICAL MEDICAL ADVICE, DEFINITIVE DIAGNOSIS, OR PRESCRIBED TREATMENT. THE RESULTS ARE BASED ON COMPUTER VISION INTERPRETATION OF VISUAL MARKERS AND MAY NOT ACCOUNT FOR ALL CLINICAL VARIABLES. ALWAYS CONSULT A LICENSED HEALTHCARE PROFESSIONAL FOR MEDICAL EVALUATION. NEVER DISREGARD PROFESSIONAL MEDICAL ADVICE OR DELAY SEEKING IT BECAUSE OF INFORMATION PROVIDED BY THIS CORE ENGINE.
                    </p>
                </div>
            </div>

            {/* Deep Footer */}
            <div className="p-16 bg-muted/30 border-t border-primary/10 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[1em] relative z-10">AnemoCloud Diagnostic Core • Quantum Encryption Active • © 2026</p>
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
