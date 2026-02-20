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
import { 
  HeartPulse, 
  Moon, 
  Sun, 
  Monitor, 
  Bot, 
  Video, 
  Search, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Leaf,
  Menu,
  X,
  Home,
  Activity,
  History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Logo } from './Logo';
import { SequentialImageAnalyzer } from '../anemo/SequentialImageAnalyzer';
import { motion, AnimatePresence } from 'framer-motion';

const mainNavLinks = [
  { href: '/dashboard', label: 'HOME', icon: Home },
  { href: '/dashboard/analysis', label: 'ANALYSIS', icon: Activity },
  { href: '/dashboard/history', label: 'TRACK', icon: History },
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
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isGuest = auth.currentUser?.isAnonymous;

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

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
    <header className="fixed top-0 z-50 w-full p-4 pointer-events-none flex justify-center">
      {/* Floating Capsule */}
      <div className="pointer-events-auto flex items-center justify-between w-full max-w-5xl h-16 px-4 md:px-6 bg-background/60 backdrop-blur-xl border border-primary/10 rounded-full shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)]">
        
        {/* Left: Logo */}
        <div className="flex items-center shrink-0 pl-2">
          <Link href="/dashboard" className="flex items-center gap-3 group h-12 px-2">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                 <Logo className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase text-foreground/80 group-hover:text-foreground transition-colors hidden sm:inline-block">Anemo</span>
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {mainNavLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 h-10 flex items-center',
                pathname === href 
                  ? 'text-primary bg-primary/5' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
              )}
            >
              {label}
            </Link>
          ))}
          
           {/* SCAN Trigger */}
           <div className="relative">
              <button 
                onClick={() => setIsScanOpen(true)}
                className={cn(
                  'px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 flex items-center gap-2 group h-10',
                  isScanOpen 
                  ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)]' 
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
                    'flex items-center gap-1 px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 outline-none h-10',
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
                    <DropdownMenuItem key={href} asChild className="p-3 cursor-pointer focus:bg-primary/5 rounded-xl text-muted-foreground focus:text-primary transition-colors">
                        <Link href={href} className="flex items-center gap-3">
                            <Icon className="h-4 w-4 opacity-70" />
                            <span className="text-sm font-medium">{label}</span>
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right: Actions & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 shrink-0 pr-1">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all outline-none"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full hover:bg-primary/5 transition-all" aria-label="Open user menu">
                <Avatar className="h-9 w-9 border border-primary/10">
                  <AvatarImage
                    src={auth?.currentUser?.photoURL ?? undefined}
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
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} disabled={isGuest} className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-3 text-sm text-muted-foreground focus:text-primary">
                <User className="mr-3 h-4 w-4 opacity-70" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-3 text-sm text-muted-foreground focus:text-primary">
                <Settings className="mr-3 h-4 w-4 opacity-70" />
                Settings
              </DropdownMenuItem>
               <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-3 text-sm text-muted-foreground focus:text-primary">
                  <div className="flex items-center flex-1">
                    <Sun className="mr-3 h-4 w-4 opacity-70 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute mr-3 h-4 w-4 opacity-70 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>Theme</span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-background/80 backdrop-blur-xl border border-primary/10 rounded-xl shadow-xl ml-2 p-1">
                    <DropdownMenuItem onClick={() => setTheme('light')} className="rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer p-3">
                      <Sun className="mr-3 h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer p-3">
                      <Moon className="mr-3 h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-lg focus:bg-primary/5 focus:text-primary cursor-pointer p-3">
                      <Monitor className="mr-3 h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer rounded-lg px-3 py-3">
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    {/* Mobile Drawer Overlay */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm md:hidden"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-[85%] max-w-sm bg-background border-l border-primary/10 shadow-2xl md:hidden flex flex-col p-8 pt-24"
          >
            <div className="space-y-8 overflow-y-auto">
              <div className="space-y-2">
                <p className="text-[10px] font-black tracking-[0.3em] text-primary uppercase ml-4">Main Menu</p>
                <div className="grid gap-2">
                  {mainNavLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black tracking-widest transition-all',
                        pathname === href 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </Link>
                  ))}
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsScanOpen(true);
                    }}
                    className="flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black tracking-widest text-primary bg-primary/10 transition-all text-left"
                  >
                    <HeartPulse className="w-5 h-5" />
                    SCAN
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black tracking-[0.3em] text-muted-foreground uppercase ml-4">Resources</p>
                <div className="grid gap-2">
                  {otherLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold tracking-widest transition-all',
                        pathname === href 
                          ? 'bg-primary/5 text-primary' 
                          : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      <Icon className="w-5 h-5 opacity-70" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-primary/5">
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-bold text-foreground mb-1 uppercase tracking-tight">Anemo Intelligence</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Neural diagnostics for blood health assessment.</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <SequentialImageAnalyzer 
      isOpen={isScanOpen} 
      onClose={() => setIsScanOpen(false)} 
    />
    </>
  );
}
