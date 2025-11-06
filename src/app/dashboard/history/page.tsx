import { AnalysisHistoryList } from '@/components/anemo/AnalysisHistoryList';

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground">
          Review your past analysis reports and recommendations.
        </p>
      </div>
      <AnalysisHistoryList />
    </div>
  );
}
