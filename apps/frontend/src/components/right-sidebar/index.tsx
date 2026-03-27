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

interface RecentPost {
  post_id: number;
  post_type_id: number;
  title: string;
  type_name: string;
  username: string;
  created_at: string;
}

interface PostsResponse {
  posts: EventPost[];
  total: number;
  hasMore: boolean;
}

interface RecentPostsResponse {
  posts: RecentPost[];
}

export function RightSidebar() {
  const [events, setEvents] = useState<EventPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

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

    const fetchRecentPosts = async () => {
      try {
        // Fetch 6 most recent writing (1) and art (2) posts for activity feed
        const response = await fetch('/api/posts/public?limit=6&sortBy=created_at&order=desc');
        if (response.ok) {
          const data: RecentPostsResponse = await response.json();
          setRecentPosts(data.posts);
        }
      } catch {
        // Silently fail - sidebar is non-critical
      }
    };

    fetchEvents();
    fetchRecentPosts();
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
          {recentPosts.length === 0 ? (
            <p className="text-sm text-amber-700 italic">No recent activity yet.</p>
          ) : (
            recentPosts.map((post) => (
              <ActivityItem
                key={post.post_id}
                username={post.username}
                action={`posted a new ${post.type_name.toLowerCase()}`}
                target={`"${post.title}"`}
                time={formatRelativeTime(post.created_at)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}
