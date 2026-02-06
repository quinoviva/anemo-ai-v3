'use client';

import React, { useState, useEffect } from 'react';
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription, Card } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Stethoscope, Eye, Hand, CheckCircle, XCircle, FileText, Camera, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveCameraAnalyzer, CalibrationMetadata } from '@/components/anemo/LiveCameraAnalyzer';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ImageAnalysisReport } from '@/components/anemo/ImageAnalysisReport';
import { AnalysisState } from '@/components/anemo/ImageAnalyzer';
import { LabReportCapture } from '@/components/anemo/LabReportCapture';
import { AnalysisGuide } from '@/components/anemo/AnalysisGuide';
import { AnemoLoading } from '@/components/ui/anemo-loading';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import { runGenerateImageDescription, saveImageForTraining } from '@/app/actions';
import dynamic from 'next/dynamic';

const LocalCbcAnalyzer = dynamic(() => import('@/components/anemo/LocalCbcAnalyzer').then(mod => mod.LocalCbcAnalyzer), { ssr: false });

type BodyPart = 'skin' | 'under-eye' | 'fingernails';

type Step = {
  id: 'screener' | 'ocular' | 'skin' | 'fingernails' | 'lab_report' | 'reconciliation';
  name: string;
  description: string;
  guideOverlay: string; // Deterministic guidance for each step
};

const analysisSteps: Step[] = [
  {
    id: 'ocular',
    name: 'Under-eye',
    description: 'Capture your lower palpebral conjunctiva.',
    guideOverlay: 'Position your camera to capture a clear image of your under-eye area. Ensure NO makeup is present.',
  },
  {
    id: 'skin',
    name: 'Skin (Palm)',
    description: 'Capture a clear image of your palm.',
    guideOverlay: 'Capture your bare palm. This area is vital for detecting skin pallor.',
  },
  {
    id: 'fingernails',
    name: 'Fingernails',
    description: 'Capture your bare fingernails.',
    guideOverlay: 'Position your bare fingernails in the frame. Ensure NO nail polish is present.',
  },
  {
    id: 'lab_report',
    name: 'Lab Report',
    description: 'Upload your CBC lab report.',
    guideOverlay: 'Providing a CBC report significantly improves the accuracy of the AI assessment.',
  },
  {
    id: 'reconciliation',
    name: 'Final Results',
    description: 'Review your personalized AI health report.',
    guideOverlay: 'Preparing your comprehensive anemia assessment and recommendations.',
  },
];

const initialCapturedImagesState: Record<BodyPart, { file: File, dataUri: string, calibrationMetadata: CalibrationMetadata } | null> = {
  skin: null,
  'under-eye': null,
  fingernails: null,
};

const initialAnalysisResultsState: Record<BodyPart, AnalysisState> = {
  skin: { file: null, imageUrl: null, dataUri: null, calibrationMetadata: null, description: null, isValid: false, analysisResult: null, error: null, status: 'idle' },
  'under-eye': { file: null, imageUrl: null, dataUri: null, calibrationMetadata: null, description: null, isValid: false, analysisResult: null, error: null, status: 'idle' },
  fingernails: { file: null, imageUrl: null, dataUri: null, calibrationMetadata: null, description: null, isValid: false, analysisResult: null, error: null, status: 'idle' },
};


export default function AnalysisPage() {
  const { user } = useUser();
  const [analysisMode, setAnalysisMode] = useState<'select' | 'full' | 'local-cbc'>('select');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(analysisSteps.length).fill(false));
  const [capturedImages, setCapturedImages] = useState<Record<BodyPart, { file: File, dataUri: string, calibrationMetadata: CalibrationMetadata } | null>>(initialCapturedImagesState);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<BodyPart, AnalysisState>>(initialAnalysisResultsState);
  const [labReportResult, setLabReportResult] = useState<AnalyzeCbcReportOutput | null>(null);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const currentStep = analysisSteps[currentStepIndex];
  const { toast } = useToast();

  const handleNextStep = () => {
    setCompletedSteps(prev => {
      const newCompleted = [...prev];
      newCompleted[currentStepIndex] = true;
      return newCompleted;
    });
    setShowGuide(true);
    if (currentStepIndex < analysisSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setShowGuide(true);
    }
  };

  const handleImageCapture = (bodyPart: BodyPart) => async (file: File, dataUri: string, calibrationMetadata: CalibrationMetadata) => {
    setIsAnalyzing(true);
    toast({ title: `Validating ${bodyPart}...`, description: 'Checking for bare skin and obstructions.' });
    
    try {
        const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart });
        
        if (!result.isValid) {
            toast({
                title: 'Image Rejected',
                description: result.description,
                variant: 'destructive'
            });
            setIsAnalyzing(false);
            return;
        }

        setCapturedImages(prev => ({
            ...prev,
            [bodyPart]: { file, dataUri, calibrationMetadata },
        }));

        setAnalysisResults(prev => ({
            ...prev,
            [bodyPart]: {
                file,
                imageUrl: URL.createObjectURL(file),
                dataUri,
                calibrationMetadata,
                description: result.description,
                isValid: true,
                analysisResult: result.analysisResult,
                confidenceScore: result.confidenceScore,
                status: 'success',
                error: null,
            }
        }));

        saveImageForTraining(dataUri, bodyPart, result.analysisResult, user?.displayName || 'Anonymous');
        
        toast({ title: 'Image Accepted!', description: 'Moving to the next step.' });
        handleNextStep();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reach AI service.';
        toast({ 
            title: 'Analysis Error', 
            description: errorMessage, 
            variant: 'destructive' 
        });
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (bodyPart: BodyPart) => (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUri = e.target?.result as string;
        // Mock calibration metadata for uploaded files
        const mockCalibration: CalibrationMetadata = {
            ambientLux: null,
            colorTemperatureKelvin: null,
            colorCorrectionMatrix: null
        };
        handleImageCapture(bodyPart)(file, dataUri, mockCalibration);
    };
    reader.readAsDataURL(file);
  };

  const handleLabReportComplete = (result: AnalyzeCbcReportOutput) => {
    setLabReportResult(result);
    handleNextStep();
  };

  const runAllAnalyses = async () => {
    // In this new flow, individual analyses are performed during capture.
    // This function can now be simplified or removed.
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (currentStep.id === 'reconciliation' && !isAnalyzing) {
        // All images are already validated and analyzed at this stage.
    }
  }, [currentStep.id, capturedImages, isAnalyzing]);


  // Placeholder for Stepper UI Component
  const Stepper = ({ currentStepIndex, completedSteps, steps }: { currentStepIndex: number; completedSteps: boolean[]; steps: Step[] }) => (
    <div className="flex justify-between items-center w-full mx-auto mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2",
                index === currentStepIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : completedSteps[index]
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground text-muted-foreground"
              )}
            >
              {completedSteps[index] ? <CheckCircle className="h-5 w-5" /> : index + 1}
            </div>
            <p
              className={cn(
                "mt-2 text-sm text-center",
                index === currentStepIndex ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              {step.name}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-px mx-2",
              completedSteps[index] ? "bg-green-500" : "bg-muted-foreground"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStepContent = () => {
    if (showGuide && (currentStep.id === 'ocular' || currentStep.id === 'skin' || currentStep.id === 'fingernails')) {
        const bodyPartMap: Record<string, BodyPart> = {
            'ocular': 'under-eye',
            'skin': 'skin',
            'fingernails': 'fingernails'
        };
        return (
            <GlassSurface intensity="medium" className="h-full border-primary/10 shadow-lg">
                <AnalysisGuide 
                    bodyPart={bodyPartMap[currentStep.id]} 
                    onComplete={() => setShowGuide(false)} 
                />
            </GlassSurface>
        );
    }

    switch (currentStep.id) {
      case 'ocular':
        return (
          <GlassSurface intensity="medium" className="h-full border-primary/10 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <CardTitle>Under-eye Area</CardTitle>
                    <CardDescription>{currentStep.guideOverlay}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                    Show Guide
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <LiveCameraAnalyzer 
                onCapture={handleImageCapture('under-eye')} 
                onFileUpload={handleFileUpload('under-eye')}
                bodyPart="under-eye" 
              />
            </CardContent>
          </GlassSurface>
        );
      case 'skin':
        return (
            <GlassSurface intensity="medium" className="h-full border-primary/10 shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle>Skin (Palm)</CardTitle>
                            <CardDescription>{currentStep.guideOverlay}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                            Show Guide
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                <LiveCameraAnalyzer 
                    onCapture={handleImageCapture('skin')} 
                    onFileUpload={handleFileUpload('skin')}
                    bodyPart="skin" 
                />
                </CardContent>
            </GlassSurface>
        );
      case 'fingernails':
        return (
            <GlassSurface intensity="medium" className="h-full border-primary/10 shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle>Bare Fingernails</CardTitle>
                            <CardDescription>{currentStep.guideOverlay}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                            Show Guide
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                <LiveCameraAnalyzer 
                    onCapture={handleImageCapture('fingernails')} 
                    onFileUpload={handleFileUpload('fingernails')}
                    bodyPart="fingernails" 
                />
                </CardContent>
            </GlassSurface>
        );
      case 'lab_report':
        return (
          <GlassSurface intensity="medium" className="h-full border-primary/10 shadow-lg p-6">
             <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">CBC Lab Report</h3>
                  <p className="text-muted-foreground max-w-md">
                    Upload a photo of your recent CBC (Complete Blood Count) report. 
                    Our AI will extract key values to provide a more accurate assessment.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <Button onClick={() => setIsLabModalOpen(true)} className="w-full h-12 rounded-full">
                    {labReportResult ? 'Change Lab Report' : 'Upload Lab Report'}
                  </Button>
                  <LabReportCapture 
                    isOpen={isLabModalOpen} 
                    onClose={() => setIsLabModalOpen(false)} 
                    onAnalysisComplete={(res) => {
                      handleLabReportComplete(res);
                      setIsLabModalOpen(false);
                    }}
                  />
                  <Button variant="ghost" onClick={handleNextStep} className="w-full h-12 rounded-full">
                    {labReportResult ? 'Continue' : 'Skip this step'}
                  </Button>
                </div>
                {labReportResult && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Lab report analyzed successfully!
                    </p>
                  </div>
                )}
             </div>
          </GlassSurface>
        );
      case 'reconciliation':
        const allImagesCaptured = Object.values(capturedImages).every(img => img !== null);
        if (!allImagesCaptured) {
            return (
                <Alert variant="destructive" className="glass border-destructive/20">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Missing Data</AlertTitle>
                    <AlertDescription>Please go back and complete all required image captures before proceeding to final reconciliation.</AlertDescription>
                    <Button onClick={() => {
                        if (!capturedImages['under-eye']) setCurrentStepIndex(0);
                        else if (!capturedImages['skin']) setCurrentStepIndex(1);
                        else if (!capturedImages['fingernails']) setCurrentStepIndex(2);
                    }} className="mt-4 rounded-full" variant="outline">Go Back to Previous Step</Button>
                </Alert>
            );
        }
        return (
          <GlassSurface intensity="medium" className="border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Final Anemia Assessment</CardTitle>
              <CardDescription>{currentStep.guideOverlay}</CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <AnemoLoading />
                  <p className="text-muted-foreground">Analyzing all captured data...</p>
                </div>
              ) : (
                Object.values(analysisResults).every(res => res.status !== 'idle') ? (
                    <ImageAnalysisReport 
                        analyses={analysisResults} 
                        labReport={labReportResult}
                        onReset={() => {
                            setCurrentStepIndex(0); // Go back to start
                            setCompletedSteps(new Array(analysisSteps.length).fill(false));
                            setCapturedImages(initialCapturedImagesState);
                            setAnalysisResults(initialAnalysisResultsState);
                            setLabReportResult(null);
                        }} 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center p-8">
                        <AnemoLoading />
                        <p className="text-muted-foreground">Preparing final analysis report...</p>
                    </div>
                )
              )}
            </CardContent>
          </GlassSurface>
        );
      default:
        return null;
    }
  };

  if (analysisMode === 'select') {
    return (
      <div className="max-w-4xl mx-auto space-y-10 py-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground">Select Analysis Mode</h1>
          <p className="text-muted-foreground text-lg max-w-lg">Choose how you want to check for potential anemia today.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Option 1: Full Assessment */}
          <Card className="relative overflow-hidden cursor-pointer group hover:border-primary transition-all duration-300" onClick={() => setAnalysisMode('full')}>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Camera className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Full Multimodal Check</CardTitle>
              <CardDescription className="text-base">
                Our most accurate assessment using your camera to analyze eye, skin, and nails combined with lab data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                 <li className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-green-500" /> Analyzes conjunctiva, palm, & nails</li>
                 <li className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-green-500" /> Integrates optional lab reports</li>
                 <li className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-green-500" /> Comprehensive AI Health Report</li>
              </ul>
              <Button className="w-full mt-8" variant="default">Start Full Scan</Button>
            </CardContent>
          </Card>

          {/* Option 2: Local CBC Check */}
          <Card className="relative overflow-hidden cursor-pointer group hover:border-emerald-500 transition-all duration-300" onClick={() => setAnalysisMode('local-cbc')}>
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl">Quick CBC Analysis</CardTitle>
                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                    New
                  </span>
              </div>
              <CardDescription className="text-base">
                Instant analysis of your CBC lab report using on-device AI for privacy and speed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                 <li className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 text-emerald-500" /> 100% Local AI (Privacy Focused)</li>
                 <li className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-emerald-500" /> Instant PDF Report Generation</li>
                 <li className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-emerald-500" /> No server upload required</li>
              </ul>
              <Button className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white">Upload Report</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (analysisMode === 'local-cbc') {
    return <LocalCbcAnalyzer onBack={() => setAnalysisMode('select')} />;
  }

  return (
    <div className="space-y-8 w-full mx-auto">
      <div className="flex items-center justify-start mb-4">
         <Button variant="ghost" onClick={() => setAnalysisMode('select')} className="gap-2">
            &larr; Back to Options
         </Button>
      </div>

      <div className="flex flex-col items-center text-center space-y-2 mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Anemo Check Analysis</h1>
        <p className="text-muted-foreground max-w-lg">Follow the steps below to complete your multimodal anemia assessment.</p>
      </div>
      <Stepper currentStepIndex={currentStepIndex} completedSteps={completedSteps} steps={analysisSteps} />
      <div className="py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderStepContent()}
      </div>
    </div>
  );
}
