'use client';

import { useState, useEffect } from 'react';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Shield, Smartphone, Globe, Palette, Database, Trash2, Key, Download, RefreshCw, Droplets } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import HeartLoader from '@/components/ui/HeartLoader';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

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
              title: "Permission Required",
              description: "Please enable notifications to receive hydration alerts.",
              variant: "destructive"
            });
            return;
         }
      }
    }
    
    try {
        await setDoc(userDocRef!, {
            hydration: {
                enabled: checked
            }
        }, { merge: true });
        
        toast({
            title: checked ? "Hydration Enabled" : "Hydration Disabled",
            description: checked ? "We'll remind you to stay hydrated." : "Hydration reminders turned off.",
        });
    } catch (error) {
        toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
    }
  };

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      if (!('Notification' in window)) {
        toast({
          title: "Not Supported",
          description: "This browser does not support desktop notifications.",
          variant: "destructive",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You will now receive health alerts on this device.",
        });
        // In a real app, you would also register the service worker token here
        new Notification("Anemo Check", {
          body: "Notifications are now active on this system!",
          icon: "/favicon.svg"
        });
      } else {
        setPushEnabled(false);
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } else {
      setPushEnabled(false);
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: "Settings Synced",
        description: "Your preferences have been updated across all devices.",
      });
    }, 1500);
  };

  const handleExportData = () => {
    toast({
        title: "Data Export Started",
        description: "A secure link with your health data will be sent to your email.",
    });
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize your Anemo experience and manage your data.
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} className="rounded-full px-6 shadow-lg shadow-primary/20">
          {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isSyncing ? 'Syncing...' : 'Sync Settings'}
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Appearance & Preferences */}
        <GlassSurface intensity="medium" className="overflow-hidden">
            <div className="p-6 border-b bg-primary/5 flex items-center gap-3">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Appearance & Localization</h2>
            </div>
            <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-lg font-medium">Interface Theme</Label>
                        <p className="text-sm text-muted-foreground">Select how Anemo looks on your screen.</p>
                    </div>
                    <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light Mode</SelectItem>
                            <SelectItem value="dark">Dark Mode</SelectItem>
                            <SelectItem value="system">System Default</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-lg font-medium">Primary Language</Label>
                        <p className="text-sm text-muted-foreground">Used for all reports and AI interactions.</p>
                    </div>
                    <Select defaultValue="en">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English (US)</SelectItem>
                            <SelectItem value="ph">Filipino (PH)</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </GlassSurface>

        {/* Notifications Section */}
        <GlassSurface intensity="medium" className="overflow-hidden">
            <div className="p-6 border-b bg-blue-500/5 flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-bold">Notifications</h2>
            </div>
            <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/30">
                    <div className="space-y-1">
                        <Label className="text-base font-bold">Weekly Health Summary</Label>
                        <p className="text-sm text-muted-foreground">Receive a digest of your anemia trends via email.</p>
                    </div>
                    <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/30">
                    <div className="space-y-1">
                        <Label className="text-base font-bold flex items-center gap-2">
                            AI Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">Real-time alerts when risk scores change significantly.</p>
                    </div>
                    <Switch />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/30">
                    <div className="space-y-1">
                        <Label className="text-base font-bold flex items-center gap-2">
                            System Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Push alerts directly to your phone or desktop system.</p>
                    </div>
                    <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/30">
                    <div className="space-y-1">
                        <Label className="text-base font-bold flex items-center gap-2">
                            Hydration Reminders
                        </Label>
                        <p className="text-sm text-muted-foreground">Get reminded to drink water every hour.</p>
                    </div>
                    <Switch checked={waterReminderEnabled} onCheckedChange={handleWaterToggle} />
                </div>
            </CardContent>
        </GlassSurface>

        {/* Data & Security */}
        <GlassSurface intensity="medium" className="overflow-hidden border-destructive/20">
            <div className="p-6 border-b bg-destructive/5 flex items-center gap-3">
                <Shield className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-bold">Privacy & Security</h2>
            </div>
            <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1 text-left" onClick={handleExportData}>
                        <div className="flex items-center gap-2 font-bold">
                            <Download className="h-4 w-4" /> Export Health Data
                        </div>
                        <span className="text-xs text-muted-foreground">Download all your records in JSON/PDF format.</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-1 text-left">
                        <div className="flex items-center gap-2 font-bold">
                            <Key className="h-4 w-4" /> Change Credentials
                        </div>
                        <span className="text-xs text-muted-foreground">Update your password or login methods.</span>
                    </Button>
                </div>

                <div className="pt-6 border-t">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="font-bold text-destructive">Danger Zone</h4>
                            <p className="text-sm text-muted-foreground">Permanently delete your account and all health history.</p>
                        </div>
                        <Button variant="destructive" className="group">
                            <Trash2 className="mr-2 h-4 w-4 group-hover:animate-bounce" /> Delete Account
                        </Button>
                    </div>
                </div>
            </CardContent>
        </GlassSurface>
      </div>

      <div className="text-center space-y-2 pt-10">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Anemo System Version 2.4.0-Stable</p>
          <p className="text-[10px] text-muted-foreground italic">Your data is encrypted end-to-end using industry-standard protocols.</p>
      </div>
    </div>
  );
}