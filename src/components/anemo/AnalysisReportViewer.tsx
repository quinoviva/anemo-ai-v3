
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ShieldAlert, Activity, FileText, Building2, UserCircle, Droplet, Check, AlertTriangle, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CbcReport = {
  id: string;
  createdAt: any;
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
  
  const reportDate = report.createdAt
    ? (() => {
        try {
          const d = typeof report.createdAt.toDate === 'function'
            ? report.createdAt.toDate()
            : report.createdAt.seconds
              ? new Date(report.createdAt.seconds * 1000)
              : new Date(report.createdAt);
          return format(d, 'PPP p');
        } catch { return 'unknown date'; }
      })()
    : 'unknown date';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-card border-border rounded-[3rem] p-0 overflow-hidden shadow-2xl">
        {/* Decorative Backgrounds */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px] -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] -ml-64 -mb-64 pointer-events-none" />

        <div className="p-5 md:p-12 space-y-6 md:space-y-10 relative z-10 flex flex-col h-[90vh] md:h-auto max-h-[90vh]">
          <DialogHeader className="space-y-4 shrink-0">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Clinical Lab Report</span>
                <DialogDescription className="text-muted-foreground/50 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">
                  Archive ID: {report.id.substring(0, 12)}
                </DialogDescription>
              </div>
            </div>
            <DialogTitle className="text-2xl md:text-5xl font-light tracking-tighter text-foreground uppercase leading-none">
                CBC <span className="font-serif italic text-blue-400">Analysis</span>
            </DialogTitle>
            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[11px]">
              Documented: {reportDate}
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-5 px-5 md:-mx-12 md:px-12 pr-4 md:pr-10">
            <div className="space-y-6 md:space-y-10 pb-8">
                
              {/* Doctor / Hospital Info */}
              {(report.hospitalName || report.doctorName) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {report.hospitalName && (
                    <div className="p-5 rounded-[1.5rem] bg-foreground/[0.02] border border-border/50 flex items-center gap-4">
                      <div className="p-3 rounded-full bg-foreground/5">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Facility</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{report.hospitalName}</p>
                      </div>
                    </div>
                  )}
                  {report.doctorName && (
                    <div className="p-5 rounded-[1.5rem] bg-foreground/[0.02] border border-border/50 flex items-center gap-4">
                      <div className="p-3 rounded-full bg-foreground/5">
                        <UserCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Physician</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{report.doctorName}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cross-Reference / Discrepancy Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {(reliabilityScore !== undefined || discrepancyAlert) && (
                   <div className={cn(
                    "p-6 rounded-[2rem] border relative overflow-hidden backdrop-blur-xl flex flex-col justify-center",
                    discrepancyAlert 
                        ? "bg-red-500/5 border-red-500/20" 
                        : "bg-blue-500/5 border-blue-500/20"
                   )}>
                        {discrepancyAlert && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] mix-blend-screen pointer-events-none" />}
                        
                        <div className="flex items-start gap-4 z-10 relative">
                            <div className={cn(
                                "p-3 rounded-2xl border",
                                discrepancyAlert ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"
                            )}>
                                {discrepancyAlert ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <Crosshair className="w-6 h-6 text-blue-400" />}
                            </div>
                            <div className="space-y-2">
                                <h4 className={cn("text-sm font-bold uppercase tracking-widest", discrepancyAlert ? "text-red-400" : "text-blue-400" )}>
                                    {discrepancyAlert ? "Clinical Discrepancy" : "Cross-Validation"}
                                </h4>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                                    {discrepancyAlert 
                                        ? "Significant variance between scan and CBC results." 
                                        : "Results successfully correlated with visual analysis."}
                                </p>
                            </div>
                        </div>
                   </div>
                )}
                
                {reliabilityScore !== undefined && (
                    <div className="p-6 rounded-[2rem] bg-foreground/[0.03] border border-border/50 backdrop-blur-xl flex items-center justify-between group">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em]">Validation Index</span>
                            <div className="text-3xl md:text-4xl font-light text-foreground tracking-tighter leading-none flex items-baseline gap-1">
                                {reliabilityScore} <span className="text-lg text-muted-foreground/50">%</span>
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Combined Reliability</p>
                        </div>
                        <div className="w-16 h-16 rounded-full border-4 border-foreground/5 flex items-center justify-center relative">
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-foreground/5" />
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="289" strokeDashoffset={289 - (289 * reliabilityScore / 100)} className={reliabilityScore > 80 ? "text-emerald-500" : reliabilityScore > 50 ? "text-amber-500" : "text-red-500"} strokeLinecap="round" />
                            </svg>
                            <span className="text-xs font-bold">{reliabilityScore}%</span>
                        </div>
                    </div>
                )}
              </div>

              {/* AI Summary */}
              <div className="space-y-4 pt-4">
                <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] ml-4 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  Clinical Interpretation
                </h4>
                <div className={cn(
                  "p-6 md:p-8 rounded-[2rem] border backdrop-blur-xl relative overflow-hidden",
                  isAnemiaPositive 
                    ? "bg-red-500/5 border-red-500/20 text-red-50"
                    : "bg-foreground/[0.02] border-border/50 text-foreground"
                )}>
                  {isAnemiaPositive && <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />}
                  <p className="text-sm md:text-lg font-light leading-relaxed relative z-10">
                    {report.summary}
                  </p>
                </div>
              </div>

              {/* Biomarkers */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between ml-4 pr-4">
                    <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                        Hematological Parameters
                    </h4>
                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{report.parameters?.length || 0} Markers</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {(report.parameters ?? []).map((p, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 gap-4",
                        !p.isNormal 
                          ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10" 
                          : "bg-foreground/[0.015] border-border/30 hover:border-border/60 hover:bg-foreground/[0.03]"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          !p.isNormal ? "bg-red-500/10 text-red-400" : "bg-foreground/5 text-muted-foreground"
                        )}>
                          <Droplet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{p.parameter}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mt-0.5">Biomarker</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                        <div className="text-left sm:text-right">
                            <p className="text-2xl font-light tracking-tight flex items-baseline gap-1">
                                {p.value} <span className="text-xs font-bold text-muted-foreground/50 tracking-widest">{p.unit}</span>
                            </p>
                        </div>
                        
                        <Badge variant={p.isNormal ? "default" : "destructive"} className={cn(
                            "rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest shrink-0 border",
                            p.isNormal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                            {p.isNormal ? "Normal Range" : "Abnormal"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>

          <div className="pt-4 md:pt-6 border-t border-border/50 shrink-0 flex justify-end">
            <Button 
                variant="ghost" 
                onClick={onClose} 
                className="h-10 px-6 md:h-14 md:px-10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all w-full md:w-auto"
            >
                ACKNOWLEDGE & CLOSE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
