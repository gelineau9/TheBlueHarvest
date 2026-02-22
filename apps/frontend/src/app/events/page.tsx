'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { EventCalendar, CalendarEvent } from '@/components/events/EventCalendar';
import { EventFeed, EventFeedItem } from '@/components/events/EventFeed';
import { Card } from '@/components/ui/card';

interface PostContent {
  description?: string;
  eventDateTime?: string; // UTC ISO string
  location?: string;
}

interface EventPost {
  post_id: number;
  title: string;
  content: PostContent;
  created_at: string;
}

interface PostsResponse {
  posts: EventPost[];
  total: number;
  hasMore: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        // Fetch events (post_type_id = 4)
        const response = await fetch('/api/posts/public?post_type_id=4&limit=50&sortBy=created_at&order=desc');

        if (!response.ok) {
          setError('Failed to load events');
          return;
        }

        const data: PostsResponse = await response.json();
        setEvents(data.posts);
      } catch {
        setError('An error occurred while loading events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Transform posts to calendar/feed format and filter for upcoming events
  const { calendarEvents, upcomingEvents } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transformed: (CalendarEvent & EventFeedItem)[] = events
      .filter((post) => post.content?.eventDateTime)
      .map((post) => ({
        id: post.post_id,
        title: post.title,
        eventDateTime: post.content.eventDateTime!,
        location: post.content.location,
        description: post.content.description,
      }));

    // All events for the calendar (current month)
    const calendarEvents = transformed;

    // Only upcoming events for the feed (today or later), sorted by date ascending
    const upcomingEvents = transformed
      .filter((event) => {
        const eventDate = new Date(event.eventDateTime);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime());

    return { calendarEvents, upcomingEvents };
  }, [events]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-amber-900 mb-8">Event Calendar</h1>

          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error}</h1>
            <p className="text-amber-700">Please try again later.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-amber-900 mb-8">Event Calendar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <EventCalendar events={calendarEvents} />
          </div>

          {/* Event Feed */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Upcoming Events</h2>
            <EventFeed events={upcomingEvents} showFullDetails />
          </div>
        </div>
      </div>
    </div>
  );
}
