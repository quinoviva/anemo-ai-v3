import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header: avatar + name */}
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 rounded-full shrink-0 bg-muted/40" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-6 w-48 rounded-2xl bg-muted/40" />
          <Skeleton className="h-4 w-32 rounded-2xl bg-muted/40" />
        </div>
      </div>

      {/* 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg rounded-[2.5rem] p-6 space-y-5 animate-pulse"
          >
            {/* Card heading */}
            <Skeleton className="h-5 w-2/3 rounded-2xl bg-muted/40" />

            {/* Input field skeletons */}
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3 w-1/3 rounded-2xl bg-muted/40" />
                <Skeleton className="h-10 w-full rounded-2xl bg-muted/40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
