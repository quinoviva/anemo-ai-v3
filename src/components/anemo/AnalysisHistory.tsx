
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-8">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center">
                <LogIn className="h-10 w-10 text-primary" />
            </div>
        </div>
        <div className="space-y-3 max-w-sm">
          <h3 className="text-2xl font-black uppercase tracking-widest text-white">Guest Protocol Active</h3>
          <p className="text-white/40 text-sm font-medium leading-relaxed">
            Historical diagnostic data is only persistent for authenticated sessions. Create an account to track your health intelligence over time.
          </p>
        </div>
        <Button asChild className="h-12 px-10 rounded-full bg-primary text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/20">
          <Link href="/signup">
            INITIALIZE ACCOUNT
          </Link>
        </Button>
      </div>
    );
  }

  if (imageIsLoading || cbcIsLoading) {
    return (
      <div className="flex flex-col h-[400px] w-full items-center justify-center space-y-4">
        <AnemoLoading />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse">Syncing Diagnostic Cloud</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-8">
        <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white/20">
            <Search className="h-10 w-10" />
        </div>
        <div className="space-y-3 max-w-sm">
          <h3 className="text-2xl font-black uppercase tracking-widest text-white">Vault is Empty</h3>
          <p className="text-white/40 text-sm font-medium leading-relaxed">
            No diagnostic records found in your profile. Initiate a scan to start building your health history.
          </p>
        </div>
        <Button asChild className="h-12 px-10 rounded-full bg-primary text-black font-black uppercase tracking-[0.2em] text-[10px]">
          <Link href="/dashboard/analysis">
            START NEW SCAN
          </Link>
        </Button>
      </div>
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
        className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors"
      >
        <TableCell className="py-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white/40" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{item.createdAt ? format(item.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}</span>
                    <span className="text-[10px] font-medium text-white/30 uppercase tracking-tighter">{item.createdAt ? format(item.createdAt.toDate(), 'p') : ''}</span>
                </div>
            </div>
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isImage ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    {isImage ? 'AI Visual Scan' : 'Clinical Report'}
                </span>
            </div>
        </TableCell>
        <TableCell>
            {isImage ? (
                <div className="flex items-center gap-3">
                    <Badge variant={getBadgeVariant((item as ImageReport).riskScore)} className="rounded-md font-black px-2 py-0.5 text-[10px] tracking-tighter">
                        RISK: {(item as ImageReport).riskScore}
                    </Badge>
                    <span className="text-xs font-medium text-white/40 truncate max-w-[200px] hidden lg:inline-block">
                        {(item as ImageReport).imageAnalysisSummary.substring(0, 40)}...
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-blue-400/50" />
                    <span className="text-xs font-medium text-white/60 truncate max-w-[250px]">
                        {(item as CbcReport).summary}
                    </span>
                </div>
            )}
        </TableCell>
        <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
                {!isImage && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                        onClick={() => {
                            setValidationCbcReport(item as CbcReport);
                            setIsValidationDialogOpen(true);
                        }}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        <span className="sr-only">Cross-Reference</span>
                    </Button>
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-white/5 hover:text-white transition-all"
                    onClick={() => setReportToView(item)}
                >
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="sr-only">Details</span>
                </Button>
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Purge</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#0a0a0a] border-white/10 rounded-[2rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-white">Purge Record?</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/40 text-sm font-medium">
                                This action is irreversible. The selected diagnostic intelligence will be permanently removed from your profile.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-2">
                            <AlertDialogCancel className="rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest">CANCEL</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => handleDelete(item.id, isImage ? 'image' : 'cbc')} 
                                className='bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl'
                            >
                                PURGE
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
            <DialogContent className="sm:max-w-2xl bg-[#080808] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                
                <div className="p-8 space-y-8 relative z-10">
                    <DialogHeader className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 bg-primary/10 rounded-xl">
                                <Activity className="w-5 h-5 text-primary" />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Diagnostic Analysis</span>
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-white uppercase">Historical Result</DialogTitle>
                        <DialogDescription className="text-white/40 font-bold uppercase tracking-widest text-[10px]">
                            Processed on {report.createdAt ? format(report.createdAt.toDate(), 'PPP, p') : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Risk Coefficient</span>
                                        <p className="text-4xl font-black text-white tracking-tighter">{report.riskScore}<span className="text-sm text-white/20 ml-1">/100</span></p>
                                    </div>
                                    <Badge variant={getBadgeVariant(report.riskScore)} className="rounded-lg px-3 py-1 font-black text-[10px] uppercase">
                                        {report.riskScore > 75 ? 'Critical' : report.riskScore > 50 ? 'Moderate' : 'Low'}
                                    </Badge>
                                </div>
                                <Progress value={report.riskScore} className="h-2 bg-white/5"/>
                            </div>

                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl flex flex-col justify-center">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Diagnosis</span>
                                    <p className="text-2xl font-black text-white tracking-tighter uppercase leading-tight">{report.anemiaType || 'N/A'}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Award className="w-3 h-3 text-primary" />
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Confidence: {report.confidenceScore || 0}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Image Observations</h4>
                            <div className="p-5 rounded-3xl bg-black border border-white/5 text-sm font-medium text-white/70 leading-relaxed italic">
                                "{report.imageAnalysisSummary}"
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Clinical Insights</h4>
                            <ScrollArea className="h-48 rounded-3xl border border-white/5 bg-white/[0.01] p-5">
                                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{report.recommendations}</p>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 bg-zinc-950/50 border-t border-white/5 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setReportToView(null)} className="rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/5">CLOSE</Button>
                    <Button asChild className="rounded-xl bg-primary text-black font-black text-xs uppercase tracking-widest px-8 shadow-lg shadow-primary/10">
                         <Link href="/dashboard/analysis">RE-SCAN</Link>
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
            <DialogContent className="bg-[#080808] border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <div className="p-8 space-y-6 relative z-10">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Clinical Validation</span>
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-white uppercase">Cross-Reference Intelligence</DialogTitle>
                        <DialogDescription className="text-white/40 font-medium text-sm">
                            Select an AI image analysis to correlate with the CBC report dated {validationCbcReport ? format(validationCbcReport.createdAt.toDate(), 'PPP') : ''}.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="h-72 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="p-2">
                            {imageHistory && imageHistory.map((item: ImageReport) => (
                                <button 
                                    key={item.id} 
                                    onClick={() => setValidationImageReport(item)} 
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl mb-2 transition-all border",
                                        validationImageReport?.id === item.id 
                                        ? "bg-primary/10 border-primary/40" 
                                        : "bg-transparent border-transparent hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs font-bold text-white">{format(item.createdAt.toDate(), 'PPP')}</span>
                                        <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">{format(item.createdAt.toDate(), 'p')}</span>
                                    </div>
                                    <Badge variant={getBadgeVariant(item.riskScore)} className="font-black text-[10px] tracking-tighter">
                                        RISK: {item.riskScore}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                
                <div className="p-6 bg-zinc-950/50 border-t border-white/5 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsValidationDialogOpen(false)} className="rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/5">CANCEL</Button>
                    <Button 
                        onClick={handleValidation} 
                        disabled={!validationImageReport}
                        className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest px-8 shadow-lg shadow-blue-500/10"
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
      <div className="space-y-12">
        {userSex === 'Female' && (cbcHistory && cbcHistory.length > 0 || cycleLogs && cycleLogs.length > 0) && (
            <MenstrualCycleCorrelator 
                labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
                cycleLogs={cycleLogs ? cycleLogs as any : []} 
            />
        )}
        
        <div className="relative group">
            {/* Background blur */}
            <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full opacity-20 pointer-events-none" />
            
            <GlassSurface intensity="medium" className="border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative z-10">
                <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-zinc-900 rounded-xl border border-white/10">
                            <Activity className="w-5 h-5 text-white/40" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Diagnostic Archive</h3>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Historical clinical intelligence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Live Sync</span>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 h-12 px-8">Temporal ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 h-12">Sequence Type</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 h-12">Assessment Vector</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/30 h-12 px-8">Diagnostic Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map(renderHistoryRow)}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="p-6 bg-zinc-950/20 border-t border-white/5 text-center">
                    <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">End of Archive Record</p>
                </div>
            </GlassSurface>
        </div>
    </div>
      
      {renderReportModal()}
      {renderValidationDialog()}
    </>
  );
}
