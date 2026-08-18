'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Users, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { useAuthorableProfiles } from '@/hooks/useAuthorableProfiles';

interface Attendee {
  profile_id: number;
  name: string;
  avatar_url: string | null;
  username: string;
}

interface AttendanceState {
  count: number;
  capacity: number | null;
  is_full: boolean;
  ended: boolean;
  can_see_attendees: boolean;
  my_attendance: Array<{ profile_id: number; name: string }>;
  attendees?: Attendee[];
}

/**
 * RSVP control for an event post.
 *
 * The attending *count* is shown to everyone, so a visitor can tell at a glance
 * whether an event still has room. The guest list is rendered only when the API
 * says the caller may see it — organisers only — so this component never has to
 * decide who is allowed to see what.
 */
export function EventRsvp({ postId }: { postId: number }) {
  const { isLoggedIn } = useAuth();
  const { profiles } = useAuthorableProfiles();

  const [state, setState] = useState<AttendanceState | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/attendees`);
      if (res.ok) setState(await res.json());
    } catch {
      // Leave the previous state on screen rather than blanking the section
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  // Characters are the ones that attend events; kinships don't RSVP
  const characters = profiles.filter((p) => p.profile_type_id === 1);
  const attendingIds = new Set((state?.my_attendance ?? []).map((a) => a.profile_id));
  const available = characters.filter((c) => !attendingIds.has(c.profile_id));

  const rsvp = async () => {
    if (!selectedProfileId) return;
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: Number(selectedProfileId) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || 'Could not record your RSVP.');
        return;
      }
      setSelectedProfileId('');
      await load();
    } catch {
      setError('Could not record your RSVP.');
    } finally {
      setIsBusy(false);
    }
  };

  const withdraw = async (profileId: number) => {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/attendees/${profileId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not withdraw that RSVP.');
        return;
      }
      await load();
    } catch {
      setError('Could not withdraw that RSVP.');
    } finally {
      setIsBusy(false);
    }
  };

  if (!state) return null;

  const { count, capacity, is_full, ended, my_attendance, attendees, can_see_attendees } = state;

  // Once the event has happened, the section becomes a record: counts switch to
  // the past tense and the RSVP/withdraw controls disappear.
  const verb = ended ? 'attended' : 'attending';

  return (
    <section className="mt-6 border-t border-amber-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-900">
          <Users className="h-5 w-5 text-amber-800" aria-hidden="true" />
          <span className="font-semibold">
            {capacity !== null ? `${count} of ${capacity} ${verb}` : `${count} ${verb}`}
          </span>
          {is_full && !ended && (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Full
            </span>
          )}
        </div>

        {isLoggedIn && !ended && (
          <div className="flex items-center gap-2">
            {available.length > 0 && !is_full && (
              <>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  disabled={isBusy}
                  aria-label="Attend as"
                  className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                >
                  <option value="">Attend as…</option>
                  {available.map((c) => (
                    <option key={c.profile_id} value={c.profile_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={rsvp}
                  disabled={isBusy || !selectedProfileId}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  RSVP
                </Button>
              </>
            )}
            {is_full && available.length > 0 && <p className="text-sm text-amber-700 italic">This event is full.</p>}
            {characters.length === 0 && (
              <p className="text-sm text-amber-700 italic">
                <Link href="/profiles/create" className="underline hover:text-amber-900">
                  Create a character
                </Link>{' '}
                to attend.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Your own RSVPs — always visible to you, whoever else can see the list */}
      {my_attendance.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-amber-700">{ended ? 'You brought' : "You're bringing"}</span>
          {my_attendance.map((a) => (
            <span
              key={a.profile_id}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
            >
              {a.name}
              {!ended && (
                <button
                  type="button"
                  onClick={() => withdraw(a.profile_id)}
                  disabled={isBusy}
                  aria-label={`Withdraw ${a.name}`}
                  title="Withdraw"
                  className="ml-0.5 rounded-full text-amber-700 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Guest list — organisers only, per the API */}
      {can_see_attendees && attendees && attendees.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            Attendees · visible only to you
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {attendees.map((a) => (
              <div key={a.profile_id} className="relative">
                <Link href={`/profiles/${a.profile_id}`} className="block">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-amber-800/20 bg-amber-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
                    {a.avatar_url ? (
                      <NextImage
                        fill
                        src={a.avatar_url}
                        alt={a.name}
                        sizes="(max-width: 640px) 33vw, 160px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <User className="h-10 w-10 text-amber-300" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-950/85 to-transparent p-2 pt-6">
                      <p className="truncate text-xs font-semibold text-amber-50 drop-shadow-sm">{a.name}</p>
                      <p className="truncate text-[10px] text-amber-100/90">{a.username}</p>
                    </div>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => withdraw(a.profile_id)}
                  disabled={isBusy}
                  aria-label={`Remove ${a.name}`}
                  className="absolute right-1 top-1 h-7 w-7 bg-white/80 text-red-600 hover:bg-white hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
