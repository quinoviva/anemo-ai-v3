'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  runProvidePersonalizedRecommendations,
  runFindNearbyClinics,
} from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Sparkles, Download, FileText, Hospital, Stethoscope, HeartPulse, MapPin } from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';

export type AnalysisState = {
  file: File | null;
  imageUrl: string | null;
  dataUri: string | null;
  calibrationMetadata: any | null;
  description: string | null;
  isValid: boolean;
  analysisResult: string | null;
  error: string | null;
  status: 'idle' | 'analyzing' | 'success' | 'error' | 'queued';
};

type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
};

type ImageAnalysisReportProps = {
  analyses: Record<string, AnalysisState>;
  labReport: AnalyzeCbcReportOutput | null;
  onReset: () => void;
};

export function ImageAnalysisReport({ analyses, labReport, onReset }: ImageAnalysisReportProps) {
  const [report, setReport] = useState<PersonalizedRecommendationsOutput | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('Iloilo City');
  const [userName, setUserName] = useState('');
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

  const allImageDescriptions = Object.entries(analyses)
    .map(([key, value]) => `Result for ${key}: ${value.analysisResult}`)
    .join('\n');
  
  const labReportSummary = labReport ? `Lab Report Summary: ${labReport.summary}` : '';

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  useEffect(() => {
    if (userData) {
      if (userData.address) setUserLocation(userData.address);
      if (userData.firstName) setUserName(`${userData.firstName} ${userData.lastName}`);
    }
  }, [userData]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);

    try {
      let userProfileString = `User's location: ${userLocation}`;
      if (userData) {
        const data = userData;
        const medicalInfo = data.medicalInfo || {};
        userProfileString = `
            Name: ${data.firstName || ''} ${data.lastName || ''}
            Location: ${data.address || 'Iloilo City'}
            Date of Birth: ${medicalInfo.dateOfBirth ? format(medicalInfo.dateOfBirth.toDate(), 'PPP') : 'N/A'}
            Sex: ${medicalInfo.sex || 'N/A'}
            Height: ${medicalInfo.height || 'N/A'} cm
            Weight: ${medicalInfo.weight || 'N/A'} kg
            Blood Type: ${medicalInfo.bloodType || 'N/A'}
            Allergies: ${medicalInfo.allergies || 'N/A'}
            Conditions: ${medicalInfo.conditions || 'N/A'}
            Medications: ${medicalInfo.medications || 'N/A'}
            Family History: ${medicalInfo.familyHistory || 'N/A'}
            Last Menstrual Period: ${medicalInfo.lastMenstrualPeriod ? format(medicalInfo.lastMenstrualPeriod.toDate(), 'PPP') : 'N/A'}
            Cycle Length: ${medicalInfo.cycleLength || 'N/A'} days
            Flow Duration: ${medicalInfo.flowDuration || 'N/A'} days
            Flow Intensity: ${medicalInfo.flowIntensity || 'N/A'}
        `;
      }

      // Generate recommendations
      let reportResult: PersonalizedRecommendationsOutput | null = null;
      
      if (!isOnline) throw new Error("Offline");
      reportResult = await runProvidePersonalizedRecommendations({
          imageAnalysis: allImageDescriptions,
          userProfile: userProfileString,
      });

      setReport(reportResult);

      // Find nearby clinics - skip if offline/cached
      if (isOnline) {
          try {
            const clinicsResult = await runFindNearbyClinics({ query: userLocation });
            setClinics(clinicsResult.results.slice(0, 5));
          } catch (e) {
              console.warn("Failed to fetch clinics", e);
          }
      }

      // Save to Firestore - Firestore SDK handles offline queueing!
      if (user && !user.isAnonymous && firestore && reportResult) {
        const reportCollection = collection(firestore, `users/${user.uid}/imageAnalyses`);
        await addDoc(reportCollection, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          riskScore: reportResult.riskScore,
          recommendations: reportResult.recommendations,
          imageAnalysisSummary: allImageDescriptions,
          labReportSummary: labReportSummary,
        });
        toast({
          title: "Analysis Saved",
          description: "Your report has been saved to your history."
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({
        title: "Report Generation Failed",
        description: isOnline ? errorMessage : "You are offline and no cached insights are available.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [allImageDescriptions, labReportSummary, user, firestore, userLocation, toast, isOnline, userData]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleDownloadPdf = async () => {
    const input = reportRef.current;
    if (!input) {
      toast({
        title: "Download Error",
        description: "Could not find report content.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.body.classList.contains('dark') ? '#09090b' : '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      let imgWidth = pdfWidth - 20;
      let imgHeight = imgWidth / ratio;
      let heightLeft = imgHeight;
      let position = 10;
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`anemocheck-report-${user?.uid || 'guest'}.pdf`);
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
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center gap-2 justify-center"><Sparkles /> Generating Report</CardTitle>
          <CardDescription>Our AI is compiling your personalized health insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (!report) {
    return (
         <Card className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <CardHeader className="text-center">
                <CardTitle>Error</CardTitle>
                <CardDescription>Could not generate the report. Please try again.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onReset}>Start Over</Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText /> Your Anemia Risk Report</CardTitle>
        <CardDescription>
          This AI-generated report is for informational purposes only. Always consult a healthcare professional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[70vh] mb-4">
            <div ref={reportRef} className="p-6 rounded-lg border bg-background space-y-8">
            <header className="space-y-4">
                <div className="flex items-start justify-between border-b pb-4">
                    <div className="flex items-center gap-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-10 w-10 text-primary"
                        >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            <path d="M3.22 12H9.5l.7-1 2.1 4.2 1.6-3.2 1.6 3.2h3.22" />
                        </svg>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Anemo Check</h2>
                            <p className="text-sm text-muted-foreground">AI-Powered Anemia Analysis</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className='font-bold text-lg'>{userName || user?.displayName}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                </div>
            </header>

            <div className="space-y-6">
                 {/* Risk Score */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-lg">Anemia Risk Score</span>
                        <span className="font-bold text-2xl text-primary">{report.riskScore}/100</span>
                    </div>
                    <Progress value={report.riskScore} className="h-3"/>
                </div>

                {/* Uploaded Images */}
                <div>
                    <h3 className="font-semibold text-lg mb-2">Uploaded Images</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(analyses).map(([key, value]) => (
                            <div key={key} className="space-y-2 text-center">
                                <img src={value.imageUrl!} alt={`Uploaded ${key}`} className="rounded-md border object-cover aspect-square" />
                                <p className="text-xs font-medium capitalize text-muted-foreground">{key.replace('-', ' ')}</p>
                            </div>
                        ))}
                    </div>
                </div>
                
                 {/* Recommendations */}
                <div>
                    <h3 className="font-semibold text-lg mb-2">AI-Powered Recommendations</h3>
                    <div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap text-sm">
                        {report.recommendations}
                    </div>
                </div>
                
                {/* Nearby Clinics */}
                {clinics.length > 0 && (
                <div>
                    <h3 className="font-semibold text-lg mb-2">Nearby Healthcare Providers in {userLocation}</h3>
                     <div className="space-y-2">
                        {clinics.map((clinic, index) => (
                           <div key={index} className="flex items-start gap-3 rounded-md border p-3">
                                <div className="p-2 bg-secondary rounded-full">
                                    {clinic.type === 'Hospital' ? <Hospital className="h-5 w-5 text-primary" /> : (clinic.type === 'Clinic' ? <HeartPulse className="h-5 w-5 text-primary" /> : <Stethoscope className="h-5 w-5 text-primary" />)}
                                </div>
                                <div>
                                    <p className="font-semibold">{clinic.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1">
                                      <MapPin className="h-4 w-4 mt-0.5 shrink-0"/> <span>{clinic.address}</span>
                                    </p>
                                </div>
                           </div>
                        ))}
                    </div>
                </div>
                )}
            </div>
            </div>
        </ScrollArea>
        <div className="flex gap-2 mt-4">
          <Button onClick={onReset}>Start New Analysis</Button>
          <Button onClick={handleDownloadPdf} variant="outline" disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
            Download Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}