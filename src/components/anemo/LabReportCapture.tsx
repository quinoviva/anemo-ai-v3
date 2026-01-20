'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, XCircle, Sparkles, Upload, Send, FileUp, Info, Hospital, Stethoscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runAnalyzeCbcReport } from '@/app/actions';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';

type LabReportCaptureProps = {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: AnalyzeCbcReportOutput) => void;
};

type AnalysisStep = 'upload' | 'analyzing' | 'result' | 'saving';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function LabReportCapture({ isOpen, onClose, onAnalysisComplete }: LabReportCaptureProps) {
  const [step, setStep] = useState<AnalysisStep>('upload');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeCbcReportOutput | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const resetState = () => {
    setStep('upload');
    setAnalysisResult(null);
    setSelectedFile(null);
    setHospitalName('');
    setDoctorName('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            title: 'Invalid File',
            description: 'Please upload a valid image file.',
            variant: 'destructive',
        });
        return;
    }
    if (file.size > MAX_FILE_SIZE) {
        toast({
            title: 'File Too Large',
            description: `The selected file exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB size limit.`,
            variant: 'destructive',
        });
        return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };


  const handleAnalyze = () => {
    if (!selectedFile) return;
    
    setStep('analyzing');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;

       try {
         const result = await runAnalyzeCbcReport({ photoDataUri: dataUri });
         if (!result.parameters || result.parameters.length === 0) {
            toast({
                title: 'Analysis Failed',
                description: result.summary || 'Could not read the lab report. Please try again with a clearer image.',
                variant: 'destructive'
            })
            setStep('upload');
            return;
        }
        setAnalysisResult(result);
        setStep('result');
        if (onAnalysisComplete) onAnalysisComplete(result);
       } catch (err) {
         toast({
          title: 'AI Analysis Error',
          description: err instanceof Error ? err.message : 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setStep('upload');
       }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSaveResult = async () => {
    if (!user || !firestore || !analysisResult) {
      toast({
        title: 'Save Error',
        description: 'You must be logged in to save results.',
        variant: 'destructive',
      });
      return;
    }
    
    setStep('saving');
    
    try {
      const reportsCollection = collection(firestore, `users/${user.uid}/labReports`);
      await addDoc(reportsCollection, {
        ...analysisResult,
        hospitalName: hospitalName,
        doctorName: doctorName,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Success',
        description: 'Lab report saved to your history.',
      });
      handleClose();
    } catch(err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({
        title: 'Firestore Error',
        description: `Could not save the report. ${errorMessage}`,
        variant: 'destructive',
      });
      setStep('result');
    }
  };


  const renderUploadView = () => (
    <>
      <DialogHeader>
        <DialogTitle>Upload CBC Lab Report</DialogTitle>
        <DialogDescription>Select or drag and drop a clear, well-lit image of your lab report.</DialogDescription>
      </DialogHeader>
      <div 
        className="py-4 space-y-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
            e.preventDefault();
            handleFileChange(e.dataTransfer.files[0]);
        }}
    >
        {previewUrl ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-black mx-auto max-w-sm">
                <img src={previewUrl} alt="Lab report preview" className="w-full h-full object-contain" />
            </div>
        ) : (
             <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg">
                <FileUp className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Drag & drop an image here</p>
                <p className="text-xs text-muted-foreground">or</p>
                <Button variant="link" size="sm" onClick={() => inputRef.current?.click()}>
                    Browse files
                </Button>
            </div>
        )}
         <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
        />
        {selectedFile && (
             <div className="space-y-4">
                <div>
                    <Label htmlFor="hospital-name">Hospital/Clinic Name (Optional)</Label>
                    <div className="relative">
                        <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            id="hospital-name"
                            placeholder="e.g., Iloilo Doctors' Hospital"
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div>
                    <Label htmlFor="doctor-name">Doctor's Name (Optional)</Label>
                    <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            id="doctor-name"
                            placeholder="e.g., Dr. Juan Dela Cruz"
                            value={doctorName}
                            onChange={(e) => setDoctorName(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>
        )}
      </div>
      <DialogFooter className='sm:justify-between items-center'>
        <Button onClick={() => { setSelectedFile(null); if(previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} variant="outline" disabled={!selectedFile}>
          Change Image
        </Button>
        <Button onClick={handleAnalyze} disabled={!selectedFile}>
          <Send className="mr-2" />
          Analyze
        </Button>
      </DialogFooter>
    </>
  );

  const renderAnalyzingView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="sr-only">AI is Analyzing Your Report</DialogTitle>
        <DialogDescription className="sr-only">The AI is currently analyzing your lab report. Please wait a moment.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <Sparkles className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold">AI is Analyzing Your Report...</h3>
        <p className="text-muted-foreground">This may take a moment. Please wait.</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary mt-6" />
      </div>
    </>
  );
  
  const renderResultView = () => {
    const isAnemiaPositive = analysisResult?.summary?.toLowerCase().includes('anemia');

    return (
    <>
      <DialogHeader>
        <DialogTitle>AI Analysis Result</DialogTitle>
        <DialogDescription>Review the extracted information from your lab report. This is not medical advice.</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh] my-4">
        <div className="py-4 space-y-4 pr-6">
          <Alert variant={isAnemiaPositive ? 'destructive' : 'default'}>
            <AlertTitle>Summary</AlertTitle>
            <AlertDescription>{analysisResult?.summary}</AlertDescription>
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
              {analysisResult?.parameters.map((p) => (
                <TableRow key={p.parameter}>
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
        <Button variant="outline" onClick={() => setStep('upload')}>Re-upload</Button>
        <Button onClick={handleSaveResult} disabled={step === 'saving'}>
            {step === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save to History
        </Button>
      </DialogFooter>
    </>
    );
  };

  const renderContent = () => {
    switch(step) {
      case 'analyzing':
      case 'saving':
        return renderAnalyzingView();
      case 'result':
        return renderResultView();
      case 'upload':
      default:
        return renderUploadView();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
