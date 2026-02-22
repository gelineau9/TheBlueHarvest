'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ActivityItem } from './ActivityItem';
import { EventCalendar, CalendarEvent } from '@/components/events/EventCalendar';
import { EventFeed, EventFeedItem } from '@/components/events/EventFeed';

interface PostContent {
  description?: string;
  eventDateTime?: string; // UTC ISO string
  location?: string;
}

interface EventPost {
  post_id: number;
  title: string;
  content: PostContent;
}

interface PostsResponse {
  posts: EventPost[];
  total: number;
  hasMore: boolean;
}

export function RightSidebar() {
  const [events, setEvents] = useState<EventPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch events (post_type_id = 4)
        const response = await fetch('/api/posts/public?post_type_id=4&limit=20&sortBy=created_at&order=desc');

        if (response.ok) {
          const data: PostsResponse = await response.json();
          setEvents(data.posts);
        }
      } catch {
        // Silently fail - sidebar is non-critical
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

    // Only upcoming events for the feed (today or later), sorted by date ascending (nearest first)
    const upcomingEvents = transformed
      .filter((event) => {
        const eventDate = new Date(event.eventDateTime);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime());

    return { calendarEvents, upcomingEvents };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-fantasy text-xl font-semibold text-amber-900">Upcoming Events</h2>
          <Link href="/events" className="text-sm text-amber-700 hover:text-amber-900 hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : (
          <>
            <EventCalendar events={calendarEvents} />
            <div className="mt-4">
              <EventFeed events={upcomingEvents.slice(0, 5)} />
            </div>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 font-fantasy text-xl font-semibold text-amber-900">Recent Activity</h2>
        <div className="space-y-3">
          <ActivityItem username="Nenenas" action="liked a post by" target="Aranarion" time="2 hours ago" />
          <ActivityItem username="Aranarion" action="posted a piece of writing" target="'TBD'" time="3 hours ago" />
          <ActivityItem username="Eldarion" action="posted a piece of art" time="5 hours ago" />
          <ActivityItem username="Aranarion" action="commented 'LOL' on" target="Elva's post" time="6 hours ago" />
          <ActivityItem username="Nenenas" action="created a new character profile" time="1 day ago" />
          <ActivityItem username="Nenenas" action="joined" time="2 days ago" />
        </div>
      </div>
    </div>
  );
}
