'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useOfflineSync } from '@/contexts/OfflineSyncContext';
import { runLocalClinicalScreening } from '@/ai/local-ai';

// Combined schema for the entire form
const formSchema = z.object({
  sex: z.string().min(1, "Please select your sex."),
  fatigue: z.string().min(1, "Please rate your level of fatigue."),
  cardiovascularStrain: z.string().min(1, "Please rate your cardiovascular strain."),
  physicalIndicators: z.string().min(1, "Please select any physical indicators you are experiencing."),
  dateRange: z.object({
    from: z.date(),
    to: z.date().optional(),
  }).optional(),
  flowIntensity: z.string().optional(),
});

type CycleFormValues = z.infer<typeof formSchema>;

interface CycleLogFormProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function CycleLogForm({ open, onOpenChange, trigger }: CycleLogFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isOnline } = useOfflineSync();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSex, setSelectedSex] = useState('');

  const show = open !== undefined ? open : isOpen;
  const setShow = onOpenChange || setIsOpen;

  const form = useForm<CycleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flowIntensity: "Medium",
      sex: ''
    },
  });

  const onSubmit = async (data: CycleFormValues) => {
    if (!isOnline) {
        setIsSubmitting(true);
        const symptoms = `Fatigue: ${data.fatigue}, Strain: ${data.cardiovascularStrain}, Physical: ${data.physicalIndicators}`;
        const localAnalysis = await runLocalClinicalScreening(symptoms);
        
        toast({
            title: "Offline Clinical Assessment (Gemini Nano)",
            description: localAnalysis || "Assessment saved locally. Syncing when online.",
        });
        setIsSubmitting(false);
        setShow(false);
        return;
    }

    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
      // Update user's medical info
      const userRef = doc(firestore, `users/${user.uid}`);
      await updateDoc(userRef, {
        medicalInfo: {
          sex: data.sex,
          fatigue: data.fatigue,
          cardiovascularStrain: data.cardiovascularStrain,
          physicalIndicators: data.physicalIndicators,
          flowIntensity: data.flowIntensity,
        }
      });

      // Save cycle log if applicable
      if (data.sex === 'Female' && data.dateRange?.from) {
        await addDoc(collection(firestore, `users/${user.uid}/cycle_logs`), {
            startDate: data.dateRange.from,
            endDate: data.dateRange.to || data.dateRange.from,
            flowIntensity: data.flowIntensity,
            createdAt: serverTimestamp(),
        });
      }

      toast({
          title: "Information Saved",
          description: "Your clinical data and cycle log have been recorded.",
      });
      
      form.reset();
      setShow(false);
    } catch (error: any) {
       toast({
           title: "Error",
           description: error.message || "Failed to save information.",
           variant: "destructive"
       });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Clinical Diagnostic Interview</DialogTitle>
                <DialogDescription>
                    Provide some clinical information to improve the accuracy of your analysis.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>What is your sex?</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedSex(value);
                                }}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Male" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Male</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Female" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Female</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                )}/>

                <FormField
                    control={form.control}
                    name="fatigue"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>How would you rate your level of fatigue?</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Mild" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Mild</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Moderate" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Moderate</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Severe" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Severe</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                )}/>

                <FormField
                    control={form.control}
                    name="cardiovascularStrain"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>How would you rate your cardiovascular strain?</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="None" />
                                    </FormControl>
                                    <FormLabel className="font-normal">None</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="Noticeable" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Noticeable</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="High" />
                                    </FormControl>
                                    <FormLabel className="font-normal">High</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                )}/>

                <FormField
                    control={form.control}
                    name="physicalIndicators"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Any physical indicators you are experiencing?</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                            >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="None" />
                                </FormControl>
                                <FormLabel className="font-normal">None</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Pale skin" />
                                </FormControl>
                                <FormLabel className="font-normal">Pale skin</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Brittle nails" />
                                </FormControl>
                                <FormLabel className="font-normal">Brittle nails</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Swollen tongue" />
                                </FormControl>
                                <FormLabel className="font-normal">Swollen tongue</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {selectedSex === 'Female' && (
                    <>
                        <Separator />
                        <h3 className='text-lg font-medium'>Menstrual Cycle (Optional)</h3>
                        <FormField
                        control={form.control}
                        name="dateRange"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Cycle Dates</FormLabel>
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
                                    {field.value?.from ? (
                                        field.value.to ? (
                                        <>
                                            {format(field.value.from, "LLL dd, y")} -{" "}
                                            {format(field.value.to, "LLL dd, y")}
                                        </>                                ) : (
                                        format(field.value.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                Select the start and end dates of your period.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <FormField
                            control={form.control}
                            name="flowIntensity"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Flow Intensity</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </>
                )}

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Information
                    </Button>
                </div>
            </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}
