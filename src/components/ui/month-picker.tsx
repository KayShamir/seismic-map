import * as React from 'react';
import { format, addMonths, subMonths, startOfYear } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface MonthPickerProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  disableFutureMonths?: boolean;
  minYear?: number;
}

export function MonthPicker({
  selected,
  onSelect,
  className,
  disableFutureMonths = true,
  minYear = 2018,
}: MonthPickerProps) {
  const [date, setDate] = React.useState<Date>(selected || new Date());
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (selected) setDate(selected);
  }, [selected]);

  const currentDate = new Date();

  const handleMonthChange = (newDate: Date) => {
    setDate(newDate);
    onSelect?.(newDate);
    setIsOpen(false);
  };

  const handlePreviousYear = () => {
    const newDate = subMonths(date, 12);
    if (newDate.getFullYear() >= minYear) {
      setDate(newDate);
    }
  };
  
  const handleNextYear = () => {
    const newDate = addMonths(date, 12);
    if (!disableFutureMonths || newDate.getFullYear() <= currentDate.getFullYear()) {
      setDate(newDate);
    }
  };

  const months = React.useMemo(() => {
    const start = startOfYear(date);
    return Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  }, [date]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start text-left font-normal', !date && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MMMM yyyy') : <span>Pick a month</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <div className="flex items-center justify-between space-x-2 border-b p-3">
          <Button 
            variant="outline" 
            className="h-7 w-7 p-0" 
            onClick={handlePreviousYear}
            disabled={date.getFullYear() <= minYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">{format(date, 'yyyy')}</div>
          <Button
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={handleNextYear}
            disabled={disableFutureMonths && date.getFullYear() >= currentDate.getFullYear()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          {months.map((month) => {
            const isFuture = month > currentDate;
            const isBeforeMinYear = month.getFullYear() < minYear;
            return (
              <Button
                key={month.toISOString()}
                onClick={() => handleMonthChange(month)}
                variant={
                  date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()
                    ? 'default'
                    : 'outline'
                }
                className="h-9"
                disabled={disableFutureMonths ? isFuture : isBeforeMinYear}
              >
                {format(month, 'MMM')}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
