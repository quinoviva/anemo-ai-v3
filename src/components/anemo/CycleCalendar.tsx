'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Droplets, 
  Sun, 
  Moon, 
  Sparkles, 
  Heart,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface CycleCalendarProps {
  compact?: boolean;
}

export function CycleCalendar({ compact = false }: CycleCalendarProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const cycleLogsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/cycle_logs`),
      orderBy('startDate', 'desc'),
      limit(12)
    );
  }, [user, firestore]);

  const { data: cycleLogs } = useCollection<any>(cycleLogsQuery);

  const calendarData = useMemo(() => {
    if (!cycleLogs || cycleLogs.length === 0) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Get latest cycle info
    const latestLog = cycleLogs[0];
    const cycleLength = latestLog?.cycleLength || 28;
    
    if (!latestLog?.startDate) return null;

    const lmpDate = latestLog.startDate.toDate ? latestLog.startDate.toDate() : new Date(latestLog.startDate.seconds * 1000);
    const daysSinceLmp = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate current phase
    let currentPhase: { name: string; icon: any; color: string; days: [number, number] };
    
    if (daysSinceLmp <= 5) {
      currentPhase = { name: 'Menstrual', icon: Droplets, color: 'bg-red-500', days: [0, 5] };
    } else if (daysSinceLmp <= 13) {
      currentPhase = { name: 'Follicular', icon: Sun, color: 'bg-amber-500', days: [6, 13] };
    } else if (daysSinceLmp <= 16) {
      currentPhase = { name: 'Ovulation', icon: Sparkles, color: 'bg-pink-500', days: [14, 16] };
    } else {
      currentPhase = { name: 'Luteal', icon: Moon, color: 'bg-purple-500', days: [17, 27] };
    }

    // Calculate next period
    const nextPeriodDate = new Date(lmpDate);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
    const daysUntilNext = Math.ceil((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get fertile window
    const fertileStart = new Date(lmpDate);
    fertileStart.setDate(fertileStart.getDate() + 12);
    const fertileEnd = new Date(lmpDate);
    fertileEnd.setDate(fertileEnd.getDate() + 16);

    return {
      currentPhase,
      daysSinceLmp,
      cycleLength,
      nextPeriodDate,
      daysUntilNext,
      fertileStart,
      fertileEnd,
      isFertile: daysSinceLmp >= 12 && daysSinceLmp <= 16,
      isOnPeriod: daysSinceLmp <= 5,
      flowIntensity: latestLog?.flowIntensity,
      isRegular: latestLog?.isRegular
    };
  }, [cycleLogs]);

  if (!calendarData) {
    return (
      <Card className="border-rose-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-light flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Cycle Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-4">No cycle data recorded yet.</p>
            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="rounded-full">
                Log Your Cycle
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentPhase, daysSinceLmp, cycleLength, daysUntilNext, isOnPeriod, isFertile, flowIntensity, isRegular } = calendarData;

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
        {currentPhase && (
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", currentPhase.color)}>
            <currentPhase.icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-rose-400">{currentPhase.name} Phase</p>
          <p className="text-sm font-bold text-foreground">Day {daysSinceLmp} of {cycleLength}</p>
        </div>
        <div className="text-right">
          {daysUntilNext > 0 ? (
            <p className="text-xs text-muted-foreground">Period in <span className="font-bold text-rose-400">{daysUntilNext}d</span></p>
          ) : (
            <p className="text-xs font-bold text-red-500">Period expected</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-rose-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-light flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          Cycle Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Phase */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center gap-3">
            {currentPhase && (
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", currentPhase.color)}>
                <currentPhase.icon className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-rose-400">Current Phase</p>
              <p className="text-xl font-bold text-foreground">{currentPhase?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-foreground">{daysSinceLmp}</p>
            <p className="text-[10px] uppercase text-muted-foreground">day {daysSinceLmp} of {cycleLength}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground uppercase">Cycle Length</p>
            <p className="text-lg font-bold">{cycleLength} days</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground uppercase">Next Period</p>
            <p className="text-lg font-bold">{daysUntilNext > 0 ? `${daysUntilNext} days` : 'Due'}</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {isOnPeriod && (
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase">
              <Droplets className="w-3 h-3 inline mr-1" /> On Period
            </span>
          )}
          {isFertile && (
            <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold uppercase">
              <Sparkles className="w-3 h-3 inline mr-1" /> Fertile Window
            </span>
          )}
          {flowIntensity === 'Heavy' && (
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold uppercase">
              <AlertCircle className="w-3 h-3 inline mr-1" /> Heavy Flow
            </span>
          )}
          {isRegular && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
              <TrendingUp className="w-3 h-3 inline mr-1" /> Regular
            </span>
          )}
        </div>

        {/* Phase Legend */}
        <div className="space-y-2 pt-2 border-t border-rose-500/10">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cycle Phases</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
            <div className="p-2 rounded bg-red-500/20 text-red-400">Menstrual</div>
            <div className="p-2 rounded bg-amber-500/20 text-amber-400">Follicular</div>
            <div className="p-2 rounded bg-pink-500/20 text-pink-400">Ovulation</div>
            <div className="p-2 rounded bg-purple-500/20 text-purple-400">Luteal</div>
          </div>
        </div>

        <Link href="/dashboard/profile" className="block">
          <Button variant="outline" size="sm" className="w-full rounded-full">
            Update Cycle Log
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default CycleCalendar;