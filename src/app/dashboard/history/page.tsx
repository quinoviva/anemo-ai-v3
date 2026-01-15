import { AnalysisHistory } from "@/components/anemo/AnalysisHistory";

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground">
          View and manage your past image analyses and clinical lab reports.
        </p>
      </div>
      <AnalysisHistory />
    </div>
  );
}
