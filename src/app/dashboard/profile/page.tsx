'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, CalendarIcon } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { format } from "date-fns"


const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  photoURL: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  // Medical Info
  dateOfBirth: z.date().optional(),
  sex: z.string().optional(),
  height: z.coerce.number().positive('Height must be positive.').optional().or(z.literal('')),
  weight: z.coerce.number().positive('Weight must be positive.').optional().or(z.literal('')),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  familyHistory: z.string().optional(),
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

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      photoURL: '',
      dateOfBirth: undefined,
      sex: '',
      height: '',
      weight: '',
      bloodType: '',
      allergies: '',
      conditions: '',
      medications: '',
      familyHistory: '',
    },
  });

  useEffect(() => {
    if (user && firestore && !initialDataLoaded) {
      const fetchUserData = async () => {
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const medicalInfo = data.medicalInfo || {};
          form.reset({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            photoURL: data.photoURL || user.photoURL || '',
            dateOfBirth: medicalInfo.dateOfBirth ? (medicalInfo.dateOfBirth as Timestamp).toDate() : undefined,
            sex: medicalInfo.sex || '',
            height: medicalInfo.height || '',
            weight: medicalInfo.weight || '',
            bloodType: medicalInfo.bloodType || '',
            allergies: medicalInfo.allergies || '',
            conditions: medicalInfo.conditions || '',
            medications: medicalInfo.medications || '',
            familyHistory: medicalInfo.familyHistory || '',
          });
        } else {
          // Pre-fill from auth if no doc exists
          const [firstName, ...lastName] = (user.displayName || '').split(' ');
          form.reset({
            firstName: firstName || '',
            lastName: lastName.join(' ') || '',
            photoURL: user.photoURL || '',
          });
        }
        setInitialDataLoaded(true);
      };
      fetchUserData();
    }
  }, [user, firestore, form, initialDataLoaded]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1
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
      toast({ title: 'Success', description: 'Profile picture updated.' });
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

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser) return;
    setIsLoading(true);

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
          medicalInfo: {
            dateOfBirth: data.dateOfBirth,
            sex: data.sex,
            height: data.height,
            weight: data.weight,
            bloodType: data.bloodType,
            allergies: data.allergies,
            conditions: data.conditions,
            medications: data.medications,
            familyHistory: data.familyHistory,
          },
        },
        { merge: true }
      );

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

  if (!user) {
    return (
       <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          <Card>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Record</CardTitle>
              <CardDescription>
                This information helps provide more accurate analysis. It is private and will not be shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 space-y-6">
                <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="e.g., Penicillin, Peanuts, Pollen"
                            {...field}
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
                        <Textarea placeholder="e.g., Asthma, Diabetes, Hypertension" {...field} />
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
                        <Textarea placeholder="List any medications you are currently taking" {...field} />
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
                        <Textarea placeholder="e.g., History of anemia, blood disorders, or heart disease in your immediate family" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            </CardContent>
          </Card>

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
