'use client';

import React, { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ReportType } from './AnalysisHistoryList';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type AnalysisReportViewerProps = {
  report: ReportType | null;
  isOpen: boolean;
  onClose: () => void;
  startDownload?: boolean;
};

export function AnalysisReportViewer({ report, isOpen, onClose, startDownload = false }: AnalysisReportViewerProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userData } = useDoc<any>(userDocRef);

  const handleDownloadPdf = async () => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '800px'; 
    
    const reportContentElement = document.getElementById(`pdf-content-${report?.id}`);
    
    if (reportContentElement) {
        element.innerHTML = reportContentElement.innerHTML;
    }

    document.body.appendChild(element);

    const input = startDownload ? element : reportRef.current;

    if (!input) {
      toast({
        title: 'Download Error',
        description: 'Could not find report content.',
        variant: 'destructive',
      });
      document.body.removeChild(element);
      return;
    }

    setIsDownloading(true);

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.body.classList.contains('dark') ? '#09090b' : '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth - 20; // with margin
      const height = width / ratio;

      pdf.addImage(imgData, 'PNG', 10, 10, width, height);
      pdf.save(`anemocheck-report-${report?.id}.pdf`);

      toast({
        title: 'Download Started',
        description: 'Your report is being downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'An error occurred while creating the PDF.',
        variant: 'destructive',
      });
    } finally {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
      setIsDownloading(false);
      onClose();
    }
  };
  
  useEffect(() => {
    if (isOpen && startDownload && report?.id) {
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, startDownload, report]);


  if (!report) return null;

  const isAnemiaPositive = report.summary?.toLowerCase().includes('anemia');
  
  const ReportContent = () => (
    <div className="p-6 rounded-lg border bg-background space-y-4 relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
            <p className="text-8xl font-black text-foreground/5 -rotate-45 select-none">
                ANEMO CHECK
            </p>
        </div>

      <header className="space-y-4">
        <div className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-4">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-primary"
            >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                <path d="M3.22 12H9.5l.7-1 2.1 4.2 1.6-3.2 1.6 3.2h3.22" />
            </svg>
            <div>
                <h2 className="text-xl font-bold text-foreground">Anemo Check</h2>
                <a href="https://anemocheck.com" className="text-sm text-muted-foreground hover:underline">anemocheck.com</a>
            </div>
            </div>
            <div className="text-right text-xs">
                <p className='font-bold text-base'>AI Lab Report Analysis</p>
                <p>Generated On: {format(new Date(), 'PPP')}</p>
            </div>
        </div>

        <div className="space-y-1">
            <p className="font-bold text-lg">{user?.displayName || 'N/A'}</p>
        </div>
      </header>

      <div className="space-y-4">
        <Alert variant={isAnemiaPositive ? 'destructive' : 'default'}>
            <AlertTitle>Summary</AlertTitle>
            <AlertDescription>{report.summary}</AlertDescription>
        </Alert>

        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {report.parameters.map((p: any, i: number) => (
                <TableRow key={i}>
                <TableCell className="font-medium">{p.parameter}</TableCell>
                <TableCell>{p.value} {p.unit}</TableCell>
                <TableCell className='flex items-center justify-start'>
                  <p className={p.isNormal ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                    {p.isNormal ? 'Normal' : 'Out of Range'}
                  </p>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground pt-4 text-center">Disclaimer: This report is AI-generated and for informational purposes only. It is not a substitute for professional medical advice.</p>
      <p className="text-sm font-semibold text-muted-foreground pt-2 text-center">*** End of Report ***</p>
    </div>
  );

  // If startDownload is true, this component renders nothing visible.
  if (startDownload) {
      return (
        <div id={`pdf-content-${report.id}`} style={{ display: 'none' }}>
           <ReportContent />
        </div>
      );
  }

  // This is the visible modal for viewing
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Analysis Report</DialogTitle>
          <DialogDescription>
            Report from {report.createdAt ? format(report.createdAt.toDate(), 'PPP, p') : 'N/A'}. This is not medical advice.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] my-4">
            <div ref={reportRef}>
               <ReportContent />
            </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={handleDownloadPdf} variant="outline" disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
            Download PDF
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
