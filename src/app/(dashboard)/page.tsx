
import { ImageAnalyzer } from '@/components/anemo/ImageAnalyzer';
import { FeatureCard } from '@/components/anemo/FeatureCard';
import { Video, Stethoscope } from 'lucide-react';

export default function RootPage() {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Anemo Check Dashboard</h1>
            <p className="text-muted-foreground">
            Upload an image to start your analysis or explore other features.
            </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
            <ImageAnalyzer />
            </div>
            <div className="space-y-6">
            <FeatureCard
                title="Live Camera Analysis"
                description="Get real-time feedback using your device's camera."
                icon={<Video className="h-8 w-8 text-primary" />}
                href="/live-analysis"
            />
            <FeatureCard
                title="Find a Doctor"
                description="Locate nearby clinics and specialists for consultation."
                icon={<Stethoscope className="h-8 w-8 text-primary" />}
                href="/find-doctor"
            />
            </div>
        </div>
    </div>
  );
}
