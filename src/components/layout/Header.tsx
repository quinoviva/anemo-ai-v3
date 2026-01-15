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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Menu, HeartPulse, History, Stethoscope, Moon, Sun, Monitor, Bot, Video, Search } from 'lucide-react';
import { Cog } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Logo } from './Logo';

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: HeartPulse },
  { href: '/dashboard/analysis', label: 'Analysis', icon: Stethoscope },
  { href: '/dashboard/history', label: 'Track', icon: History },
];

export function Header() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [, setForceRender] = useState(0);

  const isGuest = auth.currentUser?.isAnonymous;

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
    if (isGuest) return 'G';
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
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>
                Select a page to navigate to.
              </SheetDescription>
            </SheetHeader>
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Logo className="h-6 w-6" />
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
              <div className="border-t pt-4 mt-auto space-y-4">
                 <Link
                  href="/dashboard/chatbot"
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                    { 'bg-muted text-foreground': pathname === '/dashboard/chatbot' }
                  )}
                >
                  <Bot className="h-5 w-5" />
                  ChatbotAI
                </Link>
                 <Link
                  href="/dashboard/live-analysis"
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                    { 'bg-muted text-foreground': pathname === '/dashboard/live-analysis' }
                  )}
                >
                  <Video className="h-5 w-5" />
                  Live Analysis
                </Link>
                 <Link
                  href="/dashboard/find-doctor"
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                    { 'bg-muted text-foreground': pathname === '/dashboard/find-doctor' }
                  )}
                >
                  <Search className="h-5 w-5" />
                  Nearby Providers
                </Link>
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
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="hidden items-center gap-2 md:flex">
          <Logo className="h-6 w-6" />
          <span className="font-bold text-lg">Anemo Check</span>
        </Link>
      </div>

      <nav className="hidden flex-grow items-center justify-center gap-5 text-sm font-medium md:flex lg:gap-6">
        {navLinks.map(({ href, label }) => (
            <Link
            key={href}
            href={href}
            className={cn(
                'transition-colors hover:text-foreground',
                pathname === href ? 'text-foreground' : 'text-muted-foreground'
            )}
            >
            {label}
            </Link>
        ))}
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
              {isGuest ? (
                <p className="font-medium">Guest Mode</p>
              ) : (
                <>
                  <p className="font-medium">
                    {auth?.currentUser?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {auth?.currentUser?.email || 'No email provided'}
                  </p>
                </>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} disabled={isGuest}>
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
