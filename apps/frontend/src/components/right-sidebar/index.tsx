'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ActivityItem } from './ActivityItem';
import { EventCalendar, CalendarEvent } from '@/components/events/EventCalendar';
import { EventFeed, EventFeedItem } from '@/components/events/EventFeed';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostContent {
  description?: string;
  eventDateTime?: string;
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

interface ActivityFeedItem {
  kind: 'post' | 'profile' | 'comment';
  id: number;
  title: string;
  type_name: string;
  username: string;
  account_id: number;
  post_id: number | null;
  post_title: string | null;
  created_at: string;
}

interface ActivityResponse {
  items: ActivityFeedItem[];
  total: number;
  hasMore: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RightSidebar() {
  const [events, setEvents] = useState<EventPost[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activityItems, setActivityItems] = useState<ActivityFeedItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/posts/public?post_type_id=4&limit=20&sortBy=created_at&order=desc');
        if (response.ok) {
          const data: PostsResponse = await response.json();
          setEvents(data.posts);
        }
      } catch {
        // Silently fail — sidebar is non-critical
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Fetch sitewide activity (no auth)
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('/api/activity?limit=10');
        if (response.ok) {
          const data: ActivityResponse = await response.json();
          setActivityItems(data.items ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivity();
  }, []);

  // Transform events for calendar/feed
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

    const upcomingEvents = transformed
      .filter((event) => {
        const eventDate = new Date(event.eventDateTime);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.eventDateTime).getTime() - new Date(b.eventDateTime).getTime());

    return { calendarEvents: transformed, upcomingEvents };
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

        {eventsLoading ? (
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

      {/* Sitewide Activity */}
      <div>
        <h2 className="mb-3 font-fantasy text-xl font-semibold text-amber-900">Recent Activity</h2>
        <div className="space-y-3">
          {activityLoading ? (
            <p className="text-sm text-amber-600 italic">Loading...</p>
          ) : activityItems.length === 0 ? (
            <p className="text-sm text-amber-700 italic">No recent activity yet.</p>
          ) : (
            activityItems.map((item) => {
              if (item.kind === 'comment') {
                return (
                  <ActivityItem
                    key={`comment-${item.id}`}
                    kind="comment"
                    username={item.username}
                    usernameHref={`/users/${item.username}`}
                    postTitle={item.post_title ?? 'a post'}
                    postHref={`/posts/${item.post_id}`}
                    time={formatRelativeTime(item.created_at)}
                  />
                );
              }
              if (item.kind === 'profile') {
                return (
                  <ActivityItem
                    key={`profile-${item.id}`}
                    kind="profile"
                    username={item.username}
                    usernameHref={`/users/${item.username}`}
                    action={`created a ${item.type_name.toLowerCase()}`}
                    target={item.title}
                    targetHref={`/profiles/${item.id}`}
                    time={formatRelativeTime(item.created_at)}
                  />
                );
              }
              // post
              return (
                <ActivityItem
                  key={`post-${item.id}`}
                  kind="post"
                  username={item.username}
                  usernameHref={`/users/${item.username}`}
                  action={`posted a new ${item.type_name.toLowerCase()}`}
                  target={`"${item.title}"`}
                  targetHref={`/posts/${item.id}`}
                  time={formatRelativeTime(item.created_at)}
                />
              );
            })
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
