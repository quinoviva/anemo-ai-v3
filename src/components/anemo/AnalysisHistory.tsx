
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
import { Eye, Plus, LogIn, User, FileText, Download, Trash2, ShieldCheck } from 'lucide-react';
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
        title: 'Report Deleted',
        description: `The ${type === 'image' ? 'image analysis' : 'lab'} report has been removed from your history.`,
    });
  };

  const handleValidation = async () => {
    if (!user || !firestore || !validationCbcReport || !validationImageReport) {
      toast({
        title: 'Validation Error',
        description: 'Missing required data for validation.',
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
          fingernails: 'See summary',
          skin: 'See summary',
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
      <GlassSurface intensity="medium" className="text-center">
        <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">History Not Saved in Guest Mode</h3>
          <p className="text-muted-foreground">
            To save and review your analysis history, please create an account.
          </p>
          <Button asChild className="mt-2">
            <Link href="/signup">
              <LogIn className="mr-2 h-4 w-4" />
              Sign Up Now
            </Link>
          </Button>
        </CardContent>
      </GlassSurface>
    );
  }

  if (imageIsLoading || cbcIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-10">
        <AnemoLoading />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <GlassSurface intensity="medium" className="text-center">
        <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">No History Found</h3>
          <p className="text-muted-foreground">
            You haven&apos;t performed an analysis yet. Get started to see your history here.
          </p>
          <Button asChild className="mt-2">
            <Link href="/dashboard/analysis">
              <Plus className="mr-2 h-4 w-4" />
              Start New Analysis
            </Link>
          </Button>
        </CardContent>
      </GlassSurface>
    );
  }

  const renderHistoryRow = (item: HistoryItem) => {
    if (item.type === 'image') {
      return (
        <TableRow key={item.id}>
          <TableCell>{item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
          <TableCell>Image Analysis</TableCell>
          <TableCell>
            <Badge variant={getBadgeVariant(item.riskScore)}>{item.riskScore}/100</Badge>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="icon" onClick={() => setReportToView(item)}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View Report</span>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete Report</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the image analysis report from your history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(item.id, 'image')} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </TableCell>
        </TableRow>
      );
    } else {
        const cbcReport = item as CbcReport;
        return (
            <TableRow key={item.id}>
              <TableCell>{item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
              <TableCell>CBC Lab Report</TableCell>
              <TableCell>{item.summary}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => {
                    setValidationCbcReport(cbcReport);
                    setIsValidationDialogOpen(true);
                }}>
                  <ShieldCheck className="h-4 w-4" />
                  <span className="sr-only">Validate Report</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setReportToView(item)}>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View Report</span>
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete Report</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the lab report from your history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id, 'cbc')} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
    }
  }

  const renderReportModal = () => {
    if (!reportToView) return null;
    if (reportToView.type === 'image') {
      const report = reportToView as ImageReport;
      return (
        <Dialog open={true} onOpenChange={(open) => !open && setReportToView(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Image Analysis Report</DialogTitle>
                     <DialogDescription>
                        Generated on {report.createdAt ? format(report.createdAt.toDate(), 'PPP, p') : ''}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-lg">Anemia Risk Score</span>
                            <span className="font-bold text-2xl text-primary">{report.riskScore}/100</span>
                        </div>
                        <Progress value={report.riskScore} className="h-3"/>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold text-lg">Image Analysis Summary</h4>
                        <Alert>
                            <AlertDescription className="whitespace-pre-wrap">{report.imageAnalysisSummary}</AlertDescription>
                        </Alert>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold text-lg">AI-Powered Recommendations</h4>
                        <ScrollArea className="h-48 rounded-md border p-4">
                            <p className="text-sm whitespace-pre-wrap">{report.recommendations}</p>
                        </ScrollArea>
                    </div>
                </div>
                 <DialogFooter>
                    <Button onClick={() => setReportToView(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>
      )
    } else {
      const report = reportToView as CbcReport;
      return (
        <AnalysisReportViewer 
            report={report as any} // The type is compatible, but TS complains.
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Image Analysis to Validate</DialogTitle>
                    <DialogDescription>
                        Select an image analysis report to compare with the CBC report from {validationCbcReport ? format(validationCbcReport.createdAt.toDate(), 'PPP') : ''}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-64">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Risk Score</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {imageHistory && imageHistory.map((item: ImageReport) => (
                                <TableRow key={item.id} onClick={() => setValidationImageReport(item)} className={validationImageReport?.id === item.id ? 'bg-muted' : ''}>
                                    <TableCell>{item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getBadgeVariant(item.riskScore)}>{item.riskScore}/100</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" disabled={!validationImageReport || validationImageReport.id !== item.id}>Selected</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsValidationDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleValidation} disabled={!validationImageReport}>Validate</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {userSex === 'Female' && (cbcHistory && cbcHistory.length > 0 || cycleLogs && cycleLogs.length > 0) && (
            <MenstrualCycleCorrelator 
                labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
                cycleLogs={cycleLogs ? cycleLogs as any : []} 
            />
        )}
        <GlassSurface intensity="medium">
          <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(renderHistoryRow)}
            </TableBody>
          </Table>
        </CardContent>
      </GlassSurface>
    </div>
      
      {renderReportModal()}
      {renderValidationDialog()}
    </>
  );
}
