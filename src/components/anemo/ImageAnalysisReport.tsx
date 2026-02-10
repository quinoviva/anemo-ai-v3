'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  runProvidePersonalizedRecommendations,
  runFindNearbyClinics,
} from '@/app/actions';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Download, FileText, Hospital, Stethoscope, HeartPulse, MapPin, Sparkles } from 'lucide-react';
import type { PersonalizedRecommendationsOutput } from '@/ai/flows/provide-personalized-recommendations';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { AnalyzeCbcReportOutput } from '@/ai/flows/analyze-cbc-report';
import { AnemoLoading } from '../ui/anemo-loading';
import HeartLoader from '@/components/ui/HeartLoader';

export type AnalysisState = {
  file: File | null;
  imageUrl: string | null;
  dataUri: string | null;
  calibrationMetadata: any | null;
  description: string | null;
  isValid: boolean;
  analysisResult: string | null;
  confidenceScore?: number;
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
          labReport: labReportSummary,
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
      <GlassSurface intensity="medium" className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <AnemoLoading />
        <CardHeader className="text-center">
          <CardTitle className="flex items-center gap-2 justify-center">Generating Report</CardTitle>
          <CardDescription>Our AI is compiling your personalized health insights...</CardDescription>
        </CardHeader>
      </GlassSurface>
    );
  }
  
  if (!report) {
    return (
         <GlassSurface intensity="medium" className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <CardHeader className="text-center">
                <CardTitle>Error</CardTitle>
                <CardDescription>Could not generate the report. Please try again.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onReset}>Start Over</Button>
            </CardContent>
        </GlassSurface>
    )
  }

  return (
    <GlassSurface intensity="medium" className="flex-1">
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
                        <span className="font-medium text-lg">Overall Anemia Risk Score</span>
                        <span className="font-bold text-2xl text-primary">{report.riskScore}/100</span>
                    </div>
                    <Progress value={report.riskScore} className="h-3"/>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                        *Higher score indicates a higher probability of anemia signs based on visual assessment.
                    </p>
                </div>

                {/* Detailed Parameters Analysis */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-1">Multimodal Parameter Analysis</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {Object.entries(analyses).map(([key, value]) => (
                            <div key={key} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                                <div className="aspect-square rounded-md overflow-hidden border mb-2">
                                    <img src={value.imageUrl!} alt={key} className="w-full h-full object-cover" />
                                </div>
                                <p className="font-bold text-sm capitalize">{key.replace('-', ' ')}</p>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-primary uppercase tracking-wider">{value.analysisResult}</p>
                                    {value.confidenceScore !== undefined && (
                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                            <span>AI Confidence:</span>
                                            <span className="font-bold text-foreground">{value.confidenceScore}%</span> 
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {labReport && labReport.parameters && labReport.parameters.length > 0 && (
                            <div className="p-3 rounded-lg border bg-blue-50/30 dark:bg-blue-900/10 space-y-2 sm:col-span-3">
                                <p className="font-bold text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Extracted Lab Report Data
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {labReport.parameters.map((p, idx) => (
                                        <div key={idx} className="bg-background/50 p-2 rounded border text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">{p.parameter}</p>
                                            <p className="text-sm font-bold">{p.value}</p>
                                            <p className="text-[10px] text-muted-foreground">{p.unit}</p>
                                            <div className={`mt-1 h-1 w-full rounded-full ${p.isNormal ? 'bg-green-500' : 'bg-red-500'}`} />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs italic text-muted-foreground mt-2 border-t pt-2">
                                    Summary: {labReport.summary}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                 {/* Recommendations */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-1 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Clinical Observations
                    </h3>
                    <div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap text-sm leading-relaxed">
                        {report.recommendations}
                    </div>
                </div>

                {/* Home Remedies Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-1 flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-red-500" />
                        Suggested Home Remedies & Treatment
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="p-4 rounded-lg border bg-green-50/30 dark:bg-green-900/10">
                            <h4 className="font-bold text-sm mb-2 text-green-700 dark:text-green-400 uppercase tracking-tight">Iron-Rich Diet</h4>
                            <ul className="text-xs space-y-1.5 list-disc list-inside">
                                <li>Increase intake of leafy greens (Malunggay, Spinach).</li>
                                <li>Consume lean red meats, poultry, and seafood.</li>
                                <li>Eat iron-fortified cereals and legumes (Beans, Lentils).</li>
                                <li>Pair iron foods with Vitamin C (Citrus, Tomatoes) for better absorption.</li>
                            </ul>
                        </div>
                        <div className="p-4 rounded-lg border bg-blue-50/30 dark:bg-blue-900/10">
                            <h4 className="font-bold text-sm mb-2 text-blue-700 dark:text-blue-400 uppercase tracking-tight">Lifestyle Habits</h4>
                            <ul className="text-xs space-y-1.5 list-disc list-inside">
                                <li>Avoid drinking tea or coffee during meals (inhibits iron absorption).</li>
                                <li>Ensure adequate rest and manage fatigue levels.</li>
                                <li>Stay hydrated throughout the day.</li>
                                <li>Monitor symptoms like dizziness or shortness of breath.</li>
                            </ul>
                        </div>
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
            {isDownloading ? <HeartLoader size={16} strokeWidth={3} className="mr-2" /> : <Download className="mr-2" />}
            Download Report
          </Button>
        </div>
      </CardContent>
    </GlassSurface>
  );
}