'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Stethoscope, Hospital, HeartPulse } from 'lucide-react';
import { ChatbotPopup } from '@/components/anemo/ChatbotPopup';
import Link from 'next/link';
import { useUser } from '@/firebase';

const mockClinics = [
  {
    name: 'Iloilo Doctors’ Hospital',
    type: 'Hospital',
    address: 'West Timawa Avenue, Molo, Iloilo City',
    icon: <Hospital className="h-5 w-5 text-primary" />,
  },
  {
    name: 'The Medical City Iloilo',
    type: 'Hospital',
    address: 'Lopez Jaena St, Molo, Iloilo City',
    icon: <Hospital className="h-5 w-5 text-primary" />,
  },
  {
    name: 'Medicus Medical Center',
    type: 'Hospital',
    address: 'Pison Ave., Mandurriao, Iloilo City',
    icon: <Stethoscope className="h-5 w-5 text-primary" />,
  },
];

export default function DashboardPage() {
  const { user } = useUser();
  const welcomeMessage = user?.displayName ? `Welcome, ${user.displayName.split(' ')[0]}!` : 'Welcome to Anemo Check';

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Anemo Check
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {welcomeMessage}
        </p>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          AI-powered anemia detection at your fingertips.
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
            {mockClinics.slice(0,3).map((clinic, index) => (
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
            ))}
          </div>
        </CardContent>
      </Card>
      <ChatbotPopup />
    </div>
  );
}
