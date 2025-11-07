'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Loader2, Camera, Video, RefreshCw, XCircle, FlipHorizontal, Sparkles, Upload, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runAnalyzeCbcReport } from '@/app/actions';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '../ui/table';

type LabReportCaptureProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CaptureStep = 'camera' | 'analyzing' | 'result' | 'saving';

export function LabReportCapture({ isOpen, onClose }: LabReportCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<CaptureStep>('camera');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startStream = useCallback(async () => {
    stopStream();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      setStream(newStream);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      setHasPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  }, [facingMode, stopStream, toast]);

  useEffect(() => {
    if (isOpen) {
      startStream();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isOpen, startStream, stopStream]);
  
  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    setStep('camera');
    setAnalysisResult(null);
    onClose();
  };

  const handleCaptureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setStep('analyzing');
    stopStream();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const dataUri = canvas.toDataURL('image/jpeg');

    runAnalyzeCbcReport({ photoDataUri: dataUri })
      .then(result => {
        if (!result.parameters || result.parameters.length === 0) {
            toast({
                title: 'Analysis Failed',
                description: result.summary || 'Could not read the lab report. Please try again with a clearer image.',
                variant: 'destructive'
            })
            setStep('camera');
            startStream();
            return;
        }
        setAnalysisResult(result);
        setStep('result');
      })
      .catch(err => {
        toast({
          title: 'AI Analysis Error',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setStep('camera');
        startStream();
      });
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
  }


  const renderCameraView = () => (
    <>
      <DialogHeader>
        <DialogTitle>Scan CBC Lab Report</DialogTitle>
        <DialogDescription>Position your lab report in the frame and capture a clear, well-lit image.</DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        {hasPermission === false ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>Please grant camera permissions to continue.</AlertDescription>
          </Alert>
        ) : (
          <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden border bg-black mx-auto max-w-sm">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            {hasPermission === null && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
          </div>
        )}
      </div>
      <DialogFooter className='sm:justify-between items-center'>
        <Button onClick={handleFlipCamera} variant="outline" size="icon" aria-label="Flip camera">
          <FlipHorizontal />
        </Button>
        <Button onClick={handleCaptureAndAnalyze} disabled={!hasPermission}>
          <Camera className="mr-2" />
          Capture & Analyze
        </Button>
      </DialogFooter>
    </>
  );

  const renderAnalyzingView = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
      <Sparkles className="h-12 w-12 text-primary mb-4" />
      <h3 className="text-xl font-semibold">AI is Analyzing Your Report...</h3>
      <p className="text-muted-foreground">This may take a moment. Please wait.</p>
      <Loader2 className="h-8 w-8 animate-spin text-primary mt-6" />
    </div>
  );
  
  const renderResultView = () => (
    <>
      <DialogHeader>
        <DialogTitle>AI Analysis Result</DialogTitle>
        <DialogDescription>Review the extracted information from your lab report. This is not medical advice.</DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <Alert>
          <AlertTitle>Summary</AlertTitle>
          <AlertDescription>{analysisResult.summary}</AlertDescription>
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
            {analysisResult.parameters.map((p: any, i: number) => (
              <TableRow key={i}>
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
      <DialogFooter>
        <Button variant="outline" onClick={() => { setStep('camera'); startStream(); }}>Retake</Button>
        <Button onClick={handleSaveResult} disabled={step === 'saving'}>
            {step === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save to History
        </Button>
      </DialogFooter>
    </>
  );

  const renderContent = () => {
    switch(step) {
      case 'analyzing':
      case 'saving':
        return renderAnalyzingView();
      case 'result':
        return renderResultView();
      case 'camera':
      default:
        return renderCameraView();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {renderContent()}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </DialogContent>
    </Dialog>
  );
}