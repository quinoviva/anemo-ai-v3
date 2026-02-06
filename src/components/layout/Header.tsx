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
import { HeartPulse, History, Stethoscope, Moon, Sun, Monitor, Bot, Video, Search, User, Settings, LogOut, LayoutGrid, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Logo } from './Logo';

const mainNavLinks = [
  { href: '/dashboard', label: 'HOME', icon: HeartPulse },
  { href: '/dashboard/analysis', label: 'ANALYSIS', icon: Stethoscope },
  { href: '/dashboard/history', label: 'TRACK', icon: History },
];

const secondaryNavLinks = [
  { href: '/dashboard/chatbot', label: 'AI Assistant', icon: Bot, description: 'Chat with our health AI' },
  { href: '/dashboard/live-analysis', label: 'Live Scan', icon: Video, description: 'Real-time camera check' },
  { href: '/dashboard/find-doctor', label: 'Find Care', icon: Search, description: 'Locate nearby clinics' },
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
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30 shadow-sm transition-all duration-300">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 w-full relative">
        {/* Left: Logo */}
        <div className="flex items-center shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <Logo className="h-7 w-7" />
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Anemo Check</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 md:gap-2">
          {mainNavLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 md:px-5 py-2 text-sm md:text-base font-bold tracking-wider rounded-full transition-all',
                pathname === href 
                  ? 'text-primary bg-primary/10 shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          
          {/* Tools / App Launcher Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground" title="Tools & Apps">
                <LayoutGrid className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 glass border-border/50">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                Health Tools
              </DropdownMenuLabel>
              {secondaryNavLinks.map(({ href, label, icon: Icon, description }) => (
                <DropdownMenuItem key={href} asChild className="p-2 cursor-pointer focus:bg-primary/5 rounded-lg group">
                  <Link href={href} className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-none flex items-center justify-between">
                        {label}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{description}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="my-2 bg-border/50" />
              <DropdownMenuItem asChild className="p-2 cursor-pointer focus:bg-accent rounded-lg">
                 <Link href="/dashboard/settings" className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted text-muted-foreground">
                        <Settings className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Settings</span>
                 </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all" aria-label="Open user menu">
                <Avatar className="h-8 w-8 md:h-9 md:h-9 border">
                  <AvatarImage
                    src={auth?.currentUser?.photoURL ?? undefined}
                    key={auth?.currentUser?.photoURL}
                    alt={auth?.currentUser?.displayName || 'User profile'}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm font-medium">
                    {getInitials(
                      auth?.currentUser?.displayName ?? auth?.currentUser?.email
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 glass border-border/50">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                     {isGuest ? 'Guest User' : (auth?.currentUser?.displayName || 'User')}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {isGuest ? 'Sign in to save data' : (auth?.currentUser?.email || '')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} disabled={isGuest} className="cursor-pointer focus:bg-accent">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
               <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer focus:bg-accent">
                  <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="ml-2">Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="glass border-border/50">
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
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
