'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  runConductDiagnosticInterview,
  runProvidePersonalizedRecommendations,
} from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bot, FileText, Loader2, Sparkles, Send } from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';

type InterviewStep = 'loading' | 'form' | 'generatingReport' | 'reportReady';
type Answers = Record<string, string>;

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

  const handleAnswerChange = (question: string, value: string) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  
  if (interviewStep === 'loading') {
    return (
        <Card className="flex-1 flex flex-col items-center justify-center">
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
        <Card className="flex-1 flex flex-col">
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot /> Diagnostic Questionnaire</CardTitle>
              <CardDescription>Please answer the following questions to help us build your health profile.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <CardContent className="flex-1 overflow-y-auto space-y-6">
                {questions.map((q, index) => (
                    <div key={index} className="grid gap-2">
                        <Label htmlFor={`question-${index}`}>{q}</Label>
                        <Textarea
                            id={`question-${index}`}
                            placeholder="Your answer..."
                            value={answers[q] || ''}
                            onChange={(e) => handleAnswerChange(q, e.target.value)}
                            required
                            className="text-base"
                        />
                    </div>
                ))}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                <Send className="mr-2" />
                Submit for Analysis
              </Button>
            </CardFooter>
          </form>
        </Card>
    );
  }

  if (interviewStep === 'generatingReport') {
    return (
        <Card className="flex-1 flex flex-col items-center justify-center">
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
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Risk Score</span>
                        <span className="font-bold text-xl">{report.riskScore}/100</span>
                    </div>
                    <Progress value={report.riskScore} className="h-3"/>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Recommendations</h4>
                  <ScrollArea className="h-48 rounded-md border p-4">
                      <p className="text-sm whitespace-pre-wrap">{report.recommendations}</p>
                  </ScrollArea>
                </div>
                <Button onClick={onReset}>Start New Analysis</Button>
            </CardContent>
        </Card>
    );
  }

  return null;
}
