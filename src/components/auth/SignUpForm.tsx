'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { motion, Variants } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import HeartLoader from '@/components/ui/HeartLoader';
import { Eye, EyeOff, User, Mail, Lock, MapPin, Users, ArrowRight } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { iloiloMunicipalities } from '@/lib/iloilo-municipalities';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z
  .object({
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    municipality: z.string({ required_error: 'Please select a municipality.' }).min(1, 'Please select a municipality.'),
    sex: z.string({ required_error: 'Please select your sex.' }).min(1, { message: 'Please select your sex.' }),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' })
      .regex(/[a-z]/, {
        message: 'Password must contain at least one lowercase letter.',
      })
      .regex(/[A-Z]/, {
        message: 'Password must contain at least one uppercase letter.',
      })
      .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
      .regex(/[^a-zA-Z0-9]/, {
        message: 'Password must contain at least one special character.',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      municipality: '',
      sex: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${values.firstName} ${values.lastName}`,
      });
      
      const userDocRef = doc(firestore, 'users', user.uid);
      
      setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        address: values.municipality,
        medicalInfo: {
            sex: values.sex,
        }
      }, { merge: true });

      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Sign Up Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col space-y-2 mb-6">
        <h3 className="text-4xl font-light tracking-tighter text-foreground">
            Create <span className="font-semibold text-primary">Account</span>
        </h3>
        <p className="text-muted-foreground text-lg font-light tracking-wide">
          Join us to start your health journey.
        </p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">First Name</FormLabel>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                    <FormControl>
                      <Input 
                        className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm" 
                        placeholder="Zaxius" 
                        {...field} 
                    />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">Last Name</FormLabel>
                   <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                    <FormControl>
                      <Input 
                        className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm" 
                        placeholder="Berina" 
                        {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
           <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">Municipality</FormLabel>
                   <div className="relative group">
                     <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary pointer-events-none z-10" />
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                          <SelectTrigger className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <ScrollArea className='h-72'>
                          {iloiloMunicipalities.map((municipality) => (
                              <SelectItem key={municipality} value={municipality}>
                                  {municipality}
                              </SelectItem>
                          ))}
                          </ScrollArea>
                      </SelectContent>
                      </Select>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
           <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">Sex</FormLabel>
                     <div className="relative group">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary pointer-events-none z-10" />
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                          <SelectTrigger className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm">
                              <SelectValue placeholder="Sex" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                      </Select>
                     </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">Email Address</FormLabel>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                    <FormControl>
                      <Input 
                          className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm" 
                          placeholder="name@example.com" 
                          {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">Password</FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                      <FormControl>
                        <Input 
                            className="pl-12 pr-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm" 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold ml-1">Confirm</FormLabel>
                    <div className="relative group">
                     <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                    <FormControl>
                      <Input 
                        className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        {...field} 
                    />
                    </FormControl>
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </motion.div>

          <motion.div variants={itemVariants} className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-sm text-muted-foreground">
             <p className="leading-relaxed text-center">
                <span className="font-semibold text-primary block mb-1">Health Note</span> 
                Female users unlock <span className="text-foreground font-medium">Gemini Women’s Health Mode</span> for cycle-aware analysis.
             </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-500 hover:scale-[1.01] bg-gradient-to-r from-primary to-rose-600 hover:to-rose-500" 
              disabled={isLoading}
            >
              {isLoading && <HeartLoader size={24} strokeWidth={2.5} className="mr-2" />}
              Create Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </form>
      </Form>
      
      <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground/80">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 hover:underline transition-all underline-offset-4"
        >
          Log in
        </Link>
      </motion.p>
    </motion.div>
  );
}
