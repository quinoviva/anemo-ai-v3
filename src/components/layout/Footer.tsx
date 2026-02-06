'use client';

import Link from 'next/link';

export function Footer() {
  const links = [
    { label: 'Terms', href: '/terms-of-service' },
    { label: 'Privacy', href: '/privacy-policy' },
    { label: 'Security', href: '#' },
    { label: 'Status', href: '#' },
    { label: 'Community', href: '#' },
    { label: 'Docs', href: '#' },
    { label: 'Contact', href: '#' },
  ];

  return (
    <footer className="w-full py-12 px-4 md:px-8 mt-auto">
      <div className="mx-auto max-w-7xl border-t border-primary/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500">
        
        {/* Left: Copyright */}
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/40">
                &copy; 2025 ANEMO
            </span>
        </div>

        {/* Right: Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {links.map((link) => (
                <Link 
                    key={link.label} 
                    href={link.href}
                    className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground hover:text-primary transition-colors duration-300 relative group"
                >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full opacity-50" />
                </Link>
            ))}
        </nav>
      </div>
    </footer>
  );
}
