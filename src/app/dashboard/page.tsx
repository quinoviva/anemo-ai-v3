'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Hospital, Stethoscope, Loader2, Activity, Camera, FileText, MessageSquare, Plus } from 'lucide-react';
import { ChatbotPopup } from '@/components/anemo/ChatbotPopup';
import Link from 'next/link';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, getDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthTipCard } from '@/components/anemo/HealthTipCard';
import { PeriodTrackerCard } from '@/components/anemo/PeriodTrackerCard';
import { MenstrualCycleCorrelator } from '@/components/anemo/MenstrualCycleCorrelator';
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';


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

  // Queries for Menstrual Data
  const cycleLogsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, `users/${user.uid}/cycle_logs`),
        orderBy('startDate', 'desc'),
        limit(5) // Get last 5 for graph context
    );
  }, [user, firestore]);

  const labReportsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/labReports`),
      orderBy('createdAt', 'desc'),
      limit(5) // Get last 5 points
    );
  }, [user, firestore]);

  const imageAnalysesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/imageAnalyses`),
      orderBy('createdAt', 'desc'),
      limit(1) // Get latest
    );
  }, [user, firestore]);

  const { data: cycleLogs } = useCollection<any>(cycleLogsQuery);
  const { data: cbcHistory } = useCollection<any>(labReportsQuery);
  const { data: imageAnalyses } = useCollection<any>(imageAnalysesQuery);


  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.address) {
                setLocation(data.address);
            }
            if (data.medicalInfo) {
                setUserSex(data.medicalInfo.sex || '');
                if (data.medicalInfo.cycleLength) setCycleLength(Number(data.medicalInfo.cycleLength));
                if (data.medicalInfo.flowDuration) setPeriodLength(Number(data.medicalInfo.flowDuration));
            }
        }
      });
    }
  }, [user, firestore]);

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

  // Determine latest activity
  const latestImage = imageAnalyses?.[0];
  const latestCbc = cbcHistory?.[0];
  const hasHistory = latestImage || latestCbc;

  return (
    <div className="space-y-8">
      {/* Hero / Overview Section */}
      {!hasHistory ? (
        <div className="space-y-4 text-center py-10">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Anemo Check
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-bold text-muted-foreground">
            {welcomeMessage}
            </p>
            <p className="mx-auto max-w-2xl text-muted-foreground text-base">
            Your intelligent health companion for early anemia detection. Get an instant risk assessment by uploading a photo, receive personalized health advice, and find nearby healthcare providers in Iloilo.
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <Button asChild size="lg" className="rounded-full px-8">
                    <Link href="/dashboard/analysis">
                        <Camera className="mr-2 h-5 w-5" />
                        Start First Analysis
                    </Link>
                </Button>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{welcomeMessage}</h2>
                    <p className="text-muted-foreground">Here is your health overview for today.</p>
                </div>
                 <CycleLogForm 
                    trigger={
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Log Symptoms
                        </Button>
                    }
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 {/* Quick Actions */}
                 <Card className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                             <Activity className="h-5 w-5 text-primary" />
                             Latest Analysis
                        </CardTitle>
                        <CardDescription>
                            {latestImage 
                                ? `Last check on ${format(latestImage.createdAt.toDate(), 'PPP')}` 
                                : 'No image analysis yet.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {latestImage ? (
                            <div className="flex items-center gap-6">
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">Anemia Risk Score</span>
                                        <span className="font-bold">{latestImage.riskScore}/100</span>
                                    </div>
                                    <Progress value={latestImage.riskScore} className={`h-3 ${latestImage.riskScore > 50 ? 'text-destructive' : 'text-primary'}`} />
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                        {latestImage.recommendations}
                                    </p>
                                </div>
                                <Button asChild>
                                    <Link href="/dashboard/history">View Details</Link>
                                </Button>
                            </div>
                         ) : (
                             <div className="flex justify-between items-center">
                                 <p className="text-sm text-muted-foreground">No recent image analysis found.</p>
                                 <Button asChild variant="secondary">
                                    <Link href="/dashboard/analysis">Start Now</Link>
                                 </Button>
                             </div>
                         )}
                    </CardContent>
                 </Card>

                 {/* Quick Links Grid */}
                 <div className="grid grid-cols-1 gap-4">
                    <Button asChild variant="outline" className="h-full flex flex-col items-center justify-center p-4 space-y-2 hover:bg-primary/5 hover:border-primary">
                        <Link href="/dashboard/analysis">
                            <Camera className="h-6 w-6 text-primary" />
                            <span>New Scan</span>
                        </Link>
                    </Button>
                     <Button asChild variant="outline" className="h-full flex flex-col items-center justify-center p-4 space-y-2 hover:bg-primary/5 hover:border-primary">
                        <Link href="/dashboard/chatbot">
                            <MessageSquare className="h-6 w-6 text-primary" />
                            <span>AI Chat</span>
                        </Link>
                    </Button>
                 </div>
            </div>
        </div>
      )}
      
      {/* Profile Setup Prompt for New Users */}
      {!userSex && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Complete Your Health Profile</CardTitle>
            <CardDescription>
              Tell us a bit about yourself to unlock personalized features like cycle tracking and tailored health insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CycleLogForm 
                trigger={
                    <Button>
                        Setup Profile
                    </Button>
                }
            />
          </CardContent>
        </Card>
      )}

      {/* Women's Health Section */}
      {userSex === 'Female' && (
         <div className="grid gap-8 md:grid-cols-3">
             <div className="md:col-span-1">
                <PeriodTrackerCard 
                    lastPeriodStart={lastPeriodStart}
                    cycleLength={cycleLength}
                    periodLength={periodLength}
                />
             </div>
             <div className="md:col-span-2">
                {(cbcHistory && cbcHistory.length > 0 || cycleLogs && cycleLogs.length > 0) ? (
                    <MenstrualCycleCorrelator 
                        labReports={cbcHistory ? cbcHistory.map((h: any) => ({...h, type: 'cbc'})) as any : []} 
                        cycleLogs={cycleLogs || []} 
                    />
                ) : (
                    <Card className="h-full flex items-center justify-center bg-muted/20 border-dashed">
                        <CardContent className="text-center p-6 text-muted-foreground">
                            <p>Log your first period or upload a lab report to see anemia correlation trends here.</p>
                        </CardContent>
                    </Card>
                )}
             </div>
         </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <HealthTipCard />

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Nearby Healthcare Providers in {location}</CardTitle>
                <CardDescription>
                  A quick look at some of the available doctors, hospitals, and clinics.
                </CardDescription>
              </div>
               <Button asChild variant="outline">
                <Link href="/dashboard/find-doctor">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingClinics ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))
              ) : (
                clinics.slice(0, 3).map((clinic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-secondary">
                          {clinic.icon}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{clinic.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {clinic.address}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/find-doctor">View</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ChatbotPopup />
    </div>
  );
}
