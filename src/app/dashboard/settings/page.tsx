'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell,
  Shield,
  Palette,
  Trash2,
  Key,
  Download,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80 } },
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc(userDocRef);
  const waterReminderEnabled = userData?.hydration?.enabled || false;

  const handleWaterToggle = async (checked: boolean) => {
    if (!user || !firestore) return;

    if (checked) {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast({
            title: 'Permission Required',
            description: 'Please enable notifications to receive hydration alerts.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    try {
      if (!userDocRef) return;
      await setDoc(userDocRef, { hydration: { enabled: checked } }, { merge: true });
      toast({
        title: checked ? 'Hydration Enabled' : 'Hydration Disabled',
        description: checked
          ? "We'll remind you to stay hydrated."
          : 'Hydration reminders turned off.',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to update settings.', variant: 'destructive' });
    }
  };

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      if (!('Notification' in window)) {
        toast({
          title: 'Not Supported',
          description: 'This browser does not support desktop notifications.',
          variant: 'destructive',
        });
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('anemo_next_reminder_at', String(Date.now() + WEEK_MS));
        toast({
          title: 'Notifications Enabled',
          description: "You'll receive a weekly scan reminder and health alerts on this device.",
        });
        new Notification('Anemo AI \u2014 Notifications Active', {
          body: "You'll receive a weekly check-in reminder. Stay on top of your health!",
          icon: '/anemo.png',
          tag: 'anemo-setup',
        });
      } else {
        setPushEnabled(false);
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    } else {
      setPushEnabled(false);
      localStorage.removeItem('anemo_next_reminder_at');
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: 'Settings Synced',
        description: 'Your preferences have been updated across all devices.',
      });
    }, 1500);
  };

  const handleExportData = async () => {
    if (!user || !firestore) return;
    setIsExporting(true);
    try {
      const [imageSnap, labSnap, cycleSnap] = await Promise.all([
        getDocs(collection(firestore, `users/${user.uid}/imageAnalyses`)),
        getDocs(collection(firestore, `users/${user.uid}/labReports`)),
        getDocs(collection(firestore, `users/${user.uid}/cycle_logs`)),
      ]);
      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: { id: user.uid, email: user.email, ...(userData || {}) },
        imageAnalyses: imageSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        labReports: labSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        cycleLogs: cycleSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anemo-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data Exported', description: 'Your complete health data has been downloaded.' });
    } catch (e) {
      toast({ title: 'Export Failed', description: 'Could not export data. Please try again.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const notificationRows = [
    {
      title: 'Weekly Health Summary',
      desc: 'Receive a digest of your anemia trends via email.',
      badge: 'Email',
      badgeColor: '#3b82f6',
      control: <Switch defaultChecked />,
    },
    {
      title: 'AI Alerts',
      desc: 'Real-time alerts when risk scores change significantly.',
      badge: 'AI',
      badgeColor: '#8b5cf6',
      control: <Switch />,
    },
    {
      title: 'System Notifications',
      desc: 'Push alerts directly to your phone or desktop system.',
      badge: 'Push',
      badgeColor: '#f59e0b',
      control: <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />,
    },
    {
      title: 'Hydration Reminders',
      desc: 'Get reminded to drink water every hour.',
      badge: 'Hourly',
      badgeColor: '#06b6d4',
      control: <Switch checked={waterReminderEnabled} onCheckedChange={handleWaterToggle} />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 space-y-16">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-10"
      >
        {/* Hero */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4"
        >
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">
              <Settings2 className="h-3 w-3" />
              System Preferences
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9]">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
                Settings
              </span>
              <span className="text-primary animate-pulse">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
              System Preferences
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-full px-7 shadow-lg shadow-primary/20 self-start md:self-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Settings'}
          </Button>
        </motion.div>

        {/* Appearance & Localization */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg overflow-hidden"
        >
          <div className="px-8 pt-8 pb-6 flex items-center gap-3 border-b border-primary/10">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Appearance & Localization</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Display and language preferences</p>
            </div>
          </div>
          <div className="p-8 space-y-4">
            <div className="rounded-2xl bg-background/60 backdrop-blur-xl border border-primary/10 p-5 flex items-center justify-between gap-4">
              <div>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 inline-block mb-2">
                  Theme
                </span>
                <Label className="block text-base font-semibold">Interface Theme</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Select how Anemo looks on your screen.</p>
              </div>
              <Select value={theme ?? 'system'} onValueChange={setTheme}>
                <SelectTrigger className="w-[170px] rounded-full">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                  <SelectItem value="system">System Default</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-background/60 backdrop-blur-xl border border-primary/10 p-5 flex items-center justify-between gap-4">
              <div>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 inline-block mb-2">
                  Language
                </span>
                <Label className="block text-base font-semibold">Primary Language</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Used for all reports and AI interactions.</p>
              </div>
              <Select defaultValue="en">
                <SelectTrigger className="w-[170px] rounded-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (US)</SelectItem>
                  <SelectItem value="ph">Filipino (PH)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg overflow-hidden"
        >
          <div className="px-8 pt-8 pb-6 flex items-center gap-3 border-b border-primary/10">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Notifications</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage alert and reminder preferences</p>
            </div>
          </div>
          <div className="p-8 space-y-4">
            {notificationRows.map(({ title, desc, badge, badgeColor, control }) => (
              <div
                key={title}
                className="rounded-2xl bg-background/60 backdrop-blur-xl border border-primary/10 p-5 flex items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <span
                    className="rounded-full text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border inline-block mb-1"
                    style={{
                      backgroundColor: `${badgeColor}20`,
                      color: badgeColor,
                      borderColor: `${badgeColor}40`,
                    }}
                  >
                    {badge}
                  </span>
                  <Label className="block text-base font-semibold">{title}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <div className="flex-shrink-0">{control}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-destructive/20 shadow-lg overflow-hidden"
        >
          <div className="px-8 pt-8 pb-6 flex items-center gap-3 border-b border-destructive/10">
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Privacy & Security</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your data and account security</p>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={handleExportData}
                className="rounded-2xl bg-background/60 backdrop-blur-xl border border-primary/10 p-5 flex flex-col items-start gap-2 text-left hover:border-primary/30 transition-colors group"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">Export Health Data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download all your records in JSON/PDF format.
                  </p>
                </div>
              </button>
              <button className="rounded-2xl bg-background/60 backdrop-blur-xl border border-primary/10 p-5 flex flex-col items-start gap-2 text-left hover:border-primary/30 transition-colors group">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">Change Credentials</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your password or login methods.
                  </p>
                </div>
              </button>
            </div>

            {/* Download My Data */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1 inline-block mb-2">
                  GDPR Export
                </span>
                <p className="font-bold text-foreground">Download My Data</p>
                <p className="text-xs text-muted-foreground">
                  Export all your health records, analyses, and profile data as JSON.
                </p>
              </div>
              <Button
                onClick={handleExportData}
                disabled={isExporting}
                className="rounded-full flex-shrink-0 bg-primary hover:bg-primary/90 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting…' : 'Download Data'}
              </Button>
            </div>

            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1 inline-block mb-2">
                  Danger Zone
                </span>
                <p className="font-bold text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all health history.
                </p>
              </div>
              <Button variant="destructive" className="rounded-full group flex-shrink-0">
                <Trash2 className="mr-2 h-4 w-4 group-hover:animate-bounce" /> Delete Account
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Version Badge */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-2 pt-4">
          <span className="rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5">
            Anemo System v2.4.0-Stable
          </span>
          <p className="text-[10px] text-muted-foreground italic">
            Your data is encrypted end-to-end using industry-standard protocols.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
