'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  runConductDiagnosticInterview,
  runProvidePersonalizedRecommendations,
} from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bot, FileText, Loader2, Sparkles, Send, Download } from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '../ui/alert';

type InterviewStep = 'loading' | 'form' | 'generatingReport' | 'reportReady';
type Answers = Record<string, 'Yes' | 'No' | ''>;

type DiagnosticInterviewProps = {
    imageDescription: string | null;
    onReset: () => void;
    onAnalysisError: (error: string) => void;
}

export function DiagnosticInterview({ imageDescription, onReset, onAnalysisError }: DiagnosticInterviewProps) {
  const [interviewStep, setInterviewStep] = useState<InterviewStep>('loading');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<PersonalizedRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setInterviewStep('loading');
    try {
      const result = await runConductDiagnosticInterview({
        userId: 'guest-user', // Replace with actual user ID if available
        imageAnalysisResult: imageDescription || '',
        profileData: {}, // Replace with actual profile data if available
      });
      setQuestions(result.questions);
      // Initialize answers state
      const initialAnswers: Answers = {};
      result.questions.forEach(q => {
        initialAnswers[q] = '';
      });
      setAnswers(initialAnswers);
      setInterviewStep('form');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred starting the interview.";
      onAnalysisError(errorMessage);
      toast({
            title: "Interview Error",
            description: errorMessage,
            variant: "destructive",
      });
      setInterviewStep('loading'); // Or some error state
    } finally {
      setIsLoading(false);
    }
  }, [imageDescription, onAnalysisError, toast]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAnswerChange = (question: string, value: 'Yes' | 'No') => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const isFormComplete = () => {
    return questions.length > 0 && questions.every(q => answers[q] === 'Yes' || answers[q] === 'No');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete()) {
        toast({
            title: "Incomplete Form",
            description: "Please answer all questions before submitting.",
            variant: "destructive",
        });
        return;
    }
    
    setIsLoading(true);
    setInterviewStep('generatingReport');

    try {
      const formattedResponses = Object.entries(answers)
        .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
        .join('\n\n');

      const reportResult = await runProvidePersonalizedRecommendations({
        imageAnalysis: imageDescription || 'No description available',
        interviewResponses: formattedResponses,
        userProfile: 'Age: 30, Gender: Female', // Example profile data
      });
      
      setReport(reportResult);
      setInterviewStep('reportReady');
      toast({
        title: "Report Generated",
        description: "Your personalized health report is ready.",
      });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while generating the report.";
        onAnalysisError(errorMessage);
        toast({
            title: "Report Generation Error",
            description: errorMessage,
            variant: "destructive",
        });
        setInterviewStep('form'); // Go back to form on error
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) {
        toast({
            title: "Download Error",
            description: "Could not find report content to download.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);

    try {
        const canvas = await html2canvas(input, {
             scale: 2, // Higher scale for better quality
             useCORS: true, 
             backgroundColor: null 
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const width = pdfWidth - 20; // with margin
        const height = width / ratio;
        
        let position = 10;

        pdf.addImage(imgData, 'PNG', 10, position, width, height);
        
        pdf.save('anemocheck-report.pdf');

        toast({
            title: "Download Started",
            description: "Your report is being downloaded.",
        });

    } catch (error) {
        toast({
            title: "Download Failed",
            description: "An error occurred while creating the PDF.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  
  if (interviewStep === 'loading') {
    return (
        <Card className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center gap-2 justify-center"><Bot /> Building Questionnaire</CardTitle>
                <CardDescription>AI is preparing a few questions for you...</CardDescription>
            </CardHeader>
            <CardContent>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  if (interviewStep === 'form') {
    return (
      <Card className="flex-1 flex flex-col max-h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot /> Diagnostic Questionnaire
          </CardTitle>
          <CardDescription>
            Please answer the following questions to help us build your health
            profile.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <CardContent className="flex-1 overflow-hidden p-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {questions.map((q, index) => (
                  <div
                    key={index}
                    className="grid gap-3 p-4 border rounded-lg"
                  >
                    <Label htmlFor={`question-${index}`} className="text-base">
                      {q}
                    </Label>
                    <RadioGroup
                      defaultValue={answers[q]}
                      onValueChange={(value: 'Yes' | 'No') =>
                        handleAnswerChange(q, value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Yes" id={`yes-${index}`} />
                        <Label htmlFor={`yes-${index}`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="No" id={`no-${index}`} />
                        <Label htmlFor={`no-${index}`}>No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !isFormComplete()}>
              {isLoading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Send className="mr-2" />
              )}
              Submit for Analysis
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  if (interviewStep === 'generatingReport') {
    return (
        <Card className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center gap-2 justify-center"><Sparkles /> Generating Report</CardTitle>
                <CardDescription>Our AI is compiling your personalized health insights.</CardDescription>
            </CardHeader>
            <CardContent>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  if (interviewStep === 'reportReady' && report) {
    return (
        <Card className="flex-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Anemia Risk Report</CardTitle>
                 <CardDescription>
                    This AI-generated report is for informational purposes only. Always consult a healthcare professional for a medical diagnosis.
                 </CardDescription>
            </CardHeader>
            <CardContent>
                <div ref={reportRef} className="p-6 rounded-lg border bg-background mb-4">
                  <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-lg">Anemia Risk Score</span>
                            <span className="font-bold text-2xl text-primary">{report.riskScore}/100</span>
                        </div>
                        <Progress value={report.riskScore} className="h-3"/>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">Image Analysis Summary</h4>
                      <Alert>
                        <AlertDescription className="whitespace-pre-wrap">{imageDescription}</AlertDescription>
                      </Alert>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">AI-Powered Recommendations</h4>
                      <ScrollArea className="h-48 rounded-md border p-4">
                          <p className="text-sm whitespace-pre-wrap">{report.recommendations}</p>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={onReset}>Start New Analysis</Button>
                     <Button onClick={handleDownloadPdf} variant="outline" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                      Download Report
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
  }

  return null;
}
