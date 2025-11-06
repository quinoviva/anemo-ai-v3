'use client';

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
import { Eye, Download, FileText, Plus } from 'lucide-react';
import Link from 'next/link';


// Mock data is removed to reflect a new user's empty state.
// In a real implementation, this would be fetched from a database.
const history: any[] = [
  // { id: 'ANL-001', date: '2024-07-28', riskScore: 65, status: 'High Risk' },
];

export function AnalysisHistoryList() {
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'High Risk':
        return 'destructive';
      case 'Moderate Risk':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (history.length === 0) {
    return (
        <Card className="text-center">
            <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-full">
                    <FileText className="h-10 w-10 text-primary" />
                 </div>
                <h3 className="text-xl font-semibold">No History Found</h3>
                <p className="text-muted-foreground">
                    You haven't performed any analysis yet. Start your first analysis to see your reports here.
                </p>
                <Button asChild className="mt-2">
                    <Link href="/dashboard/analysis">
                        <Plus className="mr-2 h-4 w-4" />
                        Start New Analysis
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Analysis ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.riskScore}/100</TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Report</span>
                  </Button>
                  <Button variant="ghost" size="icon">
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
  );
}
