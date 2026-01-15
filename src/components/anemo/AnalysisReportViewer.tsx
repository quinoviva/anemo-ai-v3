
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ShieldAlert } from 'lucide-react';

// This should be the actual type/interface for your CBC report
export type CbcReport = {
  id: string;
  createdAt: any; // Or specific date type
  summary: string;
  parameters: {
    parameter: string;
    value: string;
    unit: string;
    isNormal: boolean;
  }[];
  hospitalName?: string;
  doctorName?: string;
};

interface AnalysisReportViewerProps {
  report: CbcReport | null;
  isOpen: boolean;
  onClose: () => void;
  reliabilityScore?: number;
  discrepancyAlert?: boolean;
}

export function AnalysisReportViewer({ report, isOpen, onClose, reliabilityScore, discrepancyAlert }: AnalysisReportViewerProps) {
  if (!report) return null;

  const isAnemiaPositive = report.summary?.toLowerCase().includes('anemia');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lab Report Analysis</DialogTitle>
          <DialogDescription>
            Report from {report.createdAt ? format(new Date(report.createdAt.seconds * 1000), 'PPP p') : 'unknown date'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-6 py-4">

                {(report.hospitalName || report.doctorName) && (
                     <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted p-4'>
                        {report.hospitalName && (
                            <div>
                                <p className='text-sm font-semibold'>Hospital/Clinic</p>
                                <p className='text-sm text-muted-foreground'>{report.hospitalName}</p>
                            </div>
                        )}
                         {report.doctorName && (
                            <div>
                                <p className='text-sm font-semibold'>Physician</p>
                                <p className='text-sm text-muted-foreground'>{report.doctorName}</p>
                            </div>
                        )}
                    </div>
                )}

                {discrepancyAlert && (
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Discrepancy Detected</AlertTitle>
                        <AlertDescription>
                            There is a significant discrepancy between the visual analysis and the lab report results. Please consult a healthcare professional.
                        </AlertDescription>
                    </Alert>
                )}

                {reliabilityScore && (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Reliability Score</p>
                        <p className="text-2xl font-bold">{reliabilityScore}%</p>
                    </div>
                )}

                <Alert variant={isAnemiaPositive ? 'destructive' : 'default'}>
                    <AlertTitle>AI Summary</AlertTitle>
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
                    {report.parameters.map((p, i) => (
                        <TableRow key={i}>
                        <TableCell className="font-medium">{p.parameter}</TableCell>
                        <TableCell>{p.value} {p.unit}</TableCell>
                        <TableCell>
                            <Badge variant={p.isNormal ? 'default' : 'destructive'}>
                            {p.isNormal ? 'Normal' : 'Out of Range'}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
