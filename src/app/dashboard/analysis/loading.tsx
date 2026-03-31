export default function AnalysisLoading() {
  return (
    <div className="w-full space-y-10 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-4 pt-2">
        <div className="h-20 w-2/3 rounded-2xl bg-muted/40" />
        <div className="h-6 w-1/3 rounded-xl bg-muted/30" />
      </div>
      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-[2.5rem] bg-muted/30 border border-primary/5" />
        ))}
      </div>
      {/* Bottom strip */}
      <div className="h-32 rounded-[2.5rem] bg-muted/20 border border-primary/5" />
    </div>
  );
}
