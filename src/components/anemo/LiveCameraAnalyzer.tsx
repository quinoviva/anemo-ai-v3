'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Video, RefreshCw, XCircle, FlipHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type LiveCameraAnalyzerProps = {
  onCapture: (file: File, dataUri: string) => void;
};

export function LiveCameraAnalyzer({ onCapture }: LiveCameraAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    const getCameraPermission = async () => {
      stopStream(); // Stop any existing stream before starting a new one

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode }
        });
        setStream(newStream);
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
        toast({
            title: 'Capture Error',
            description: 'Could not get canvas context.',
            variant: 'destructive',
        });
        setIsCapturing(false);
        return;
    };

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'capture.png', { type: 'image/png' });
        const dataUri = canvas.toDataURL('image/png');
        onCapture(file, dataUri);
      } else {
         toast({
            title: 'Capture Error',
            description: 'Could not create image blob.',
            variant: 'destructive',
        });
      }
      setIsCapturing(false);
    }, 'image/png');
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };
  

  const renderContent = () => {
    if (hasCameraPermission === null) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 h-full">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Requesting camera access...</p>
        </div>
      );
    }
    
    if (!hasCameraPermission) {
         return (
             <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                <Alert variant="destructive" className="max-w-md">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                        Anemo Check needs permission to use your camera for live analysis. Please grant access in your browser's settings.
                    </AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2" />
                  Retry
                </Button>
            </div>
         );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video /> Live Camera Analysis</CardTitle>
                <CardDescription>Position your camera over your skin, under-eye, or fingernails and capture an image for analysis.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
                 <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-lg overflow-hidden border bg-black">
                     <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                     <div className="absolute inset-0 bg-grid-slate-100/[0.075] [mask-image:linear-gradient(to_bottom,white_40%,transparent_90%)]"></div>
                 </div>

                <div className="flex items-center gap-4">
                    <Button onClick={handleCapture} disabled={isCapturing} size="lg">
                        {isCapturing ? <Loader2 className="animate-spin" /> : <Camera />}
                        <span className="ml-2">Capture Image</span>
                    </Button>
                    <Button onClick={handleFlipCamera} variant="outline" size="icon" aria-label="Flip camera">
                        <FlipHorizontal />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
  };
  
  return (
    <>
      <div className="space-y-8 h-full flex flex-col">{renderContent()}</div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </>
  );
}
