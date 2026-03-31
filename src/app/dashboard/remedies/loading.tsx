export default function RemediesLoading() {
  return (
    <div className="w-full space-y-10 animate-pulse">
      {/* Header */}
      <div className="space-y-4 pt-2">
        <div className="h-20 w-1/2 rounded-2xl bg-muted/40" />
        <div className="h-6 w-1/4 rounded-xl bg-muted/30" />
      </div>
      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-[2.5rem] bg-muted/30 border border-primary/5" />
        ))}
      </div>
      {/* Tab area */}
      <div className="h-10 w-64 rounded-full bg-muted/20" />
      {/* Food cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 rounded-[2rem] bg-muted/30 border border-primary/5" />
        ))}
      </div>
    </div>
  );
}
