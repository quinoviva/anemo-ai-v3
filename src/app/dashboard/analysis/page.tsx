import { ImageAnalyzer } from '@/components/anemo/ImageAnalyzer';
import { CycleLogForm } from '@/components/anemo/CycleLogForm';
import { Button } from '@/components/ui/button';
import { Stethoscope } from 'lucide-react';

export default function AnalysisPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Point Image Analysis</h1>
          <p className="text-muted-foreground">
            Upload three separate images—one for each area—to start your AI-powered anemia risk assessment.
          </p>
        </div>
        <CycleLogForm 
          trigger={
            <Button variant="outline" className='gap-2'>
              <Stethoscope className='h-4 w-4'/>
              Clinical Screening
            </Button>
          }
        />
      </div>
      <ImageAnalyzer />
    </div>
  );
}
