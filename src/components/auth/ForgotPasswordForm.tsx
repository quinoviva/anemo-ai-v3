'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';

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
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import HeartLoader from '@/components/ui/HeartLoader';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'Password Reset Email Sent',
        description:
          'If an account exists for this email, you will receive a link to reset your password.',
      });
      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error Sending Reset Email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h3 className="text-3xl font-light tracking-tight text-foreground">
            Reset <span className="font-semibold">Password</span>
        </h3>
        <p className="text-muted-foreground text-lg">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold ml-1">Email Address</FormLabel>
                 <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <FormControl>
                    <Input 
                        className="pl-10 h-12 bg-muted/30 border-transparent focus:border-primary/20 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all duration-300 rounded-xl" 
                        placeholder="name@example.com" 
                        {...field} 
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02]" 
            disabled={isLoading}
          >
            {isLoading && <HeartLoader size={24} strokeWidth={2.5} className="mr-2" />}
            Send Reset Link <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Form>
      
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Log in
        </Link>
      </div>
    </div>
  );
}
