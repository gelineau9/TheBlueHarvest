'use client';

import { CalendarDays, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export interface EventFeedItem {
  id: number;
  title: string;
  eventDate: string; // YYYY-MM-DD
  eventTime?: string; // HH:MM
  location?: string;
  description?: string;
}

interface EventFeedProps {
  events: EventFeedItem[];
  showFullDetails?: boolean;
}

function formatDate(dateStr: string): { month: string; day: string; weekday: string } {
  const date = new Date(dateStr);
  return {
    month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
    weekday: date.toLocaleString('default', { weekday: 'long' }),
  };
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function EventFeed({ events, showFullDetails = false }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-amber-600">
        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const { month, day, weekday } = formatDate(event.eventDate);

        return (
          <Link key={event.id} href={`/posts/${event.id}`} className="block group">
            <div className="flex gap-3 rounded-lg border border-amber-800/20 bg-white/50 p-3 transition-all hover:bg-amber-50 hover:border-amber-300">
              {/* Date badge */}
              <div className="flex-shrink-0 w-14 text-center">
                <div className="rounded-lg bg-amber-100 border border-amber-200 py-1.5 px-2">
                  <div className="text-xs font-semibold text-amber-700">{month}</div>
                  <div className="text-xl font-bold text-amber-900 leading-tight">{day}</div>
                </div>
              </div>

              {/* Event details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-amber-900 group-hover:text-amber-700 truncate">{event.title}</h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-amber-700">
                  {showFullDetails && <span className="text-amber-600">{weekday}</span>}
                  {event.eventTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(event.eventTime)}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  )}
                </div>

                {showFullDetails && event.description && (
                  <p className="mt-2 text-sm text-amber-700 line-clamp-2">{event.description}</p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
