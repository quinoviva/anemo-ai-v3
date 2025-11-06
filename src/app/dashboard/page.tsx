'use client';

import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.displayName || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Ready to check your health? Start by analyzing an image.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start Your Analysis</CardTitle>
          <CardDescription>
            Upload a clear picture of your skin, under-eye, or fingernails to
            get an AI-powered anemia risk assessment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4">
             <p className="text-sm text-muted-foreground">
                Click the button below to navigate to the analysis page and begin the process.
              </p>
            <Button onClick={() => router.push('/dashboard/analysis')}>
              Go to Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
