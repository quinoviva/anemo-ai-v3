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
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';

type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
  icon: React.ReactNode;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await runFindNearbyClinics({ query: 'Iloilo City' });
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
        // Optionally, set some error state to show in the UI
      } finally {
        setIsLoading(false);
      }
    };
    fetchClinics();
  }, []);

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
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Your intelligent health companion for early anemia detection. Get an instant risk assessment by uploading a photo, receive personalized health advice, and find nearby healthcare providers in Iloilo.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard/analysis">Start Analysis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard/find-doctor">Nearby Healthcare Providers</Link>
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Nearby Healthcare Providers</CardTitle>
          <CardDescription>
            A quick look at some of the available doctors, hospitals, and clinics in Iloilo City.
          </CardDescription>
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
      <ChatbotPopup />
    </div>
  );
}
