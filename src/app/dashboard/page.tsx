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
import { Hospital, Stethoscope, Loader2 } from 'lucide-react';
import { ChatbotPopup } from '@/components/anemo/ChatbotPopup';
import Link from 'next/link';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthTipCard } from '@/components/anemo/HealthTipCard';


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
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState('Iloilo City');

  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists() && docSnap.data().address) {
          setLocation(docSnap.data().address);
        }
      });
    }
  }, [user, firestore]);

  useEffect(() => {
    const fetchClinics = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    };
    fetchClinics();
  }, [location]);

  const welcomeMessage = user?.displayName
    ? `Welcome, ${user.displayName.split(' ')[0]}!`
    : 'Welcome to Anemo Check';

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Anemo Check
        </h1>
        <p className="mx-auto max-w-2xl text-lg font-bold text-muted-foreground">
          {welcomeMessage}
        </p>
        <p className="mx-auto max-w-2xl text-muted-foreground text-base">
          Your intelligent health companion for early anemia detection. Get an instant risk assessment by uploading a photo, receive personalized health advice, and find nearby healthcare providers in Iloilo.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard/analysis">Start Analysis</Link>
          </Button>
        </div>
      </div>
      
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
              {isLoading ? (
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
