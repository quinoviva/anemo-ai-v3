'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Download, RefreshCw, AlertTriangle, CheckCircle, Cpu, FileUp } from 'lucide-react';
import HeartLoader from '@/components/ui/HeartLoader';
import { useToast } from '@/hooks/use-toast';
import { runLocalCbcAnalysis } from '@/ai/local-ai';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type LocalCbcAnalyzerProps = {
  onBack: () => void;
};

type AnalysisState = 'idle' | 'ocr' | 'analyzing' | 'complete' | 'error';

export function LocalCbcAnalyzer({ onBack }: LocalCbcAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisState>('idle');
  const [progress, setProgress] = useState(0); // For OCR progress
  const [result, setResult] = useState<any | null>(null); // Using any for the loose JSON structure from local AI
  const [error, setError] = useState<string | null>(null);
  const [isNanoAvailable, setIsNanoAvailable] = useState<boolean | null>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      
      const { data: { text } } = await worker.recognize(previewUrl);
      await worker.terminate();

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
        throw new Error('Gemini Nano (Local AI) is not available in this browser. Please use Chrome Canary or a supported environment.');
      }

      if (analysisResult.error) {
        throw new Error(analysisResult.error);
      }

      setResult(analysisResult);
      setStatus('complete');

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>&larr; Back to Options</Button>
        <div className="flex items-center gap-2">
           <Cpu className={`h-5 w-5 ${isNanoAvailable ? 'text-green-500' : 'text-yellow-500'}`} />
           <span className="text-sm text-muted-foreground">
             Local AI: {isNanoAvailable === null ? 'Checking...' : isNanoAvailable ? 'Ready' : 'Not Detected'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Upload CBC Report</CardTitle>
            <CardDescription>Select a clear image of your Complete Blood Count result.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div 
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[200px]"
                onClick={() => fileInputRef.current?.click()}
             >
                {previewUrl ? (
                   <img src={previewUrl} alt="Preview" className="max-h-[300px] w-full object-contain rounded-md" />
                ) : (
                   <>
                      <FileUp className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG supported</p>
                   </>
                )}
                <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*" 
                   onChange={handleFileChange} 
                />
             </div>
             
             {file && status !== 'analyzing' && status !== 'ocr' && (
                <Button className="w-full" onClick={processImage}>
                   <Cpu className="mr-2 h-4 w-4" /> Analyze with Local AI
                </Button>
             )}

             {(status === 'ocr' || status === 'analyzing') && (
                <div className="space-y-2 text-center py-4">
                   <HeartLoader size={32} strokeWidth={3} className="mx-auto" />
                   <p className="text-sm font-medium">
                      {status === 'ocr' ? `Reading Text (${progress}%)` : 'Local AI Processing...'}
                   </p>
                   <p className="text-xs text-muted-foreground">
                      {status === 'ocr' ? 'Extracting data from image' : 'Gemini Nano is analyzing the results'}
                   </p>
                </div>
             )}
             
             {status === 'error' && (
                <Alert variant="destructive">
                   <AlertTriangle className="h-4 w-4" />
                   <AlertTitle>Analysis Failed</AlertTitle>
                   <AlertDescription>{error}</AlertDescription>
                </Alert>
             )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-4">
            {status === 'complete' && result ? (
               <div className="space-y-4">
                   <Card ref={reportRef} className="bg-background print:shadow-none">
                      <CardHeader className="border-b pb-4">
                         <div className="flex justify-between items-start">
                            <div>
                               <CardTitle className="text-2xl text-primary">CBC Analysis Report</CardTitle>
                               <CardDescription>Generated via On-Device AI • {new Date().toLocaleDateString()}</CardDescription>
                            </div>
                            <Cpu className="h-6 w-6 text-muted-foreground opacity-20" />
                         </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                         
                         {/* Summary Box */}
                         <div className={`p-4 rounded-lg border ${result.summary?.includes('POSITIVE') ? 'bg-red-500/10 border-red-500/20' : result.summary?.includes('NEGATIVE') ? 'bg-green-500/10 border-green-500/20' : 'bg-muted border-muted-foreground/20'}`}>
                            <h4 className={`font-semibold mb-1 flex items-center gap-2 ${result.summary?.includes('POSITIVE') ? 'text-red-700' : result.summary?.includes('NEGATIVE') ? 'text-green-700' : 'text-muted-foreground'}`}>
                               {result.summary?.includes('POSITIVE') ? <AlertTriangle className="h-4 w-4" /> : result.summary?.includes('NEGATIVE') ? <CheckCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                               Assessment Summary
                            </h4>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                               {result.summary || 'No summary generated.'}
                            </p>
                         </div>

                         {/* Parameters Table */}
                         {result.parameters && result.parameters.length > 0 ? (
                            <Table>
                               <TableHeader>
                                  <TableRow>
                                     <TableHead>Parameter</TableHead>
                                     <TableHead>Value</TableHead>
                                     <TableHead>Status</TableHead>
                                  </TableRow>
                               </TableHeader>
                               <TableBody>
                                  {result.parameters.map((p: any, i: number) => (
                                     <TableRow key={i}>
                                        <TableCell className="font-medium">{p.parameter}</TableCell>
                                        <TableCell>{p.value} <span className="text-xs text-muted-foreground">{p.unit}</span></TableCell>
                                        <TableCell>
                                           <Badge variant={p.isNormal === false ? 'destructive' : 'outline'}>
                                              {p.isNormal === false ? 'Abnormal' : 'Normal'}
                                           </Badge>
                                        </TableCell>
                                     </TableRow>
                                  ))}
                               </TableBody>
                            </Table>
                         ) : (
                            <div className="text-center py-8 text-muted-foreground italic">
                               No structured parameters extracted.
                            </div>
                         )}
                         
                         <div className="text-[10px] text-muted-foreground pt-4 border-t">
                            Disclaimer: This analysis is performed by an experimental local AI model. Results may vary and should not be treated as a definitive medical diagnosis. Always consult a healthcare professional.
                         </div>
                      </CardContent>
                   </Card>

                   <Button className="w-full" size="lg" onClick={downloadPdf}>
                      <Download className="mr-2 h-4 w-4" /> Download PDF Report
                   </Button>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center p-8 border rounded-xl border-dashed bg-muted/20 text-muted-foreground">
                  {status === 'idle' && (
                     <>
                        <FileText className="h-16 w-16 mb-4 opacity-20" />
                        <p>Upload an image to see the analysis report here.</p>
                     </>
                  )}
                  {(status === 'ocr' || status === 'analyzing') && (
                     <>
                        <RefreshCw className="h-16 w-16 mb-4 animate-spin opacity-20" />
                        <p>Generating report...</p>
                     </>
                  )}
               </div>
            )}
        </div>
      </div>
    </div>
  );
}
