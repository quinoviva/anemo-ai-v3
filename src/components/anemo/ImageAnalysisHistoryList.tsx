'use client';

import { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Plus, LogIn, User, Loader2, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';

type ImageReportType = PersonalizedRecommendationsOutput & {
  id: string;
  createdAt: {
    toDate: () => Date;
  };
  imageAnalysisSummary: string;
};

export function ImageAnalysisHistoryList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isGuest = user?.isAnonymous;
  const [reportToView, setReportToView] = useState<ImageReportType | null>(null);

  const imageAnalysesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/imageAnalyses`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: history, isLoading } = useCollection<any>(imageAnalysesQuery);

  const getBadgeVariant = (riskScore: number) => {
    if (riskScore > 75) return 'destructive';
    if (riskScore > 50) return 'secondary';
    return 'default';
  };

  if (isGuest) {
    return (
      <Card className="text-center">
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
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="text-center">
        <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">No History Found</h3>
          <p className="text-muted-foreground">
            You haven't performed an image analysis yet. Get started to see your history here.
          </p>
          <Button asChild className="mt-2">
            <Link href="/dashboard/analysis">
              <Plus className="mr-2 h-4 w-4" />
              Start New Analysis
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item: ImageReportType) => (
                <TableRow key={item.id}>
                  <TableCell>{item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(item.riskScore)}>{item.riskScore}/100</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setReportToView(item)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View Report</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Modal for viewing the report */}
       <Dialog open={!!reportToView} onOpenChange={(open) => !open && setReportToView(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Image Analysis Report</DialogTitle>
                     <DialogDescription>
                        Generated on {reportToView ? format(reportToView.createdAt.toDate(), 'PPP, p') : ''}
                    </DialogDescription>
                </DialogHeader>
                {reportToView && (
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-lg">Anemia Risk Score</span>
                                <span className="font-bold text-2xl text-primary">{reportToView.riskScore}/100</span>
                            </div>
                            <Progress value={reportToView.riskScore} className="h-3"/>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg">Image Analysis Summary</h4>
                            <Alert>
                                <AlertDescription className="whitespace-pre-wrap">{reportToView.imageAnalysisSummary}</AlertDescription>
                            </Alert>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-lg">AI-Powered Recommendations</h4>
                            <ScrollArea className="h-48 rounded-md border p-4">
                                <p className="text-sm whitespace-pre-wrap">{reportToView.recommendations}</p>
                            </ScrollArea>
                        </div>
                    </div>
                )}
                 <DialogFooter>
                    <Button onClick={() => setReportToView(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
       </Dialog>
    </>
  );
}
