'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Hospital, Stethoscope, Loader2, Activity, Camera, MessageSquare, Plus, ChevronRight, MapPin, Sparkles } from 'lucide-react';
const ChatbotPopup = dynamic(() => import('@/components/anemo/ChatbotPopup').then(mod => mod.ChatbotPopup), { ssr: false });
import Link from 'next/link';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthTipCard } from '@/components/anemo/HealthTipCard';
import { PeriodTrackerCard } from '@/components/anemo/PeriodTrackerCard';
import React from 'react';
const MenstrualCycleCorrelator = dynamic(() => import('@/components/anemo/MenstrualCycleCorrelator').then(mod => mod.MenstrualCycleCorrelator), { ssr: false });
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';


type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
  icon: React.ReactNode;
};

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [location, setLocation] = useState('Iloilo City');
  const [userSex, setUserSex] = useState<string>('');
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodLength, setPeriodLength] = useState<number>(5);

  const cycleLogsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, `users/${user.uid}/cycle_logs`),
        orderBy('startDate', 'desc'),
        limit(5)
    );
  }, [user, firestore]);

  const labReportsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/labReports`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [user, firestore]);

  const imageAnalysesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/imageAnalyses`),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [user, firestore]);

  const { data: cycleLogs } = useCollection<any>(cycleLogsQuery);
  const { data: cbcHistory } = useCollection<any>(labReportsQuery);
  const { data: imageAnalyses } = useCollection<any>(imageAnalysesQuery);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userData } = useDoc(userDocRef);

  useEffect(() => {
    if (userData) {
        if (userData.address) {
            setLocation(userData.address);
        }
        if (userData.medicalInfo) {
            setUserSex(userData.medicalInfo.sex || '');
            if (userData.medicalInfo.cycleLength) setCycleLength(Number(userData.medicalInfo.cycleLength));
            if (userData.medicalInfo.flowDuration) setPeriodLength(Number(userData.medicalInfo.flowDuration));
        }
    }
  }, [userData]);

  useEffect(() => {
    const fetchClinics = async () => {
      setIsLoadingClinics(true);
      try {
        const response = await runFindNearbyClinics({ query: location });
        const clinicsWithIcons = response.results.map((clinic) => ({
          ...clinic,
          icon:
            clinic.type === 'Hospital' ? (
              <Hospital className="h-5 w-5 text-primary" />
            ) : (
              <Stethoscope className="h-5 w-5 text-primary" />
            ),
        }));
        setClinics(clinicsWithIcons);
      } catch (error) {
        console.error("Failed to fetch clinics:", error);
      } finally {
        setIsLoadingClinics(false);
      }
    };
    fetchClinics();
  }, [location]);

  const welcomeMessage = user?.displayName
    ? `Welcome back, ${user.displayName.split(' ')[0]}!`
    : 'Welcome to Anemo Check';
    
  const lastPeriodStart = cycleLogs && cycleLogs.length > 0 ? cycleLogs[0].startDate.toDate() : null;

  const latestImage = imageAnalyses?.[0];
  const latestCbc = cbcHistory?.[0];
  const hasHistory = latestImage || latestCbc;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">{welcomeMessage}</h2>
              <p className="text-muted-foreground text-lg">Your daily health dashboard.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" asChild className="hidden sm:flex">
                <Link href="/dashboard/analysis">
                    <Camera className="mr-2 h-4 w-4" />
                    New Scan
                </Link>
             </Button>
             <CycleLogForm 
                trigger={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Log Symptoms
                    </Button>
                }
            />
          </div>
      </div>

      {!hasHistory ? (
        // Empty State / Onboarding
        <div className="grid md:grid-cols-2 gap-8 items-center py-8">
            <div className="space-y-6 order-2 md:order-1">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                    <Sparkles className="mr-1 h-3 w-3" />
                    New AI Feature
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Early anemia detection made simple.
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    Get an instant risk assessment by uploading a photo of your conjunctiva, fingernails, or palm. Our AI provides personalized health advice and connects you with nearby care.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <Button asChild size="lg" className="rounded-full px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all">
                        <Link href="/dashboard/analysis">
                            Start Your First Analysis
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-12 text-base">
                        <Link href="/how-to-use">
                            Watch Demo
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
                <div className="relative w-full max-w-sm aspect-square bg-gradient-to-tr from-primary/20 to-secondary rounded-full blur-3xl opacity-50 absolute top-10 right-10 -z-10"></div>
                <Card className="w-full max-w-md shadow-2xl border-muted bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            How it works
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">1</div>
                            <div>
                                <h4 className="font-medium">Take a Photo</h4>
                                <p className="text-sm text-muted-foreground">Capture a clear image of your eye (conjunctiva), fingernails, or palm.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                            <div>
                                <h4 className="font-medium">AI Analysis</h4>
                                <p className="text-sm text-muted-foreground">Our advanced AI scans for pallor and other anemia indicators.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                            <div>
                                <h4 className="font-medium">Get Results</h4>
                                <p className="text-sm text-muted-foreground">Receive an instant risk score and actionable health tips.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        // Active Dashboard Grid
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             {/* Left: Main Status */}
             <div className="md:col-span-8 lg:col-span-8 space-y-6">
                 {/* Latest Analysis Card */}
                 <Card className="glass glass-hover border-primary/10 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Latest Analysis Result
                                </CardTitle>
                                <CardDescription>
                                    {latestImage 
                                        ? `Performed on ${format(latestImage.createdAt.toDate(), 'MMMM d, yyyy')} at ${format(latestImage.createdAt.toDate(), 'h:mm a')}` 
                                        : 'No analysis performed yet.'}
                                </CardDescription>
                            </div>
                            {latestImage && (
                                <Badge variant={latestImage.riskScore > 50 ? 'destructive' : 'default'} className="text-sm px-3 py-1">
                                    {latestImage.riskScore > 50 ? 'Attention Needed' : 'Normal Range'}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                         {latestImage ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-medium text-muted-foreground">Anemia Risk Score</span>
                                        <span className="text-3xl font-bold text-foreground">{latestImage.riskScore}<span className="text-lg text-muted-foreground font-normal">/100</span></span>
                                    </div>
                                    <Progress value={latestImage.riskScore} className={`h-4 rounded-full ${latestImage.riskScore > 50 ? 'text-destructive' : 'text-primary'}`} />
                                    <p className="text-xs text-muted-foreground text-right pt-1">
                                        Higher score indicates higher probability of anemia.
                                    </p>
                                </div>
                                
                                <div className="bg-background/80 rounded-lg p-4 border shadow-sm">
                                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                                        <Sparkles className="h-3 w-3 text-yellow-500" />
                                        AI Recommendation
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {latestImage.recommendations}
                                    </p>
                                </div>
                            </div>
                         ) : (
                             <div className="py-8 text-center space-y-4">
                                 <p className="text-muted-foreground">You haven&apos;t performed an analysis yet.</p>
                                 <Button asChild>
                                    <Link href="/dashboard/analysis">Start Analysis</Link>
                                 </Button>
                             </div>
                         )}
                    </CardContent>
                    {latestImage && (
                        <CardFooter className="bg-secondary/20 border-t py-3 px-6">
                             <Button variant="ghost" size="sm" asChild className="ml-auto text-primary hover:text-primary/80 p-0 h-auto font-medium">
                                <Link href="/dashboard/history" className="flex items-center">
                                    View Full History <ChevronRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                 </Card>

                                 {/* Women's Health & Charts */}
                                 {userSex === 'Female' && (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <PeriodTrackerCard 
                                            lastPeriodStart={lastPeriodStart}
                                            cycleLength={cycleLength}
                                            periodLength={periodLength}
                                            className="glass glass-hover"
                                        />                        {(cbcHistory && cbcHistory.length > 0 || cycleLogs && cycleLogs.length > 0) ? (
                            <React.Suspense fallback={<Card className="h-full flex items-center justify-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>}>
                                <MenstrualCycleCorrelator 
                                    labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
                                    cycleLogs={cycleLogs || []} 
                                />
                            </React.Suspense>
                        ) : (
                             <Card className="flex items-center justify-center p-6 border-dashed bg-muted/30">
                                <div className="text-center space-y-2">
                                    <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
                                    <p className="text-sm font-medium">Correlation Data</p>
                                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Log more periods and lab reports to see trends.</p>
                                </div>
                            </Card>
                        )}
                    </div>
                 )}
                 
                 {/* Health Tips Section */}
                 <div className="pt-4">
                    <h3 className="text-lg font-semibold mb-4 px-1">Daily Health Insight</h3>
                    <HealthTipCard />
                 </div>
             </div>

             {/* Right Column: Sidebar Actions */}
             <div className="md:col-span-4 lg:col-span-4 space-y-6">
                 {/* Quick Actions Grid */}
                 <div className="grid grid-cols-2 gap-3">
                    <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 border-primary/10 hover:border-primary/50 hover:bg-primary/5 transition-all group">
                        <Link href="/dashboard/analysis">
                            <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                                <Camera className="h-5 w-5" />
                            </div>
                            <span className="font-medium">New Scan</span>
                        </Link>
                    </Button>
                     <Button asChild variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 border-primary/10 hover:border-primary/50 hover:bg-primary/5 transition-all group">
                        <Link href="/dashboard/chatbot">
                             <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <span className="font-medium">AI Chat</span>
                        </Link>
                    </Button>
                 </div>

                 {/* Profile Setup Prompt */}
                {!userSex && (
                    <Card className="glass border-primary/20 overflow-hidden relative group">
                         <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-md">Complete Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Tell us about yourself to unlock personalized cycle tracking and better health insights.
                            </p>
                            <CycleLogForm 
                                trigger={
                                    <Button size="sm" className="w-full">
                                        Setup Profile
                                    </Button>
                                }
                            />
                        </CardContent>
                    </Card>
                )}

                 {/* Nearby Providers */}
                <Card className="glass glass-hover h-fit">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-md flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Nearby Care
                            </CardTitle>
                            <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
                                <Link href="/dashboard/find-doctor">View All</Link>
                            </Button>
                        </div>
                        <CardDescription className="text-xs truncate" title={location}>
                           Providers in {location}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {isLoadingClinics ? (
                            Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className="flex gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                    <div className="space-y-1 w-full">
                                        <Skeleton className="h-3 w-3/4" />
                                        <Skeleton className="h-2 w-1/2" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            clinics.slice(0, 3).map((clinic, index) => (
                                <div key={index} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                    <div className="bg-primary/10 p-1.5 rounded-full shrink-0">
                                        {clinic.type === 'Hospital' ? <Hospital className="h-4 w-4 text-primary" /> : <Stethoscope className="h-4 w-4 text-primary" />}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium truncate">{clinic.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{clinic.address}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
             </div>
        </div>
      )}
      
      <ChatbotPopup />
    </div>
  );
}