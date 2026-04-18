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
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
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
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'framer-motion';

const mainNavLinks = [
  { href: '/dashboard', label: 'HOME', icon: Home },
  { href: '/dashboard/analysis', label: 'ANALYSIS', icon: Activity },
  { href: '/dashboard/history', label: 'TRACK', icon: History },
];

const otherLinks = [
  { href: '/dashboard/chatbot', label: 'Anemo Bot', icon: Bot },
  { href: '/dashboard/find-doctor', label: 'Find Care', icon: Search },
  { href: '/dashboard/remedies', label: 'Remedies', icon: Leaf },
];

export function Header() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);
  const otherMenuRef = useRef<HTMLDivElement>(null);
  const openTimeout = useRef<NodeJS.Timeout | null>(null);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const isGuest = auth.currentUser?.isAnonymous;

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const displayName = userData ? `${userData.firstName} ${userData.lastName}` : (auth?.currentUser?.displayName || 'User');

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (isGuest) return 'G';
    if (!name || name === 'User') return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name[0] || 'U';
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed top-0 z-50 w-full p-4 pointer-events-none flex justify-center">
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

            <div className="relative">
              <Link
                href="/dashboard/analysis/multimodal"
                className={cn(
                  'px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 flex items-center gap-2 group h-10',
                  pathname === '/dashboard/analysis/multimodal'
                    ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)]'
                    : 'text-primary bg-primary/10 hover:bg-primary/20'
                )}
              >
                <HeartPulse className="w-3 h-3 animate-pulse" />
                SCAN
              </Link>
            </div>

            <DropdownMenu open={otherMenuOpen} onOpenChange={setOtherMenuOpen}>
              <div
                ref={otherMenuRef}
                onMouseEnter={() => {
                  if (closeTimeout.current) clearTimeout(closeTimeout.current);
                  openTimeout.current = setTimeout(() => setOtherMenuOpen(true), 150);
                }}
                onMouseLeave={() => {
                  if (openTimeout.current) clearTimeout(openTimeout.current);
                  closeTimeout.current = setTimeout(() => setOtherMenuOpen(false), 200);
                }}
                className="relative flex items-center justify-center w-[90px]"
              >
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold tracking-widest rounded-full transition-all duration-300 outline-none h-10 w-full',
                      otherLinks.some(l => l.href === pathname)
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                    )}
                  >
                    MORE
                    <ChevronDown className={cn("h-3 w-3 opacity-50 transition-transform duration-200", otherMenuOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>
                
                <AnimatePresence>
                  {otherMenuOpen && (
                    /* The motion.div below is centered using left-1/2 and -translate-x-1/2 */
                    <motion.div 
                      initial={{ opacity: 0, y: 8, x: '-50%' }}
                      animate={{ opacity: 1, y: 0, x: '-50%' }}
                      exit={{ opacity: 0, y: 8, x: '-50%' }}
                      className="absolute left-1/2 top-full pt-2 z-50 pointer-events-auto"
                    >
                      <div className="w-52 p-2 bg-background/95 backdrop-blur-xl border border-primary/10 rounded-2xl shadow-xl">
                        {otherLinks.map(({ href, label, icon: Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                            onClick={() => setOtherMenuOpen(false)}
                          >
                            <Icon className="h-4 w-4 opacity-70" />
                            <span className="text-sm font-medium">{label}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </DropdownMenu>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 pr-1">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full hover:bg-primary/5 transition-all">
                  <Avatar className="h-9 w-9 border border-primary/10">
                    <AvatarImage src={auth?.currentUser?.photoURL ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-2 bg-background/80 backdrop-blur-xl border border-primary/10 rounded-2xl shadow-xl">
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{isGuest ? 'Guest User' : displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate font-mono opacity-70">
                      {isGuest ? 'Sign in to save data' : auth?.currentUser?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} disabled={isGuest} className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-3 text-sm text-muted-foreground">
                  <User className="mr-3 h-4 w-4 opacity-70" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-3 text-sm text-muted-foreground">
                  <Settings className="mr-3 h-4 w-4 opacity-70" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer focus:bg-primary/5 rounded-lg px-3 py-3 text-sm text-muted-foreground">
                    <Sun className="mr-3 h-4 w-4 opacity-70 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute mr-3 h-4 w-4 opacity-70 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="bg-background/80 backdrop-blur-xl border border-primary/10 rounded-xl shadow-xl ml-2 p-1">
                      <DropdownMenuItem onClick={() => setTheme('light')} className="rounded-lg focus:bg-primary/5 p-3">
                        <Sun className="mr-3 h-4 w-4" /> <span>Light</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-lg focus:bg-primary/5 p-3">
                        <Moon className="mr-3 h-4 w-4" /> <span>Dark</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-lg focus:bg-primary/5 p-3">
                        <Monitor className="mr-3 h-4 w-4" /> <span>System</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/5 cursor-pointer rounded-lg px-3 py-3">
                  <LogOut className="mr-3 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm md:hidden" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 z-[70] w-[85%] max-w-sm bg-background border-l border-primary/10 shadow-2xl md:hidden flex flex-col p-8 pt-24">
              <div className="space-y-8 overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-[10px] font-black tracking-[0.3em] text-primary uppercase ml-4">Main Menu</p>
                  <div className="grid gap-2">
                    {mainNavLinks.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} className={cn('flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black tracking-widest transition-all', pathname === href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/5')}>
                        <Icon className="w-5 h-5" /> {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}