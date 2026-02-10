'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Video, RefreshCw, XCircle, FlipHorizontal, Sun, Target, CheckCircle, UploadCloud } from 'lucide-react';
import HeartLoader from '@/components/ui/HeartLoader';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useColorNormalization } from '@/hooks/use-color-normalization'; // Import the hook

type BodyPart = 'skin' | 'under-eye' | 'fingernails';

export type CalibrationMetadata = {
  ambientLux: number | null;
  colorTemperatureKelvin: number | null;
  colorCorrectionMatrix: number[][] | null;
};

type LiveCameraAnalyzerProps = {
  onCapture: (file: File, dataUri: string, calibrationMetadata: CalibrationMetadata) => void;
  onFileUpload?: (file: File) => void;
  bodyPart?: BodyPart;
};

// Extend Window interface for AmbientLightSensor
declare global {
  interface Window {
    AmbientLightSensor: any;
  }
}

export function LiveCameraAnalyzer({ onCapture, onFileUpload, bodyPart }: LiveCameraAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lux, setLux] = useState<number | null>(null); // State for ambient light level
  const [lowLightCondition, setLowLightCondition] = useState(false); // State for low light alert

  // Calibration states
  const [calibrationStage, setCalibrationStage] = useState<'idle' | 'calibrating_white' | 'capturing_subject'>('idle');
  
  const { toast } = useToast();
  // Call the useColorNormalization hook
  const { colorTemperatureKelvin, colorCorrectionMatrix, performCalibration, applyColorCorrection, resetCalibration } = useColorNormalization();

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
        setCameraError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        if (error instanceof Error) {
            if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                setCameraError('no-device');
            } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setCameraError('permission-denied');
            } else {
                setCameraError('unknown');
            }
        }
      }
    };

    getCameraPermission();

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // AmbientLightSensor integration
  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      const sensor = new window.AmbientLightSensor();

      sensor.onreading = () => {
        setLux(sensor.illuminance);
      };

      sensor.onerror = (event: any) => {
        console.error('AmbientLightSensor error:', event.error.name, event.error.message);
      };

      sensor.start();

      return () => {
        sensor.stop();
      };
    } else {
      console.warn('AmbientLightSensor not supported in this browser.');
    }
  }, []);

  // Luminance Guardrail effect
  useEffect(() => {
    if (lux !== null) {
      setLowLightCondition(lux < 300); // Trigger alert if lux is below 300
      if (lux < 300 && calibrationStage !== 'idle') {
          // If low light condition appears during calibration or capture, reset calibration
          setCalibrationStage('idle');
          resetCalibration(); // Reset calibration data from hook
          toast({
              title: "Calibration Reset",
              description: "Low light detected, please recalibrate in a brighter area.",
          });
      }
    }
  }, [lux, calibrationStage, toast, resetCalibration]);

  const handleSampleReferenceColor = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Define the Reference ROI area (e.g., center-right square)
    // Adjust these values based on actual UI positioning
    const roiSize = Math.min(video.videoWidth, video.videoHeight) * 0.2; // 20% of smallest dimension
    const roiX = (video.videoWidth / 2) + (roiSize / 2); // Example position: center-right
    const roiY = (video.videoHeight / 2) - (roiSize / 2);

    const calibrationResult = performCalibration(video, canvas, { x: roiX, y: roiY, width: roiSize, height: roiSize });

    if (calibrationResult) {
        setCalibrationStage('capturing_subject');
        toast({
            title: "Calibration Successful",
            description: `Color temperature estimated at ${calibrationResult.cct}K.`,
        });
    } else {
        toast({
            title: "Calibration Error",
            description: "Could not sample reference color. Ensure white paper is visible.",
            variant: "destructive"
        });
        setCalibrationStage('idle'); // Reset on error
    }
  }, [performCalibration, toast]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || lowLightCondition || calibrationStage !== 'capturing_subject') return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
        toast({
            title: 'Capture Error',
            description: 'Could not get canvas context.',
            variant: 'destructive',
        });
        setIsCapturing(false);
        return;
    };

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Apply color correction matrix if available
    if (colorCorrectionMatrix) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const correctedImageData = applyColorCorrection(imageData, colorCorrectionMatrix);
        context.putImageData(correctedImageData, 0, 0);
    }

    const calibrationMetadata: CalibrationMetadata = {
        ambientLux: lux,
        colorTemperatureKelvin: colorTemperatureKelvin,
        colorCorrectionMatrix: colorCorrectionMatrix,
    };

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'capture.png', { type: 'image/png' });
        const dataUri = canvas.toDataURL('image/png');
        onCapture(file, dataUri, calibrationMetadata);
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
    setCalibrationStage('idle'); // Reset calibration on camera flip
    resetCalibration(); // Reset hook state
  };

  const getOverlayInstruction = () => {
      if (calibrationStage === 'calibrating_white') {
          return "Hold a standard white surface (e.g., paper) in the right box, next to the subject area.";
      }
      if (calibrationStage === 'capturing_subject' && bodyPart) {
        switch (bodyPart) {
            case 'skin':
                return "Place your palm or skin area within the left circle.";
            case 'under-eye':
                return "Center your eyes in the left frame and look up slightly.";
            case 'fingernails':
                return "Place your fingernails in the left frame.";
            default:
                return "Position the subject in the left center.";
        }
      }
      return "Click 'Start Calibration' to begin the process.";
  };
  
  const renderOverlay = () => {
      if (hasCameraPermission !== true || lowLightCondition) return null;

      const mainRoiCn = cn(
          "relative z-10 border-2 border-white/80",
          bodyPart === 'skin' && "rounded-full w-48 h-48",
          bodyPart === 'under-eye' && "rounded-[50%] w-64 h-24",
          bodyPart === 'fingernails' && "rounded-lg w-56 h-32",
          calibrationStage === 'calibrating_white' && "opacity-50"
      );

      const referenceRoiCn = cn(
          "relative z-10 border-2 border-green-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]",
          "w-32 h-32 rounded-lg"
      );

      return (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {calibrationStage !== 'calibrating_white' && <div className="absolute inset-0 bg-black/40"></div>}
              
              {calibrationStage !== 'idle' ? (
                <div className="flex justify-center items-center h-full w-full gap-4">
                    <div className={mainRoiCn}>
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <div className="w-4 h-full bg-white/50 w-[1px]"></div>
                            <div className="h-4 w-full bg-white/50 h-[1px]"></div>
                        </div>
                    </div>
                    {calibrationStage === 'calibrating_white' && (
                        <div className={referenceRoiCn}>
                             <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                <div className="w-4 h-full bg-white/50 w-[1px]"></div>
                                <div className="h-4 w-full bg-white/50 h-[1px]"></div>
                            </div>
                        </div>
                    )}
                </div>
              ) : (
                <div className={cn(mainRoiCn, "shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]")}>
                     <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <div className="w-4 h-full bg-white/50 w-[1px]"></div>
                        <div className="h-4 w-full bg-white/50 h-[1px]"></div>
                    </div>
                </div>
              )}

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
          <HeartLoader size={40} strokeWidth={3} className="mb-4" />
          <p className="text-muted-foreground">Checking camera...</p>
        </div>
      );
    }
    
    if (!hasCameraPermission) {
         return (
             <div className="flex flex-col items-center justify-center text-center p-12 h-full space-y-6">
                <div className="p-6 bg-muted rounded-full">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Camera Unavailable</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {cameraError === 'no-device' 
                            ? "No camera was detected on this device. You can upload a photo from your gallery instead."
                            : "Camera access was denied. Please enable permissions or upload a photo manually."}
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button onClick={() => fileInputRef.current?.click()} className="w-full h-12 rounded-full">
                        <UploadCloud className="mr-2" />
                        Upload from Gallery
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onFileUpload) onFileUpload(file);
                        }}
                    />
                    <Button variant="ghost" onClick={() => window.location.reload()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Camera Again
                    </Button>
                </div>
            </div>
         );
    }

    return (
        <GlassSurface intensity="medium" className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video /> Live Camera Analysis</CardTitle>
                <CardDescription>Position your camera over your skin, under-eye, or fingernails and capture an image for analysis.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
                 <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-lg overflow-hidden border bg-black">
                     <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay muted playsInline />
                     {renderOverlay()}
                 </div>

                {lowLightCondition && (
                    <Alert variant="destructive" className="w-full max-w-2xl">
                        <Sun className="h-4 w-4" />
                        <AlertTitle>Low Light Detected</AlertTitle>
                        <AlertDescription>
                            Ambient light (approx. {lux} lux) is too low for accurate analysis. Please move to a brighter area (ideally &gt; 300 lux).
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center gap-4">
                    {calibrationStage === 'idle' && (
                        <Button onClick={() => setCalibrationStage('calibrating_white')} disabled={lowLightCondition} size="lg" variant="secondary">
                            <Target className="mr-2" />
                            Start Calibration
                        </Button>
                    )}
                    {calibrationStage === 'calibrating_white' && (
                        <Button onClick={handleSampleReferenceColor} disabled={lowLightCondition} size="lg">
                            <CheckCircle className="mr-2" />
                            Confirm White Reference
                        </Button>
                    )}
                    {calibrationStage === 'capturing_subject' && (
                        <Button onClick={handleCapture} disabled={isCapturing || lowLightCondition} size="lg">
                            {isCapturing ? <HeartLoader size={20} strokeWidth={3} /> : <Camera />}
                            <span className="ml-2">Capture Image</span>
                        </Button>
                    )}
                    <Button onClick={handleFlipCamera} variant="outline" size="icon" aria-label="Flip camera">
                        <FlipHorizontal />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Upload instead">
                        <UploadCloud />
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onFileUpload) onFileUpload(file);
                        }}
                    />
                </div>
                {calibrationStage !== 'idle' && (
                    <Button variant="ghost" onClick={() => {
                        setCalibrationStage('idle');
                        resetCalibration(); // Reset hook state
                    }}>
                        Reset Calibration
                    </Button>
                )}
            </CardContent>
        </GlassSurface>
    );
  };
  
  return (
    <>
      <div className="space-y-8 h-full flex flex-col">{renderContent()}</div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </>
  );
}
