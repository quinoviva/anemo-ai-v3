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
import { Eye, FileText, Plus, LogIn, User, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { AnalysisReportViewer } from './AnalysisReportViewer';
import type { AnalyzeCbcReportOutput } from '@/ai/schemas/cbc-report';

export type ReportType = AnalyzeCbcReportOutput & {
  id: string;
  createdAt: {
    toDate: () => Date;
  };
  hospitalName?: string;
};

export function AnalysisHistoryList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isGuest = user?.isAnonymous;
  const [reportToView, setReportToView] = useState<ReportType | null>(null);
  const [reportToDownload, setReportToDownload] = useState<ReportType | null>(null);

  const labReportsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/labReports`),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: history, isLoading } = useCollection<any>(labReportsQuery);

  const getBadgeVariant = (summary: string) => {
    if (summary.toLowerCase().includes('anemia')) {
      return 'destructive';
    }
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
            You haven't performed any analysis yet. Upload a lab report to see your history here.
          </p>
          <Button asChild className="mt-2">
            <Link href="/dashboard/history">
              <Plus className="mr-2 h-4 w-4" />
              Upload Lab Report
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
                <TableHead>Summary</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item: ReportType) => (
                <TableRow key={item.id}>
                  <TableCell>{item.createdAt ? format(item.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(item.summary)}>{item.summary}</Badge>
                  </TableCell>
                  <TableCell>{item.hospitalName || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setReportToView(item)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View Report</span>
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => setReportToDownload(item)}>
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download Report</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Modal for viewing the report */}
      <AnalysisReportViewer
        report={reportToView}
        isOpen={!!reportToView}
        onClose={() => setReportToView(null)}
      />

      {/* Invisible component instance to handle direct downloads */}
      <AnalysisReportViewer
        report={reportToDownload}
        isOpen={!!reportToDownload}
        onClose={() => setReportToDownload(null)}
        startDownload={true}
      />
    </>
  );
}
