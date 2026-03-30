'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-3',
        caption: 'flex justify-center items-center relative h-9',
        caption_label: 'text-sm font-semibold tracking-tight',
        nav: 'flex items-center gap-1',
        nav_button: cn(
          'h-8 w-8 rounded-xl inline-flex items-center justify-center',
          'bg-muted/40 hover:bg-primary/10 border border-border/40 hover:border-primary/30',
          'text-muted-foreground hover:text-primary transition-all duration-150'
        ),
        nav_button_previous: 'absolute left-0',
        nav_button_next: 'absolute right-0',
        table: 'w-full border-collapse',
        head_row: 'flex mb-1',
        head_cell: 'text-muted-foreground w-10 text-center text-[11px] font-medium uppercase tracking-wider',
        row: 'flex w-full mt-1',
        cell: cn(
          'w-10 h-10 text-center text-sm p-0 relative',
          'focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-primary/10',
          '[&:has([aria-selected].day-range-end)]:rounded-r-xl',
          '[&:has([aria-selected].day-outside)]:bg-primary/5',
          'first:[&:has([aria-selected])]:rounded-l-xl',
          'last:[&:has([aria-selected])]:rounded-r-xl',
        ),
        day: cn(
          'h-10 w-10 p-0 font-normal rounded-xl transition-all duration-150',
          'inline-flex items-center justify-center text-sm',
          'hover:bg-primary/10 hover:text-primary',
          'aria-selected:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        ),
        day_range_start: 'rounded-l-xl',
        day_range_end: 'day-range-end rounded-r-xl',
        day_selected: cn(
          'bg-primary text-primary-foreground font-semibold',
          'hover:bg-primary hover:text-primary-foreground',
          'focus:bg-primary focus:text-primary-foreground',
          'shadow-sm shadow-primary/30'
        ),
        day_today: 'bg-accent text-accent-foreground font-semibold ring-1 ring-primary/30',
        day_outside: 'day-outside text-muted-foreground/40 opacity-50 aria-selected:bg-primary/5 aria-selected:text-muted-foreground',
        day_disabled: 'text-muted-foreground/30 opacity-30 cursor-not-allowed',
        day_range_middle: 'aria-selected:bg-primary/10 aria-selected:text-foreground rounded-none',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
