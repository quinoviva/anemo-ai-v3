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
  Utensils,
  Heart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  ClipboardList,
  Moon,
  Sun,
  Wind,
  Coffee,
  Apple,
  Baby,
  Clock,
  TrendingUp,
  Ban,
  Plus,
  CircleSlash,
  HelpCircle,
  MessageSquare,
  Thermometer
} from 'lucide-react';
import type { PersonalizedRecommendationsOutput, PersonalizedRecommendationsInput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import HeartLoader from '@/components/ui/HeartLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Badge } from '../ui/badge';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────────────────────────────────────────

const BentoCard = ({ 
  children, 
  className = '', 
  colSpan = 'col-span-1', 
  rowSpan = 'row-span-1',
  onClick
}: { 
  children: React.ReactNode; 
  className?: string; 
  colSpan?: string; 
  rowSpan?: string;
  onClick?: () => void;
}) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col border border-white/10 dark:border-white/5 shadow-2xl", 
      colSpan, 
      rowSpan, 
      className,
      onClick && "cursor-pointer"
    )}
  >
    <div className="relative z-10 h-full w-full">{children}</div>
  </motion.div>
);

const SectionHeading = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  accent = "primary",
  noItalic = false
}: { 
  title: string; 
  subtitle: string; 
  icon: any; 
  accent?: string;
  noItalic?: boolean;
}) => (
  <div className="flex flex-col gap-3 mb-8 md:mb-12">
    <div className="flex items-center gap-4">
      <div className={cn(
        "p-2.5 rounded-2xl bg-opacity-10 shadow-inner", 
        accent === "primary" ? "bg-primary text-primary" : 
        accent === "blue" ? "bg-blue-500 text-blue-500" :
        accent === "amber" ? "bg-amber-500 text-amber-500" :
        "bg-emerald-500 text-emerald-500"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-70">{subtitle}</h3>
    </div>
    <h2 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-foreground leading-none">
      {title.split(' ')[0]}{' '}
      <span className={cn("font-black", noItalic ? "" : "italic") + " text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground"}>
        {title.split(' ').slice(1).join(' ')}
      </span>
    </h2>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Severity Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

const getSeverityColors = (anemiaType: string | undefined) => {
  const type = anemiaType || '';
  const lower = type.toLowerCase();
  
  if (lower.includes('negative') || lower.includes('normal') || lower.includes('healthy')) {
    return { 
      base: 'emerald', 
      bg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/30', 
      text: 'text-emerald-500 dark:text-emerald-400', 
      ring: 'rgba(16,185,129,0.5)', 
      glow: 'rgba(16,185,129,0.2)',
      gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
    };
  }
  if (lower.includes('suspected') || lower.includes('mild')) {
    return { 
      base: 'amber', 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/30', 
      text: 'text-amber-500 dark:text-amber-400', 
      ring: 'rgba(245,158,11,0.5)', 
      glow: 'rgba(245,158,11,0.2)',
      gradient: 'from-amber-500/20 via-amber-500/5 to-transparent'
    };
  }
  if (lower.includes('moderate')) {
    return { 
      base: 'orange', 
      bg: 'bg-orange-500/10', 
      border: 'border-orange-500/30', 
      text: 'text-orange-500 dark:text-orange-400', 
      ring: 'rgba(249,115,22,0.5)', 
      glow: 'rgba(249,115,22,0.2)',
      gradient: 'from-orange-500/20 via-orange-500/5 to-transparent'
    };
  }
  // Default to severe/red for strong positive or inconclusive
  return { 
    base: 'red', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30', 
    text: 'text-red-500 dark:text-red-400', 
    ring: 'rgba(239,68,68,0.5)', 
    glow: 'rgba(239,68,68,0.2)',
    gradient: 'from-red-600/20 via-red-500/5 to-transparent'
  };
};

const getVerdictText = (anemiaType: string | undefined) => {
  const type = anemiaType || '';
  const lower = type.toLowerCase();
  
  if (lower.includes('negative') || lower.includes('normal') || lower.includes('healthy')) {
    return { label: 'Healthy', description: 'No significant pallor detected. Vascular presentation appears normal.' };
  }
  if (lower.includes('suspected') || lower.includes('mild')) {
    return { label: 'Mild Risk', description: 'Early signs detected. Dietary intervention recommended.' };
  }
  if (lower.includes('moderate')) {
    return { label: 'Moderate Risk', description: 'Significant pallor confirmed. Medical consultation advised.' };
  }
  if (lower.includes('inconclusive') || !type) {
    return { label: 'Inconclusive', description: 'Unable to determine result. Please retake photos in better lighting.' };
  }
  return { label: 'High Risk', description: 'Strong indicators detected. Immediate medical attention recommended.' };
};

const getPriorityLevel = (anemiaType: string | undefined) => {
  const type = anemiaType || '';
  const lower = type.toLowerCase();
  
  if (lower.includes('negative') || lower.includes('normal') || lower.includes('healthy')) {
    return { level: 'Routine', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  }
  if (lower.includes('suspected') || lower.includes('mild')) {
    return { level: 'Moderate', color: 'text-amber-500', bg: 'bg-amber-500/10' };
  }
  if (lower.includes('moderate')) {
    return { level: 'Elevated', color: 'text-orange-500', bg: 'bg-orange-500/10' };
  }
  return { level: 'Immediate', color: 'text-red-500', bg: 'bg-red-500/10' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Parse Confidence Reasoning
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedReasoning {
  conjunctiva: number | null;
  nails: number | null;
  palm: number | null;
  formula: string;
  hgb: number | null;
}

const parseConfidenceReasoning = (reasoning: string | undefined): ParsedReasoning => {
  const defaultResult = {
    conjunctiva: null,
    nails: null,
    palm: null,
    formula: 'Unable to calculate',
    hgb: null
  };
  
  if (!reasoning) return defaultResult;
  
  try {
    // Try to extract percentage values from various formats
    const extractNumber = (text: string): number | null => {
      const match = text.match(/(\d+\.?\d*)\s*%?/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val <= 1) return val; // Already 0-1
        if (val <= 100) return val / 100; // Convert percentage to 0-1
      }
      return null;
    };
    
    const lines = reasoning.split('\n');
    let conjunctiva: number | null = null;
    let nails: number | null = null;
    let palm: number | null = null;
    let calculatedHgb: number | null = null;
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('conjunctiva') || lower.includes('eye') || lower.includes('undereye')) {
        const val = extractNumber(line);
        if (val !== null) conjunctiva = val;
      } else if (lower.includes('nail') || lower.includes('bed')) {
        const val = extractNumber(line);
        if (val !== null) nails = val;
      } else if (lower.includes('palm') || lower.includes('skin')) {
        const val = extractNumber(line);
        if (val !== null) palm = val;
      } else if (lower.includes('hgb') || lower.includes('hemoglobin') || lower.includes('synthesis')) {
        const match = line.match(/(\d+\.?\d*)\s*g?d?L?/i);
        if (match) calculatedHgb = parseFloat(match[1]);
      }
    }
    
    // Calculate Hgb from confidence if not provided
    if (calculatedHgb === null && (conjunctiva !== null || nails !== null || palm !== null)) {
      const avg = ((conjunctiva ?? 0) + (nails ?? 0) + (palm ?? 0)) / 
        ([conjunctiva, nails, palm].filter(v => v !== null).length || 1);
      calculatedHgb = 5.0 + (avg * 11.0);
    }
    
    return {
      conjunctiva,
      nails,
      palm,
      formula: reasoning.substring(0, 100) + '...',
      hgb: calculatedHgb
    };
  } catch {
    return defaultResult;
  }
};

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
  const [biometricCompare, setBiometricCompare] = useState(false);
  const [labCompare, setLabCompare] = useState(false);
  
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

  // Fetch cycle logs for cycle data
  const cycleLogsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/cycle_logs`);
  }, [user, firestore]);
  const { data: cycleLogs } = useCollection<any>(cycleLogsQuery);
  
  // Build cycle data string from recent logs
  const cycleDataString = useMemo(() => {
    if (!cycleLogs || cycleLogs.length === 0) return null;
    
    // Get most recent cycle log
    const latestLog = cycleLogs[0];
    const parts: string[] = [];
    
    if (latestLog.startDate) {
      const lmpDate = latestLog.startDate.toDate ? latestLog.startDate.toDate() : new Date(latestLog.startDate.seconds * 1000);
      const lmpStr = lmpDate.toISOString().split('T')[0];
      parts.push(`Last menstrual period: ${lmpStr}`);
      
      // Calculate days since LMP
      const daysSinceLmp = Math.floor((new Date().getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
      parts.push(`Days since LMP: ${daysSinceLmp}`);
    }
    
    if (latestLog.flowIntensity) {
      parts.push(`Flow intensity: ${latestLog.flowIntensity}`);
    }
    
    if (latestLog.cycleLength) {
      parts.push(`Cycle length: ${latestLog.cycleLength} days`);
    }
    
    if (latestLog.isRegular !== undefined) {
      parts.push(`Cycle regularity: ${latestLog.isRegular ? 'Regular' : 'Irregular'}`);
    }
    
    if (latestLog.symptoms && latestLog.symptoms.length > 0) {
      parts.push(`Symptoms: ${latestLog.symptoms.join(', ')}`);
    }
    
    return parts.join('. ');
  }, [cycleLogs]);

  const userName = userData?.firstName || (user?.displayName ? user.displayName.split(' ')[0] : 'Patient');
  const userSex = userData?.medicalInfo?.sex;

  // Calculate cycle phase from cycle logs
  const cyclePhase = useMemo(() => {
    if (!cycleLogs || cycleLogs.length === 0) return null;
    
    const latestLog = cycleLogs[0];
    if (!latestLog.startDate) return null;
    
    const lmpDate = latestLog.startDate.toDate ? latestLog.startDate.toDate() : new Date(latestLog.startDate.seconds * 1000);
    const cycleLength = latestLog.cycleLength || 28;
    const daysSinceLmp = Math.floor((new Date().getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let phase: string;
    let phaseIcon: any;
    let phaseColor: string;
    let ironTiming: string;
    
    if (daysSinceLmp <= 5) {
      phase = 'Menstrual';
      phaseIcon = Droplets;
      phaseColor = 'text-red-500';
      ironTiming = 'During period - Focus on iron-rich foods. Consider iron supplement if heavy flow.';
    } else if (daysSinceLmp <= 13) {
      phase = 'Follicular';
      phaseIcon = Sun;
      phaseColor = 'text-amber-500';
      ironTiming = 'Optimal absorption phase - Best time for iron supplements (empty stomach).';
    } else if (daysSinceLmp <= 16) {
      phase = 'Ovulation';
      phaseIcon = Sparkles;
      phaseColor = 'text-pink-500';
      ironTiming = 'Peak absorption - Continue iron-rich diet. Good time for lab tests.';
    } else {
      phase = 'Luteal';
      phaseIcon = Moon;
      phaseColor = 'text-purple-500';
      ironTiming = 'PMS phase - Increase vitamin C intake. Avoid iron on empty stomach if mood changes.';
    }
    
    const nextPeriod = new Date(lmpDate);
    nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
    const daysUntilNext = Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      phase,
      phaseIcon,
      phaseColor,
      ironTiming,
      daysSinceLmp,
      cycleLength,
      nextPeriod: daysUntilNext > 0 ? daysUntilNext : null,
      isHeavyFlow: latestLog.flowIntensity === 'Heavy'
    };
  }, [cycleLogs]);

  // Safely extract hemoglobin from lab report
  const labHgb = useMemo(() => {
    if (!labReport?.parameters) return null;
    const hgbParam = labReport.parameters.find(p => 
      p.parameter?.toLowerCase().includes('hemoglobin') || 
      p.parameter?.toLowerCase().includes('hgb')
    );
    return hgbParam ? { value: hgbParam.value, unit: hgbParam.unit } : null;
  }, [labReport]);

  // Safely build image descriptions
  const allImageDescriptions = useMemo(() => {
    if (!analyses || Object.keys(analyses).length === 0) {
      return 'No image analysis data available.';
    }
    return Object.entries(analyses)
      .map(([key, value]) => {
        const result = value.analysisResult || 'Analysis pending';
        return `${key.toUpperCase()}: ${result}`;
      })
      .join('\n');
  }, [analyses]);

  const labReportSummary = labHgb ? 
    `CBC Report: Hemoglobin ${labHgb.value} ${labHgb.unit}, ${labReport?.summary || 'See details'}` 
    : '';

  useEffect(() => {
    if (userData?.address) setUserLocation(userData.address);
  }, [userData]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      let userProfileString = `Name: ${userName}, Location: ${userLocation}, Sex: ${userSex || 'Not specified'}`;
      if (userData) {
        const medicalInfo = userData.medicalInfo || {};
        userProfileString = `Name: ${userData.firstName || ''} ${userData.lastName || ''}, Location: ${userData.address || userLocation}, Sex: ${medicalInfo.sex || 'Not specified'}, Conditions: ${medicalInfo.conditions || 'None'}`;
      }
      
      const reportResult = await runProvidePersonalizedRecommendations({
        imageAnalysis: allImageDescriptions,
        labReport: labReportSummary,
        userProfile: userProfileString,
        cycleData: cycleDataString || undefined,
      });
      
      setReport({ ...reportResult, imageAnalysisSummary: allImageDescriptions });
      
      // Save to Firestore
      if (user && !user.isAnonymous && firestore && reportResult && !hasSavedRef.current) {
        hasSavedRef.current = true;
        const reportCollection = collection(firestore, `users/${user.uid}/imageAnalyses`);
        
        const thumbnails = await Promise.all(
          Object.entries(analyses).map(([part, v]) => 
            new Promise<{ part: string; data: string }>((resolve) => {
              const dataUri = v.dataUri || v.imageUrl;
              if (!dataUri) return resolve({ part, data: '' });
              
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 300;
                let { width: w, height: h } = img;
                if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                else { w = Math.round(w * maxSize / h); h = maxSize; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                resolve({ part, data: canvas.toDataURL('image/jpeg', 0.6) });
              };
              img.onerror = () => resolve({ part, data: '' });
              img.src = dataUri;
            })
          )
        );

        const hgbValue = labHgb ? parseFloat(labHgb.value) : null;

        await addDoc(reportCollection, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          riskScore: reportResult.riskScore,
          anemiaType: reportResult.anemiaType,
          hemoglobin: hgbValue,
          confidenceScore: reportResult.confidenceScore,
          recommendations: reportResult.recommendations,
          imageAnalysisSummary: allImageDescriptions,
          labReportSummary: labReportSummary,
          thumbnails: thumbnails.filter((t: any) => t.data),
        });
      }
    } catch (err) {
      console.error('Report generation error:', err);
      // Create fallback report on error
      setReport({
        recommendations: '- Please consult a healthcare provider for follow-up\n- Consider retaking photos in better lighting\n- Maintain iron-rich diet with malunggay, monggo, and leafy greens',
        riskScore: 50,
        anemiaType: 'INCONCLUSIVE (Analysis Error)',
        confidenceScore: 30,
        confidenceReasoning: '- System Error: Unable to process\n- Please retry the analysis',
        imageAnalysisSummary: allImageDescriptions
      });
    } finally {
      setIsLoading(false);
    }
  }, [allImageDescriptions, labReportSummary, user, firestore, userLocation, userData, userName, userSex, analyses, labReport]);

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
    if (!report) return;
    
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      
      // ─────── HEADER ───────
      pdf.setFillColor(220, 38, 50); // ANEMO red
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANEMO AI', margin, 12);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('CLINICAL DIAGNOSTIC REPORT', margin + 45, 12);
      
      pdf.setFontSize(9);
      pdf.text(format(new Date(), 'MMMM d, yyyy'), pageWidth - margin - 35, 12);
      pdf.text('CONFIDENTIAL', pageWidth - margin - 35, 18);
      
      yPos = 35;
      
      // ─────── PATIENT INFORMATION ───────
      pdf.setDrawColor(220, 38, 50);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PATIENT INFORMATION', margin, yPos);
      yPos += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const patientName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : (user?.displayName || 'Patient');
      const patientAge = userData?.medicalInfo?.age || '--';
      const patientSex = userData?.medicalInfo?.sex || '--';
      const patientLocation = userData?.address || userLocation;
      
      pdf.text(`Name: ${patientName}`, margin, yPos);
      pdf.text(`Age: ${patientAge}`, margin + 80, yPos);
      pdf.text(`Sex: ${patientSex}`, margin + 120, yPos);
      yPos += 6;
      pdf.text(`Location: ${patientLocation}`, margin, yPos);
      
      // ─────── SCREENING SUMMARY ───────
      yPos += 12;
      pdf.setDrawColor(220, 38, 50);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('SCREENING SUMMARY', margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Anemia Type
      pdf.setFont('helvetica', 'bold');
      pdf.text('Classification: ', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      const anemiaTypeStr = report.anemiaType || 'INCONCLUSIVE';
      const anemiaColor = report.anemiaType?.includes('NEGATIVE') ? [34, 197, 94] : report.anemiaType?.includes('POSITIVE') ? [239, 68, 68] : [234, 179, 8];
      pdf.setTextColor(anemiaColor[0], anemiaColor[1], anemiaColor[2]);
      pdf.text(anemiaTypeStr, margin + 35, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
      
      // Risk Score
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Risk Score: ${report.riskScore || '--'}%`, margin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      
      // Confidence
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Confidence: ${report.confidenceScore || '--'}%`, margin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 10;
      
      // ─────── HEMOGLOBIN DATA ───────
      if (labReport && labReport.parameters && labReport.parameters.length > 0) {
        pdf.setDrawColor(220, 38, 50);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('LABORATORY FINDINGS', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const hgbParam = labReport.parameters.find(p => 
          p.parameter?.toLowerCase().includes('hemoglobin') || 
          p.parameter?.toLowerCase().includes('hgb')
        );
        const rbcParam = labReport.parameters.find(p => 
          p.parameter?.toLowerCase().includes('rbc') || 
          p.parameter?.toLowerCase().includes('red cell')
        );
        const hctParam = labReport.parameters.find(p => 
          p.parameter?.toLowerCase().includes('hematocrit') || 
          p.parameter?.toLowerCase().includes('hct')
        );
        
        if (hgbParam) {
          pdf.text(`Hemoglobin: ${hgbParam.value} ${hgbParam.unit}`, margin, yPos);
          yPos += 5;
        }
        if (rbcParam) {
          pdf.text(`RBC Count: ${rbcParam.value} ${rbcParam.unit}`, margin, yPos);
          yPos += 5;
        }
        if (hctParam) {
          pdf.text(`Hematocrit: ${hctParam.value} ${hctParam.unit}`, margin, yPos);
          yPos += 5;
        }
        yPos += 5;
      }
      
      // ─────── VISUAL OBSERVATIONS ───────
      if (analyses && Object.keys(analyses).length > 0) {
        yPos += 3;
        pdf.setDrawColor(220, 38, 50);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VISUAL OBSERVATIONS', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        for (const [key, value] of Object.entries(analyses)) {
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            yPos = margin;
          }
          
          const siteName = key.toUpperCase();
          const siteResult = value.analysisResult || 'No result';
          const siteDesc = value.description || '';
          
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(220, 38, 50);
          pdf.text(`${siteName}: `, margin, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          // Split long text
          const maxWidth = pageWidth - margin - 50;
          const splitDesc = pdf.splitTextToSize(siteResult, maxWidth);
          pdf.text(splitDesc, margin + 30, yPos);
          yPos += (splitDesc.length * 4) + 3;
          
          if (siteDesc) {
            const splitFull = pdf.splitTextToSize(siteDesc, maxWidth);
            pdf.text(splitFull, margin + 10, yPos);
            yPos += splitFull.length * 4;
          }
          yPos += 3;
        }
      }
      
      // ─────── CYCLE DATA (if female) ───────
      if (cyclePhase && userSex === 'Female') {
        yPos += 3;
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = margin;
        }
        pdf.setDrawColor(220, 38, 50);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CYCLE CONTEXT', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Current Phase: ${cyclePhase.phase} (Day ${cyclePhase.daysSinceLmp})`, margin, yPos);
        yPos += 5;
        if (cyclePhase.nextPeriod !== null) {
          pdf.text(`Next Period: In ${cyclePhase.nextPeriod} days`, margin, yPos);
          yPos += 5;
        }
        pdf.text(`Iron Timing: ${cyclePhase.ironTiming}`, margin, yPos);
        yPos += 10;
      }
      
      // ─────── RECOMMENDATIONS ───────
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.setDrawColor(220, 38, 50);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RECOMMENDATIONS', margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const recText = report.recommendations || 'Please consult with a healthcare provider for personalized advice.';
      const recLines = pdf.splitTextToSize(recText, pageWidth - margin * 2);
      pdf.text(recLines, margin, yPos);
      yPos += recLines.length * 4 + 10;
      
      // ─────── IMAGES SECTION ───────
      if (analyses && Object.keys(analyses).length > 0) {
        const imageEntries = Object.entries(analyses).filter(([_, v]) => v.imageUrl);
        
        if (imageEntries.length > 0) {
          // Check if we need a new page for images
          if (yPos > pageHeight - 80) {
            pdf.addPage();
            yPos = margin;
          }
          
          pdf.setDrawColor(220, 38, 50);
          pdf.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 8;
          
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('CAPTURED IMAGES', margin, yPos);
          yPos += 10;
          
          const imgWidth = 60;
          const imgHeight = 45;
          const gap = 10;
          let imgX = margin;
          
          for (const [key, value] of imageEntries) {
            if (value.imageUrl) {
              try {
                if (imgX + imgWidth > pageWidth - margin && yPos + imgHeight > pageHeight - 30) {
                  pdf.addPage();
                  yPos = margin;
                  imgX = margin;
                }
                
                if (imgX + imgWidth > pageWidth - margin) {
                  imgX = margin;
                  yPos += imgHeight + gap;
                }
                
                pdf.addImage(value.imageUrl, 'PNG', imgX, yPos, imgWidth, imgHeight);
                
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(220, 38, 50);
                pdf.text(key.toUpperCase(), imgX, yPos + imgHeight + 4);
                
                imgX += imgWidth + gap;
              } catch (imgErr) {
                console.warn('Failed to add image to PDF:', key, imgErr);
              }
            }
          }
        }
      }
      
      // ─────── FOOTER ───────
      const footerY = pageHeight - 10;
      pdf.setDrawColor(220, 38, 50);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Generated by Anemo AI - This report is for screening purposes only and is NOT a substitute for professional medical advice.', pageWidth / 2, footerY, { align: 'center' });
      pdf.text('Please consult with a qualified healthcare provider for diagnosis and treatment.', pageWidth / 2, footerY + 4, { align: 'center' });
      
      // Save PDF
      const fileName = `ANEMO-REPORT-${patientName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      toast({ title: 'Report Exported', description: 'PDF downloaded successfully.' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Export Error', variant: 'destructive', description: 'Failed to generate PDF. Please try again.' });
    } finally {
      setIsDownloading(false);
    }
  };

  // Computed values with fallbacks
  const sevColors = useMemo(() => getSeverityColors(report?.anemiaType), [report?.anemiaType]);
  const verdict = useMemo(() => getVerdictText(report?.anemiaType), [report?.anemiaType]);
  const priority = useMemo(() => getPriorityLevel(report?.anemiaType), [report?.anemiaType]);
  const reasoning = useMemo(() => parseConfidenceReasoning(report?.confidenceReasoning), [report?.confidenceReasoning]);
  
  // Calculate estimated Hgb from risk score as fallback
  const estHgb = useMemo(() => {
    if (reasoning.hgb) return reasoning.hgb;
    if (report?.riskScore) return 5 + (report.riskScore / 100) * 11;
    return null;
  }, [reasoning.hgb, report?.riskScore]);

  // Safe anemia type display
  const displayAnemiaType = report?.anemiaType || 'INCONCLUSIVE';
  const anemiaTypeWords = displayAnemiaType.split(' ');
  const firstWord = anemiaTypeWords[0] || 'INCONCLUSIVE';
  const remainingWords = anemiaTypeWords.slice(1).join(' ');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
        <HeartLoader size={120} strokeWidth={1} />
        <div className="text-center space-y-4">
           <h3 className="text-4xl font-light tracking-tight">Neural <span className="font-medium text-primary italic pr-1.5">Synthesis.</span></h3>
           <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-primary/40 animate-pulse">Aggregating Consensus</span>
              <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
           </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <motion.div
      initial="hidden" 
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="w-full space-y-16 pb-40 relative px-4 md:px-8"
    >
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="space-y-4 text-center lg:text-left">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[0.9] text-foreground pr-10">
             Analysis <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">Report.</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
             <Badge variant="outline" className="px-4 py-2 border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase bg-primary/5">
               ANEMO_V3_{Math.random().toString(16).substring(2, 8).toUpperCase()}
             </Badge>
             <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 flex items-center gap-2">
               <Calendar className="w-3.5 h-3.5" /> {format(new Date(), 'PPP p')}
             </span>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <Button 
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 md:flex-none h-20 rounded-full px-8 md:px-12 bg-primary hover:bg-red-600 text-white shadow-2xl transition-all active:scale-95 text-xs font-bold uppercase tracking-widest gap-4 border-none"
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
             className={cn("bg-gradient-to-br via-background to-background", sevColors.gradient)}
           >
              <div className="absolute top-0 right-0 p-16 opacity-[0.03] scale-[2] text-primary -mr-32 -mt-32 pointer-events-none">
                 <HeartPulse className="w-96 h-96" />
              </div>
              
              <div className="h-full p-10 md:p-16 flex flex-col justify-between">
                 <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className={cn("p-6 rounded-3xl backdrop-blur-2xl border shadow-2xl transition-transform duration-700 hover:scale-110 cursor-help", sevColors.bg, sevColors.border)}>
                       <Activity className={cn("h-12 w-12", sevColors.text)} />
                    </div>
                    <div className={cn("flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-md", sevColors.bg, sevColors.border)}>
                       <span className={cn("text-[11px] font-black tracking-[0.3em] uppercase", sevColors.text)}>
                         {verdict.label} Detected
                       </span>
                       <div className={cn("h-2.5 w-2.5 rounded-full animate-pulse shadow-[0_0_15px_currentColor]", sevColors.text.replace('text-', 'bg-'))} />
                    </div>
                 </div>

<div className="space-y-8 mt-8 md:mt-16">
                     <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-[0.5em] text-muted-foreground opacity-60">Clinical Verdict</h3>
                        <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-light tracking-tight text-foreground leading-[0.85] text-balance pr-10">
                          {firstWord}{' '}
                          <span className={cn("font-black italic drop-shadow-sm pr-1.5", sevColors.text)}>
                            {remainingWords}
                          </span>
                        </h2>
                        <p className="text-lg md:text-xl text-slate-900 dark:text-slate-100 font-medium leading-relaxed max-w-2xl text-balance">
                           {verdict.description}
                        </p>
                     </div>
                     
                     {/* Status Badge */}
                     <div className={cn(
                       "inline-flex items-center gap-3 px-6 py-3 rounded-full border-2",
                       report?.anemiaType?.includes('NEGATIVE') ? "bg-emerald-500/20 border-emerald-500/40" :
                       report?.anemiaType?.includes('POSITIVE') ? "bg-red-500/20 border-red-500/40" :
                       report?.anemiaType?.includes('SUSPECTED') ? "bg-amber-500/20 border-amber-500/40" :
                       "bg-muted border-border"
                     )}>
                       {report?.anemiaType?.includes('NEGATIVE') ? (
                         <ShieldCheck className="w-5 h-5 text-emerald-400" />
                       ) : report?.anemiaType?.includes('POSITIVE') ? (
                         <AlertCircle className="w-5 h-5 text-red-400" />
                       ) : (
                         <AlertTriangle className="w-5 h-5 text-amber-400" />
                       )}
                       <span className={cn(
                         "text-base font-black uppercase tracking-widest",
                         report?.anemiaType?.includes('NEGATIVE') ? "text-emerald-400" :
                         report?.anemiaType?.includes('POSITIVE') ? "text-red-400" :
                         report?.anemiaType?.includes('SUSPECTED') ? "text-amber-400" :
                         "text-muted-foreground"
                       )}>
                         {report?.anemiaType || 'PENDING'}
                       </span>
                     </div>
                    
<div className="flex flex-wrap gap-4 pt-8 border-t border-white/10 dark:border-white/5">
                        <div className="flex-1 min-w-[180px] flex items-center gap-4 px-6 py-5 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-xl group/score cursor-pointer">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/score:scale-110 transition-transform">
                                 <Scale className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Risk Index</span>
                                 <span className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                                   {report.riskScore ?? '--'}<span className="text-xs text-muted-foreground ml-1">%</span>
                                 </span>
                              </div>
                        </div>
                        <div className="flex-1 min-w-[180px] flex items-center gap-4 px-6 py-5 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-xl group/hgb cursor-pointer">
                              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover/hgb:scale-110 transition-transform">
                                 <FlaskConical className="w-5 h-5 text-blue-500" />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Est. Hgb</span>
                                 <span className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                                   {estHgb ? estHgb.toFixed(1) : '--'}<span className="text-xs text-muted-foreground ml-1 font-medium italic uppercase tracking-tighter pr-1.5">g/dL</span>
                                 </span>
                              </div>
                        </div>
                        <div className="flex-1 min-w-[180px] flex items-center gap-4 px-6 py-5 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-xl group/conf cursor-pointer">
                              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border group-hover/conf:scale-110 transition-transform", sevColors.bg, sevColors.border)}>
                                 <Brain className={cn("w-5 h-5", sevColors.text)} />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Confidence</span>
                                 <span className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                                   {report.confidenceScore ?? '--'}<span className="text-xs text-muted-foreground ml-1">%</span>
                                 </span>
                              </div>
                        </div>
                        {cyclePhase && userSex === 'Female' && (
                          <div className="flex-1 min-w-[220px] flex items-center gap-4 px-6 py-5 rounded-3xl bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl group/cycle cursor-pointer">
                                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover/cycle:scale-110 transition-transform">
                                   {cyclePhase.phaseIcon && <cyclePhase.phaseIcon className={cn("w-5 h-5", cyclePhase.phaseColor)} />}
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Cycle Phase</span>
                                   <span className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                                     {cyclePhase.phase}
                                     {cyclePhase.isHeavyFlow && <span className="text-xs text-red-500 ml-1">⚠️</span>}
                                   </span>
                                   <span className="text-[9px] text-rose-400/70">
                                     Day {cyclePhase.daysSinceLmp} • {cyclePhase.nextPeriod ? `${cyclePhase.nextPeriod}d until period` : ''}
                                   </span>
                                </div>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </BentoCard>

<BentoCard colSpan="lg:col-span-4" className="bg-gradient-to-b from-blue-500/[0.05] via-background to-background border-blue-500/20">
              <div className="h-full p-6 md:p-8 flex flex-col items-center justify-center text-center">
                 <div className="space-y-4 w-full">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500">Ensemble Agreement</span>
                    
                    <div className="relative flex items-center justify-center">
                       <div className="relative w-40 h-40 md:w-48 md:h-48">
                          {/* Background ring */}
                          <div className="absolute inset-0 rounded-full border-[6px] border-blue-500/10" />
                          
                          {/* Progress ring */}
                          <div 
                            className="absolute inset-0 rounded-full border-[6px] border-transparent border-t-blue-500 border-r-blue-500"
                            style={{ 
                              transform: 'rotate(-90deg)',
                              animation: 'spin 2s ease-out forwards'
                            }}
                          />
                          
                          {/* Center content */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-5xl md:text-6xl font-black tracking-tight text-foreground">
                               {report.confidenceScore ?? '--'}
                             </span>
                             <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">%</span>
                          </div>
                       </div>
                    </div>
                    
                    {/* Status badge */}
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest mx-auto",
                      (report.confidenceScore || 0) >= 70 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      (report.confidenceScore || 0) >= 40 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}>
                      {(report.confidenceScore || 0) >= 70 ? (
                        <><ShieldCheck className="w-3 h-3" /> High Confidence</>
                      ) : (report.confidenceScore || 0) >= 40 ? (
                        <><AlertCircle className="w-3 h-3" /> Moderate</>
                      ) : (
                        <><AlertTriangle className="w-3 h-3" /> Low Confidence</>
                      )}
                    </div>
                 </div>

                  <div className="w-full mt-4 pt-4 border-t border-blue-500/10">
                     <p className="text-[9px] text-muted-foreground leading-relaxed text-center">
                       Visual + Lab correlation strength
                     </p>
                  </div>
               </div>
            </BentoCard>
        </div>

        {/* ── ROW 2: BIOMETRIC TELEMETRY ───────────────────────────────────── */}
{analyses && Object.keys(analyses).length > 0 && (
          <div className="space-y-8 md:space-y-12">
             <div className="flex items-center justify-between">
                <SectionHeading title="Biometric Telemetry" subtitle="MULTI-SITE OPTICAL RESULTS" icon={LayoutGrid} accent="primary" noItalic />
                <button 
                  onClick={() => setBiometricCompare(!biometricCompare)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
                    biometricCompare ? "bg-primary/20 border-primary text-primary" : "bg-transparent border-white/20 text-muted-foreground"
                  )}
                >
                  <Layers className="w-4 h-4" />
                  Compare
                </button>
             </div>
             
             <div className={cn(
               "grid gap-8 md:gap-10",
               biometricCompare ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
             )}>
                {Object.entries(analyses).map(([key, value]) => (
                  <div key={key} className="space-y-6 group/site">
                    <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl bg-black isolate">
                      {value.imageUrl ? (
                        <img 
                          src={value.imageUrl} 
                          alt={key} 
                          className="w-full h-full object-cover opacity-80 group-hover/site:opacity-100 group-hover/site:scale-105 transition-all duration-1000 mix-blend-screen" 
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Activity className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* HUD Overlays */}
                      <div className="absolute inset-0 z-20 pointer-events-none" />
                      <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
                         <Badge className="bg-white/10 backdrop-blur-xl border-white/10 text-[8px] font-black tracking-widest uppercase py-1 px-3">
                           ROI_{key.toUpperCase()}
                         </Badge>
                         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[8px] font-black text-white/50 tracking-tighter uppercase">Acquired</span>
                         </div>
                      </div>

                      <div className="absolute bottom-6 left-6 right-6 z-30">
                         <div className="flex items-center gap-3 mb-2">
                           <Crosshair className="w-4 h-4 text-primary" />
                           <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.4em]">Target</span>
                         </div>
                         <h5 className="text-3xl font-black text-white uppercase tracking-tight leading-none">{key}</h5>
                      </div>
                    </div>

<div className={cn(
                      "p-8 rounded-[2.5rem] glass-panel border-l-[8px] transition-all duration-700 min-h-[160px] flex flex-col justify-center space-y-4 shadow-xl", 
                      sevColors.border.replace('border-', 'border-l-')
                    )}>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                             <span className={cn("text-[9px] font-black uppercase tracking-[0.3em]", sevColors.text)}>Outcome</span>
                             {value.isValid ? (
                               <CheckCircle className={cn("w-4 h-4", sevColors.text)} />
                             ) : (
                               <AlertCircle className="w-4 h-4 text-amber-500" />
                             )}
                          </div>
                          
                          {/* Color coding helper based on analysis result */}
                          {/* Highlighted Outcome */}
                          <div className={cn(
                            "p-4 rounded-2xl border-2",
                            (() => {
                              const resultText = value.analysisResult?.toLowerCase() || '';
                              if (resultText.includes('normal') || resultText.includes('healthy') || resultText.includes('no pallor') || resultText.includes('negative')) return "bg-emerald-500/20 border-emerald-500/40";
                              if (resultText.includes('positive') || resultText.includes('anemic') || resultText.includes('pallor') || resultText.includes('severe')) return "bg-red-500/20 border-red-500/40";
                              if (resultText.includes('suspected') || resultText.includes('mild') || resultText.includes('borderline')) return "bg-amber-500/20 border-amber-500/40";
                              return "bg-muted border-border";
                            })()
                          )}>
                            <p className={cn(
                              "text-lg font-bold uppercase tracking-wide",
                              (() => {
                                const resultText = value.analysisResult?.toLowerCase() || '';
                                if (resultText.includes('normal') || resultText.includes('healthy') || resultText.includes('no pallor') || resultText.includes('negative')) return "text-emerald-400";
                                if (resultText.includes('positive') || resultText.includes('anemic') || resultText.includes('pallor') || resultText.includes('severe')) return "text-red-400";
                                if (resultText.includes('suspected') || resultText.includes('mild') || resultText.includes('borderline')) return "text-amber-400";
                                return "text-muted-foreground";
                              })()
                            )}>
                              {value.analysisResult || 'No result recorded'}
                            </p>
                          </div>
                       </div>
                      <div className="pt-4 border-t border-white/5">
                         <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Analysis</span>
                         <p className="text-sm text-slate-900 dark:text-slate-200 leading-relaxed">
                            {value.description || 'Target specimen processed successfully.'}
                         </p>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* ── DETECTION METHODOLOGY ────────────────────────────────────── */}
        <div className="space-y-8 md:space-y-12">
           <SectionHeading title="Detection Methodology" subtitle="MULTI-MODAL FUSION" icon={Cpu} accent="blue" noItalic />
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Visual Pallor Analysis */}
              <div className="p-8 rounded-[2.5rem] bg-blue-500/[0.02] border border-blue-500/20">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                       <Eye className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">Visual Analysis</span>
                 </div>
                 <h4 className="text-xl font-black mb-3">3-Point Pallor Detection</h4>
                 <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                       <Droplets className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
                       <span><strong>Skin</strong> — Palms, forehead tone analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <Eye className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
                       <span><strong>Conjunctiva</strong> — Inner eyelid vascularity</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <Hand className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
                       <span><strong>Nails</strong> — Bed color + capillary refill</span>
                    </li>
                 </ul>
                 <div className="mt-6 pt-4 border-t border-blue-500/10">
                    <span className="text-[8px] font-black text-blue-400/60 uppercase">Max Contribution</span>
                    <p className="text-2xl font-black text-blue-400">40%</p>
                 </div>
              </div>
              
              {/* Lab CBC Analysis */}
              <div className="p-8 rounded-[2.5rem] bg-emerald-500/[0.02] border border-emerald-500/20">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                       <FlaskConical className="w-6 h-6 text-emerald-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">Lab Analysis</span>
                 </div>
                 <h4 className="text-xl font-black mb-3">CBC Hemoglobin</h4>
                 <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                       <Activity className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                       <span><strong>Hgb</strong> — Primary diagnostic marker</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <Dna className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                       <span><strong>RBC</strong> — Red cell count</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <TrendingDown className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                       <span><strong>Hct</strong> — Hematocrit ratio</span>
                    </li>
                 </ul>
                 <div className="mt-6 pt-4 border-t border-emerald-500/10">
                    <span className="text-[8px] font-black text-emerald-400/60 uppercase">Max Contribution</span>
                    <p className="text-2xl font-black text-emerald-400">50%</p>
                 </div>
              </div>
              
              {/* Fusion Logic */}
              <div className="p-8 rounded-[2.5rem] bg-purple-500/[0.02] border border-purple-500/20">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                       <Sparkles className="w-6 h-6 text-purple-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400">Fusion Logic</span>
                 </div>
                 <h4 className="text-xl font-black mb-3">Multi-Modal AI</h4>
                 <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                       <CheckCircle className="w-4 h-4 text-purple-400 mt-1 shrink-0" />
                       <span><strong>Concordance</strong> — Visual + Lab agree</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <AlertCircle className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
                       <span><strong>Discordance</strong> — Different readings</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <Zap className="w-4 h-4 text-purple-400 mt-1 shrink-0" />
                       <span><strong>Cycle Context</strong> — Female adjustment</span>
                    </li>
                 </ul>
                 <div className="mt-6 pt-4 border-t border-purple-500/10">
                    <span className="text-[8px] font-black text-purple-400/60 uppercase">Final Weight</span>
                    <p className="text-2xl font-black text-purple-400">100%</p>
                 </div>
              </div>
           </div>
           
           {/* Algorithm Flow */}
           <div className="p-8 rounded-[3rem] glass-panel border">
              <div className="flex items-center gap-4 mb-6">
                 <Cpu className="w-6 h-6 text-primary" />
                 <span className="text-lg font-black">Detection Algorithm Flow</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <span className="font-medium text-blue-400">1. Input</span>
                 </div>
                 <ArrowRight className="w-4 h-4 text-muted-foreground" />
                 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <span className="font-medium text-blue-400">2. Visual (3 sites)</span>
                 </div>
                 <span className="text-muted-foreground">×</span>
                 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="font-medium text-emerald-400">Lab CBC</span>
                 </div>
                 <span className="text-muted-foreground">=</span>
                 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="font-medium text-amber-400">Anemia Risk</span>
                 </div>
                 <span className="text-muted-foreground">→</span>
                 <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <span className="font-medium text-purple-400">Final Classification</span>
                 </div>
              </div>
           </div>
        </div>

        {/* ── ROW 3: DIAGNOSTIC CALCULUS ─────────────────────── */}
        <div className="space-y-8 md:space-y-12">
           <SectionHeading title="Diagnostic Calculus" subtitle="NEURAL COMPUTATIONAL TRACE" icon={Calculator} accent="amber" noItalic />
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parse reasoning into cards */}
              {(() => {
                const lines = (report.confidenceReasoning || '').split('\n').filter(l => l.trim());
                if (lines.length === 0) {
                  return (
                    <BentoCard className="col-span-full bg-amber-500/[0.02] border-amber-500/10">
                      <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-amber-500/40" />
                        <p className="text-muted-foreground">Confidence reasoning not available.</p>
                      </div>
                    </BentoCard>
                  );
                }
                return lines.slice(0, 4).map((line, i) => {
                  const parts = line.replace(/^[-•]\s*/, '').split(':');
                  const label = parts[0]?.trim() || `Factor ${i + 1}`;
                  const value = parts[1]?.trim() || line;
                  
                  return (
                    <BentoCard key={i} className="bg-amber-500/[0.02] dark:bg-amber-500/[0.01] border-amber-500/10 hover:border-amber-500/30 transition-all duration-500">
                      <div className="p-8 h-full flex flex-col justify-between">
                         <div className="flex justify-between items-start mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                               <Binary className="w-5 h-5" />
                            </div>
                            <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-tighter">Node {i + 1}</span>
                         </div>
                         <div className="space-y-3">
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{label}</span>
                            <div className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                              {value}
                            </div>
                         </div>
                      </div>
                    </BentoCard>
                  );
                });
              })()}
           </div>

           <BentoCard className="border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-black/20 shadow-2xl">
              <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000 pointer-events-none">
                <Cpu className="w-64 h-64 text-foreground" />
              </div>
              <div className="p-10 md:p-14 relative z-10 space-y-10">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                       <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10">
                          <ShieldCheck className="w-8 h-8" />
                       </div>
                       <div>
                          <h5 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-foreground leading-none mb-2">Verification</h5>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Cross-validation status</p>
                       </div>
                    </div>
                    <div className="px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Network: NOMINAL</span>
                       <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {[
                      { label: 'Spectral Consistency', value: `${reasoning.conjunctiva ? (reasoning.conjunctiva * 100).toFixed(1) : '--'}%`, icon: Sparkles },
                      { label: 'Ensemble Stability', value: `${reasoning.nails ? (reasoning.nails * 100).toFixed(1) : '--'}%`, icon: Layers },
                      { label: 'Hgb Synthesis', value: reasoning.hgb ? `${reasoning.hgb.toFixed(1)} g/dL` : '--', icon: FlaskConical }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-4 group/matrix cursor-default">
                         <div className="flex justify-between items-end">
                            <div className="space-y-2">
                               <div className="flex items-center gap-2">
                                  <item.icon className="w-3.5 h-3.5 text-emerald-500/40" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 leading-none">{item.label}</span>
                               </div>
                            </div>
                            <span className="text-2xl md:text-3xl font-black tabular-nums text-foreground group-hover/matrix:text-emerald-400 transition-all duration-500">
                              {item.value}
                            </span>
                         </div>
                         <div className="h-2 w-full bg-white/5 dark:bg-white/10 rounded-full overflow-hidden shadow-inner p-[1px]">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: item.value.includes('%') ? item.value : '50%' }} 
                              transition={{ duration: 1.5, delay: idx * 0.3, ease: "circOut" }}
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
        <div className="space-y-8 md:space-y-12">
           <SectionHeading title="Clinical Protocol" subtitle="TAILORED THERAPEUTIC GUIDELINES" icon={ShieldCheck} accent="blue" noItalic />

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
<div className="lg:col-span-4 space-y-6">
                  <div className="p-10 rounded-[3rem] bg-blue-500/10 dark:bg-blue-500/[0.05] border border-blue-500/20 flex flex-col justify-between aspect-square group shadow-xl relative overflow-hidden cursor-help min-h-[400px]">
                     <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(59,130,246,0.1)_0%,transparent_70%) opacity-50" />
                     <div className="space-y-6 relative z-10">
                        <div className="p-5 rounded-[1.5rem] bg-blue-500 text-white w-fit shadow-2xl group-hover:scale-110 transition-transform duration-700">
                           <Stethoscope className="w-8 h-8" />
                        </div>
                        <h4 className="text-4xl font-black tracking-tight leading-[0.9] text-foreground">
                          Actionable <br />
                          <span className="italic text-blue-500 font-medium pr-1.5">Protocol.</span>
                        </h4>
                     </div>
                     <div className="relative z-10 flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500/60">Priority Level</span>
                        <p className={cn("text-lg font-bold tracking-widest uppercase", priority.color)}>
                           {priority.level}
                        </p>
                     </div>
                  </div>
                  
                  {cyclePhase && userSex === 'Female' && (
                    <div className="p-8 rounded-[2.5rem] bg-rose-500/10 dark:bg-rose-500/[0.05] border border-rose-500/20 shadow-xl">
                       <div className="flex items-center gap-3 mb-4">
                          {cyclePhase.phaseIcon && <cyclePhase.phaseIcon className={cn("w-5 h-5", cyclePhase.phaseColor)} />}
                          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-rose-400">Iron Timing</span>
                       </div>
                       <p className="text-sm text-slate-900 dark:text-slate-200 leading-relaxed line-clamp-2">
                          {cyclePhase.ironTiming}
                       </p>
                       <div className="mt-4 pt-4 border-t border-rose-500/10">
                          <div className="flex justify-between text-[9px]">
                             <span className="text-muted-foreground">Days since LMP</span>
                             <span className="font-bold text-rose-400">{cyclePhase.daysSinceLmp}</span>
                          </div>
                          {cyclePhase.nextPeriod !== null && (
                            <div className="flex justify-between text-[9px] mt-2">
                               <span className="text-muted-foreground">Next period in</span>
                               <span className="font-bold text-rose-400">{cyclePhase.nextPeriod} days</span>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                   
                  <Button
                   onClick={handleCopyRecommendations}
                   className="w-full h-20 rounded-[2.5rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs gap-4 shadow-[0_30px_60px_-10px_rgba(59,130,246,0.4)] border-none transition-all active:scale-95"
                 >
                   {copiedRec ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                   {copiedRec ? 'Copied to Clipboard' : 'Copy Clinical Protocol'}
                 </Button>
              </div>

              <div className="lg:col-span-8 p-10 md:p-16 rounded-[3.5rem] glass-panel border border-blue-500/20 dark:bg-black/30 shadow-2xl space-y-6 max-h-[600px] overflow-y-auto">
                 {report.recommendations.split('\n').filter(l => l.trim().length > 0).map((line, idx) => {
                    const isHeader = line.includes('**') && !line.startsWith('-') && !line.startsWith('* ');
                    const isBullet = line.startsWith('-') || line.startsWith('*');
                    
                    if (isHeader) {
                       return (
                         <div key={idx} className="space-y-4 pt-4 first:pt-0">
                            <h6 className="text-lg md:text-xl font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                               <ClipboardCheck className="w-5 h-5 opacity-40" />
                               {line.replace(/\*\*/g, '').trim()}
                            </h6>
                            <div className="h-[1px] w-full bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent" />
                         </div>
                       );
                    }
                    
                    if (isBullet) {
                       const cleanLine = line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '');
                       const colonParts = cleanLine.split(':');
                       
                       return (
                         <div key={idx} className="flex gap-4 group/item py-3 border-b border-white/5 last:border-none hover:bg-white/[0.02] transition-colors -mx-4 px-4 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover/item:scale-125 transition-transform" />
                            <div className="flex-1">
                               {colonParts.length > 1 ? (
                                 <>
                                    <strong className="text-xs font-black uppercase tracking-[0.3em] text-blue-500/80 block">
                                      {colonParts[0].trim()}
                                    </strong>
                                    <p className="text-base font-light text-foreground/80 leading-relaxed text-balance">
                                      {colonParts.slice(1).join(':').trim()}
                                    </p>
                                 </>
                               ) : (
                                 <p className="text-base font-light text-foreground/80 leading-relaxed text-balance">
                                   {cleanLine}
                                 </p>
                               )}
                            </div>
                         </div>
                       );
                    }
                    
                    return (
                      <p key={idx} className="text-sm text-muted-foreground font-medium opacity-60 leading-relaxed italic">
                        {line}
                      </p>
                    );
                 })}
              </div>
           </div>
        </div>

{/* ── ROW 5: LABORATORY SYNC (if lab report exists) ───────────────────── */}
        {labReport && labReport.parameters && labReport.parameters.length > 0 && (
          <div className="space-y-8 md:space-y-12">
             <div className="flex items-center justify-between">
<SectionHeading title="Laboratory Sync" subtitle="EXTERNAL HEMATOLOGICAL DATA" icon={TableProperties} accent="emerald" noItalic />
              </div>
              <div className={cn(
                "grid gap-6",
                labCompare ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {labReport.parameters.slice(0, 8).map((param, idx) => (
                   <div key={idx} className={cn(
                     "p-8 rounded-[2.5rem] glass-panel border flex flex-col justify-between min-h-[280px] group hover:scale-[1.02] transition-all shadow-xl cursor-default text-left",
                     param.isNormal ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-red-500/20 bg-red-500/[0.02]"
                   )}>
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 leading-none">Parameter</span>
                           <h6 className="text-xs font-black uppercase tracking-widest text-foreground line-clamp-2">
                             {param.parameter}
                           </h6>
                        </div>
                        {param.isNormal ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                     </div>
                     
                     <div className="space-y-4">
                        <div className="flex items-baseline gap-2">
                           <span className="text-5xl md:text-6xl font-thin tracking-tight tabular-nums text-foreground leading-none">
                             {param.value}
                           </span>
                           <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
                             {param.unit}
                           </span>
                        </div>
                        <Badge className={cn(
                          "px-4 py-2 border-none font-black text-[9px] uppercase tracking-[0.3em] rounded-xl w-full flex items-center justify-center shadow-inner", 
                          param.isNormal ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {param.isNormal ? 'Nominal' : 'Flagged'}
                        </Badge>
                     </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* ── ROW 5B: WOMEN'S HEALTH (Cycle-Aware) ────────────────────────── */}
        {cyclePhase && userSex === 'Female' && (
          <div className="space-y-8 md:space-y-12">
            <SectionHeading title="Women's Health" subtitle="CYCLE-AWARE ANALYSIS" icon={Heart} accent="rose" noItalic />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Cycle Phase Visualization */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-8 rounded-[3rem] bg-gradient-to-br from-rose-500/20 via-rose-500/5 to-transparent border border-rose-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    {cyclePhase.phaseIcon && <cyclePhase.phaseIcon className={cn("w-6 h-6", cyclePhase.phaseColor)} />}
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Current Phase</span>
                  </div>
                  
                  <h3 className="text-4xl font-black text-foreground mb-2">{cyclePhase.phase}</h3>
                  <p className="text-muted-foreground text-sm mb-6">Day {cyclePhase.daysSinceLmp} of {cyclePhase.cycleLength}</p>
                  
                  {/* Phase Timeline */}
                  <div className="relative pt-8">
                    <div className="flex justify-between text-[8px] text-muted-foreground mb-2">
                      <span>Day 1</span>
                      <span>Day 14</span>
                      <span>Day 28</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(cyclePhase.daysSinceLmp / cyclePhase.cycleLength) * 100}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                    <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2">
                      <div className={cn("w-4 h-4 rounded-full border-2 border-background", cyclePhase.phase === 'Menstrual' ? 'bg-red-500' : cyclePhase.phase === 'Follicular' ? 'bg-amber-500' : cyclePhase.phase === 'Ovulation' ? 'bg-pink-500' : 'bg-purple-500')} />
                    </div>
                  </div>
                  
                  {/* Next Period */}
                  {cyclePhase.nextPeriod !== null && (
                    <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                      <div className="flex items-center gap-2 text-rose-400 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Next Period</span>
                      </div>
                      <p className="text-2xl font-black">{cyclePhase.nextPeriod} days</p>
                    </div>
                  )}
                  
                  {cyclePhase.isHeavyFlow && (
                    <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Heavy Flow Alert</span>
                      </div>
                      <p className="text-sm text-red-400/80">Consider iron supplementation during this time.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Iron Schedule */}
              <div className="lg:col-span-8 space-y-6">
                <div className="p-8 rounded-[3rem] glass-panel border-rose-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-rose-500/10">
                      <Clock className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black">Iron Supplementation Schedule</h4>
                      <p className="text-xs text-muted-foreground">Optimized for your current cycle phase</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Morning */}
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Morning (Empty Stomach)</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {cyclePhase.phase === 'Luteal' 
                          ? '⚠️ Skip if experiencing nausea/mood changes'
                          : '✅ Best absorption time - Take iron supplement with water'
                        }
                      </p>
                    </div>
                    
                    {/* Midday */}
                    <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4 text-blue-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Midday (With Lunch)</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {cyclePhase.phase === 'Menstrual'
                          ? '✅ Take with meal to reduce stomach upset'
                          : '❌ Avoid - may reduce absorption by 40%'
                        }
                      </p>
                    </div>
                    
                    {/* Evening */}
                    <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Moon className="w-4 h-4 text-purple-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-500">Evening</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {cyclePhase.phase === 'Ovulation'
                          ? '✅ Good time for iron + vitamin C snack'
                          : '⚠️ Avoid within 2 hours of sleep'
                        }
                      </p>
                    </div>
                    
                    {/* Vitamin C */}
                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Apple className="w-4 h-4 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Vitamin C Pairing</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {cyclePhase.isHeavyFlow
                          ? '🥗 Increase: Calamansi, guava with every iron dose'
                          : '✅ Standard: Pair iron with citrus fruits'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Phase-Specific Recommendations */}
                <div className="p-8 rounded-[3rem] bg-rose-500/5 border border-rose-500/10">
                  <h5 className="text-lg font-black mb-4 flex items-center gap-2">
                    {cyclePhase.phaseIcon && <cyclePhase.phaseIcon className={cn("w-5 h-5", cyclePhase.phaseColor)} />}
                    <span className="text-rose-400">{cyclePhase.phase} Phase Recommendations</span>
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Diet Focus</p>
                      {cyclePhase.phase === 'Menstrual' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>🥩 Red meat, liver (dinuguan, atay)</li>
                          <li>🥬 Dark leafy greens (malunggay, kangkong)</li>
                          <li>🍊 Calamansi juice with every meal</li>
                        </ul>
                      )}
                      {cyclePhase.phase === 'Follicular' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>💊 Start iron supplements</li>
                          <li>🍳 Malunggay omelette breakfast</li>
                          <li>🥗 Light, iron-rich meals</li>
                        </ul>
                      )}
                      {cyclePhase.phase === 'Ovulation' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>🩸 Best time for CBC test</li>
                          <li>🥩 Maximize heme iron intake</li>
                          <li>🍊 Continue vitamin C pairing</li>
                        </ul>
                      )}
                      {cyclePhase.phase === 'Luteal' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>⚠️ Reduce caffeine intake</li>
                          <li>🍲 Easily digestible iron meals</li>
                          <li>💤 Avoid late-night iron</li>
                        </ul>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">What to Avoid</p>
                      {cyclePhase.phase === 'Menstrual' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>☕ Coffee/tea within 1 hour of meals</li>
                          <li>🥛 Calcium supplements</li>
                          <li>🏃‍♂️ Intense exercise</li>
                        </ul>
                      )}
                      {cyclePhase.phase === 'Follicular' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>🚫 Raw spinach (oxalates)</li>
                          <li>🚫 Tannin-rich foods</li>
                        </ul>
                      )}
                      {cyclePhase.phase === 'Ovulation' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>🍷 Alcohol (impairs iron absorption)</li>
                          <li>🚫 High-fiber immediately after iron</li>
                        </ul>
                      )}
                      {cyclePhase.phase === 'Luteal' && (
                        <ul className="text-sm space-y-2 text-foreground/80">
                          <li>☕ Limit caffeine to morning only</li>
                          <li>🧊 Avoid cold drinks with iron</li>
                          <li>🌙 No iron before bed</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ROW 6: NUTRITION MATRIX ────────────────────────── */}
        <div className="space-y-8 md:space-y-16">
           <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
              <SectionHeading title="The Anemo Kitchen" subtitle="CULTURALLY ALIGNED NUTRITION" icon={Utensils} accent="primary" noItalic />
              <p className="text-lg text-muted-foreground font-light leading-relaxed italic text-balance">
                 Filipino iron-rich staples selected for optimal hemoglobin optimization and ferritin storage.
              </p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {[
                { name: 'Malunggay', benefit: 'Iron + Vit C', result: '28mg/100g iron', icon: Droplets, color: 'text-emerald-400' },
                { name: 'Atay (Liver)', benefit: 'B12 & Ferritin', result: 'Heme iron rich', icon: Flame, color: 'text-orange-400' },
                { name: 'Monggo', benefit: 'Plant Protein', result: 'Folate source', icon: Zap, color: 'text-amber-400' },
                { name: 'Kangkong', benefit: 'Folate', result: 'DNA synthesis', icon: Sparkles, color: 'text-emerald-500' },
                { name: 'Itlog (Egg)', benefit: 'Bioavailable', result: 'Cell repair', icon: Activity, color: 'text-blue-400' },
                { name: 'Calamansi', benefit: 'Absorption', result: 'Vit C boost', icon: Sparkles, color: 'text-yellow-400' }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  onClick={() => setExpandedFood(expandedFood === i ? null : i)}
                  className={cn(
                    "p-6 md:p-8 rounded-[2.5rem] glass-panel text-center space-y-4 group cursor-pointer transition-all duration-500 shadow-2xl border border-white/10 relative overflow-hidden",
                    expandedFood === i ? "scale-105 border-primary/40 bg-primary/[0.03]" : "hover:border-primary/20 hover:bg-white/[0.01]"
                  )}
                >
                   <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-[30px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className={cn(
                     "w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform duration-700",
                     item.color.replace('text-', 'bg-') + '/10'
                   )}>
                      <item.icon className={cn("w-6 h-6 md:w-7 md:h-7 opacity-60", item.color)} />
                   </div>
                   <div className="space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] block text-foreground">
                        {item.name}
                      </span>
                      <span className="text-[9px] font-bold text-primary uppercase tracking-tighter block">
                        {item.benefit}
                      </span>
                   </div>
                   <AnimatePresence>
                     {expandedFood === i && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }} 
                         animate={{ height: 'auto', opacity: 1 }} 
                         exit={{ height: 0, opacity: 0 }} 
                         className="pt-3 border-t border-white/5"
                       >
                          <p className="text-[9px] font-medium text-foreground/70 leading-relaxed">
                            {item.result}
                          </p>
                       </motion.div>
                     )}
                   </AnimatePresence>
                   <div className="flex justify-center pt-2">
                      <ChevronDown className={cn(
                        "w-4 h-4 text-primary/30 transition-transform duration-500", 
                        expandedFood === i && "rotate-180"
                      )} />
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* ── ROW 7: FIND A SPECIALIST CTA ────────────────────────────────── */}
        <div className="pt-8 md:pt-16 pb-20">
           <div className="relative p-12 md:p-20 lg:p-28 rounded-[4rem] md:rounded-[6rem] bg-gradient-to-r from-primary via-primary/95 to-rose-600 text-white overflow-hidden shadow-[0_60px_120px_-20px_rgba(var(--primary-rgb),0.4)] group border-none isolate">
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/10 rounded-full blur-[160px] -mr-[300px] -mt-[300px] animate-pulse duration-[8000ms] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/20 rounded-full blur-[100px] -ml-[150px] -mb-[150px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
                 <div className="max-w-3xl space-y-8 text-center lg:text-left">
                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.4em] backdrop-blur-xl">
                      Medical Consultation Recommended
                    </div>
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[0.9] text-balance">
                       Secure clinical <br />
                       <span className="font-black italic drop-shadow-2xl">clearance.</span>
                    </h2>
                    <p className="text-lg md:text-xl text-white/80 font-light leading-relaxed text-balance max-w-xl">
                       We have mapped board-certified hematologists in <span className="underline decoration-white/40 underline-offset-4 decoration-2 font-black">
                         {userLocation}
                       </span> available for consult.
                    </p>
                 </div>

                 <div className="flex flex-col gap-6 w-full lg:w-auto shrink-0">
                    <Button 
                      size="lg" 
                      className="h-24 px-12 md:px-20 rounded-[2.5rem] bg-white text-primary hover:bg-white/95 text-sm font-black uppercase tracking-[0.3em] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] transition-all hover:scale-105 active:scale-95 group/btn border-none relative z-10"
                      asChild
                    >
                       <Link href="/dashboard/find-doctor" className="flex items-center gap-4">
                          <MapPin className="w-6 h-6 group-hover/btn:animate-bounce" /> 
                          Connect with Specialist
                       </Link>
                    </Button>
                    <p className="text-center text-[9px] font-black uppercase tracking-[0.5em] text-white/40 relative z-10">
                      Encrypted • Confidential • Secure
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {/* ── DIAGNOSTIC DISCLAIMER FOOTER ─────────────────────────────────── */}
        <footer className="text-center space-y-12 opacity-40 border-t border-white/5 dark:border-white/5 pt-16 md:pt-24 pb-12">
           <div className="flex flex-col items-center gap-6">
              <Cpu className="w-12 h-12 opacity-30 animate-pulse" />
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase tracking-[0.6em] leading-none text-foreground text-balance">
                   ANEMO
                 </p>
                 <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                   2026
                 </p>
              </div>
           </div>
           
           <div className="max-w-4xl mx-auto p-8 md:p-12 rounded-[3rem] border border-white/10 dark:border-white/5 bg-white/[0.01] dark:bg-black/20">
              <p className="text-[11px] font-medium leading-[2] text-muted-foreground text-center uppercase tracking-[0.15em] text-balance px-4">
                 <strong className="text-primary font-black mr-2">DISCLAIMER:</strong> 
                 This diagnostic summary is generated by artificial intelligence for preliminary screening purposes only. 
                 It is NOT a substitute for professional medical advice, clinical diagnosis, or therapeutic treatment. Always consult with a licensed physician for definitive assessment.
              </p>
           </div>
        </footer>

      </div>
    </motion.div>
  );
}