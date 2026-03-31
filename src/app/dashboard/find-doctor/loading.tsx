export default function FindDoctorLoading() {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
      {/* Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="h-64 rounded-[2.5rem] bg-muted/30 border border-primary/5" />
        <div className="h-16 rounded-[2rem] bg-muted/20 border border-primary/5" />
      </div>
      {/* Results grid */}
      <div className="lg:col-span-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-[2.5rem] bg-muted/30 border border-primary/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
