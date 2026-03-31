'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  analysis: 'Analysis',
  multimodal: 'Multimodal Scan',
  history: 'History',
  profile: 'Profile',
  settings: 'Settings',
  'live-analysis': 'Live Scan',
  chatbot: 'AI Assistant',
  'find-doctor': 'Find Care',
  remedies: 'Remedies',
  'about-anemia': 'About Anemia',
  games: 'Games',
  'iron-catcher': 'Iron Catcher',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Only show when depth > 1 (i.e., beyond /dashboard)
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labelMap[seg] ?? seg.replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-0 flex-wrap">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center">
            {i > 0 && (
              <ChevronRight className="w-3.5 h-3.5 mx-1 text-border shrink-0" aria-hidden="true" />
            )}
            {crumb.isLast ? (
              <span
                aria-current="page"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] bg-primary/10 text-primary border border-primary/20"
              >
                {i === 0 && <LayoutDashboard className="w-3 h-3 shrink-0" aria-hidden="true" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-[0.12em] transition-all duration-200',
                  'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border/50'
                )}
              >
                {i === 0 && <LayoutDashboard className="w-3 h-3 shrink-0" aria-hidden="true" />}
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
