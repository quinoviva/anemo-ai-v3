import { ImageAnalyzer } from '@/components/anemo/ImageAnalyzer';

export default function AnalysisPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Image Analysis</h1>
        <p className="text-muted-foreground">
          Upload an image to start your AI-powered anemia risk assessment.
        </p>
      </div>
      <ImageAnalyzer />
    </div>
  );
}
