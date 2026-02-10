'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
} from 'firebase/auth';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import HeartLoader from '@/components/ui/HeartLoader';
import { Eye, EyeOff, Mail, Lock, ArrowRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const isSigningIn = isLoading || isGoogleLoading || isGuestLoading;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Google Sign-In Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsGuestLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Guest Sign-In Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGuestLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
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
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col space-y-2">
        <h3 className="text-4xl font-light tracking-tighter text-foreground">
            Welcome <span className="font-semibold text-primary">Back</span>
        </h3>
        <p className="text-muted-foreground text-lg font-light tracking-wide">
          Enter your credentials to access your dashboard.
        </p>
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <motion.div variants={itemVariants} className="space-y-5">
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
                            className="pl-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm hover:border-border/80" 
                            placeholder="name@example.com" 
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
                name="password"
                render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between ml-1">
                        <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Password</FormLabel>
                        <Link
                            href="/forgot-password"
                            className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors tracking-wide"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                    <FormControl>
                        <Input 
                            className="pl-12 pr-12 h-14 bg-muted/20 border-border/50 focus:border-primary/30 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-2xl text-base shadow-sm hover:border-border/80" 
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
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-500 hover:scale-[1.01] bg-gradient-to-r from-primary to-rose-600 hover:to-rose-500" 
              disabled={isSigningIn}
            >
              {isLoading && <HeartLoader size={24} strokeWidth={2.5} className="mr-2" />}
              Sign In <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </form>
      </Form>
      
      <motion.div variants={itemVariants} className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-dashed border-muted-foreground/30" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground/70 font-medium tracking-widest">
            Or continue with
          </span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-border/50 bg-background/50 hover:bg-muted/30 hover:border-primary/20 transition-all duration-300 shadow-sm"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
          >
              {isGoogleLoading ? (
               <HeartLoader size={20} strokeWidth={2.5} className="mr-2" />
              ) : (
                <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/><path d="M12.24 24.0008C15.4765 24.0008 18.2058 22.9382 20.19 21.1039L16.323 18.1056C15.2494 18.8375 13.8627 19.252 12.24 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853"/><path d="M5.50705 14.3003C5.00636 12.8099 5.00636 11.1961 5.50705 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50705 14.3003Z" fill="#FBBC05"/><path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50705 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335"/></svg>
              )}
              Google
          </Button>

          <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-border/50 bg-background/50 hover:bg-muted/30 hover:border-primary/20 transition-all duration-300 shadow-sm"
              onClick={handleGuestSignIn}
              disabled={isSigningIn}
              >
              {isGuestLoading ? (
               <HeartLoader size={20} strokeWidth={2.5} className="mr-2" />
              ) : (
               <User className="mr-2 h-4 w-4" />
              )}
              Guest
          </Button>
      </motion.div>

      <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground/80">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-primary hover:text-primary/80 hover:underline transition-all underline-offset-4"
        >
          Create account
        </Link>
      </motion.p>
    </motion.div>
  );
}
