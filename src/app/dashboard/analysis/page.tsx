import { ImageAnalyzer } from '@/components/anemo/ImageAnalyzer';

export default function AnalysisPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Multi-Point Image Analysis</h1>
        <p className="text-muted-foreground">
          Upload three separate images—one for each area—to start your AI-powered anemia risk assessment.
        </p>
      </div>
      <ImageAnalyzer />
    </div>
  );
}
