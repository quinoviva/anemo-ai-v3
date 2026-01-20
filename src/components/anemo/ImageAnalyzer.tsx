'use client';

import React, { useState, useEffect } from 'react';
import { runGenerateImageDescription } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, XCircle, Loader2, CheckCircle, RefreshCw, Hand, Eye, User, Camera } from 'lucide-react';
import { ImageAnalysisReport } from './ImageAnalysisReport';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LiveCameraAnalyzer, CalibrationMetadata } from './LiveCameraAnalyzer';

type BodyPart = 'skin' | 'under-eye' | 'fingernails';

export type AnalysisState = {
  file: File | null;
  imageUrl: string | null;
  dataUri: string | null;
  calibrationMetadata: CalibrationMetadata | null;
  description: string | null;
  isValid: boolean;
  analysisResult: string | null;
  error: string | null;
  status: 'idle' | 'analyzing' | 'success' | 'error' | 'queued';
};

const initialAnalysisState: AnalysisState = {
  file: null,
  imageUrl: null,
  dataUri: null,
  calibrationMetadata: null,
  description: null,
  isValid: false,
  analysisResult: null,
  error: null,
  status: 'idle',
};

const analysisPoints: { id: BodyPart; title: string; description: string, icon: React.ReactNode }[] = [
  { id: 'skin', title: 'Skin', description: 'A clear photo of your skin, like the palm of your hand.', icon: <User /> },
  { id: 'under-eye', title: 'Under-eye', description: 'A clear photo of the lower under-eye area.', icon: <Eye /> },
  { id: 'fingernails', title: 'Fingernails', description: 'A clear photo of your bare fingernails.', icon: <Hand /> },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageAnalyzerProps {
    initialCapture?: {
        file: File;
        dataUri: string;
        bodyPart?: BodyPart;
    };
}

export function ImageAnalyzer({ initialCapture }: ImageAnalyzerProps) {
  const [analyses, setAnalyses] = useState<Record<BodyPart, AnalysisState>>({
    'skin': initialAnalysisState,
    'under-eye': initialAnalysisState,
    'fingernails': initialAnalysisState,
  });
  const [activeCameraBodyPart, setActiveCameraBodyPart] = useState<BodyPart | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
      if (initialCapture) {
          const { file, dataUri, bodyPart } = initialCapture;
          if (bodyPart) {
              handleImageChange(bodyPart, file);
          } else {
              toast({
                  title: "Image Captured",
                  description: "Please select which body part this image represents.",
              });
          }
      }
  }, [initialCapture]);

  React.useEffect(() => {
    return () => {
      Object.values(analyses).forEach(analysis => {
        if (analysis.imageUrl) {
          URL.revokeObjectURL(analysis.imageUrl);
        }
      });
    };
  }, [analyses]);

  const handleImageChange = (bodyPart: BodyPart, file: File | null) => {
    if (!file) {
        return;
    }
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (e.g., PNG, JPG).',
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

    setAnalyses(prev => ({
      ...prev,
      [bodyPart]: { ...initialAnalysisState, status: 'analyzing' },
    }));

    const imageUrl = URL.createObjectURL(file);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      setAnalyses(prev => ({
        ...prev,
        [bodyPart]: {
          ...prev[bodyPart],
          file,
          imageUrl,
          dataUri,
        },
      }));

      await startAnalysis(bodyPart, dataUri);
    };

    reader.readAsDataURL(file);
  };

  const startAnalysis = async (bodyPart: BodyPart, dataUri: string) => {
    try {
      const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart });
      
      setAnalyses(prev => ({
        ...prev,
        [bodyPart]: {
          ...prev[bodyPart],
          description: result.description,
          isValid: result.isValid,
          analysisResult: result.analysisResult,
          status: result.isValid ? 'success' : 'error',
          error: result.isValid ? null : result.description,
        }
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setAnalyses(prev => ({
        ...prev,
        [bodyPart]: {
          ...prev[bodyPart],
          status: 'error',
          error: `Failed to analyze image. ${errorMessage}`,
        }
      }));
      toast({
        title: 'Analysis Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  const resetAllAnalyses = () => {
    Object.keys(analyses).forEach(key => {
        const bodyPart = key as BodyPart;
        const currentAnalysis = analyses[bodyPart];
        if (currentAnalysis.imageUrl) {
            URL.revokeObjectURL(currentAnalysis.imageUrl);
        }
    });
    setAnalyses({
        'skin': initialAnalysisState,
        'under-eye': initialAnalysisState,
        'fingernails': initialAnalysisState,
    });
  };

  const resetSingleAnalysis = (bodyPart: BodyPart) => {
    const currentAnalysis = analyses[bodyPart];
    if (currentAnalysis.imageUrl) {
        URL.revokeObjectURL(currentAnalysis.imageUrl);
    }
    setAnalyses(prev => ({
        ...prev,
        [bodyPart]: initialAnalysisState
    }));
  };

  const allAnalysesComplete = Object.values(analyses).every(a => a.status === 'success' || a.status === 'queued');
  
  if (allAnalysesComplete) {
    return <ImageAnalysisReport analyses={analyses} onReset={resetAllAnalyses} labReport={null} />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {analysisPoints.map(({ id, title, description, icon }) => (
          <AnalysisCard
            key={id}
            bodyPart={id}
            title={title}
            description={description}
            analysisState={analyses[id]}
            icon={icon}
            onImageChange={(file) => handleImageChange(id, file)}
            onReset={() => resetSingleAnalysis(id)}
          />
        ))}
      </div>
    </div>
  );
}

// --- AnalysisCard Component ---
type AnalysisCardProps = {
  bodyPart: BodyPart;
  title: string;
  description: string;
  icon: React.ReactNode;
  analysisState: AnalysisState;
  onImageChange: (file: File | null) => void;
  onReset: () => void;
};

function AnalysisCard({
  bodyPart,
  title,
  description,
  icon,
  analysisState,
  onImageChange,
  onReset,
}: AnalysisCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    onImageChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const renderContent = () => {
    switch (analysisState.status) {
      case 'idle':
        return (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg h-48"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drag & drop or</p>
            <Button variant="link" size="sm" onClick={() => inputRef.current?.click()}>
              browse to upload
            </Button>
            <Input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onImageChange(e.target.files ? e.target.files[0] : null)}
            />
          </div>
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg h-48 bg-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Analyzing...</p>
          </div>
        );
      case 'queued':
        return (
            <div className="space-y-2">
            <div className="relative aspect-video rounded-md overflow-hidden border">
              {analysisState.imageUrl && <img src={analysisState.imageUrl} alt={title} className="object-cover w-full h-full opacity-70" />}
              <div className="absolute top-1 right-1">
                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onReset}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Alert className="bg-muted">
              <UploadCloud className="h-4 w-4" />
              <AlertTitle>Queued</AlertTitle>
              <AlertDescription>Waiting for connection...</AlertDescription>
            </Alert>
          </div>
        );
      case 'success':
        return (
          <div className="space-y-2">
            <div className="relative aspect-video rounded-md overflow-hidden border">
              {analysisState.imageUrl && <img src={analysisState.imageUrl} alt={title} className="object-cover w-full h-full" />}
              <div className="absolute top-1 right-1">
                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onReset}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Analysis Complete</AlertTitle>
              <AlertDescription>{analysisState.analysisResult}</AlertDescription>
            </Alert>
          </div>
        );
      case 'error':
        return (
          <div className="space-y-2">
             <div className="relative aspect-video rounded-md overflow-hidden border">
                {analysisState.imageUrl && <img src={analysisState.imageUrl} alt={title} className="object-cover w-full h-full opacity-50" />}
                 <div className="absolute top-1 right-1">
                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onReset}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>{analysisState.error}</AlertDescription>
            </Alert>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
            {icon} {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}