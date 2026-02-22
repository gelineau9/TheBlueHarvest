'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarEvent {
  id: number;
  title: string;
  eventDateTime: string; // UTC ISO string
  location?: string;
  description?: string;
}

interface EventCalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date, eventsOnDate: CalendarEvent[]) => void;
}

export function EventCalendar({ events, onDateClick }: EventCalendarProps) {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const todayDate = today.getDate();

  // State for displayed month (starts at current month)
  const [displayMonth, setDisplayMonth] = useState(todayMonth);
  const [displayYear, setDisplayYear] = useState(todayYear);

  // Calculate max date (12 months from now)
  const maxMonth = (todayMonth + 11) % 12;
  const maxYear = todayYear + Math.floor((todayMonth + 11) / 12);

  // Check if we can navigate
  const canGoBack = displayYear > todayYear || (displayYear === todayYear && displayMonth > todayMonth);
  const canGoForward = displayYear < maxYear || (displayYear === maxYear && displayMonth < maxMonth);

  const goToPrevMonth = () => {
    if (!canGoBack) return;
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoForward) return;
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  // Get month name
  const monthName = new Date(displayYear, displayMonth).toLocaleString('default', { month: 'long' }).toUpperCase();

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1);
    const lastDay = new Date(displayYear, displayMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (number | null)[] = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [displayMonth, displayYear]);

  // Create a map of dates to events (using LOCAL date from UTC)
  const eventsByDate = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    events.forEach((event) => {
      // Parse UTC and get LOCAL date components
      const utcDate = new Date(event.eventDateTime);
      const localMonth = utcDate.getMonth();
      const localYear = utcDate.getFullYear();
      const localDay = utcDate.getDate();
      
      // Only include events from the displayed month (in local time)
      if (localMonth === displayMonth && localYear === displayYear) {
        const existing = map.get(localDay) || [];
        map.set(localDay, [...existing, event]);
      }
    });
    return map;
  }, [events, displayMonth, displayYear]);

  const handleDateClick = (day: number) => {
    if (onDateClick) {
      const date = new Date(displayYear, displayMonth, day);
      const eventsOnDate = eventsByDate.get(day) || [];
      onDateClick(date, eventsOnDate);
    }
  };

  // Check if a day is today
  const isCurrentMonth = displayMonth === todayMonth && displayYear === todayYear;

  return (
    <div className="rounded-lg border border-amber-800/20 bg-amber-50/50 p-4">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrevMonth}
          disabled={!canGoBack}
          className={`p-1 rounded transition-colors ${
            canGoBack 
              ? 'text-amber-700 hover:bg-amber-200/50 hover:text-amber-900' 
              : 'text-amber-300 cursor-not-allowed'
          }`}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center font-medium text-amber-900">
          {monthName} {displayYear}
        </div>
        
        <button
          onClick={goToNextMonth}
          disabled={!canGoForward}
          className={`p-1 rounded transition-colors ${
            canGoForward 
              ? 'text-amber-700 hover:bg-amber-200/50 hover:text-amber-900' 
              : 'text-amber-300 cursor-not-allowed'
          }`}
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-amber-700 font-medium text-xs pb-1">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }

          const hasEvents = eventsByDate.has(day);
          const isToday = isCurrentMonth && day === todayDate;
          const isPast = isCurrentMonth && day < todayDate;

          return (
            <div
              key={day}
              onClick={() => hasEvents && handleDateClick(day)}
              className={`
                relative rounded p-1 text-sm transition-colors
                ${hasEvents ? 'cursor-pointer' : ''}
                ${hasEvents && !isPast ? 'bg-amber-200/70 font-semibold text-amber-900 hover:bg-amber-300/70' : ''}
                ${hasEvents && isPast ? 'bg-amber-100/50 text-amber-500' : ''}
                ${isToday && !hasEvents ? 'ring-1 ring-amber-400 font-medium' : ''}
                ${isToday && hasEvents ? 'ring-2 ring-amber-600' : ''}
                ${isPast && !hasEvents ? 'text-amber-400' : ''}
              `}
            >
              {day}
              {/* Event dot indicator */}
              {hasEvents && (
                <span
                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${
                    isPast ? 'bg-amber-400' : 'bg-amber-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
