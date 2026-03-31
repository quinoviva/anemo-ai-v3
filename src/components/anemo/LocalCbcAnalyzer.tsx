'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, RotateCcw, ArrowLeft, Loader2 } from 'lucide-react';
import { runAnalyzeCbcReport } from '@/app/actions';
import type { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export type LocalCbcAnalyzerProps = {
   onBack?: () => void;
};

type Step = 'upload' | 'analyzing' | 'results' | 'error';

export function LocalCbcAnalyzer({ onBack }: LocalCbcAnalyzerProps) {
   const { user } = useUser();
   const firestore = useFirestore();
   const { toast } = useToast();

   const [step, setStep] = useState<Step>('upload');
   const [file, setFile] = useState<File | null>(null);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [dataUri, setDataUri] = useState<string | null>(null);
   const [isDragging, setIsDragging] = useState(false);
   const [result, setResult] = useState<AnalyzeCbcReportOutput | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [saved, setSaved] = useState(false);

   const fileInputRef = useRef<HTMLInputElement>(null);

   const readAsDataUri = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onloadend = () => resolve(reader.result as string);
         reader.onerror = reject;
         reader.readAsDataURL(f);
      });

   const applyFile = async (selectedFile: File) => {
      if (!selectedFile.type.startsWith('image/')) {
         toast({ title: 'Invalid File', description: 'Please upload an image file (JPG, PNG).', variant: 'destructive' });
         return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setDataUri(await readAsDataUri(selectedFile));
      setResult(null);
      setStep('upload');
      setError(null);
      setSaved(false);
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) applyFile(e.target.files[0]);
   };

   const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
   }, []);

   const handleDragLeave = useCallback(() => setIsDragging(false), []);

   const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files[0]) applyFile(e.dataTransfer.files[0]);
   }, []);

   const analyze = async () => {
      if (!dataUri) return;
      setStep('analyzing');
      setError(null);
      try {
         const analysisResult = await runAnalyzeCbcReport({ photoDataUri: dataUri });
         setResult(analysisResult);
         setStep('results');
      } catch (err) {
         setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
         setStep('error');
      }
   };

   const saveToFirestore = async () => {
      if (!result || !user || user.isAnonymous || !firestore) {
         toast({ title: 'Sign in required', description: 'Please sign in to save reports.', variant: 'destructive' });
         return;
      }
      setIsSaving(true);
      try {
         const labReportsRef = collection(firestore, `users/${user.uid}/labReports`);
         await addDoc(labReportsRef, {
            userId: user.uid,
            type: 'cbc',
            createdAt: serverTimestamp(),
            summary: result.summary,
            parameters: result.parameters,
         });
         setSaved(true);
         toast({ title: 'Saved!', description: 'CBC report saved to your health records.' });
      } catch (err) {
         console.error('Failed to save:', err);
         toast({ title: 'Save failed', description: 'Could not save to health records.', variant: 'destructive' });
      } finally {
         setIsSaving(false);
      }
   };

   const reset = () => {
      setStep('upload');
      setFile(null);
      setPreviewUrl(null);
      setDataUri(null);
      setResult(null);
      setError(null);
      setSaved(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const isAnemiaDetected = result?.summary?.toUpperCase().includes('ANEMIA POSITIVE');
   const isAnemiaFree = result?.summary?.toUpperCase().includes('ANEMIA NEGATIVE');

   return (
      <div className="w-full space-y-6 md:space-y-8">
         {/* Back Button */}
         {onBack && step !== 'results' && (
            <button
               onClick={onBack}
               className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
               <span className="h-8 w-8 rounded-full glass-panel flex items-center justify-center group-hover:border-primary/20 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
               </span>
               <span>Back to Analysis Options</span>
            </button>
         )}

         {/* Header */}
         <div className="glass-panel rounded-[2.5rem] p-6 md:p-8">
            <div className="flex items-center gap-4">
               <div className="p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20">
                  <FileText className="h-6 w-6 text-blue-500" />
               </div>
               <div>
                  <p className="font-black uppercase tracking-[0.3em] text-[10px] text-blue-500 mb-1">Laboratory Analysis</p>
                  <h2 className="text-4xl md:text-6xl font-light tracking-tighter">CBC Report</h2>
               </div>
            </div>
         </div>

         <AnimatePresence mode="wait">
            {/* Upload / Error Step */}
            {(step === 'upload' || step === 'error') && (
               <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="glass-panel rounded-[2.5rem] p-6 md:p-8 space-y-6"
               >
                  <p className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground">Upload CBC Image</p>

                  {/* Drop Zone */}
                  <div
                     className={cn(
                        'rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[240px]',
                        isDragging
                           ? 'border-blue-500/60 bg-blue-600/5'
                           : 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'
                     )}
                     onClick={() => fileInputRef.current?.click()}
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     onDrop={handleDrop}
                  >
                     {previewUrl ? (
                        <div className="w-full space-y-3">
                           <img src={previewUrl} alt="CBC Report Preview" className="max-h-[280px] w-full object-contain rounded-xl" />
                           {file && (
                              <p className="text-xs text-muted-foreground">
                                 {file.name} &bull; {file.size < 1024 * 1024
                                    ? `${(file.size / 1024).toFixed(0)} KB`
                                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                              </p>
                           )}
                        </div>
                     ) : (
                        <>
                           <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 mb-4">
                              <Upload className="h-8 w-8 text-blue-500" />
                           </div>
                           <p className="text-base font-medium">Drop CBC report image here</p>
                           <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                           <p className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground/50 mt-4">JPG · PNG · JPEG</p>
                        </>
                     )}
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>

                  {/* Error notice */}
                  {step === 'error' && error && (
                     <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                           <p className="font-black uppercase tracking-[0.3em] text-[10px] text-red-500 mb-1">Analysis Failed</p>
                           <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                     </div>
                  )}

                  {file && (
                     <button
                        onClick={analyze}
                        className="w-full h-14 rounded-full bg-blue-600 text-white font-bold tracking-wide flex items-center justify-center gap-3 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                     >
                        <FileText className="h-5 w-5" />
                        Analyze Report
                     </button>
                  )}
               </motion.div>
            )}

            {/* Analyzing Step */}
            {step === 'analyzing' && (
               <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="glass-panel rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center justify-center gap-6 min-h-[320px]"
               >
                  <div className="p-5 rounded-full bg-blue-600/10 border border-blue-500/20">
                     <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  </div>
                  <div className="text-center">
                     <p className="font-black uppercase tracking-[0.3em] text-[10px] text-blue-500 mb-2">Processing</p>
                     <p className="text-xl font-light">AI is reading your CBC report...</p>
                     <p className="text-sm text-muted-foreground mt-2">Gemini is analyzing your blood count values</p>
                  </div>
               </motion.div>
            )}

            {/* Results Step */}
            {step === 'results' && result && (
               <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
               >
                  {/* Verdict Panel */}
                  <div className={cn(
                     'glass-panel rounded-[2.5rem] p-6 md:p-8',
                     isAnemiaDetected && 'border border-red-500/20',
                     isAnemiaFree && 'border border-emerald-500/20',
                     !isAnemiaDetected && !isAnemiaFree && 'border border-blue-500/20'
                  )}>
                     <p className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground mb-4">Verdict</p>

                     <div className={cn(
                        'inline-flex items-center gap-3 px-6 py-3 rounded-full border mb-5',
                        isAnemiaDetected && 'bg-red-500/10 border-red-500/20 text-red-500',
                        isAnemiaFree && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
                        !isAnemiaDetected && !isAnemiaFree && 'bg-blue-600/10 border-blue-500/20 text-blue-500'
                     )}>
                        {isAnemiaDetected && <XCircle className="h-5 w-5" />}
                        {isAnemiaFree && <CheckCircle className="h-5 w-5" />}
                        {!isAnemiaDetected && !isAnemiaFree && <FileText className="h-5 w-5" />}
                        <span className="font-black uppercase tracking-[0.3em] text-sm">
                           {isAnemiaDetected ? 'Anemia Detected' : isAnemiaFree ? 'No Anemia Detected' : 'Analysis Complete'}
                        </span>
                     </div>

                     <p className="text-sm text-foreground/80 leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Parameters Panel */}
                  <div className="glass-panel rounded-[2.5rem] p-6 md:p-8 space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20">
                           <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground">CBC Parameters</p>
                     </div>

                     {result.parameters && result.parameters.length > 0 ? (
                        <div className="space-y-2">
                           {/* Column headers */}
                           <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 pb-2 border-b border-border/40">
                              <span className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground">Parameter</span>
                              <span className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground text-right">Value</span>
                              <span className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground text-right hidden sm:block">Ref Range</span>
                              <span className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground text-right">Status</span>
                           </div>

                           {result.parameters.map((p, i) => (
                              <div
                                 key={i}
                                 className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center p-4 rounded-2xl bg-muted/30 border border-border/40"
                              >
                                 <span className="text-sm font-medium">{p.parameter}</span>
                                 <div className="text-right">
                                    <span className="text-sm tabular-nums font-mono">{p.value}</span>
                                    {p.unit && (
                                       <span className="text-xs text-muted-foreground ml-1">{p.unit}</span>
                                    )}
                                 </div>
                                 <span className="hidden sm:block text-xs text-muted-foreground text-right">{p.range}</span>
                                 <span className={cn(
                                    'font-black uppercase tracking-[0.3em] text-[10px] px-2.5 py-1 rounded-full border text-right whitespace-nowrap',
                                    p.isNormal
                                       ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                       : 'bg-red-500/10 text-red-500 border-red-500/20'
                                 )}>
                                    {p.isNormal ? 'Normal' : 'Abnormal'}
                                 </span>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="py-8 text-center text-muted-foreground italic text-sm">
                           No structured parameters extracted.
                        </div>
                     )}

                     <p className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground/40 pt-4 border-t border-border/40 leading-relaxed">
                        Disclaimer: Experimental AI analysis. Not a medical diagnosis. Consult a healthcare professional.
                     </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     <button
                        onClick={saveToFirestore}
                        disabled={isSaving || saved}
                        className={cn(
                           'h-14 rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                           saved
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 disabled:opacity-50'
                        )}
                     >
                        {isSaving ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                           <CheckCircle className="h-4 w-4" />
                        ) : null}
                        {saved ? 'Saved' : isSaving ? 'Saving...' : 'Save to Health Records'}
                     </button>

                     <button
                        onClick={reset}
                        className="h-14 rounded-full glass-panel border border-primary/20 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
                     >
                        <RotateCcw className="h-4 w-4" />
                        New Analysis
                     </button>

                     {onBack && (
                        <button
                           onClick={onBack}
                           className="h-14 rounded-full glass-panel border border-primary/20 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
                        >
                           <ArrowLeft className="h-4 w-4" />
                           Back
                        </button>
                     )}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}
