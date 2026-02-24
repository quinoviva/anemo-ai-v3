
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
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

type ImageReport = PersonalizedRecommendationsOutput & {
  id: string;
  type: 'image';
  createdAt: {
    toDate: () => Date;
  };
  imageAnalysisSummary: string;
};

export type CbcReport = AnalyzeCbcReportOutput & {
    id: string;
    type: 'cbc';
    createdAt: {
      toDate: () => Date;
    };
    hospitalName?: string;
    doctorName?: string;
};

export type HistoryItem = ImageReport | CbcReport;

export function AnalysisHistory() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isGuest = user?.isAnonymous;
  const { toast } = useToast();
  const [reportToView, setReportToView] = useState<HistoryItem | null>(null);
  const [validationCbcReport, setValidationCbcReport] = useState<CbcReport | null>(null);
  const [validationImageReport, setValidationImageReport] = useState<ImageReport | null>(null);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{reliabilityScore: number, discrepancyAlert: boolean} | null>(null);
  const [userSex, setUserSex] = useState<string>('');


  const imageAnalysesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/imageAnalyses`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const labReportsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/labReports`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

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
    return combined.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
  }, [imageHistory, cbcHistory]);

  const getBadgeVariant = (riskScore: number) => {
    if (riskScore > 75) return 'destructive';
    if (riskScore > 50) return 'secondary';
    return 'default';
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
          hemoglobin: validationCbcReport.parameters.find(p => p.parameter.toLowerCase().includes('hemoglobin'))?.value || 'N/A',
          rbc: validationCbcReport.parameters.find(p => p.parameter.toLowerCase().includes('rbc'))?.value || 'N/A',
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
        <TableCell className="py-8 px-8">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <Calendar className="w-5 h-5 text-white/40 group-hover:text-primary/60 transition-colors" />
                </div>
                <div className="flex flex-col space-y-1">
                    <span className="text-base font-bold text-white tracking-tight">{item.createdAt ? format(item.createdAt.toDate(), 'MMMM d, yyyy') : 'N/A'}</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{item.createdAt ? format(item.createdAt.toDate(), 'h:mm a') : ''}</span>
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
        <TableCell className="text-right px-8">
            <div className="flex items-center justify-end gap-3">
                {!isImage && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/20 hover:text-blue-400 transition-all group/btn"
                        onClick={() => {
                            setValidationCbcReport(item as CbcReport);
                            setIsValidationDialogOpen(true);
                        }}
                    >
                        <ShieldCheck className="h-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        <span className="sr-only">Cross-Reference</span>
                    </Button>
                )}
                <Button 
                    variant="ghost" 
                    className="h-12 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all group/btn flex items-center gap-2"
                    onClick={() => setReportToView(item)}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest mr-2">Open Report</span>
                    <ArrowUpRight className="h-4 w-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Button>
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 group/btn"
                        >
                            <Trash2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
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
                            Calibration: {report.createdAt ? format(report.createdAt.toDate(), 'PPP, p') : ''}
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
                                    <Progress value={report.riskScore} className="h-1.5 bg-white/5"/>
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
                
                <div className="p-10 bg-zinc-950/80 border-t border-white/5 flex justify-end gap-6 backdrop-blur-2xl">
                    <Button variant="ghost" onClick={() => setReportToView(null)} className="h-14 px-10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/5 text-white/60 hover:text-white transition-all">CLOSE</Button>
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
                                            <span className="text-sm font-bold text-white">{format(item.createdAt.toDate(), 'MMMM d, yyyy')}</span>
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{format(item.createdAt.toDate(), 'h:mm a')}</span>
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
      <div className="space-y-16">
        {userSex === 'Female' && (cbcHistory && cbcHistory.length > 0 || cycleLogs && cycleLogs.length > 0) && (
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            >
                <MenstrualCycleCorrelator 
                    labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
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
                <div className="p-12 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[2rem] border border-white/10 flex items-center justify-center shadow-2xl">
                            <History className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-light tracking-tight text-white uppercase">Diagnostic <span className="font-serif italic text-primary/80">Archive</span></h3>
                            <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.4em]">Historical Clinical Intelligence Engine</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Temporal Status</span>
                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_100px_theme(colors.emerald.500)]" />
                                Synchronized
                            </span>
                        </div>
                        <div className="h-12 w-px bg-white/5 hidden md:block" />
                        <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                            <Activity className="w-4 h-4 text-primary/60" />
                            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                                {history.length} <span className="text-white/30 ml-1">Records</span>
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/5 hover:bg-transparent h-20">
                                <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20 px-12">Temporal Identifier</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Sequence Mode</TableHead>
                                <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Diagnostic Payload</TableHead>
                                <TableHead className="text-right text-[11px] font-black uppercase tracking-[0.4em] text-white/20 px-12">Action Core</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map(renderHistoryRow)}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="p-12 bg-zinc-950/40 border-t border-white/5 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    <p className="text-[11px] font-black text-white/10 uppercase tracking-[1em] relative z-10">End of Historical Data Stream</p>
                </div>
            </div>
        </motion.div>
    </div>
      
      {renderReportModal()}
      {renderValidationDialog()}
    </>
  );
}
