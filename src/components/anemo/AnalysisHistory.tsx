
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import {
    Eye,
    Plus,
    LogIn,
    User,
    FileText,
    Download,
    Trash2,
    ShieldCheck,
    Activity,
    Calendar,
    Search,
    ChevronRight,
    Sparkles,
    ArrowUpRight,
    TrendingUp,
    History,
    Filter,
    FileDown,
    StickyNote,
    Check,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CbcReport as CbcReportType, AnalysisReportViewer } from './AnalysisReportViewer';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import { runValidateMultimodalResults } from '@/app/actions';
import { MenstrualCycleCorrelator, CycleLogType } from './MenstrualCycleCorrelator';
import { AnemoLoading } from '@/components/ui/anemo-loading';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

type ImageReport = PersonalizedRecommendationsOutput & {
    id: string;
    type: 'image';
    createdAt: { toDate: () => Date } | Date | null;
    imageAnalysisSummary: string;
    hemoglobin?: number;
    notes?: string;
};

export type CbcReport = AnalyzeCbcReportOutput & {
    id: string;
    type: 'cbc';
    createdAt: { toDate: () => Date } | Date | null;
    hospitalName?: string;
    doctorName?: string;
};

export type HistoryItem = ImageReport | CbcReport;

/** Safely converts Firestore Timestamp or Date to a JS Date */
function toDate(ts: { toDate: () => Date } | Date | null | undefined): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as any).toDate === 'function') return (ts as any).toDate();
  return null;
}

function CalendarView({ records, onViewReport }: { records: any[]; onViewReport: (r: any) => void }) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const recordsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    records.forEach(r => {
      if (!r.createdAt) return;
      const d = toDate(r.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [records]);

  const { year, month } = calMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => setCalMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 });
  const nextMonth = () => setCalMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 });

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().toISOString().slice(0, 10);

  const getSeverityDot = (dayRecords: any[]) => {
    if (!dayRecords?.length) return null;
    const hasSevere = dayRecords.some(r => r.anemiaType?.toLowerCase().includes('severe'));
    const hasModerate = dayRecords.some(r => r.anemiaType?.toLowerCase().includes('moderate'));
    if (hasSevere) return 'bg-red-500';
    if (hasModerate) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="rounded-[2.5rem] glass-panel border-primary/10 p-6 md:p-8 space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl glass-button border-primary/10 hover:border-primary/30 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 rounded-xl glass-button border-primary/10 hover:border-primary/30 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => (
          <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRecords = recordsByDate[dateKey];
          const dotColor = getSeverityDot(dayRecords);
          const isToday = dateKey === today;
          return (
            <button
              key={day}
              onClick={() => dayRecords?.length && onViewReport(dayRecords[0])}
              className={`aspect-square flex flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-bold transition-all ${
                dayRecords?.length
                  ? 'glass-button border border-primary/20 hover:border-primary/40 cursor-pointer'
                  : 'text-muted-foreground/40 cursor-default'
              } ${isToday ? 'ring-1 ring-primary/50' : ''}`}
            >
              <span className={isToday ? 'text-primary font-black' : ''}>{day}</span>
              {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
        {[['bg-emerald-500', 'Normal/Mild'], ['bg-amber-500', 'Moderate'], ['bg-red-500', 'Severe']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalysisHistory() {
    const { user } = useUser();
    const firestore = useFirestore();
    const isGuest = user?.isAnonymous;
    const { toast } = useToast();
    const [reportToView, setReportToView] = useState<HistoryItem | null>(null);
    const [validationCbcReport, setValidationCbcReport] = useState<CbcReport | null>(null);
    const [validationImageReport, setValidationImageReport] = useState<ImageReport | null>(null);
    const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
    const [validationResult, setValidationResult] = useState<{ reliabilityScore: number, discrepancyAlert: boolean } | null>(null);
    const [userSex, setUserSex] = useState<string>('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'cbc'>('all');
    const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
    const [pageLimit, setPageLimit] = useState(20);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
        );
    };
    const [isPulling, setIsPulling] = useState(false);
    const pullStartY = useRef<number>(0);
    const PULL_THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        pullStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const delta = e.changedTouches[0].clientY - pullStartY.current;
        if (delta > PULL_THRESHOLD && window.scrollY === 0) {
            setIsPulling(true);
            setPageLimit(20);
            setTimeout(() => setIsPulling(false), 800);
        }
    };


    const imageAnalysesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/imageAnalyses`),
            orderBy('createdAt', 'desc'),
            limit(pageLimit)
        );
    }, [user, firestore, pageLimit]);

    const labReportsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/labReports`),
            orderBy('createdAt', 'desc'),
            limit(pageLimit)
        );
    }, [user, firestore, pageLimit]);

    const cycleLogsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/cycle_logs`),
            orderBy('startDate', 'desc')
        );
    }, [user, firestore]);

    const { data: imageHistory, isLoading: imageIsLoading } = useCollection<any>(imageAnalysesQuery);
    const { data: cbcHistory, isLoading: cbcIsLoading } = useCollection<any>(labReportsQuery);
    const { data: cycleLogs, isLoading: cycleIsLoading } = useCollection<any>(cycleLogsQuery);

    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userData } = useDoc(userDocRef);

    useEffect(() => {
        if (userData?.medicalInfo?.sex) {
            setUserSex(userData.medicalInfo.sex);
        }
    }, [userData]);

    const history = useMemo(() => {
        if (!imageHistory || !cbcHistory) return [];
        const combined = [
            ...imageHistory.map((item: any) => ({ ...item, type: 'image' } as ImageReport)),
            ...cbcHistory.map((item: any) => ({ ...item, type: 'cbc' } as CbcReport))
        ];
        return combined.sort((a, b) => {
            const aTime = toDate(a.createdAt)?.getTime() ?? 0;
            const bTime = toDate(b.createdAt)?.getTime() ?? 0;
            return bTime - aTime;
        });
    }, [imageHistory, cbcHistory]);

    const filteredHistory = useMemo(() => {
        return history.filter((item) => {
            if (typeFilter !== 'all' && item.type !== typeFilter) return false;

            if (riskFilter !== 'all') {
                if (item.type === 'image') {
                    const score = (item as ImageReport).riskScore;
                    if (riskFilter === 'high' && score <= 75) return false;
                    if (riskFilter === 'moderate' && (score <= 50 || score > 75)) return false;
                    if (riskFilter === 'low' && score > 50) return false;
                } else {
                    const assessment = (item as CbcReport).summary?.toLowerCase() ?? '';
                    const isHigh = /high|severe|critical/.test(assessment);
                    const isModerate = /moderate|mild/.test(assessment);
                    if (riskFilter === 'high' && !isHigh) return false;
                    if (riskFilter === 'moderate' && !isModerate) return false;
                    if (riskFilter === 'low' && (isHigh || isModerate)) return false;
                }
            }

            if (search.trim()) {
                const q = search.trim().toLowerCase();
                const dateStr = (() => {
                    const d = toDate(item.createdAt);
                    return d ? format(d, 'MMMM d, yyyy').toLowerCase() : '';
                })();
                const riskStr = item.type === 'image' ? String((item as ImageReport).riskScore) : ((item as CbcReport).summary ?? '').toLowerCase();
                if (!dateStr.includes(q) && !riskStr.includes(q)) return false;
            }

            return true;
        });
    }, [history, typeFilter, riskFilter, search]);

    const compareItems = selectedIds.map(id => filteredHistory.find(h => h.id === id)).filter(Boolean) as HistoryItem[];

    const getBadgeVariant = useCallback((riskScore: number) => {
        if (riskScore > 75) return 'destructive';
        if (riskScore > 50) return 'secondary';
        return 'default';
    }, []);

    const handleSaveNote = async (reportId: string, type: 'image' | 'cbc') => {
        if (!user || !firestore) return;
        const collectionName = type === 'image' ? 'imageAnalyses' : 'labReports';
        const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, reportId);
        try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(docRef, { notes: noteValue });
            toast({ title: 'Note Saved', description: 'Your annotation has been saved.' });
            setEditingNoteId(null);
            setNoteValue('');
        } catch {
            toast({ title: 'Save Failed', description: 'Could not save note.', variant: 'destructive' });
        }
    };

    const handleDelete = (reportId: string, type: 'image' | 'cbc') => {
        if (!user || !firestore) return;
        const collectionName = type === 'image' ? 'imageAnalyses' : 'labReports';
        const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, reportId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Intelligence Purged',
            description: `The ${type === 'image' ? 'analysis' : 'clinical'} record has been removed.`,
        });
    };

    const handleDownloadPDF = useCallback((item: HistoryItem) => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const margin = 20;
        let y = margin;

        // ── Header ──────────────────────────────────────────────────────────
        pdf.setFillColor(220, 38, 38);
        pdf.rect(0, 0, pageW, 18, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANEMO AI — DIAGNOSTIC REPORT', margin, 12);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Non-invasive Hematological Screening', pageW - margin, 12, { align: 'right' });

        y = 30;
        // ── Report meta ────────────────────────────────────────────────────
        pdf.setTextColor(30, 30, 30);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.type === 'image' ? 'Visual Neural Analysis' : 'CBC Lab Report Analysis', margin, y);
        y += 8;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Generated: ${format(toDate(item.createdAt) ?? new Date(), 'MMMM d, yyyy · h:mm a')}`, margin, y);
        pdf.text(`Record ID: ${item.id.substring(0, 16)}`, pageW - margin, y, { align: 'right' });
        y += 5;
        pdf.setDrawColor(220, 38, 38);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageW - margin, y);
        y += 10;

        if (item.type === 'image') {
            const img = item as ImageReport;

            // Risk score box
            pdf.setFillColor(255, 245, 245);
            pdf.roundedRect(margin, y, pageW - margin * 2, 28, 4, 4, 'F');
            pdf.setTextColor(220, 38, 38);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ANEMIA RISK INDEX', margin + 6, y + 8);
            pdf.setFontSize(28);
            pdf.text(String(img.riskScore), margin + 6, y + 22);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            const verdict = img.riskScore > 75 ? 'Critical' : img.riskScore > 50 ? 'Moderate Risk' : 'Normal Range';
            pdf.text(verdict, margin + 40, y + 22);
            pdf.text(`Confidence: ${img.confidenceScore || 0}%`, pageW - margin - 40, y + 22, { align: 'right' });
            y += 38;

            // Analysis summary
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            pdf.text('AI Observation', margin, y);
            y += 6;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(70, 70, 70);
            const summaryLines = pdf.splitTextToSize(img.imageAnalysisSummary || '', pageW - margin * 2);
            pdf.text(summaryLines, margin, y);
            y += summaryLines.length * 5 + 8;

            // Recommendations
            if (img.recommendations) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(30, 30, 30);
                pdf.text('Clinical Recommendations', margin, y);
                y += 6;
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(70, 70, 70);
                const recLines = pdf.splitTextToSize(img.recommendations, pageW - margin * 2);
                pdf.text(recLines, margin, y);
                y += recLines.length * 5 + 8;
            }
        } else {
            const cbc = item as CbcReport;
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            pdf.text('CBC Analysis Summary', margin, y);
            y += 6;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(70, 70, 70);
            const summaryLines = pdf.splitTextToSize(cbc.summary || '', pageW - margin * 2);
            pdf.text(summaryLines, margin, y);
            y += summaryLines.length * 5 + 8;

            // Parameters table
            if (cbc.parameters && cbc.parameters.length > 0) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(30, 30, 30);
                pdf.text('Parameters', margin, y);
                y += 6;
                const colW = [(pageW - margin * 2) * 0.45, (pageW - margin * 2) * 0.25, (pageW - margin * 2) * 0.15, (pageW - margin * 2) * 0.15];
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(245, 245, 245);
                pdf.rect(margin, y - 2, pageW - margin * 2, 7, 'F');
                pdf.text('Parameter', margin + 2, y + 3);
                pdf.text('Value', margin + colW[0] + 2, y + 3);
                pdf.text('Unit', margin + colW[0] + colW[1] + 2, y + 3);
                pdf.text('Status', margin + colW[0] + colW[1] + colW[2] + 2, y + 3);
                y += 8;
                pdf.setFont('helvetica', 'normal');
                for (const p of cbc.parameters.slice(0, 20)) {
                    pdf.setTextColor(p.isNormal ? 40 : 200, p.isNormal ? 40 : 38, p.isNormal ? 40 : 38);
                    pdf.text(String(p.parameter).substring(0, 30), margin + 2, y);
                    pdf.text(String(p.value), margin + colW[0] + 2, y);
                    pdf.text(String(p.unit), margin + colW[0] + colW[1] + 2, y);
                    pdf.text(p.isNormal ? 'Normal' : 'Abnormal', margin + colW[0] + colW[1] + colW[2] + 2, y);
                    y += 6;
                    if (y > 260) { pdf.addPage(); y = margin; }
                }
            }
        }

        // ── Footer ──────────────────────────────────────────────────────────
        const pageH = pdf.internal.pageSize.getHeight();
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageH - 18, pageW - margin, pageH - 18);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(160, 160, 160);
        pdf.text('ANEMO AI — For screening purposes only. Not a medical diagnosis. Consult a licensed healthcare professional.', pageW / 2, pageH - 11, { align: 'center' });
        pdf.text(`anemo.ai · ${format(new Date(), 'yyyy')}`, pageW / 2, pageH - 6, { align: 'center' });

        pdf.save(`anemo-report-${item.id.substring(0, 8)}-${format(toDate(item.createdAt) ?? new Date(), 'yyyyMMdd')}.pdf`);
        toast({ title: 'Report Downloaded', description: 'Your Anemo AI report has been saved as PDF.' });
    }, [toast]);

    const handleExportCSV = useCallback(() => {
        const rows = [
            ['Date', 'Time', 'Type', 'Risk Score / Assessment', 'Anemia Type', 'Confidence', 'Hgb (g/dL)', 'Summary'],
        ];
        filteredHistory.forEach((item) => {
            const date = (() => { const d = toDate(item.createdAt); return d ? format(d, 'yyyy-MM-dd') : ''; })();
            const time = (() => { const d = toDate(item.createdAt); return d ? format(d, 'HH:mm:ss') : ''; })();
            if (item.type === 'image') {
                const img = item as ImageReport;
                rows.push([
                    date, time, 'Image Scan',
                    String(img.riskScore),
                    img.anemiaType || '',
                    String(img.confidenceScore || 0) + '%',
                    img.hemoglobin ? String(img.hemoglobin.toFixed(1)) : '',
                    (img.imageAnalysisSummary || '').replace(/,/g, ';').replace(/\n/g, ' '),
                ]);
            } else {
                const cbc = item as CbcReport;
                rows.push([
                    date, time, 'CBC Report',
                    cbc.summary || '',
                    '', '', '',
                    '',
                ]);
            }
        });
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anemo-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'CSV Exported', description: `${filteredHistory.length} records downloaded.` });
    }, [filteredHistory, toast]);

    const handleValidation = async () => {
        if (!user || !firestore || !validationCbcReport || !validationImageReport) {
            toast({
                title: 'Validation Error',
                description: 'Missing required data for cross-reference.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const medicalInfo = userData?.medicalInfo || {};

            const result = await runValidateMultimodalResults({
                medicalInfo: medicalInfo,
                imageAnalysisReport: {
                    conjunctiva: validationImageReport.imageAnalysisSummary,
                    fingernails: 'Verified in summary',
                    skin: 'Verified in summary',
                },
                cbcAnalysis: {
                    hemoglobin: validationCbcReport?.parameters?.find(p => p?.parameter?.toLowerCase().includes('hemoglobin'))?.value ?? 'N/A',
                    rbc: validationCbcReport?.parameters?.find(p => p?.parameter?.toLowerCase().includes('rbc'))?.value ?? 'N/A',
                },
            });

            setValidationResult(result);
            setIsValidationDialogOpen(false);
            setReportToView(validationCbcReport);
        } catch (error) {
            toast({
                title: 'Validation Failed',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    }

    if (isGuest) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-12 p-12 rounded-[3rem] glass-panel border-primary/10 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                    <div className="relative w-32 h-32 rounded-[2.5rem] bg-zinc-900/50 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl">
                        <LogIn className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <div className="space-y-6 max-w-md relative z-10">
                    <h3 className="text-4xl font-light tracking-tighter text-white">
                        Guest <span className="font-serif italic text-primary">Protocol</span> Active
                    </h3>
                    <p className="text-white/40 text-lg font-light leading-relaxed">
                        Historical diagnostic data is only persistent for authenticated sessions. Create an account to track your health intelligence over time with our neural diagnostic suite.
                    </p>
                </div>
                <Button asChild className="h-16 px-12 rounded-full bg-primary text-black font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_20px_40px_rgba(var(--primary),0.3)] hover:scale-105 transition-all">
                    <Link href="/signup">
                        INITIALIZE ACCOUNT
                    </Link>
                </Button>
            </motion.div>
        );
    }

    if (imageIsLoading || cbcIsLoading) {
        return (
            <div className="flex flex-col h-[500px] w-full items-center justify-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                    <AnemoLoading />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Synchronizing</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Diagnostic Cloud Interface</p>
                </div>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-12 p-12 rounded-[3rem] glass-panel border-white/5 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-900/50 border border-white/10 flex items-center justify-center text-white/10 backdrop-blur-xl shadow-2xl">
                    <Search className="h-12 w-12" />
                </div>
                <div className="space-y-6 max-w-md relative z-10">
                    <h3 className="text-4xl font-light tracking-tighter text-white">
                        Archive <span className="font-serif italic text-muted-foreground">Empty</span>
                    </h3>
                    <p className="text-white/40 text-lg font-light leading-relaxed">
                        No diagnostic records found in your profile. Initiate a scan to start building your health history and unlock longitudinal insights.
                    </p>
                </div>
                <Button asChild className="h-16 px-12 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 transition-all">
                    <Link href="/dashboard/analysis">
                        START NEW SCAN
                    </Link>
                </Button>
            </motion.div>
        );
    }

    const renderHistoryRow = (item: HistoryItem) => {
        const isImage = item.type === 'image';

        return (
            <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group border-b border-white/5 hover:bg-white/[0.03] transition-all duration-300"
            >
                <TableCell className="py-4 px-4 md:py-8 md:px-8">
                    <div className="flex items-center gap-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          disabled={!isImage}
                          className="w-4 h-4 rounded accent-primary cursor-pointer disabled:opacity-20 flex-shrink-0"
                          title={isImage ? 'Select for comparison' : 'Only image scans can be compared'}
                        />
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                            <Calendar className="w-5 h-5 text-white/40 group-hover:text-primary/60 transition-colors" />
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-base font-bold text-white tracking-tight">{toDate(item.createdAt) ? format(toDate(item.createdAt)!, 'MMMM d, yyyy') : 'N/A'}</span>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{toDate(item.createdAt) ? format(toDate(item.createdAt)!, 'h:mm a') : ''}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-3 h-3 rounded-full",
                            isImage
                                ? "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.6)]"
                                : "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                        )} />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">
                            {isImage ? 'AI Neural Scan' : 'Clinical Data'}
                        </span>
                    </div>
                </TableCell>
                <TableCell>
                    {isImage ? (
                        <div className="flex items-center gap-6">
                            <Badge variant={getBadgeVariant((item as ImageReport).riskScore)} className="rounded-xl font-black px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase border-none">
                                Risk Index: {(item as ImageReport).riskScore}
                            </Badge>
                            <span className="text-sm font-medium text-white/40 truncate max-w-[200px] hidden lg:inline-block italic">
                                "{(item as ImageReport).imageAnalysisSummary.substring(0, 50)}..."
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <FileText className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-white/60 truncate max-w-[300px]">
                                {(item as CbcReport).summary}
                            </span>
                        </div>
                    )}
                </TableCell>
                <TableCell className="text-right px-4 md:px-8">
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                        {!isImage && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/20 hover:text-blue-400 transition-all group/btn"
                                onClick={() => {
                                    setValidationCbcReport(item as CbcReport);
                                    setIsValidationDialogOpen(true);
                                }}
                            >
                                <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 group-hover/btn:scale-110 transition-transform" />
                                <span className="sr-only">Cross-Reference</span>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            className="h-10 md:h-12 px-3 md:px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all group/btn flex items-center gap-1.5 md:gap-2"
                            onClick={() => setReportToView(item)}
                        >
                            <Eye className="h-4 w-4 flex-shrink-0" />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">View</span>
                            <ArrowUpRight className="hidden md:inline h-4 w-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </Button>

                        <Button
                            variant="ghost"
                            className="h-10 md:h-12 px-3 md:px-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all group/btn flex items-center gap-1.5 md:gap-2"
                            onClick={() => handleDownloadPDF(item)}
                        >
                            <Download className="h-4 w-4 flex-shrink-0 group-hover/btn:scale-110 transition-transform" />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">PDF</span>
                        </Button>

                        {/* Add/Edit Note */}
                        {editingNoteId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={noteValue}
                              onChange={e => setNoteValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveNote(item.id, isImage ? 'image' : 'cbc');
                                if (e.key === 'Escape') { setEditingNoteId(null); setNoteValue(''); }
                              }}
                              placeholder="Add note…"
                              className="h-10 w-36 px-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/80 placeholder-white/20 outline-none focus:border-primary/40"
                              maxLength={120}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                              onClick={() => handleSaveNote(item.id, isImage ? 'image' : 'cbc')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={(item as any).notes || 'Add note'}
                            className="h-10 w-10 md:h-12 md:w-12 rounded-2xl glass-button border border-white/10 hover:border-primary/30 hover:text-primary transition-all"
                            onClick={() => { setEditingNoteId(item.id); setNoteValue((item as any).notes || ''); }}
                          >
                            <StickyNote className="h-4 w-4 md:h-5 md:w-5" />
                          </Button>
                        )}

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all group/btn"
                                >
                                    <Trash2 className="h-4 w-4 md:h-5 md:w-5 group-hover/btn:scale-110 transition-transform" />
                                    <span className="sr-only">Purge</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#0a0a0a] border-white/10 rounded-[3rem] p-12">
                                <AlertDialogHeader className="space-y-4">
                                    <AlertDialogTitle className="text-4xl font-light tracking-tighter text-white uppercase">
                                        Purge <span className="font-serif italic text-red-500">Record</span>?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-white/40 text-lg font-light leading-relaxed">
                                        This action is irreversible. The selected diagnostic intelligence will be permanently removed from your profile's historical evolution.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-12 gap-4">
                                    <AlertDialogCancel className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all">CANCEL</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDelete(item.id, isImage ? 'image' : 'cbc')}
                                        className='h-14 px-10 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/20 transition-all'
                                    >
                                        PURGE INTELLIGENCE
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TableCell>
            </motion.tr>
        );
    }

    const renderReportModal = () => {
        if (!reportToView) return null;
        if (reportToView.type === 'image') {
            const report = reportToView as ImageReport;
            return (
                <Dialog open={true} onOpenChange={(open) => !open && setReportToView(null)}>
                    <DialogContent className="sm:max-w-2xl bg-[#080808] border-white/10 rounded-[3rem] p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] -mr-64 -mt-64 pointer-events-none" />

                        <div className="p-12 space-y-12 relative z-10">
                            <DialogHeader className="space-y-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                        <Activity className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Neural Diagnostic Analysis</span>
                                        <DialogDescription className="text-white/20 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">
                                            Archive ID: {report.id.substring(0, 12)}
                                        </DialogDescription>
                                    </div>
                                </div>
                                <DialogTitle className="text-5xl font-light tracking-tighter text-white uppercase leading-none">
                                    Historical <span className="font-serif italic text-primary/80">Result</span>
                                </DialogTitle>
                                <p className="text-white/40 font-medium uppercase tracking-[0.2em] text-[11px]">
                                    Calibration: {toDate(report.createdAt) ? format(toDate(report.createdAt)!, 'PPP, p') : ''}
                                </p>
                            </DialogHeader>

                            <div className="grid gap-10">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <TrendingUp className="w-12 h-12 text-white" />
                                        </div>
                                        <div className="flex justify-between items-end mb-6 relative z-10">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Risk Score</span>
                                                <p className="text-6xl font-light text-white tracking-tighter leading-none">{report.riskScore}<span className="text-xl text-white/20 ml-1">/100</span></p>
                                            </div>
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            <Progress value={report.riskScore} className="h-1.5 bg-white/5" />
                                            <div className="flex justify-between">
                                                <Badge variant={getBadgeVariant(report.riskScore)} className="rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                                                    {report.riskScore > 75 ? 'Critical' : report.riskScore > 50 ? 'Moderate' : 'Optimal'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl flex flex-col justify-center relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <ShieldCheck className="w-12 h-12 text-white" />
                                        </div>
                                        <div className="space-y-4 relative z-10">
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Verdict</span>
                                            <p className="text-3xl font-light text-white tracking-tight uppercase leading-tight">{report.anemiaType || 'N/A'}</p>
                                            <div className="flex items-center gap-3 mt-4">
                                                <div className="p-2 bg-primary/20 rounded-lg">
                                                    <Sparkles className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Confidence: {report.confidenceScore || 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] ml-4 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        Image Observations
                                    </h4>
                                    <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 text-lg font-light text-white/70 leading-relaxed italic backdrop-blur-xl">
                                        "{report.imageAnalysisSummary}"
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] ml-4 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        Clinical Insights
                                    </h4>
                                    <ScrollArea className="h-64 rounded-[2rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-xl">
                                        <p className="text-lg text-white/50 leading-relaxed font-light whitespace-pre-wrap">{report.recommendations}</p>
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-zinc-950/80 border-t border-white/5 flex justify-end gap-4 backdrop-blur-2xl flex-wrap">
                            <Button variant="ghost" onClick={() => setReportToView(null)} className="h-14 px-10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/5 text-white/60 hover:text-white transition-all">CLOSE</Button>
                            <Button
                                onClick={() => handleDownloadPDF(report)}
                                className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" /> DOWNLOAD PDF
                            </Button>
                            <Button asChild className="h-14 px-12 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                                <Link href="/dashboard/analysis" className="flex items-center gap-2">
                                    RE-SCAN <ChevronRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )
        } else {
            const report = reportToView as CbcReport;
            return (
                <AnalysisReportViewer
                    report={report as any}
                    isOpen={true}
                    onClose={() => setReportToView(null)}
                    reliabilityScore={validationResult?.reliabilityScore}
                    discrepancyAlert={validationResult?.discrepancyAlert}
                />
            )
        }
    }

    const renderValidationDialog = () => {
        return (
            <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
                <DialogContent className="bg-[#080808] border-white/10 rounded-[3rem] p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] max-w-xl">
                    <div className="p-12 space-y-10 relative z-10">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Clinical Validation</span>
                            </div>
                            <DialogTitle className="text-4xl font-light tracking-tighter text-white uppercase leading-tight">
                                Cross-Reference <span className="font-serif italic text-blue-400">Sync</span>
                            </DialogTitle>
                            <DialogDescription className="text-white/40 font-light text-base leading-relaxed">
                                Select an AI image analysis to correlate with the clinical CBC report.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="h-[400px] rounded-[2rem] border border-white/5 bg-white/[0.02] p-4">
                            <div className="space-y-3">
                                {imageHistory && imageHistory.map((item: ImageReport) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setValidationImageReport(item)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-6 rounded-2xl transition-all border group/item",
                                            validationImageReport?.id === item.id
                                                ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
                                                : "bg-transparent border-transparent hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                validationImageReport?.id === item.id ? "bg-primary/20" : "bg-white/5"
                                            )}>
                                                <Calendar className={cn("w-4 h-4", validationImageReport?.id === item.id ? "text-primary" : "text-white/20")} />
                                            </div>
                                            <div className="flex flex-col items-start space-y-1">
                                                <span className="text-sm font-bold text-white">{toDate(item.createdAt) ? format(toDate(item.createdAt)!, 'MMMM d, yyyy') : 'N/A'}</span>
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{toDate(item.createdAt) ? format(toDate(item.createdAt)!, 'h:mm a') : ''}</span>
                                            </div>
                                        </div>
                                        <Badge variant={getBadgeVariant(item.riskScore)} className="font-black text-[10px] tracking-widest uppercase px-3 py-1 rounded-lg border-none">
                                            {item.riskScore}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="p-10 bg-zinc-950/80 border-t border-white/5 flex justify-end gap-6 backdrop-blur-2xl">
                        <Button variant="ghost" onClick={() => setIsValidationDialogOpen(false)} className="h-14 px-10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/5 text-white/60 hover:text-white transition-all">CANCEL</Button>
                        <Button
                            onClick={handleValidation}
                            disabled={!validationImageReport}
                            className="h-14 px-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            RUN VALIDATION
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <>
            <div className="space-y-16" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {isPulling && (
                    <div className="flex justify-center py-4 text-primary">
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                )}
                {userSex === 'Female' && (cbcHistory && cbcHistory.length > 0 || cycleLogs && cycleLogs.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                    >
                        <MenstrualCycleCorrelator
                            labReports={cbcHistory ? cbcHistory.map((h: any) => ({ ...h, type: 'cbc' })) as any : []}
                            cycleLogs={cycleLogs ? cycleLogs as any : []}
                        />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                    className="relative group"
                >
                    {/* Background Glows */}
                    <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity duration-1000" />
                    <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[160px] opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity duration-1000" />

                    <div className="rounded-[3rem] glass-panel border-white/5 overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative z-10">
                        <div className="p-6 md:p-12 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[2rem] border border-white/10 flex items-center justify-center shadow-2xl">
                                    <History className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-light tracking-tight text-white">Diagnostic <span className="italic text-primary/80 font-bold">Archive</span></h3>
                                    <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.4em]">Database of past diagnostics</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden lg:flex flex-col items-end mr-4">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">ACTIVE</span>
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-2 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_100px_theme(colors.emerald.500)]" />
                                        Sync
                                    </span>
                                </div>
                                <div className="h-12 w-px bg-white/5 hidden md:block" />
                                <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-primary/60" />
                                    <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                                        {history.length} <span className="text-white/30 ml-1">Records</span>
                                    </span>
                                </div>
                                <button
                                    onClick={handleExportCSV}
                                    className="h-10 px-5 rounded-2xl glass-button border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                                >
                                    <FileDown className="w-3.5 h-3.5" /> Export CSV
                                </button>
                                {/* View Mode Toggle */}
                                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-white/5">
                                  <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="List view"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                  </button>
                                  <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Calendar view"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                  </button>
                                </div>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="px-4 py-4 md:px-12 md:py-6 border-b border-white/5">
                            <div className="glass-panel rounded-[2rem] p-4 flex flex-wrap gap-3 items-center">
                                {/* Search */}
                                <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-full px-4 py-2">
                                    <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by date or risk…"
                                        className="bg-transparent text-[11px] font-bold text-white/70 placeholder-white/20 outline-none w-full uppercase tracking-widest"
                                    />
                                </div>

                                {/* Divider */}
                                <div className="h-6 w-px bg-white/10 hidden sm:block" />

                                {/* Type filter */}
                                <div className="flex items-center gap-1.5">
                                    <Filter className="w-3 h-3 text-white/20 flex-shrink-0" />
                                    {(['all', 'image', 'cbc'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTypeFilter(t)}
                                            className={cn(
                                                'glass-button rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                                                typeFilter === t
                                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                                    : 'text-white/40 hover:text-white/70'
                                            )}
                                        >
                                            {t === 'all' ? 'All' : t === 'image' ? 'Image Scan' : 'CBC Report'}
                                        </button>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className="h-6 w-px bg-white/10 hidden sm:block" />

                                {/* Risk filter */}
                                <div className="flex items-center gap-1.5">
                                    {(['all', 'high', 'moderate', 'low'] as const).map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRiskFilter(r)}
                                            className={cn(
                                                'glass-button rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                                                riskFilter === r
                                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                                    : 'text-white/40 hover:text-white/70'
                                            )}
                                        >
                                            {r === 'all' ? 'All' : r === 'high' ? 'High Risk' : r === 'moderate' ? 'Moderate' : 'Low Risk'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-white/5 hover:bg-transparent h-20">
                                        <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20 px-4 md:px-12">Date</TableHead>
                                        <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Sequence Mode</TableHead>
                                        <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Diagnostic</TableHead>
                                        <TableHead className="text-right text-[11px] font-black uppercase tracking-[0.4em] text-white/20 px-4 md:px-12">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHistory.map(renderHistoryRow)}
                                </TableBody>
                            </Table>
                        </div>
                        ) : (
                          <div className="p-6 md:p-8">
                            <CalendarView records={filteredHistory} onViewReport={setReportToView} />
                          </div>
                        )}

                        <div className="p-12 bg-zinc-950/40 border-t border-white/5 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                            {history.length >= pageLimit ? (
                              <button
                                onClick={() => setPageLimit(prev => prev + 20)}
                                className="relative z-10 h-12 px-10 rounded-full glass-button border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                              >
                                Load More Records
                              </button>
                            ) : (
                              <p className="text-[11px] font-black text-white/10 uppercase tracking-[1em] relative z-10">
                                {filteredHistory.length} of {history.length} Records
                              </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {renderReportModal()}
            {renderValidationDialog()}

            {/* Compare floating bar */}
            {selectedIds.length > 0 && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-full glass-panel border border-primary/30 shadow-2xl backdrop-blur-xl">
                <span className="text-[11px] font-black uppercase tracking-widest text-primary">{selectedIds.length}/2 Selected</span>
                {selectedIds.length === 2 && (
                  <button
                    onClick={() => setIsCompareOpen(true)}
                    className="px-5 py-2 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Compare
                  </button>
                )}
                <button
                  onClick={() => setSelectedIds([])}
                  className="w-8 h-8 rounded-full glass-button border border-white/10 text-white/40 hover:text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Side-by-side comparison dialog */}
            {isCompareOpen && compareItems.length === 2 && (() => {
                const [a, b] = compareItems as ImageReport[];
                const fields: Array<{ label: string; aVal: string; bVal: string }> = [
                    { label: 'Date', aVal: toDate(a.createdAt) ? format(toDate(a.createdAt)!, 'PP') : 'N/A', bVal: toDate(b.createdAt) ? format(toDate(b.createdAt)!, 'PP') : 'N/A' },
                    { label: 'Risk Score', aVal: String(a.riskScore) + '/100', bVal: String(b.riskScore) + '/100' },
                    { label: 'Verdict', aVal: a.anemiaType || 'N/A', bVal: b.anemiaType || 'N/A' },
                    { label: 'Confidence', aVal: (a.confidenceScore || 0) + '%', bVal: (b.confidenceScore || 0) + '%' },
                    { label: 'Hgb', aVal: a.hemoglobin ? a.hemoglobin.toFixed(1) + ' g/dL' : 'N/A', bVal: b.hemoglobin ? b.hemoglobin.toFixed(1) + ' g/dL' : 'N/A' },
                ];
                return (
                    <Dialog open={true} onOpenChange={(open) => !open && setIsCompareOpen(false)}>
                        <DialogContent className="sm:max-w-3xl bg-[#080808] border-white/10 rounded-[3rem] p-0 overflow-hidden">
                            <div className="p-10 space-y-8">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-light tracking-tighter text-white">
                                        Side-by-Side <span className="italic text-primary">Comparison</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-white/40 text-xs uppercase tracking-widest">
                                        Comparing 2 selected scan records
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                    {fields.map(({ label, aVal, bVal }) => (
                                        <div key={label} className="grid grid-cols-[120px_1fr_1fr] gap-4 items-center py-3 border-b border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
                                            <span className={`text-sm font-bold text-center py-2 px-4 rounded-2xl ${label === 'Risk Score' && a.riskScore > b.riskScore ? 'text-red-400 bg-red-500/10' : 'text-white/80 bg-white/5'}`}>{aVal}</span>
                                            <span className={`text-sm font-bold text-center py-2 px-4 rounded-2xl ${label === 'Risk Score' && b.riskScore > a.riskScore ? 'text-red-400 bg-red-500/10' : 'text-white/80 bg-white/5'}`}>{bVal}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button variant="ghost" onClick={() => setIsCompareOpen(false)} className="rounded-2xl text-white/40 hover:text-white">Close</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                );
            })()}
        </>
    );
}
