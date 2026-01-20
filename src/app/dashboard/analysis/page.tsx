'use client';

import React, { useState, useEffect } from 'react';
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Stethoscope, Eye, Hand, CheckCircle, Loader2, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveCameraAnalyzer, CalibrationMetadata } from '@/components/anemo/LiveCameraAnalyzer';
import { useToast } from '@/hooks/use-toast';
import { ImageAnalysisReport } from '@/components/anemo/ImageAnalysisReport';
import { AnalysisState } from '@/components/anemo/ImageAnalyzer';
import { LabReportCapture } from '@/components/anemo/LabReportCapture';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';

type BodyPart = 'skin' | 'under-eye' | 'fingernails';

type Step = {
  id: 'screener' | 'ocular' | 'physical_markers' | 'lab_report' | 'reconciliation';
  name: string;
  description: string;
  guideOverlay: string; // Deterministic guidance for each step
};

const analysisSteps: Step[] = [
  {
    id: 'screener',
    name: 'Screener',
    description: 'Complete the initial clinical screening.',
    guideOverlay: 'Complete the initial clinical screening to provide essential background information for a more accurate analysis. This step is crucial for personalized recommendations.',
  },
  {
    id: 'ocular',
    name: 'Ocular Analysis',
    description: 'Capture an image of your lower palpebral conjunctiva.',
    guideOverlay: 'Position your camera to capture a clear image of your lower palpebral conjunctiva (under-eye area) for hemoglobin level assessment. Ensure good lighting and a steady hand.',
  },
  {
    id: 'physical_markers',
    name: 'Physical Markers',
    description: 'Capture images of your skin (palm) and fingernails.',
    guideOverlay: 'First, capture a clear image of your palm. Then, proceed to capture an image of your bare fingernails. These physical markers help in assessing broader signs of anemia and complement ocular findings.',
  },
  {
    id: 'lab_report',
    name: 'Lab Report Analysis',
    description: 'Upload your CBC lab report for AI analysis.',
    guideOverlay: 'Upload a clear image of your Complete Blood Count (CBC) lab report. Our AI will extract key parameters to inform your anemia risk assessment. This provides a clinical perspective.',
  },
  {
    id: 'reconciliation',
    name: 'Final Reconciliation',
    description: 'Review your analysis results and personalized recommendations.',
    guideOverlay: 'Review your comprehensive analysis report. This report combines all captured data from image analysis and lab reports to provide a holistic view of your anemia risk and tailored recommendations.',
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(analysisSteps.length).fill(false));
  const [capturedImages, setCapturedImages] = useState<Record<BodyPart, { file: File, dataUri: string, calibrationMetadata: CalibrationMetadata } | null>>(initialCapturedImagesState);
  const [isScreenerCompleted, setIsScreenerCompleted] = useState(false);
  const [isLabReportCaptureOpen, setIsLabReportCaptureOpen] = useState(false);
  const [labReportAnalysisResult, setLabReportAnalysisResult] = useState<AnalyzeCbcReportOutput | null>(null);
  const [isLabReportCompleted, setIsLabReportCompleted] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<BodyPart, AnalysisState>>(initialAnalysisResultsState);

  const currentStep = analysisSteps[currentStepIndex];
  const { toast } = useToast();

  const handleNextStep = () => {
    setCompletedSteps(prev => {
      const newCompleted = [...prev];
      newCompleted[currentStepIndex] = true;
      return newCompleted;
    });
    if (currentStepIndex < analysisSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleImageCapture = (bodyPart: BodyPart) => (file: File, dataUri: string, calibrationMetadata: CalibrationMetadata) => {
    setCapturedImages(prev => ({
      ...prev,
      [bodyPart]: { file, dataUri, calibrationMetadata }, // Storing metadata
    }));
    toast({
      title: `${bodyPart} image captured!`,
      description: 'Image ready for analysis.',
    });
    // Automatically move to the next physical marker or reconciliation
    if (bodyPart === 'under-eye') {
        handleNextStep(); // Move from Ocular to Physical Markers
    } else if (bodyPart === 'skin') {
        // After skin, stay on physical markers to capture fingernails
        // The UI will determine if fingernails are ready
    } else if (bodyPart === 'fingernails') {
        // Only move to next step (Lab Report) if both skin and fingernails are captured
        if (capturedImages['skin'] && capturedImages['fingernails']) {
             handleNextStep(); // Move from Physical Markers to Lab Report
        }
    }
  };

  const handleLabReportAnalysisComplete = (result: AnalyzeCbcReportOutput) => {
    setLabReportAnalysisResult(result);
    setIsLabReportCompleted(true);
    setIsLabReportCaptureOpen(false); // Close dialog
    handleNextStep(); // Move to Reconciliation
  };

  const runAllAnalyses = async () => {
    setIsAnalyzing(true);
    const tempResults: Record<BodyPart, AnalysisState> = { ...initialAnalysisResultsState };

    // Simulate image analysis
    for (const bodyPart of ['skin', 'under-eye', 'fingernails'] as BodyPart[]) {
      const captured = capturedImages[bodyPart];
      if (captured) {
        try {
            // Mocking the analysis for now. In a real scenario, this would call `runGenerateImageDescription`
            // const result = await runGenerateImageDescription({ photoDataUri: captured.dataUri, bodyPart });
            // For now, simulate success
            const mockResult = {
                description: `Analysis for ${bodyPart} was successful.`,
                isValid: true,
                analysisResult: 'No immediate concerns based on ' + bodyPart,
            };
            tempResults[bodyPart] = {
                file: captured.file,
                imageUrl: URL.createObjectURL(captured.file),
                dataUri: captured.dataUri,
                calibrationMetadata: captured.calibrationMetadata, // Storing metadata
                description: mockResult.description,
                isValid: mockResult.isValid,
                analysisResult: mockResult.analysisResult,
                status: 'success',
                error: null,
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            tempResults[bodyPart] = {
                file: captured.file,
                imageUrl: URL.createObjectURL(captured.file),
                dataUri: captured.dataUri,
                calibrationMetadata: captured.calibrationMetadata, // Storing metadata
                status: 'error',
                error: `Failed to analyze ${bodyPart}. ${errorMessage}`,
                description: null,
                isValid: false,
                analysisResult: null,
            };
            toast({
                title: 'Analysis Error',
                description: `Failed to analyze ${bodyPart}: ${errorMessage}`,
                variant: 'destructive',
            });
        }
      }
    }
    setAnalysisResults(tempResults);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (currentStep.id === 'reconciliation' && !isAnalyzing) {
        // Check if all necessary images are captured and lab report is processed (if applicable)
        const allImagesCaptured = Object.values(capturedImages).every(img => img !== null);
        const canRunAnalysis = allImagesCaptured && Object.values(analysisResults).every(res => res.status === 'idle') && (!analysisSteps.some(step => step.id === 'lab_report') || isLabReportCompleted); // Only run if lab report step is not present or completed
        
        if (canRunAnalysis) {
             runAllAnalyses();
        }
    }
  }, [currentStep.id, capturedImages, isAnalyzing, analysisResults, isLabReportCompleted, analysisSteps]);


  // Placeholder for Stepper UI Component
  const Stepper = ({ currentStepIndex, completedSteps, steps }: { currentStepIndex: number; completedSteps: boolean[]; steps: Step[] }) => (
    <div className="flex justify-between items-center w-full max-w-4xl mx-auto mb-8">
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
    switch (currentStep.id) {
      case 'screener':
        return (
          <Card className="glass border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Clinical Screening</CardTitle>
              <CardDescription>{currentStep.guideOverlay}</CardDescription>
            </CardHeader>
            <CardContent>
              <CycleLogForm 
                onFormSubmit={() => {
                  setIsScreenerCompleted(true);
                  handleNextStep();
                }}
                trigger={<Button className='gap-2 rounded-full'><Stethoscope className='h-4 w-4'/> Complete Screening</Button>}
              />
               {isScreenerCompleted && <Alert className="mt-4 bg-primary/5 border-primary/20"><CheckCircle className="h-4 w-4 text-primary" /><AlertTitle>Screening Complete!</AlertTitle><AlertDescription>Proceed to Ocular Analysis.</AlertDescription></Alert>}
            </CardContent>
          </Card>
        );
      case 'ocular':
        return (
          <Card className="h-full glass border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Ocular Analysis</CardTitle>
              <CardDescription>{currentStep.guideOverlay}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <LiveCameraAnalyzer onCapture={handleImageCapture('under-eye')} bodyPart="under-eye" />
              {capturedImages['under-eye'] && <Alert className="mt-4 bg-primary/5 border-primary/20"><CheckCircle className="h-4 w-4 text-primary" /><AlertTitle>Ocular image captured!</AlertTitle><AlertDescription>Ready for the next step.</AlertDescription></Alert>}
            </CardContent>
          </Card>
        );
      case 'physical_markers':
        return (
          <div className="grid gap-6 md:grid-cols-2 h-full">
            <Card className="h-full flex flex-col glass border-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle>Skin Analysis (Palm)</CardTitle>
                <CardDescription>Capture a clear image of your palm.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <LiveCameraAnalyzer onCapture={handleImageCapture('skin')} bodyPart="skin" />
                {capturedImages['skin'] && <Alert className="mt-4 bg-primary/5 border-primary/20"><CheckCircle className="h-4 w-4 text-primary" /><AlertTitle>Skin image captured!</AlertTitle><AlertDescription>Ready for the next physical marker.</AlertDescription></Alert>}
              </CardContent>
            </Card>
            <Card className="h-full flex flex-col glass border-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle>Fingernail Analysis</CardTitle>
                <CardDescription>Capture a clear image of your bare fingernails.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <LiveCameraAnalyzer onCapture={handleImageCapture('fingernails')} bodyPart="fingernails" />
                {capturedImages['fingernails'] && <Alert className="mt-4 bg-primary/5 border-primary/20"><CheckCircle className="h-4 w-4 text-primary" /><AlertTitle>Fingernail image captured!</AlertTitle><AlertDescription>All physical markers captured.</AlertDescription></Alert>}
              </CardContent>
            </Card>
            {(capturedImages['skin'] && capturedImages['fingernails']) && (
                <div className="md:col-span-2 flex justify-end">
                    <Button onClick={handleNextStep} className="rounded-full shadow-md">Proceed to Lab Report Analysis</Button>
                </div>
            )}
          </div>
        );
      case 'lab_report':
        return (
          <Card className="glass border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Lab Report Analysis</CardTitle>
              <CardDescription>{currentStep.guideOverlay}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsLabReportCaptureOpen(true)} className='gap-2 rounded-full'>
                <FileText className='h-4 w-4'/>
                Upload CBC Report
              </Button>
              {isLabReportCompleted && labReportAnalysisResult && (
                <Alert className="mt-4 bg-primary/5 border-primary/20">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertTitle>Lab Report Processed!</AlertTitle>
                  <AlertDescription>Summary: {labReportAnalysisResult.summary}</AlertDescription>
                  <Button onClick={handleNextStep} className="mt-2 rounded-full">Proceed to Final Reconciliation</Button>
                </Alert>
              )}
            </CardContent>
            <LabReportCapture 
              isOpen={isLabReportCaptureOpen} 
              onClose={() => setIsLabReportCaptureOpen(false)} 
              onAnalysisComplete={handleLabReportAnalysisComplete} 
            />
          </Card>
        );
      case 'reconciliation':
        const allImagesCaptured = Object.values(capturedImages).every(img => img !== null);
        if (!allImagesCaptured || (analysisSteps.some(step => step.id === 'lab_report') && !isLabReportCompleted)) {
            return (
                <Alert variant="destructive" className="glass border-destructive/20">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Missing Data</AlertTitle>
                    <AlertDescription>Please go back and complete all required steps (image captures and/or lab report analysis) before proceeding to final reconciliation.</AlertDescription>
                    <Button onClick={() => {
                        if (!isScreenerCompleted) setCurrentStepIndex(0);
                        else if (!capturedImages['under-eye']) setCurrentStepIndex(1);
                        else if (!capturedImages['skin'] || !capturedImages['fingernails']) setCurrentStepIndex(2);
                        else if (!isLabReportCompleted) setCurrentStepIndex(3);
                    }} className="mt-4 rounded-full" variant="outline">Go Back to Previous Step</Button>
                </Alert>
            );
        }
        return (
          <Card className="glass border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle>Final Reconciliation</CardTitle>
              <CardDescription>{currentStep.guideOverlay}</CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyzing all captured data...</p>
                </div>
              ) : (
                Object.values(analysisResults).every(res => res.status !== 'idle') ? (
                    <ImageAnalysisReport 
                        analyses={analysisResults} 
                        labReport={labReportAnalysisResult} // Pass lab report here
                        onReset={() => {
                            setCurrentStepIndex(0); // Go back to start
                            setCompletedSteps(new Array(analysisSteps.length).fill(false));
                            setCapturedImages(initialCapturedImagesState);
                            setIsScreenerCompleted(false);
                            setLabReportAnalysisResult(null);
                            setIsLabReportCompleted(false);
                            setAnalysisResults(initialAnalysisResultsState);
                        }} 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center p-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Preparing final analysis report...</p>
                    </div>
                )
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
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
