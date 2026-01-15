'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isWithinInterval, differenceInDays } from 'date-fns';
import { Droplets, Info, TrendingDown, Utensils } from 'lucide-react';
import { HistoryItem } from './AnalysisHistory';

export type CycleLogType = {
    id: string;
    startDate: { toDate: () => Date } | Date;
    endDate: { toDate: () => Date } | Date;
    flowIntensity: string;
};

interface MenstrualCycleCorrelatorProps {
  labReports: HistoryItem[];
  cycleLogs: CycleLogType[];
}

export function MenstrualCycleCorrelator({ labReports, cycleLogs }: MenstrualCycleCorrelatorProps) {

  const data = useMemo(() => {
    // 1. Process Lab Reports to get Hemoglobin points
    const points = labReports
      .filter(report => report.type === 'cbc')
      .map(report => {
        const cbcReport = report as any; // Cast for simplicity, or use type guard
        const hbParam = cbcReport.parameters.find((p: { parameter: string; }) => 
            p.parameter.toLowerCase().includes('hemoglobin') || 
            p.parameter.toLowerCase().includes('hgb')
        );
        
        if (!hbParam) return null;

        const value = parseFloat(hbParam.value);
        if (isNaN(value)) return null;

        return {
            date: report.createdAt.toDate().getTime(), // Convert date to timestamp for recharts
            hemoglobin: value,
            id: report.id,
            isLow: !hbParam.isNormal && value < 12 // Simplified check, usually < 12 for women
        };
    }).filter(Boolean) as { date: number, hemoglobin: number, id: string, isLow: boolean }[];

    // Sort by date
    points.sort((a, b) => a.date - b.date);
    return points;
  }, [labReports]);

  const cycleAreas = useMemo(() => {
      return cycleLogs.map(log => {
          const start = log.startDate instanceof Date ? log.startDate : log.startDate.toDate();
          const end = log.endDate instanceof Date ? log.endDate : log.endDate.toDate();
          return {
              x1: start.getTime(),
              x2: end.getTime(),
              intensity: log.flowIntensity
          };
      });
  }, [cycleLogs]);

  const correlationInsight = useMemo(() => {
      // Find if any LOW hemoglobin report is within 7 days AFTER a cycle ends
      for (const point of data) {
          if (!point.isLow) continue;

          for (const cycle of cycleLogs) {
              const end = cycle.endDate instanceof Date ? cycle.endDate : cycle.endDate.toDate();
              // Check if report date is between cycle end and cycle end + 7 days
              const windowEnd = addDays(end, 7);
              
              if (isWithinInterval(new Date(point.date), { start: end, end: windowEnd })) {
                  return {
                      found: true,
                      date: new Date(point.date),
                      cycleEnd: end
                  };
              }
          }
      }
      return null;
  }, [data, cycleLogs]);

  if (data.length === 0 && cycleLogs.length === 0) {
      return null;
  }

  // Format date for X-axis
  const formatDateTick = (tick: number) => {
      return format(new Date(tick), 'MMM d');
  };

  return (
    <div className="space-y-6">
        {correlationInsight && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900">
                <Droplets className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-800 dark:text-red-300">Cycle-Related Anemia Detected</AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-200 mt-2">
                    <p>
                        We noticed a drop in your Hemoglobin levels on <strong>{format(correlationInsight.date, 'MMM d, yyyy')}</strong>, 
                        which occurred shortly after your menstrual cycle ended on <strong>{format(correlationInsight.cycleEnd, 'MMM d, yyyy')}</strong>.
                    </p>
                    <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-md flex items-start gap-3">
                        <Utensils className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                            <span className="font-semibold text-green-700 dark:text-green-400">Nutritional Recommendation:</span>
                            <p className="text-sm mt-1">
                                To replenish iron stores lost during your cycle, consider increasing your intake of local iron-rich foods such as:
                            </p>
                            <ul className="list-disc list-inside text-sm mt-1 ml-1 space-y-1">
                                <li><strong>Malunggay</strong> (Moringa) leaves in soups</li>
                                <li><strong>Atay</strong> (Chicken/Pork Liver)</li>
                                <li><strong>Talbos ng Kamote</strong> (Sweet Potato Tops)</li>
                                <li>Red meat or fish</li>
                            </ul>
                        </div>
                    </div>
                </AlertDescription>
            </Alert>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    Hemoglobin Trends & Cycle Correlation
                </CardTitle>
                <CardDescription>
                    Visualizing your blood health in relation to your menstrual cycle.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                domain={['auto', 'auto']} 
                                name="Date"
                                tickFormatter={formatDateTick}
                                type="number"
                                scale="time"
                            />
                            <YAxis 
                                domain={['dataMin - 2', 'dataMax + 2']} 
                                label={{ value: 'Hb (g/dL)', angle: -90, position: 'insideLeft' }} 
                            />
                            <Tooltip 
                                labelFormatter={(label) => format(new Date(label), 'PPP')}
                                formatter={(value: number) => [`${value} g/dL`, 'Hemoglobin']}
                            />
                            <Legend />
                            
                            {/* Cycle Areas */}
                            {cycleAreas.map((area, index) => (
                                <ReferenceArea 
                                    key={index} 
                                    x1={area.x1} 
                                    x2={area.x2} 
                                    fill="pink" 
                                    fillOpacity={0.4}
                                    label={index === 0 ? "Period" : undefined}
                                />
                            ))}

                            <Line 
                                type="monotone" 
                                dataKey="hemoglobin" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2} 
                                dot={{ r: 4 }} 
                                activeDot={{ r: 6 }} 
                                name="Hemoglobin"
                            />
                            
                            {/* Reference Line for Normal Range (approx lower bound for women) */}
                            <ReferenceLine y={12} stroke="red" strokeDasharray="3 3" label="Low (12 g/dL)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="block h-3 w-3 rounded-full bg-primary"></span>
                        Hemoglobin Level
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="block h-3 w-3 bg-pink-300 opacity-50"></span>
                        Menstrual Cycle
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}