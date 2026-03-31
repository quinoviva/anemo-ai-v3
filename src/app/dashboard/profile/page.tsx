'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfile } from 'firebase/auth';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { useUser, useFirestore, useAuth, useDoc, useMemoFirebase } from '@/firebase';
import { CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Upload, User, LogIn, Info, Activity, ShieldCheck, Heart, UserCircle, MapPin, CalendarIcon } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn, getErrorMessage } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import HeartLoader from '@/components/ui/HeartLoader';
import { AnemoLoading } from '@/components/ui/anemo-loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagInput } from '@/components/ui/tag-input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  photoURL: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  sex: z.string().optional(),
  height: z.coerce.number().positive('Height must be positive.').optional().or(z.literal('')),
  weight: z.coerce.number().positive('Weight must be positive.').optional().or(z.literal('')),
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  familyHistory: z.array(z.string()).optional(),
  lastMenstrualPeriod: z.string().optional(),
  cycleLength: z.coerce.number().positive('Must be a positive number.').optional().or(z.literal('')),
  flowDuration: z.coerce.number().positive('Must be a positive number.').optional().or(z.literal('')),
  flowIntensity: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [lmpOpen, setLmpOpen] = useState(false);
  // Tracks when the Firestore subscription has actually started fetching,
  // preventing a race condition where userDocRef becomes non-null but
  // useDoc's isLoading is still false on the same render.
  const docHasStartedLoadingRef = useRef(false);

  const isGuest = user?.isAnonymous;

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore || isGuest) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore, isGuest]);

  const { data: userData, isLoading: userDataLoading } = useDoc(userDocRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      photoURL: '',
      address: '',
      dateOfBirth: '',
      sex: '',
      height: '',
      weight: '',
      bloodType: '',
      allergies: [],
      conditions: [],
      medications: [],
      familyHistory: [],
      lastMenstrualPeriod: '',
      cycleLength: '',
      flowDuration: '',
      flowIntensity: '',
    },
  });

  const watchSex = form.watch('sex');
  const isFemale = watchSex === 'Female';
  const watchFirstName = form.watch('firstName');
  const watchLastName = form.watch('lastName');
  const watchHeight = Number(form.watch('height'));
  const watchWeight = Number(form.watch('weight'));
  const watchDob = form.watch('dateOfBirth');
  const watchAddress = form.watch('address');

  // Calculate BMI if height and weight are present
  const bmi = (watchHeight && watchWeight) 
    ? (watchWeight / ((watchHeight / 100) ** 2)).toFixed(1) 
    : null;

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(s => s);
    return [];
  };

  // Track when loading has actually started (prevents race condition)
  useEffect(() => {
    if (userDataLoading) docHasStartedLoadingRef.current = true;
  }, [userDataLoading]);

  useEffect(() => {
    if (initialDataLoaded) return;
    if (!user) return; // Auth not ready yet

    // If we have a docRef, wait for the subscription to START loading before
    // trusting a null userData — otherwise we fire the fallback on the brief
    // render where userDocRef just became non-null but isLoading is still false.
    if (userDocRef && !docHasStartedLoadingRef.current) return;
    if (userDocRef && userDataLoading) return; // Still fetching

    if (userData) {
          const medicalInfo = userData.medicalInfo || {};
          let dobValue = medicalInfo.dateOfBirth;
          if (dobValue instanceof Timestamp) dobValue = formatDate(dobValue.toDate());
          let lmpValue = medicalInfo.lastMenstrualPeriod;
          if (lmpValue instanceof Timestamp) lmpValue = formatDate(lmpValue.toDate());

          form.reset({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            photoURL: userData.photoURL || user?.photoURL || '',
            address: userData.address || '',
            dateOfBirth: dobValue || '',
            sex: medicalInfo.sex || '',
            height: medicalInfo.height || '',
            weight: medicalInfo.weight || '',
            bloodType: medicalInfo.bloodType || '',
            allergies: toArray(medicalInfo.allergies),
            conditions: toArray(medicalInfo.conditions),
            medications: toArray(medicalInfo.medications),
            familyHistory: toArray(medicalInfo.familyHistory),
            lastMenstrualPeriod: lmpValue || '',
            cycleLength: medicalInfo.cycleLength || '',
            flowDuration: medicalInfo.flowDuration || '',
            flowIntensity: medicalInfo.flowIntensity || '',
          });
          setInitialDataLoaded(true);
    } else {
          // No Firestore doc yet (new user) — seed from auth profile
          const [firstName, ...lastName] = (user.displayName || '').split(' ');
          form.reset({
            firstName: firstName || '',
            lastName: lastName.join(' ') || '',
            photoURL: user.photoURL || '',
            address: '',
            dateOfBirth: '',
            sex: '',
            height: '',
            weight: '',
            bloodType: '',
            allergies: [],
            conditions: [],
            medications: [],
            familyHistory: [],
            lastMenstrualPeriod: '',
            cycleLength: '',
            flowDuration: '',
            flowIntensity: '',
          });
          if (!isGuest) setInitialDataLoaded(true);
    }
    if (isGuest) setInitialDataLoaded(true);
  }, [user, userData, userDataLoading, userDocRef, form, initialDataLoaded, isGuest]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 && names[1] ? `${names[0][0]}${names[names.length - 1][0]}` : name[0] || 'U';
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      form.setValue('photoURL', downloadURL);
      toast({ title: 'Success', description: 'Profile picture uploaded. Click "Save Changes" to apply.' });
    } catch (error) {
      toast({ title: 'Upload Failed', description: getErrorMessage(error, 'Could not upload profile picture. Please try a different image.'), variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const convertDateStringToDate = (dateString: string | undefined): Date | null => {
      if (!dateString || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return null;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
  }

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser || isGuest) return;
    setIsLoading(true);
    const dateOfBirthForFirestore = convertDateStringToDate(data.dateOfBirth);
    const lastMenstrualPeriodForFirestore = convertDateStringToDate(data.lastMenstrualPeriod);
    try {
      await updateProfile(auth.currentUser, {
        displayName: `${data.firstName} ${data.lastName}`,
        photoURL: data.photoURL || '',
      });
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
          id: user.uid,
          firstName: data.firstName,
          lastName: data.lastName,
          email: user.email,
          photoURL: data.photoURL || '',
          address: data.address || '',
          medicalInfo: {
            dateOfBirth: dateOfBirthForFirestore || null,
            sex: data.sex || 'Other',
            height: data.height || null,
            weight: data.weight || null,
            bloodType: data.bloodType || 'Unknown',
            allergies: data.allergies || [],
            conditions: data.conditions || [],
            medications: data.medications || [],
            familyHistory: data.familyHistory || [],
            lastMenstrualPeriod: lastMenstrualPeriodForFirestore || null,
            cycleLength: data.cycleLength || null,
            flowDuration: data.flowDuration || null,
            flowIntensity: data.flowIntensity || 'Medium',
          },
        },
        { merge: true }
      );
      window.dispatchEvent(new CustomEvent('profile-updated'));
      toast({ title: 'Profile Updated', description: 'Your information has been saved and synced.' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: getErrorMessage(error, 'Could not save your profile changes.'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !initialDataLoaded) {
    return <div className="flex h-full w-full items-center justify-center"><AnemoLoading /></div>;
  }

  if (isGuest) {
    return (
        <div className="glass-panel rounded-[2.5rem] text-center">
            <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-full"><User className="h-10 w-10 text-primary" /></div>
                <h3 className="text-xl font-semibold">Profile Not Available in Guest Mode</h3>
                <p className="text-muted-foreground">To save your profile and medical history, please create an account.</p>
                <Button asChild className="mt-2 rounded-full"><Link href="/signup"><LogIn className="mr-2 h-4 w-4" />Sign Up Now</Link></Button>
            </CardContent>
        </div>
    )
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 50, damping: 20 }}>
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-4">
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400 drop-shadow-sm">Profile</span>
          <span className="text-primary animate-pulse">.</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase mt-4">Health &amp; Medical Record</p>
      </motion.div>

      {/* Profile Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.1 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <div className="glass-panel rounded-[2.5rem] md:col-span-2 p-8 flex flex-col md:flex-row items-center gap-8 border-primary/20">
            <div className="relative group">
                <Avatar className="h-32 w-32 ring-4 ring-primary/10 ring-offset-4 ring-offset-background transition-transform group-hover:scale-105 duration-500">
                  <AvatarImage src={form.watch('photoURL') || undefined} />
                  <AvatarFallback className="text-4xl bg-primary/5 text-primary">
                    {getInitials(`${watchFirstName} ${watchLastName}`)}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="picture-upload" className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Upload className="h-4 w-4" />
                </label>
            </div>
            <div className="text-center md:text-left space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">{watchFirstName} {watchLastName}</h2>
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="h-4 w-4" /> {form.watch('address') || 'Add address in settings'}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 capitalize rounded-full">{watchSex || 'Not specified'}</Badge>
                    <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/10 rounded-full">{form.watch('bloodType') || 'Unknown Blood Type'}</Badge>
                </div>
            </div>
        </div>

        <div className="glass-panel rounded-[2.5rem] p-8 flex flex-col justify-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Vital Metrics</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">BMI</p>
                    <p className="text-3xl font-black text-foreground">{bmi || '--'}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Age</p>
                    <p className="text-3xl font-black text-foreground">
                        {watchDob ? 2026 - Number(watchDob.split('/').pop() ?? '0') : '--'}
                    </p>
                </div>
            </div>
            <Progress value={bmi ? (Number(bmi) / 40) * 100 : 0} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground italic">Based on provided medical data.</p>
        </div>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Personal Section */}
                <div className="glass-panel rounded-[2.5rem] overflow-hidden">
                    <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20">
                          <UserCircle className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold">Basic Information</h2>
                    </div>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl><Input className="bg-background/50" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl><Input className="bg-background/50" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Registered Email</Label>
                            <Input value={user.email || ''} disabled className="opacity-50" />
                        </div>
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Location / Address</FormLabel>
                                <FormControl><Textarea className="bg-background/50 min-h-[100px]" placeholder="Your city or specific address..." maxLength={300} {...field} /></FormControl>
                                <div className="flex justify-between items-center">
                                  <FormDescription>Helps us locate clinics near you.</FormDescription>
                                  <span className={`text-[10px] font-medium tabular-nums ${(watchAddress?.length ?? 0) >= 280 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {watchAddress?.length ?? 0}/300
                                  </span>
                                </div>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </CardContent>
                </div>

                {/* Medical Records */}
                <div className="glass-panel rounded-[2.5rem] overflow-hidden">
                     <div className="bg-emerald-500/5 p-6 border-b border-emerald-500/10 flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold">Clinical Data</h2>
                    </div>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid gap-6 md:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="dateOfBirth"
                                render={({ field }) => {
                                  const parsed = field.value ? parse(field.value, 'MM/dd/yyyy', new Date()) : undefined;
                                  const dateVal = parsed && isValid(parsed) ? parsed : undefined;
                                  return (
                                  <FormItem>
                                      <FormLabel>Birth Date</FormLabel>
                                      <Popover open={dobOpen} onOpenChange={setDobOpen}>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <button type="button" className={cn(
                                              'w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors',
                                              !dateVal && 'text-muted-foreground'
                                            )}>
                                              <CalendarIcon className="h-4 w-4 text-primary/50 shrink-0" />
                                              {dateVal ? format(dateVal, 'MMMM d, yyyy') : 'Select date'}
                                            </button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <CalendarComponent
                                            mode="single"
                                            selected={dateVal}
                                            onSelect={(d) => {
                                              field.onChange(d ? format(d, 'MM/dd/yyyy') : '');
                                              setDobOpen(false);
                                            }}
                                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                  </FormItem>
                                  );
                                }}
                            />
                            <FormField
                                control={form.control}
                                name="sex"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Biological Sex</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bloodType"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Blood Group</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Group" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                             <FormField
                                control={form.control}
                                name="height"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Height (cm)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="weight"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Weight (kg)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-6">
                            <FormField control={form.control} name="allergies" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Allergies</FormLabel>
                                    <FormControl><TagInput placeholder="Add allergy..." value={field.value || []} onChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="medications" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Medications</FormLabel>
                                    <FormControl><TagInput placeholder="Add medication..." value={field.value || []} onChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                        </div>
                    </CardContent>
                </div>
            </div>

            <aside className="space-y-8">
                 {isFemale && (
                    <div className="glass-panel rounded-[2.5rem] overflow-hidden border-rose-500/20">
                        <div className="bg-rose-500/5 p-6 border-b border-rose-500/10 flex items-center gap-3">
                            <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                              <Heart className="h-4 w-4 text-rose-500" />
                            </div>
                            <h2 className="text-lg font-bold">Women's Health</h2>
                        </div>
                        <CardContent className="p-6 space-y-6">
                            <FormField
                                control={form.control}
                                name="lastMenstrualPeriod"
                                render={({ field }) => {
                                  const parsed = field.value ? parse(field.value, 'MM/dd/yyyy', new Date()) : undefined;
                                  const dateVal = parsed && isValid(parsed) ? parsed : undefined;
                                  return (
                                    <FormItem>
                                        <FormLabel>Last Period</FormLabel>
                                        <Popover open={lmpOpen} onOpenChange={setLmpOpen}>
                                          <PopoverTrigger asChild>
                                            <FormControl>
                                              <button type="button" className={cn(
                                                'w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors',
                                                !dateVal && 'text-muted-foreground'
                                              )}>
                                                <CalendarIcon className="h-4 w-4 text-rose-400 shrink-0" />
                                                {dateVal ? format(dateVal, 'MMMM d, yyyy') : 'Select date'}
                                              </button>
                                            </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent
                                              mode="single"
                                              selected={dateVal}
                                              onSelect={(d) => {
                                                field.onChange(d ? format(d, 'MM/dd/yyyy') : '');
                                                setLmpOpen(false);
                                              }}
                                              disabled={(date) => date > new Date() || date < new Date('2000-01-01')}
                                              initialFocus
                                            />
                                          </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                  );
                                }}
                            />
                            <FormField
                                control={form.control}
                                name="flowIntensity"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Flow Intensity</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Light">Light</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Heavy">Heavy</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="cycleLength"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Cycle (Days)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </div>
                )}

                <div className="glass-panel rounded-[2.5rem] p-6 border-primary/20 sticky top-24">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" /> Save Information
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Complete your medical profile to improve AI diagnostic accuracy by up to 35%.
                    </p>
                    <Button type="submit" className="w-full rounded-full shadow-lg shadow-primary/20" disabled={isLoading || isUploading}>
                        {isLoading && <HeartLoader size={20} strokeWidth={3} className="mr-2" />}
                        {isLoading ? 'Processing...' : 'Sync Profile'}
                    </Button>
                </div>
            </aside>
          </div>

        </form>
      </Form>
    </div>
  );
}