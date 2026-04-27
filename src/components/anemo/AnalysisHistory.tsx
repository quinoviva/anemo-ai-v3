
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
import { AnalysisReportViewer } from './AnalysisReportViewer';
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
    fullAnalysis?: string;
    hemoglobin?: number;
    notes?: string;
    thumbnails?: { part: string; data: string }[];
    riskIndex?: number;
    modelResults?: any[];
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

/** Safely converts Firestore Timestamp or Date to a string (ISO format) */
function toISOString(ts: { toDate: () => Date } | Date | null | undefined): string | null {
    if (!ts) return null;
    if (ts instanceof Date) return ts.toISOString();
    if (typeof (ts as any).toDate === 'function') return (ts as any).toDate().toISOString();
    return null;
}

/** Converts Firestore Timestamp fields to ISO strings for server function serialization */
function sanitizeForServer(obj: Record<string, any>): Record<string, any> {
    if (!obj) return {};
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            sanitized[key] = null;
        } else if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
            sanitized[key] = toISOString(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map((item: any) => {
                if (item && typeof item === 'object' && typeof item.toDate === 'function') {
                    return toISOString(item);
                }
                return item;
            });
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeForServer(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{monthName}</h3>
                <button onClick={nextMonth} className="p-2 rounded-xl glass-button border-primary/10 hover:border-primary/30 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
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
                            className={`aspect-square flex flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-bold transition-all ${dayRecords?.length
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
            <div className="flex items-center gap-4 pt-2 border-t border-border/50">
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
                    const img = item as ImageReport;
                    const score = img.riskIndex ?? img.riskScore;
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
                const img = item.type === 'image' ? (item as ImageReport) : null;
                const riskStr = img ? String(img.riskIndex ?? img.riskScore) : ((item as CbcReport).summary ?? '').toLowerCase();
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

    const getSeverityColors = useCallback((anemiaType: string) => {
        const lower = (anemiaType || '').toLowerCase();
        if (lower.includes('none') || lower.includes('normal'))
            return { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' };
        if (lower.includes('mild'))
            return { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' };
        if (lower.includes('moderate'))
            return { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' };
        if (lower.includes('severe') || lower.includes('critical'))
            return { badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' };
        return { badge: 'bg-primary/15 text-primary border-primary/30', dot: 'bg-primary' };
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
        pdf.text('ANEMO — DIAGNOSTIC REPORT', margin, 12);
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
            const rScore = img.riskIndex ?? img.riskScore;

            // Risk score box
            pdf.setFillColor(255, 245, 245);
            pdf.roundedRect(margin, y, pageW - margin * 2, 28, 4, 4, 'F');
            pdf.setTextColor(220, 38, 38);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ANEMIA RISK INDEX', margin + 6, y + 8);
            pdf.setFontSize(28);
            pdf.text(String(rScore), margin + 6, y + 22);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            const verdict = rScore > 75 ? 'Critical' : rScore > 50 ? 'Moderate Risk' : 'Normal Range';
            pdf.text(verdict, margin + 40, y + 22);
            pdf.text(`Confidence: ${img.confidenceScore || 0}%`, pageW - margin - 40, y + 22, { align: 'right' });
            y += 38;

            if (img.thumbnails && img.thumbnails.length > 0) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(30, 30, 30);
                pdf.text('Uploaded Scans', margin, y);
                y += 6;
                const thumbW = 35;
                const thumbH = 35;
                let currentX = margin;
                img.thumbnails.forEach((thumb) => {
                    if (thumb.data) {
                        try {
                            pdf.addImage(thumb.data, 'JPEG', currentX, y, thumbW, thumbH);
                            pdf.setFontSize(7);
                            pdf.text(thumb.part.toUpperCase(), currentX, y + thumbH + 4);
                            currentX += thumbW + 10;
                        } catch (e) {
                            console.warn('Failed to attach thumbnail to PDF', e);
                        }
                    }
                });
                y += thumbH + 12;
            }

            // Analysis summary
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            pdf.text('Observations', margin, y);
            y += 6;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(70, 70, 70);
            const summaryLines = pdf.splitTextToSize(img.fullAnalysis || img.imageAnalysisSummary || '', pageW - margin * 2);
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
        pdf.text('ANEMO — For screening purposes only. Not a medical diagnosis. Consult a licensed healthcare professional.', pageW / 2, pageH - 11, { align: 'center' });
        pdf.text(`anemo.ai · ${format(new Date(), 'yyyy')}`, pageW / 2, pageH - 6, { align: 'center' });

        pdf.save(`anemo-report-${item.id.substring(0, 8)}-${format(toDate(item.createdAt) ?? new Date(), 'yyyyMMdd')}.pdf`);
        toast({ title: 'Report Downloaded', description: 'Your Anemo report has been saved as PDF.' });
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
                    String(img.riskIndex ?? img.riskScore),
                    img.anemiaType || '',
                    String(img.confidenceScore || 0) + '%',
                    img.hemoglobin ? String(img.hemoglobin.toFixed(1)) : '',
                    (img.fullAnalysis || img.imageAnalysisSummary || '').replace(/,/g, ';').replace(/\n/g, ' '),
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
            const medicalInfo = sanitizeForServer(userData?.medicalInfo || {});

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
                className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 md:space-y-12 p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] glass-panel border-primary/10 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                    <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-muted border border-border flex items-center justify-center backdrop-blur-xl shadow-2xl">
                        <LogIn className="h-8 w-8 md:h-12 md:w-12 text-primary" />
                    </div>
                </div>
                <div className="space-y-6 max-w-md relative z-10">
                    <h3 className="text-2xl md:text-4xl font-light tracking-tighter text-foreground">
                        Guest <span className="font-serif italic text-primary">Protocol</span> Active
                    </h3>
                    <p className="text-muted-foreground text-lg font-light leading-relaxed">
                        Historical diagnostic data is only persistent for authenticated sessions. Create an account to track your health intelligence over time with our neural diagnostic suite.
                    </p>
                </div>
                <Button asChild className="h-12 px-8 md:h-16 md:px-12 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_20px_40px_rgba(var(--primary),0.3)] hover:scale-105 transition-all">
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
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">Diagnostic Cloud Interface</p>
                </div>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 md:space-y-12 p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] glass-panel border-border/50 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none" />
                <div className="w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-muted border border-border flex items-center justify-center text-muted-foreground/30 backdrop-blur-xl shadow-2xl">
                    <Search className="h-8 w-8 md:h-12 md:w-12" />
                </div>
                <div className="space-y-6 max-w-md relative z-10">
                    <h3 className="text-2xl md:text-4xl font-light tracking-tighter text-foreground">
                        Archive <span className="font-serif italic text-muted-foreground">Empty</span>
                    </h3>
                    <p className="text-muted-foreground text-lg font-light leading-relaxed">
                        No diagnostic records found in your profile. Initiate a scan to start building your health history and unlock longitudinal insights.
                    </p>
                </div>
                <Button asChild className="h-12 px-8 md:h-16 md:px-12 rounded-full bg-foreground text-background font-black uppercase tracking-[0.3em] text-[11px] shadow-lg hover:scale-105 transition-all">
                    <Link href="/dashboard/analysis">
                        START NEW SCAN
                    </Link>
                </Button>
            </motion.div>
        );
    }

    const renderHistoryCard = (item: HistoryItem) => {
        const isImage = item.type === 'image';
        const date = toDate(item.createdAt);
        const severityColors = isImage
            ? getSeverityColors((item as ImageReport).anemiaType || '')
            : { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' };
        const hgbMatch = isImage
            ? (item as ImageReport).imageAnalysisSummary?.match(/(\d+\.?\d*)\s*g\/dL/i)
            : null;

        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-panel rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden group border border-border/50 hover:border-primary/20 transition-all duration-300"
            >
                {/* Top row: date + type badge */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-foreground/5 border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors flex-shrink-0">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground leading-tight">
                                {date ? format(date, 'MMM d, yyyy') : 'N/A'}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                {date ? format(date, 'h:mm a') : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            disabled={!isImage}
                            className="w-3.5 h-3.5 rounded accent-primary cursor-pointer disabled:opacity-20 flex-shrink-0"
                            title={isImage ? 'Select for comparison' : 'Only image scans can be compared'}
                        />
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                            isImage ? 'bg-primary/10 text-primary border-primary/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        )}>
                            {isImage ? 'Image Scan' : 'CBC'}
                        </span>
                    </div>
                </div>

                {/* Middle: severity badge + hgb (image) or summary (cbc) */}
                <div className="flex flex-col gap-2">
                    {isImage ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                                "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border",
                                severityColors.badge
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", severityColors.dot)} />
                                {(item as ImageReport).anemiaType || 'Unknown'}
                            </span>
                            {hgbMatch && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    Hgb {hgbMatch[0]}
                                </span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary ml-auto flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                Conf. {(item as ImageReport).confidenceScore || 0}%
                            </span>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {(item as CbcReport).summary}
                        </p>
                    )}
                </div>

                {/* Middle: Confidence score (image) or summary (cbc) */}
                <div className="flex flex-col gap-2">
                    {isImage && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 italic">
                            {(item as ImageReport).fullAnalysis || (item as ImageReport).imageAnalysisSummary}
                        </p>
                    )}
                </div>

                {/* Notes preview */}
                {(item as any).notes && (
                    <p className="text-[10px] text-muted-foreground/60 italic px-3 py-2 rounded-xl bg-foreground/[0.02] border border-border/50 truncate">
                        &ldquo;{(item as any).notes}&rdquo;
                    </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {/* View */}
                    <Button
                        variant="ghost"
                        className="flex-1 h-9 rounded-2xl bg-foreground/5 border border-border hover:bg-foreground/10 hover:text-foreground transition-all flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setReportToView(item)}
                    >
                        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">View</span>
                    </Button>

                    {/* PDF */}
                    <Button
                        variant="ghost"
                        className="flex-1 h-9 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/15 hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => handleDownloadPDF(item)}
                    >
                        <Download className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">PDF</span>
                    </Button>

                    {/* CBC cross-reference */}
                    {!isImage && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/20 hover:text-blue-400 transition-all"
                            onClick={() => {
                                setValidationCbcReport(item as CbcReport);
                                setIsValidationDialogOpen(true);
                            }}
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span className="sr-only">Cross-Reference</span>
                        </Button>
                    )}

                    {/* Add/Edit Note */}
                    {editingNoteId === item.id ? (
                        <div className="flex items-center gap-1">
                            <input
                                autoFocus
                                value={noteValue}
                                onChange={e => setNoteValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveNote(item.id, isImage ? 'image' : 'cbc');
                                    if (e.key === 'Escape') { setEditingNoteId(null); setNoteValue(''); }
                                }}
                                placeholder="Add note…"
                                className="h-9 w-28 px-3 rounded-2xl bg-foreground/5 border border-border text-xs text-foreground/80 placeholder-muted-foreground outline-none focus:border-primary/40"
                                maxLength={120}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                onClick={() => handleSaveNote(item.id, isImage ? 'image' : 'cbc')}
                            >
                                <Check className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            title={(item as any).notes || 'Add note'}
                            className="h-9 w-9 rounded-2xl glass-button border border-border hover:border-primary/30 hover:text-primary transition-all"
                            onClick={() => { setEditingNoteId(item.id); setNoteValue((item as any).notes || ''); }}
                        >
                            <StickyNote className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    {/* Delete */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border rounded-[2rem] md:rounded-[3rem] p-6 md:p-12">
                            <AlertDialogHeader className="space-y-4">
                                <AlertDialogTitle className="text-2xl md:text-4xl font-light tracking-tighter text-foreground uppercase">
                                    Purge <span className="font-serif italic text-red-500">Record</span>?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground text-lg font-light leading-relaxed">
                                    This action is irreversible. The selected diagnostic intelligence will be permanently removed from your profile&apos;s historical evolution.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6 md:mt-12 gap-4">
                                <AlertDialogCancel className="h-10 px-5 md:h-14 md:px-8 rounded-2xl border-border bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs uppercase tracking-widest transition-all">CANCEL</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDelete(item.id, isImage ? 'image' : 'cbc')}
                                    className="h-10 px-6 md:h-14 md:px-10 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/20 transition-all"
                                >
                                    PURGE INTELLIGENCE
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </motion.div>
        );
    }

    const renderReportModal = () => {
        if (!reportToView) return null;
        if (reportToView.type === 'image') {
            const report = reportToView as ImageReport;
            const hgb = report.hemoglobin || 12.0;
            const hgbPercent = Math.min(100, Math.max(0, ((hgb - 5) / 11) * 100));
            const severityColor = getSeverityColors(report.anemiaType || 'Normal');
            
            return (
                <Dialog open={true} onOpenChange={(open) => !open && setReportToView(null)}>
                    <DialogContent className="w-[95vw] sm:max-w-4xl bg-card border-border rounded-[2rem] md:rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                        {/* Decorative Backgrounds */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/10 rounded-full blur-[100px] md:blur-[140px] -mr-32 -mt-32 md:-mr-64 md:-mt-64 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-rose-500/10 rounded-full blur-[100px] md:blur-[140px] -ml-32 -mb-32 md:-ml-64 md:-mb-64 pointer-events-none" />

                        <div className="p-4 md:p-12 space-y-4 md:space-y-10 relative z-10 flex flex-col h-[90vh] md:h-auto max-h-[90vh]">
                            <DialogHeader className="space-y-3 md:space-y-4 shrink-0">
                                <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2">
                                    <div className="p-2 md:p-3 bg-primary/10 rounded-xl md:rounded-2xl border border-primary/20">
                                        <Activity className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-primary">Neural Diagnostic Analysis</span>
                                        <DialogDescription className="text-muted-foreground/50 font-bold uppercase tracking-[0.3em] text-[9px] md:text-[10px] mt-1">
                                            Archive ID: {report.id.substring(0, 12)}
                                        </DialogDescription>
                                    </div>
                                </div>
                                <DialogTitle className="text-xl md:text-5xl font-light tracking-tighter text-foreground leading-none">
                                    Analysis <span className="font-serif italic text-primary">Result</span>
                                </DialogTitle>
                                <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[9px] md:text-[11px]">
                                    Documented: {toDate(report.createdAt) ? format(toDate(report.createdAt)!, 'PPP, p') : ''}
                                </p>
                            </DialogHeader>

                            <ScrollArea className="flex-1 -mx-4 px-4 md:-mx-12 md:px-12 pr-4 md:pr-10">
                                <div className="space-y-5 md:space-y-10 pb-8">
                                    
                                    {/* ── Hemoglobin card ──────────────────────────────────────────────── */}
                                    <div className="glass-panel rounded-[2rem] p-6 md:p-8 space-y-6 md:space-y-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <TrendingUp className="w-16 h-16 text-primary" />
                                        </div>
                                        
                                        <div className="flex items-center justify-between flex-wrap gap-6 relative z-10">
                                            <div className="space-y-2">
                                                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.3em] font-black">
                                                    Estimated Hemoglobin
                                                </p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-5xl md:text-7xl font-light text-primary tracking-tighter leading-none">
                                                        {hgb.toFixed(1)}
                                                    </span>
                                                    <span className="text-lg md:text-2xl text-muted-foreground font-light">g/dL</span>
                                                </div>
                                            </div>
                                            <div className="text-right space-y-3">
                                                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.3em] font-black">
                                                    Severity Status
                                                </p>
                                                <Badge className={cn('text-xs md:text-sm px-5 py-2 border rounded-full font-black uppercase tracking-widest shadow-lg', severityColor.badge)}>
                                                    {report.anemiaType || 'Normal'}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Hgb scale bar */}
                                        <div className="space-y-3">
                                            <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${hgbPercent}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] md:text-[10px] text-muted-foreground font-mono uppercase tracking-widest font-bold">
                                                <span>5 g/dL</span>
                                                <span className="text-primary/60">Target ≥ 12</span>
                                                <span>16 g/dL</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* HUD Stats Row */}
                                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                                        <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-foreground/[0.03] border border-border/50 backdrop-blur-3xl flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <span className="text-[9px] md:text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em]">Confidence</span>
                                                <div className="text-2xl md:text-4xl font-light text-foreground tracking-tighter leading-none flex items-baseline gap-1">
                                                    {report.confidenceScore || 0}<span className="text-base md:text-lg text-muted-foreground/50">%</span>
                                                </div>
                                            </div>
                                            <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-primary/30 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-foreground/[0.03] border border-border/50 backdrop-blur-3xl flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <span className="text-[9px] md:text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em]">Risk Index</span>
                                                <div className="text-2xl md:text-4xl font-light text-foreground tracking-tighter leading-none flex items-baseline gap-1">
                                                    {report.riskIndex ?? report.riskScore}<span className="text-base md:text-lg text-muted-foreground/50">/100</span>
                                                </div>
                                            </div>
                                            <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-rose-500/30 group-hover:text-rose-500 transition-colors" />
                                        </div>
                                    </div>

                                    {/* Visual Markers */}
                                    {report.thumbnails && report.thumbnails.length > 0 && (
                                        <div className="space-y-4 md:space-y-6">
                                            <h4 className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] ml-2 md:ml-4 flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                Visual Neural Markers
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                                {report.thumbnails.map((thumb, idx) => (
                                                    <div key={idx} className="glass-panel glass-panel-hover rounded-2xl md:rounded-[1.5rem] p-3 md:p-4 flex items-center gap-4 group">
                                                        <div className="relative shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden border border-border bg-black shadow-lg">
                                                            <img src={thumb.data} alt={thumb.part} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary mb-1">{thumb.part}</p>
                                                            <p className="text-[9px] md:text-[10px] text-muted-foreground leading-tight uppercase font-bold tracking-tighter">Verified Scan Area</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Interpretation */}
                                    <div className="space-y-4 pt-2 md:pt-4">
                                        <h4 className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] md:tracking-[0.4em] ml-2 md:ml-4 flex items-center gap-2 md:gap-3">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-muted-foreground/50" />
                                            Clinical Interpretation
                                        </h4>
                                        <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-foreground/[0.02] border border-border/50 text-xs md:text-lg font-light text-muted-foreground leading-relaxed italic backdrop-blur-xl relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                                            "{report.fullAnalysis || report.imageAnalysisSummary}"
                                        </div>
                                    </div>

                                    {/* Ensemble breakdown */}
                                    {report.modelResults && report.modelResults.length > 0 && (
                                        <div className="space-y-4 pt-2 md:pt-4">
                                            <h4 className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] md:tracking-[0.4em] ml-2 md:ml-4 flex items-center gap-2 md:gap-3">
                                                <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-muted-foreground/50" />
                                                10-Model Ensemble Performance
                                            </h4>
                                            <div className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-foreground/[0.01] border border-border/50 backdrop-blur-xl">
                                                <div className="grid grid-cols-1 gap-3">
                                                    {report.modelResults
                                                        .filter((r: any) => r.contributedToConsensus)
                                                        .map((r: any) => (
                                                            <div key={r.modelId} className="flex items-center gap-4">
                                                                <span className="text-[9px] font-mono text-muted-foreground w-6 text-right shrink-0">T{r.tier}</span>
                                                                <span className="text-[10px] md:text-xs flex-1 truncate font-bold text-foreground/80">{r.modelName}</span>
                                                                <div className="w-20 md:w-32 h-1 rounded-full bg-muted/30 overflow-hidden shrink-0">
                                                                    <div className="h-full bg-primary/40 rounded-full" style={{ width: `${Math.round(r.confidence * 100)}%` }} />
                                                                </div>
                                                                <span className="text-[9px] md:text-[10px] font-mono font-black text-primary w-10 text-right">{r.estimatedHgb.toFixed(1)}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Confidence & Math sections grouped */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Confidence Reasoning */}
                                        {report.confidenceReasoning && (
                                            <div className="space-y-4">
                                                <h4 className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] md:tracking-[0.4em] ml-4 flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                                    Neural Reasoning
                                                </h4>
                                                <div className="p-5 rounded-[1.5rem] bg-foreground/[0.01] border border-border/50 h-full backdrop-blur-xl">
                                                    <p className="text-[10px] md:text-xs text-muted-foreground/80 leading-relaxed font-mono whitespace-pre-wrap">{report.confidenceReasoning}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Diagnostic Mathematics */}
                                        <div className="space-y-4">
                                            <h4 className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] md:tracking-[0.4em] ml-4 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                                Diagnostic Math
                                            </h4>
                                            <div className="p-5 rounded-[1.5rem] bg-foreground/[0.01] border border-border/50 h-full backdrop-blur-xl space-y-4">
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Risk Calculation</p>
                                                    <p className="text-[10px] font-mono text-foreground/70">((16 - Hgb) / 11) × 100</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Ensemble Mean</p>
                                                    <p className="text-[10px] font-mono text-foreground/70">Σ(Specialist Est.) / N</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Clinical Protocols */}
                                    <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
                                        <h4 className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] md:tracking-[0.4em] ml-2 md:ml-4 flex items-center gap-2 md:gap-3">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-primary" />
                                            Clinical Protocols
                                        </h4>
                                        <div className="rounded-[1.5rem] md:rounded-[2rem] border border-primary/20 bg-primary/5 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <ShieldCheck className="w-12 h-12 text-primary" />
                                            </div>
                                            <p className="text-xs md:text-lg text-foreground/90 leading-relaxed font-medium whitespace-pre-wrap relative z-10">{report.recommendations}</p>
                                        </div>
                                    </div>

                                    {/* Disclaimer */}
                                    <p className="text-[9px] md:text-[10px] text-muted-foreground/50 text-center leading-relaxed px-4 pt-4 border-t border-border/50">
                                        This screen is generated by Anemo AI for non-invasive screening only and does not
                                        constitute a medical diagnosis. Consult a licensed healthcare professional.
                                    </p>
                                </div>
                            </ScrollArea>

                            {/* Footer Buttons */}
                            <div className="pt-3 md:pt-6 border-t border-border/50 shrink-0 flex justify-end gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
                                <Button variant="ghost" onClick={() => setReportToView(null)} className="h-10 px-4 md:h-14 md:px-10 rounded-[1rem] md:rounded-[1.2rem] font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all flex-1 sm:flex-none">
                                    CLOSE
                                </Button>
                                <Button
                                    onClick={() => handleDownloadPDF(report)}
                                    className="h-10 px-3 md:h-14 md:px-8 rounded-[1rem] md:rounded-[1.2rem] bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 transition-all flex items-center gap-2 flex-1 sm:flex-none"
                                >
                                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="inline">PDF</span>
                                </Button>
                                <Button asChild className="h-10 px-4 md:h-14 md:px-10 rounded-[1rem] md:rounded-[1.2rem] bg-primary text-primary-foreground font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all flex-1 sm:flex-none">
                                    <Link href="/dashboard/analysis" className="flex items-center gap-2 justify-center">
                                        RE-SCAN <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            );
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
            );
        }
    }

    const renderValidationDialog = () => {
        return (
            <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
                <DialogContent className="bg-card border-border rounded-[3rem] p-0 overflow-hidden shadow-2xl max-w-xl">
                    <div className="p-5 md:p-12 space-y-6 md:space-y-10 relative z-10">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Clinical Validation</span>
                            </div>
                            <DialogTitle className="text-2xl md:text-4xl font-light tracking-tighter text-foreground uppercase leading-tight">
                                Cross-Reference <span className="font-serif italic text-blue-400">Sync</span>
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground font-light text-base leading-relaxed">
                                Select an AI image analysis to correlate with the clinical CBC report.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="h-[400px] rounded-[2rem] border border-border/50 bg-foreground/[0.02] p-4">
                            <div className="space-y-3">
                                {imageHistory && imageHistory.map((item: ImageReport) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setValidationImageReport(item)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-6 rounded-2xl transition-all border group/item",
                                            validationImageReport?.id === item.id
                                                ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
                                                : "bg-transparent border-transparent hover:bg-foreground/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                validationImageReport?.id === item.id ? "bg-primary/20" : "bg-foreground/5"
                                            )}>
                                                <Calendar className={cn("w-4 h-4", validationImageReport?.id === item.id ? "text-primary" : "text-muted-foreground/50")} />
                                            </div>
                                            <div className="flex flex-col items-start space-y-1">
                                                <span className="text-sm font-bold text-foreground">{toDate(item.createdAt) ? format(toDate(item.createdAt)!, 'MMMM d, yyyy') : 'N/A'}</span>
                                                <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">{toDate(item.createdAt) ? format(toDate(item.createdAt)!, 'h:mm a') : ''}</span>
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

                    <div className="p-4 md:p-10 bg-card/80 border-t border-border/50 flex justify-end gap-3 md:gap-6 backdrop-blur-2xl">
                        <Button variant="ghost" onClick={() => setIsValidationDialogOpen(false)} className="h-10 px-6 md:h-14 md:px-10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all">CANCEL</Button>
                        <Button
                            onClick={handleValidation}
                            disabled={!validationImageReport}
                            className="h-10 px-6 md:h-14 md:px-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
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

                    <div className="rounded-[3rem] glass-panel border-border/50 overflow-hidden shadow-2xl relative z-10">
                        <div className="p-6 md:p-12 border-b border-border/50 bg-foreground/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/80 rounded-[2rem] border border-border flex items-center justify-center shadow-2xl">
                                    <History className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-light tracking-tight text-foreground">Diagnostic <span className="italic text-primary/80 font-bold">Archive</span></h3>
                                    <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.4em]">Database of past diagnostics</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden lg:flex flex-col items-end mr-4">
                                    <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">ACTIVE</span>
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-2 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_100px_theme(colors.emerald.500)]" />
                                        Sync
                                    </span>
                                </div>
                                <div className="h-12 w-px bg-border/50 hidden md:block" />
                                <div className="px-6 py-3 rounded-2xl bg-foreground/5 border border-border flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-primary/60" />
                                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                        {history.length} <span className="text-muted-foreground/50 ml-1">Records</span>
                                    </span>
                                </div>
                                <button
                                    onClick={handleExportCSV}
                                    className="h-10 px-5 rounded-2xl glass-button border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                                >
                                    <FileDown className="w-3.5 h-3.5" /> Export CSV
                                </button>
                                {/* View Mode Toggle */}
                                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        title="List view"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        title="Calendar view"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="px-4 py-4 md:px-12 md:py-6 border-b border-border/50">
                            <div className="glass-panel rounded-[2rem] p-4 flex flex-wrap gap-3 items-center">
                                {/* Search */}
                                <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-foreground/5 border border-border rounded-full px-4 py-2">
                                    <Search className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by date or risk…"
                                        className="bg-transparent text-[11px] font-bold text-foreground/70 placeholder-muted-foreground outline-none w-full uppercase tracking-widest"
                                    />
                                </div>

                                {/* Divider */}
                                <div className="h-6 w-px bg-border hidden sm:block" />

                                {/* Type filter */}
                                <div className="flex items-center gap-1.5">
                                    <Filter className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                                    {(['all', 'image', 'cbc'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTypeFilter(t)}
                                            className={cn(
                                                'glass-button rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                                                typeFilter === t
                                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                                    : 'text-muted-foreground hover:text-foreground/70'
                                            )}
                                        >
                                            {t === 'all' ? 'All' : t === 'image' ? 'Image Scan' : 'CBC Report'}
                                        </button>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className="h-6 w-px bg-border hidden sm:block" />

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
                                                    : 'text-muted-foreground hover:text-foreground/70'
                                            )}
                                        >
                                            {r === 'all' ? 'All' : r === 'high' ? 'High Risk' : r === 'moderate' ? 'Moderate' : 'Low Risk'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {viewMode === 'table' ? (
                            <div className="p-4 md:p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredHistory.map(item => renderHistoryCard(item))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 md:p-8">
                                <CalendarView records={filteredHistory} onViewReport={setReportToView} />
                            </div>
                        )}

                        <div className="p-12 bg-card/40 border-t border-border/50 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/[0.04] to-transparent pointer-events-none" />
                            {history.length >= pageLimit ? (
                                <button
                                    onClick={() => setPageLimit(prev => prev + 20)}
                                    className="relative z-10 h-12 px-10 rounded-full glass-button border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                                >
                                    Load More Records
                                </button>
                            ) : (
                                <p className="text-[11px] font-black text-muted-foreground/30 uppercase tracking-[1em] relative z-10">
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
                        className="w-8 h-8 rounded-full glass-button border border-border text-muted-foreground hover:text-foreground flex items-center justify-center"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Side-by-side comparison dialog */}
            {isCompareOpen && compareItems.length === 2 && (() => {
                const [itemA, itemB] = compareItems;
                const isImageA = itemA.type === 'image';
                const isImageB = itemB.type === 'image';
                const imgA = isImageA ? (itemA as ImageReport) : null;
                const imgB = isImageB ? (itemB as ImageReport) : null;
                const cbcA = !isImageA ? (itemA as CbcReport) : null;
                const cbcB = !isImageB ? (itemB as CbcReport) : null;

                const getLabel = (item: HistoryItem) => item.type === 'image' ? 'Image Scan' : 'CBC Report';
                const getVerdict = (item: HistoryItem) => item.type === 'image' ? (item as ImageReport).anemiaType || 'N/A' : (item as CbcReport).summary?.slice(0, 40) || 'N/A';
                const getConfidence = (item: HistoryItem) => item.type === 'image' ? `${(item as ImageReport).confidenceScore || 0}%` : 'N/A';
                const getRisk = (item: HistoryItem) => item.type === 'image' ? `${(item as ImageReport).riskScore}/100` : 'N/A';
                const getRiskNum = (item: HistoryItem) => item.type === 'image' ? ((item as ImageReport).riskScore || 0) : 0;
                const getHgb = (item: HistoryItem) => item.type === 'image' && (item as ImageReport).hemoglobin ? `${(item as ImageReport).hemoglobin!.toFixed(1)} g/dL` : 'N/A';

                const fields: Array<{ label: string; aVal: string; bVal: string; highlight?: boolean }> = [
                    { label: 'Date', aVal: toDate(itemA.createdAt) ? format(toDate(itemA.createdAt)!, 'PP') : 'N/A', bVal: toDate(itemB.createdAt) ? format(toDate(itemB.createdAt)!, 'PP') : 'N/A' },
                    { label: 'Type', aVal: getLabel(itemA), bVal: getLabel(itemB) },
                    { label: 'Verdict', aVal: getVerdict(itemA), bVal: getVerdict(itemB) },
                    { label: 'Risk Score', aVal: getRisk(itemA), bVal: getRisk(itemB), highlight: true },
                    { label: 'Confidence', aVal: getConfidence(itemA), bVal: getConfidence(itemB) },
                    { label: 'Hgb', aVal: getHgb(itemA), bVal: getHgb(itemB) },
                ];
                return (
                    <Dialog open={true} onOpenChange={(open) => !open && setIsCompareOpen(false)}>
                        <DialogContent className="sm:max-w-3xl bg-card border-border rounded-[3rem] p-0 overflow-hidden">
                            <div className="p-5 md:p-10 space-y-6 md:space-y-8">
                                <DialogHeader>
                                    <DialogTitle className="text-xl md:text-3xl font-light tracking-tighter text-foreground">
                                        Side-by-Side <span className="italic text-primary">Comparison</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-xs uppercase tracking-widest">
                                        Comparing 2 selected records
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                    {fields.map(({ label, aVal, bVal, highlight }) => (
                                        <div key={label} className="grid grid-cols-[80px_1fr_1fr] md:grid-cols-[120px_1fr_1fr] gap-2 md:gap-4 items-center py-3 border-b border-border/50">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
                                            <span className={`text-sm font-bold text-center py-2 px-4 rounded-2xl ${highlight && getRiskNum(itemA) > getRiskNum(itemB) ? 'text-red-400 bg-red-500/10' : 'text-foreground/80 bg-foreground/5'}`}>{aVal}</span>
                                            <span className={`text-sm font-bold text-center py-2 px-4 rounded-2xl ${highlight && getRiskNum(itemB) > getRiskNum(itemA) ? 'text-red-400 bg-red-500/10' : 'text-foreground/80 bg-foreground/5'}`}>{bVal}</span>
                                        </div>
                                    ))}
                                </div>
                                {(cbcA || cbcB) && (
                                    <div className="text-xs text-muted-foreground/60 text-center">
                                        CBC reports show summary text. Image scans show full numeric comparison.
                                    </div>
                                )}
                                <div className="flex justify-end">
                                    <Button variant="ghost" onClick={() => setIsCompareOpen(false)} className="rounded-2xl text-muted-foreground hover:text-foreground">Close</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                );
            })()}
        </>
    );
}
