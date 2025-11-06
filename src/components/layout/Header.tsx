'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '@/firebase';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu, HeartPulse, History, Stethoscope, Moon, Sun, Monitor, Bot, Video, Search } from 'lucide-react';
import { Cog } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: HeartPulse },
  { href: '/dashboard/analysis', label: 'Analysis', icon: Stethoscope },
  { href: '/dashboard/history', label: 'Track', icon: History },
  { href: '/dashboard/chatbot', label: 'AI Assistant', icon: Bot },
  { href: '/dashboard/live-analysis', label: 'Live Analysis', icon: Video },
  { href: '/dashboard/find-doctor', label: 'Find a Doctor', icon: Search },
];

export function Header() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [, setForceRender] = useState(0);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setForceRender(Math.random());
    };

    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name[0] || 'U';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                 <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-primary"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  <path d="M3.22 12H9.5l.7-1 2.1 4.2 1.6-3.2 1.6 3.2h3.22" />
                </svg>
                <span className="font-bold">Anemo Check</span>
              </Link>
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                    { 'bg-muted text-foreground': pathname === href }
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
               <Link
                  href="/dashboard/settings"
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                    { 'bg-muted text-foreground': pathname === '/dashboard/settings' }
                  )}
                >
                  <Cog className="h-5 w-5" />
                  Settings
                </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="hidden items-center gap-2 md:flex">
           <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-primary"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  <path d="M3.22 12H9.5l.7-1 2.1 4.2 1.6-3.2 1.6 3.2h3.22" />
                </svg>
          <span className="font-bold text-lg">Anemo Check</span>
        </Link>
      </div>

      <nav className="hidden flex-grow items-center justify-center gap-5 text-sm font-medium md:flex lg:gap-6">
        <Link
          href={'/dashboard'}
          className={cn(
            'transition-colors hover:text-foreground',
            pathname === '/dashboard' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Home
        </Link>
        <Link
          href={'/dashboard/analysis'}
          className={cn(
            'transition-colors hover:text-foreground',
            pathname === '/dashboard/analysis' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Analysis
        </Link>
        <Link
          href={'/dashboard/history'}
          className={cn(
            'transition-colors hover:text-foreground',
            pathname === '/dashboard/history' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Track
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage
                  src={auth?.currentUser?.photoURL ?? undefined}
                  key={auth?.currentUser?.photoURL}
                  data-ai-hint="person face"
                />
                <AvatarFallback>
                  {getInitials(
                    auth?.currentUser?.displayName ?? auth?.currentUser?.email
                  )}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="font-medium">
                {auth?.currentUser?.displayName || 'Guest'}
              </p>
              <p className="text-xs text-muted-foreground">
                {auth?.currentUser?.email || 'No email provided'}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Settings
            </DropdownMenuItem>
             <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
