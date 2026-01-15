
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Droplets, CalendarHeart, Plus } from 'lucide-react';
import { differenceInDays, addDays, format, isBefore, isAfter } from 'date-fns';
import { CycleLogForm } from './CycleLogForm';

interface PeriodTrackerCardProps {
    lastPeriodStart: Date | null;
    cycleLength?: number; // Default to 28 if not provided
    periodLength?: number; // Default to 5 if not provided
}

export function PeriodTrackerCard({ lastPeriodStart, cycleLength = 28, periodLength = 5 }: PeriodTrackerCardProps) {
    if (!lastPeriodStart) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-pink-600">
                        <Droplets className="h-5 w-5" />
                        Menstrual Health
                    </CardTitle>
                    <CardDescription>Track your cycle to unlock anemia correlation insights.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-4 gap-4">
                        <p className="text-sm text-muted-foreground text-center">
                            No cycle data found. Log your last period to get started.
                        </p>
                         <CycleLogForm 
                            trigger={
                                <Button variant="outline" className="w-full border-pink-200 hover:bg-pink-50 text-pink-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Log Period
                                </Button>
                            } 
                        />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const today = new Date();
    const daysSinceStart = differenceInDays(today, lastPeriodStart);
    const currentDay = daysSinceStart + 1; // Cycle Day 1 is the start date
    const nextPeriodDate = addDays(lastPeriodStart, cycleLength);
    const daysUntilNext = differenceInDays(nextPeriodDate, today);
    const ovulationDay = cycleLength - 14;
    
    // Determine Phase
    let statusText = "";
    let statusColor = "bg-primary";
    let progressValue = 0;

    if (daysSinceStart < periodLength) {
        statusText = `Period Day ${currentDay}`;
        statusColor = "bg-pink-500";
        progressValue = (currentDay / periodLength) * 100; // Progress through the *period*
    } else if (currentDay < ovulationDay) { // Follicular Phase
        statusText = `Follicular Phase (Day ${currentDay})`;
        statusColor = "bg-blue-400";
        // Progress from end of period to ovulation
        const follicularLength = ovulationDay - periodLength;
        const daysInFollicular = currentDay - periodLength;
        progressValue = (daysInFollicular / follicularLength) * 100;
    } else if (currentDay === ovulationDay) { // Ovulation
        statusText = "Ovulation Day";
        statusColor = "bg-purple-500";
        progressValue = 100;
    } else if (currentDay <= cycleLength) { // Luteal Phase
        statusText = `Luteal Phase (Day ${currentDay})`;
        statusColor = "bg-orange-400";
        // Progress from ovulation to end of cycle
        const lutealLength = cycleLength - ovulationDay;
        const daysInLuteal = currentDay - ovulationDay;
        progressValue = (daysInLuteal / lutealLength) * 100;
    } else {
        statusText = `Late by ${Math.abs(daysUntilNext)} Days`;
        statusColor = "bg-red-500";
        progressValue = 100;
    }

    return (
        <Card className="overflow-hidden border-pink-100 dark:border-pink-900/20">
             <div className="h-1 w-full bg-pink-100 dark:bg-pink-900/20">
                <div className={`h-full ${statusColor}`} style={{ width: `${Math.min(progressValue, 100)}%` }} />
            </div>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-pink-700 dark:text-pink-400">
                            <CalendarHeart className="h-5 w-5" />
                            Cycle Tracker
                        </CardTitle>
                        <CardDescription>
                            {statusText}
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-foreground">
                            {daysUntilNext > 0 ? daysUntilNext : 0}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                            Days until next
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-pink-50 dark:bg-pink-900/10 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Current Phase</p>
                            <p className="font-medium text-pink-900 dark:text-pink-100">
                                {daysSinceStart < periodLength ? "Menstruation" : (currentDay < ovulationDay ? "Follicular" : (currentDay === ovulationDay ? "Ovulation" : "Luteal"))}
                            </p>
                        </div>
                         <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Predicted Start</p>
                            <p className="font-medium">
                                {format(nextPeriodDate, 'MMM d')}
                            </p>
                        </div>
                    </div>
                    
                     <CycleLogForm 
                        trigger={
                            <Button variant="outline" className="w-full border-pink-200 hover:bg-pink-50 text-pink-700 dark:border-pink-800 dark:hover:bg-pink-900/30 dark:text-pink-300">
                                <Plus className="mr-2 h-4 w-4" />
                                Update Log
                            </Button>
                        } 
                    />
                </div>
            </CardContent>
        </Card>
    );
}
