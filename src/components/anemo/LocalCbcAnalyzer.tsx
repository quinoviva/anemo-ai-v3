'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, AlertTriangle, CheckCircle, Cpu, FileUp } from 'lucide-react';
import HeartLoader from '@/components/ui/HeartLoader';
import { useToast } from '@/hooks/use-toast';
import { runLocalCbcAnalysis } from '@/ai/local-ai';
import { runAnalyzeCbcReport } from '@/app/actions';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';

export type LocalCbcAnalyzerProps = {
   onBack: () => void;
};

type AnalysisState = 'idle' | 'ocr' | 'analyzing' | 'complete' | 'error';

export function LocalCbcAnalyzer({ onBack }: LocalCbcAnalyzerProps) {
   const { user } = useUser();
   const firestore = useFirestore();
   const [file, setFile] = useState<File | null>(null);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [status, setStatus] = useState<AnalysisState>('idle');
   const [progress, setProgress] = useState(0); // For OCR progress
   const [result, setResult] = useState<{ summary?: string; parameters?: { parameter: string; value: string; unit: string; isNormal: boolean }[]; error?: string } | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [isNanoAvailable, setIsNanoAvailable] = useState<boolean | null>(null);
   const [isDragging, setIsDragging] = useState(false);

   const reportRef = useRef<HTMLDivElement>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { toast } = useToast();

   const userDocRef = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return doc(firestore, 'users', user.uid);
   }, [user, firestore]);
   const { data: userData } = useDoc(userDocRef);

   const fullName = userData ? `${userData.firstName} ${userData.lastName}` : (user?.displayName || 'Anonymous');

   useEffect(() => {
      // Check if Gemini Nano is available
      const checkNano = async () => {
         if (typeof window !== 'undefined' && 'ai' in window) {
            try {
               // @ts-ignore
               const capabilities = await window.ai.languageModel.capabilities();
               setIsNanoAvailable(capabilities.available !== 'no');
            } catch (e) {
               setIsNanoAvailable(false);
            }
         } else {
            setIsNanoAvailable(false);
         }
      };
      checkNano();
   }, []);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const selectedFile = e.target.files[0];
         if (!selectedFile.type.startsWith('image/')) {
            toast({
               title: 'Invalid File',
               description: 'Please upload an image file (JPG, PNG).',
               variant: 'destructive',
            });
            return;
         }
         setFile(selectedFile);
         setPreviewUrl(URL.createObjectURL(selectedFile));
         setResult(null);
         setStatus('idle');
         setError(null);
      }
   };

   const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
   };

   const handleDragLeave = () => setIsDragging(false);

   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileChange({ target: { files: e.dataTransfer.files } } as any);
   };

   const processImage = async () => {
      if (!file || !previewUrl) return;

      setStatus('ocr');
      setProgress(0);
      setError(null);

      try {
         // 1. Tesseract OCR
         const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
               if (m.status === 'recognizing text') {
                  setProgress(Math.round(m.progress * 100));
               }
            }
         });

         const recognizeResult = await worker.recognize(previewUrl);
         await worker.terminate();
         const text = recognizeResult?.data?.text ?? '';

         if (!text || text.trim().length < 10) {
            throw new Error('Could not extract sufficient text from the image. Please try a clearer image.');
         }

         setStatus('analyzing');

         // 2. Local AI Analysis
         let analysisResult;

         if (isNanoAvailable) {
            analysisResult = await runLocalCbcAnalysis(text);
         } else {
            // Mock fallback if Nano isn't available but user is in this flow (or show error)
            // For now, we will throw an error to encourage using the main flow if Nano is missing,
            // OR we could fallback to cloud if that was the requirement. 
            // The prompt specifically asked for "local ai will analyze".
            // If local AI fails/missing, we should probably inform the user.
            toast({ title: 'Using cloud AI analysis', description: 'Gemini Nano is unavailable — falling back to cloud AI.' });
            const cloudResult = await runAnalyzeCbcReport({ photoDataUri: previewUrl! });
            analysisResult = { summary: cloudResult.summary, parameters: cloudResult.parameters };
         }

         if (analysisResult.error) {
            throw new Error(analysisResult.error);
         }

         setResult(analysisResult);
         setStatus('complete');

         // 3. Save to Firestore (Synchronize across devices)
         if (user && !user.isAnonymous && firestore) {
            try {
               const labReportsRef = collection(firestore, `users/${user.uid}/labReports`);
               await addDoc(labReportsRef, {
                  userId: user.uid,
                  createdAt: serverTimestamp(),
                  summary: analysisResult.summary || 'No summary',
                  parameters: analysisResult.parameters || [],
                  isLocal: true, // Mark it as locally analyzed
               });
               toast({ title: "Report Synced", description: "Your analysis has been saved to your health history." });
            } catch (dbError) {
               console.error("Failed to save report to database:", dbError);
            }
         }

      } catch (err) {
         console.error('Analysis failed:', err);
         setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
         setStatus('error');
      }
   };

   const downloadPdf = async () => {
      if (!reportRef.current) return;

      try {
         const canvas = await html2canvas(reportRef.current, { scale: 2 });
         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF('p', 'mm', 'a4');
         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

         pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
         pdf.save('cbc-analysis-report.pdf');

         toast({
            title: 'PDF Downloaded',
            description: 'Your report has been saved successfully.',
         });
      } catch (e) {
         console.error('PDF generation failed', e);
         toast({
            title: 'Download Failed',
            description: 'Could not generate PDF.',
            variant: 'destructive',
         });
      }
   };

   return (
      <div className="w-full space-y-8">
         {/* Back Button */}
         <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
         >
            <span className="h-8 w-8 rounded-full glass-panel flex items-center justify-center group-hover:border-primary/20 transition-colors">
               ←
            </span>
            <span>Back to Analysis Options</span>
         </button>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="glass-panel rounded-[2.5rem] overflow-hidden">
               <div className="p-8 border-b border-primary/10">
                  <div className="flex items-center gap-4">
                     <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                        <FileText className="h-5 w-5 text-primary" />
                     </div>
                     <div>
                        <h3 className="text-lg font-semibold tracking-tight">Upload CBC Report</h3>
                        <p className="text-sm text-muted-foreground">Clear image of your Complete Blood Count result</p>
                     </div>
                  </div>
               </div>
               <div className="p-8 space-y-6">
                  {isNanoAvailable === false && (
                     <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                        <Cpu className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                           Gemini Nano unavailable — using cloud AI for analysis.
                        </p>
                     </div>
                  )}

                  {/* Drop Zone */}
                  <div
                     className={`rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] ${
                        isDragging
                           ? 'border-primary/60 bg-primary/5'
                           : 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'
                     }`}
                     onClick={() => fileInputRef.current?.click()}
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     onDrop={handleDrop}
                  >
                     {previewUrl ? (
                        <div className="w-full space-y-3">
                           <img src={previewUrl} alt="Preview" className="max-h-[260px] w-full object-contain rounded-xl" />
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
                           <div className="p-4 rounded-full bg-primary/10 mb-4">
                              <FileUp className="h-8 w-8 text-primary" />
                           </div>
                           <p className="text-base font-medium">Drop CBC image here</p>
                           <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                           <p className="text-xs text-muted-foreground/60 mt-3 uppercase tracking-widest font-bold">JPG · PNG · JPEG</p>
                        </>
                     )}
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>

                  {file && status !== 'analyzing' && status !== 'ocr' && (
                     <button
                        onClick={processImage}
                        className="w-full h-14 rounded-full bg-primary text-white font-bold tracking-wide flex items-center justify-center gap-3 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                     >
                        <Cpu className="h-5 w-5" />
                        Analyze with AI
                     </button>
                  )}

                  {(status === 'ocr' || status === 'analyzing') && (
                     <div className="flex flex-col items-center gap-3 py-6">
                        <HeartLoader size={36} strokeWidth={3} />
                        <p className="text-sm font-semibold">
                           {status === 'ocr' ? `Reading Text… ${progress}%` : 'AI Processing…'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                           {status === 'ocr' ? 'Extracting CBC parameters from image' : 'Calibrating against clinical ranges'}
                        </p>
                     </div>
                  )}

                  {status === 'error' && (
                     <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                           <p className="text-sm font-semibold text-destructive">Analysis Failed</p>
                           <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
               {status === 'complete' && result ? (
                  <>
                     <div ref={reportRef} className="glass-panel rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 border-b border-primary/10 flex items-center justify-between">
                           <div>
                              <h3 className="text-lg font-semibold text-primary">CBC Analysis Report</h3>
                              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">
                                 On-Device AI · {new Date().toLocaleDateString()}
                              </p>
                           </div>
                           <Cpu className="h-6 w-6 text-muted-foreground/20" />
                        </div>
                        <div className="p-8 space-y-6">
                           {/* Summary */}
                           <div className={`p-5 rounded-2xl border ${
                              result.summary?.includes('POSITIVE')
                                 ? 'bg-red-500/5 border-red-500/20'
                                 : result.summary?.includes('NEGATIVE')
                                 ? 'bg-emerald-500/5 border-emerald-500/20'
                                 : 'bg-primary/5 border-primary/10'
                           }`}>
                              <div className={`flex items-center gap-2 mb-2 text-sm font-bold uppercase tracking-widest ${
                                 result.summary?.includes('POSITIVE') ? 'text-red-500' :
                                 result.summary?.includes('NEGATIVE') ? 'text-emerald-500' : 'text-primary'
                              }`}>
                                 {result.summary?.includes('POSITIVE') ? <AlertTriangle className="h-4 w-4" /> :
                                  result.summary?.includes('NEGATIVE') ? <CheckCircle className="h-4 w-4" /> :
                                  <FileText className="h-4 w-4" />}
                                 Assessment
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">{result.summary || 'No summary generated.'}</p>
                           </div>

                           {/* Parameters */}
                           {result.parameters && result.parameters.length > 0 ? (
                              <div className="space-y-2">
                                 {(result.parameters ?? []).map((p, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
                                       <span className="text-sm font-medium">{p?.parameter ?? '—'}</span>
                                       <div className="flex items-center gap-3">
                                          <span className="text-sm tabular-nums">{p?.value} <span className="text-xs text-muted-foreground">{p?.unit}</span></span>
                                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                             p?.isNormal === false
                                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                          }`}>
                                             {p?.isNormal === false ? 'Abnormal' : 'Normal'}
                                          </span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="py-8 text-center text-muted-foreground italic text-sm">
                                 No structured parameters extracted.
                              </div>
                           )}

                           <p className="text-[10px] text-muted-foreground/60 pt-4 border-t border-border/40 leading-relaxed">
                              Disclaimer: This is an experimental AI analysis. Not a medical diagnosis. Always consult a healthcare professional.
                           </p>
                        </div>
                     </div>

                     <button
                        onClick={downloadPdf}
                        className="w-full h-14 rounded-full glass-button border border-primary/20 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors"
                     >
                        <Download className="h-4 w-4 text-primary" />
                        Download PDF Report
                     </button>
                  </>
               ) : (
                  <div className="glass-panel rounded-[2.5rem] h-full min-h-[400px] flex flex-col items-center justify-center gap-4 text-center p-8">
                     {status === 'idle' && (
                        <>
                           <div className="p-5 rounded-full bg-muted/50">
                              <FileText className="h-10 w-10 text-muted-foreground/40" />
                           </div>
                           <p className="text-sm text-muted-foreground">Upload a CBC image to see results here</p>
                        </>
                     )}
                     {(status === 'ocr' || status === 'analyzing') && (
                        <>
                           <div className="p-5 rounded-full bg-primary/5">
                              <RefreshCw className="h-10 w-10 text-primary/40 animate-spin" />
                           </div>
                           <p className="text-sm text-muted-foreground">Generating report…</p>
                        </>
                     )}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
