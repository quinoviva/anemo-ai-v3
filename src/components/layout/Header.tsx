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
import { HeartPulse, History, Stethoscope, Moon, Sun, Monitor, Bot, Video, Search, User, Settings, LogOut, ChevronDown, Leaf } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Logo } from './Logo';
import { SequentialImageAnalyzer } from '../anemo/SequentialImageAnalyzer';

const mainNavLinks = [
  { href: '/dashboard', label: 'HOME' },
  { href: '/dashboard/analysis', label: 'ANALYSIS' },
  { href: '/dashboard/history', label: 'TRACK' },
];

const otherLinks = [
  { href: '/dashboard/chatbot', label: 'AI Assistant', icon: Bot },
  { href: '/dashboard/live-analysis', label: 'Live Scan', icon: Video },
  { href: '/dashboard/find-doctor', label: 'Find Care', icon: Search },
  { href: '/dashboard/remedies', label: 'Remedies', icon: Leaf },
];

export function Header() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [, setForceRender] = useState(0);
  const [isScanOpen, setIsScanOpen] = useState(false);

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
    <>
    <header className="fixed top-0 z-50 w-full p-4 pointer-events-none flex justify-center">
      {/* Floating Capsule */}
      <div className="pointer-events-auto flex items-center justify-between w-full max-w-5xl h-16 px-4 pr-2 bg-background/60 backdrop-blur-xl border border-primary/10 rounded-full shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
        
        {/* Left: Logo */}
        <div className="flex items-center shrink-0 pl-2">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                 <Logo className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase text-foreground/80 group-hover:text-foreground transition-colors hidden sm:inline-block">Anemo</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {mainNavLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300',
                pathname === href 
                  ? 'text-primary bg-primary/5 shadow-none' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
              )}
            >
              {label}
            </Link>
          ))}
          
           {/* SCAN Trigger - Click to Open */}
           <div className="relative">
              <button 
                onClick={() => setIsScanOpen(true)}
                className={cn(
                  'px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 flex items-center gap-2 group',
                  isScanOpen 
                  ? 'bg-primary text-black shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)]' 
                  : 'text-primary bg-primary/10 hover:bg-primary/20'
                )}
              >
                <HeartPulse className="w-3 h-3 animate-pulse" />
                SCAN
              </button>
           </div>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    'flex items-center gap-1 px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 outline-none',
                    otherLinks.some(l => l.href === pathname)
                    ? 'text-primary bg-primary/5' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                )}>
                    OTHER
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={10} className="w-56 p-2 bg-background/80 backdrop-blur-xl border border-primary/10 rounded-2xl shadow-xl">
                {otherLinks.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild className="p-2 cursor-pointer focus:bg-primary/5 rounded-xl text-muted-foreground focus:text-primary transition-colors">
                        <Link href={href} className="flex items-center gap-3">
                            <Icon className="h-4 w-4 opacity-70" />
                            <span className="text-sm font-medium">{label}</span>
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 transition-all" aria-label="Open user menu">
                <Avatar className="h-8 w-8 border border-primary/10">
                  <AvatarImage
                    src={auth?.currentUser?.photoURL ?? undefined}
                    key={auth?.currentUser?.photoURL}
                    alt={auth?.currentUser?.displayName || 'User profile'}
                  />
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                    {getInitials(
                      auth?.currentUser?.displayName ?? auth?.currentUser?.email
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-2 bg-background/80 backdrop-blur-xl border border-primary/10 rounded-2xl shadow-xl">
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                     {isGuest ? 'Guest User' : (auth?.currentUser?.displayName || 'User')}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate font-mono opacity-70">
                    {isGuest ? 'Sign in to save data' : (auth?.currentUser?.email || '')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} disabled={isGuest} className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-2 text-sm text-muted-foreground focus:text-primary">
                <User className="mr-2 h-4 w-4 opacity-70" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-2 text-sm text-muted-foreground focus:text-primary">
                <Settings className="mr-2 h-4 w-4 opacity-70" />
                Settings
              </DropdownMenuItem>
               <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-2 text-sm text-muted-foreground focus:text-primary">
                  <Sun className="mr-2 h-4 w-4 opacity-70 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute mr-2 h-4 w-4 opacity-70 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="mr-2">Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-background/80 backdrop-blur-xl border border-primary/10 rounded-xl shadow-xl ml-2 p-1">
                    <DropdownMenuItem onClick={() => setTheme('light')} className="rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer">
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer">
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer">
                      <Monitor className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer rounded-lg px-3 py-2">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    <SequentialImageAnalyzer 
      isOpen={isScanOpen} 
      onClose={() => setIsScanOpen(false)} 
    />
    </>
  );
}
