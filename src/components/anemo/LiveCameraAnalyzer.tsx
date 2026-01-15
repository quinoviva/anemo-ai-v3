'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Video, RefreshCw, XCircle, FlipHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type BodyPart = 'skin' | 'under-eye' | 'fingernails';

type LiveCameraAnalyzerProps = {
  onCapture: (file: File, dataUri: string) => void;
  bodyPart?: BodyPart;
};

export function LiveCameraAnalyzer({ onCapture, bodyPart }: LiveCameraAnalyzerProps) {
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

  const getOverlayInstruction = () => {
      switch (bodyPart) {
          case 'skin':
              return "Place your palm or skin area within the circle.";
          case 'under-eye':
              return "Center your eyes in the frame and look up slightly.";
          case 'fingernails':
              return "Place your fingernails in the center of the frame.";
          default:
              return "Position the subject in the center.";
      }
  };
  
  const renderOverlay = () => {
      if (!bodyPart) return <div className="absolute inset-0 bg-grid-slate-100/[0.075] [mask-image:linear-gradient(to_bottom,white_40%,transparent_90%)]"></div>;

      return (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Darkened background with cutout */}
              <div className="absolute inset-0 bg-black/40"></div>
              
              {/* Cutout Shape */}
              <div className={cn(
                  "relative z-10 border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]",
                  bodyPart === 'skin' && "rounded-full w-48 h-48",
                  bodyPart === 'under-eye' && "rounded-[50%] w-64 h-24", // Oval
                  bodyPart === 'fingernails' && "rounded-lg w-56 h-32"
              )}>
                 {/* Crosshair/Guides inside the shape */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-4 h-full bg-white/50 w-[1px]"></div>
                    <div className="h-4 w-full bg-white/50 h-[1px]"></div>
                 </div>
              </div>

              {/* Instruction Text */}
              <div className="absolute bottom-4 z-20 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {getOverlayInstruction()}
              </div>
          </div>
      );
  }

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
                     <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay muted playsInline />
                     {renderOverlay()}
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
