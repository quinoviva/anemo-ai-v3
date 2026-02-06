'use client';

import React from 'react';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';

// The AI-generated output from the flow
type CbcAnalysisResult = AnalyzeCbcReportOutput;

// The data structure for the analysis history, which includes metadata
export interface AnalysisHistoryItem extends CbcAnalysisResult {
  id: string;
  createdAt: any; // Can be Date, string, or number depending on data source
  hospitalName?: string;
  doctorName?: string;
}

export type ReportType = AnalysisHistoryItem;

interface AnalysisHistoryListProps {
  analysisHistory: AnalysisHistoryItem[];
}

const getParameterValue = (
  parameters: CbcAnalysisResult['parameters'],
  name: string
) => {
  const param = parameters.find((p) => p.parameter === name);
  return param ? param.value : 'N/A';
};

const AnalysisHistoryList: React.FC<AnalysisHistoryListProps> = ({ analysisHistory }) => {
  return (
    <GlassSurface intensity="medium">
      <CardHeader>
        <CardTitle>Analysis History</CardTitle>
        <CardDescription>View your past CBC report analyses.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Hemoglobin</TableHead>
              <TableHead>RBC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysisHistory.map((analysis, index) => (
              <TableRow key={index}>
                <TableCell>{new Date(analysis.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{analysis.summary}</TableCell>
                <TableCell>{getParameterValue(analysis.parameters, 'Hemoglobin')}</TableCell>
                <TableCell>{getParameterValue(analysis.parameters, 'RBC')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </GlassSurface>
  );
};

export default AnalysisHistoryList;
