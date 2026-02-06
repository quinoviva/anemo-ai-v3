'use client';

import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import * as z from 'zod';

import { updateProfile } from 'firebase/auth';

import { doc, Timestamp } from 'firebase/firestore';

import Link from 'next/link';



import { useUser, useFirestore, useAuth, useDoc, useMemoFirebase } from '@/firebase';

import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

import { CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from '@/components/ui/form';

import { useToast } from '@/hooks/use-toast';

import { Loader2, Upload, User, LogIn, Info } from 'lucide-react';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { cn } from '@/lib/utils';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagInput } from '@/components/ui/tag-input';





const profileSchema = z.object({

  firstName: z.string().min(1, 'First name is required.'),

  lastName: z.string().min(1, 'Last name is required.'),

  photoURL: z.string().url('Must be a valid URL.').optional().or(z.literal('')),

  address: z.string().optional(),

  // Medical Info

  dateOfBirth: z.string().optional(),

  sex: z.string().optional(),

  height: z.coerce.number().positive('Height must be positive.').optional().or(z.literal('')),

  weight: z.coerce.number().positive('Weight must be positive.').optional().or(z.literal('')),

  bloodType: z.string().optional(),

  allergies: z.array(z.string()).optional(),

  conditions: z.array(z.string()).optional(),

  medications: z.array(z.string()).optional(),

  familyHistory: z.array(z.string()).optional(),

  // Women's Health

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



  const formatDate = (date: Date | undefined): string => {

    if (!date) return '';

    const d = new Date(date);

    const month = String(d.getMonth() + 1).padStart(2, '0');

    const day = String(d.getDate()).padStart(2, '0');

    const year = d.getFullYear();

    return `${month}/${day}/${year}`;

  }



  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ProfileFormValues) => {

    let value = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters

    if (value.length > 8) {

      value = value.slice(0, 8);

    }

    

    if (value.length > 4) {

      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;

    } else if (value.length > 2) {

      value = `${value.slice(0, 2)}/${value.slice(2)}`;

    }

    

    form.setValue(fieldName, value);

  };

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(s => s);
    return [];
  };

  useEffect(() => {

    if (!initialDataLoaded && !userDataLoading) {

        if (userData) {

          const medicalInfo = userData.medicalInfo || {};

          

          let dobValue = medicalInfo.dateOfBirth;

          if (dobValue instanceof Timestamp) {

            dobValue = formatDate(dobValue.toDate());

          }



          let lmpValue = medicalInfo.lastMenstrualPeriod;

          if (lmpValue instanceof Timestamp) {

            lmpValue = formatDate(lmpValue.toDate());

          }



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

        } else if (user) {

          // Pre-fill from auth if no doc exists (or while waiting/error)

          const [firstName, ...lastName] = (user.displayName || '').split(' ');

          form.reset({

            firstName: firstName || '',

            lastName: lastName.join(' ') || '',

            photoURL: user.photoURL || '',

          });

          if (!isGuest) {

             // If not guest, we might still be loading or it truly doesn't exist

             // We'll mark as loaded if we have a user but no userData yet and not loading

             setInitialDataLoaded(true);

          }

        }

        

        if (isGuest) {

            setInitialDataLoaded(true);

        }

    }

  }, [user, userData, userDataLoading, form, initialDataLoaded, isGuest]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 && names[1]
      ? `${names[0][0]}${names[names.length - 1][0]}`
      : name[0] || 'U';
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
      toast({ title: 'Success', description: 'Profile picture selected. Click "Save Changes" to apply.' });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Could not upload profile picture.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const convertDateStringToDate = (dateString: string | undefined): Date | null => {
      if (!dateString || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return null;
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
  }

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser || isGuest) return;
    setIsLoading(true);

    const dateOfBirthForFirestore = convertDateStringToDate(data.dateOfBirth);
    const lastMenstrualPeriodForFirestore = convertDateStringToDate(data.lastMenstrualPeriod);

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, {
        displayName: `${data.firstName} ${data.lastName}`,
        photoURL: data.photoURL,
      });

      // 2. Update Firestore Document
      const userDocRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(
        userDocRef,
        {
          id: user.uid,
          firstName: data.firstName,
          lastName: data.lastName,
          email: user.email, // email is immutable
          photoURL: data.photoURL,
          address: data.address,
          medicalInfo: {
            dateOfBirth: dateOfBirthForFirestore,
            sex: data.sex,
            height: data.height,
            weight: data.weight,
            bloodType: data.bloodType,
            allergies: data.allergies,
            conditions: data.conditions,
            medications: data.medications,
            familyHistory: data.familyHistory,
            // Women's Health data
            lastMenstrualPeriod: lastMenstrualPeriodForFirestore,
            cycleLength: data.cycleLength,
            flowDuration: data.flowDuration,
            flowIntensity: data.flowIntensity,
          },
        },
        { merge: true }
      );
      
      // Dispatch event to notify header
      window.dispatchEvent(new CustomEvent('profile-updated'));

      toast({
        title: 'Profile Updated',
        description: 'Your information has been saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !initialDataLoaded) {
    return (
       <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isGuest) {
    return (
        <GlassSurface intensity="medium" className="text-center">
            <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-full">
                    <User className="h-10 w-10 text-primary" />
                 </div>
                <h3 className="text-xl font-semibold">Profile Not Available in Guest Mode</h3>
                <p className="text-muted-foreground">
                    To save your profile and medical history, please create an account.
                </p>
                <Button asChild className="mt-2">
                    <Link href="/signup">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign Up Now
                    </Link>
                </Button>
            </CardContent>
        </GlassSurface>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          View and manage your account details and medical information.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <GlassSurface intensity="medium">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and profile picture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={form.watch('photoURL') || undefined} />
                  <AvatarFallback className="text-3xl">
                    {getInitials(
                      `${form.watch('firstName')} ${form.watch('lastName')}`
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className='relative'>
                  <Button type="button" asChild variant="outline">
                    <label htmlFor="picture-upload">
                      {isUploading ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2" />}
                       {isUploading ? 'Uploading...' : 'Upload Picture'}
                    </label>
                  </Button>
                   <input
                    id="picture-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePictureUpload}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your first name" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="Your last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={user.email || ''} disabled />
                 <p className="text-sm text-muted-foreground">Email cannot be changed.</p>
              </div>
               <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Molo, Iloilo City, Philippines" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your address is used to find nearby healthcare providers.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </GlassSurface>

          <GlassSurface intensity="medium">
            <CardHeader>
              <CardTitle>Medical Record</CardTitle>
              <CardDescription>
                This information helps provide more accurate analysis. It is private and will not be shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="MM/DD/YYYY"
                          {...field}
                          onChange={(e) => handleDateInputChange(e, 'dateOfBirth')}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 170" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 65" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="bloodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a blood type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                            <SelectItem value="Unknown">Don't Know</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <div className="space-y-6">
                <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                        <TagInput
                            placeholder="e.g., Penicillin, Peanuts (Press Enter to add)"
                            value={field.value || []}
                            onChange={field.onChange}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="conditions"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pre-existing Medical Conditions</FormLabel>
                        <FormControl>
                        <TagInput
                            placeholder="e.g., Asthma, Diabetes (Press Enter to add)"
                            value={field.value || []}
                            onChange={field.onChange}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="medications"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Medications</FormLabel>
                        <FormControl>
                        <TagInput
                             placeholder="e.g., Lisinopril 10mg (Press Enter to add)"
                             value={field.value || []}
                             onChange={field.onChange}
                        />
                        </FormControl>
                         <FormDescription>
                            Include dosage if known.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="familyHistory"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Relevant Family Medical History</FormLabel>
                        <FormControl>
                        <TagInput
                            placeholder="e.g., Anemia, Heart Disease (Press Enter to add)"
                            value={field.value || []}
                            onChange={field.onChange}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            </CardContent>
          </GlassSurface>

          {isFemale && (
            <GlassSurface intensity="medium">
                <CardHeader>
                    <CardTitle>Women's Health Mode</CardTitle>
                    <CardDescription>
                        Provide optional menstrual health data for a more accurate, AI-assisted anemia analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            This information is optional but can significantly improve the accuracy of your anemia risk assessment. It is stored securely and used only for analysis.
                        </AlertDescription>
                    </Alert>
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="lastMenstrualPeriod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Menstrual Period</FormLabel>
                                    <FormControl>
                                        <Input
                                        placeholder="MM/DD/YYYY"
                                        {...field}
                                        onChange={(e) => handleDateInputChange(e, 'lastMenstrualPeriod')}
                                        value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="flowIntensity"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Typical Flow Intensity</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select intensity" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Light">Light</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Heavy">Heavy</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cycleLength"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Typical Cycle Length (Days)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 28" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="flowDuration"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Typical Flow Duration (Days)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 5" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </GlassSurface>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading && <Loader2 className="mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

    