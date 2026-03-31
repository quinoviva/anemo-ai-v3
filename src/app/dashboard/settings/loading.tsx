import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page title */}
      <Skeleton className="h-8 w-40 rounded-2xl bg-muted/40" />

      {/* 4 setting section cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg rounded-[2.5rem] p-6 space-y-5 animate-pulse"
        >
          {/* Card heading */}
          <Skeleton className="h-5 w-1/4 rounded-2xl bg-muted/40" />

          {/* Row items: label + toggle/select placeholder */}
          {Array.from({ length: i === 0 ? 3 : 2 }).map((_, j) => (
            <div key={j} className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-1/3 rounded-2xl bg-muted/40" />
                <Skeleton className="h-3 w-1/2 rounded-2xl bg-muted/40" />
              </div>
              <Skeleton className="h-8 w-14 rounded-2xl bg-muted/40 shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
