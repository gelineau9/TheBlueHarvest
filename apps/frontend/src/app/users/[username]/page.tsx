'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Calendar, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { FollowButton } from '@/components/follows/FollowButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicAccount {
  account_id: number;
  username: string;
  created_at: string;
}

interface PublicProfile {
  profile_id: number;
  profile_type_id: number;
  name: string;
  details: { avatar?: { url: string } } | null;
  created_at: string;
  type_name: string;
  username: string;
}

interface ProfilesResponse {
  profiles: PublicProfile[];
  total: number;
  hasMore: boolean;
}

// ─── Profile mini-card ────────────────────────────────────────────────────────

function ProfileCard({ profile }: { profile: PublicProfile }) {
  const avatar = profile.details?.avatar?.url;
  return (
    <Link href={`/profiles/${profile.profile_id}`}>
      <Card className="flex items-center gap-3 border-amber-800/20 bg-amber-50/90 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        {avatar ? (
          <img
            src={avatar}
            alt={profile.name}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
            <User className="h-5 w-5 text-amber-700" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-amber-900">{profile.name}</p>
          <p className="text-xs text-amber-600">{profile.type_name}</p>
        </div>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { isLoggedIn, accountId } = useAuth();

  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCheckDone, setFollowCheckDone] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch public account info
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await fetch(`/api/users/public/${encodeURIComponent(username)}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data: PublicAccount = await res.json();
        setAccount(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAccount();
  }, [username]);

  // Fetch public profiles belonging to this account
  useEffect(() => {
    if (!account) return;
    const fetchProfiles = async () => {
      try {
        const res = await fetch(
          `/api/profiles/public?account_id=${account.account_id}&limit=20&sortBy=created_at&order=desc`,
        );
        if (res.ok) {
          const data: ProfilesResponse = await res.json();
          setProfiles(data.profiles ?? []);
        }
      } catch {
        // silently fail
      }
    };
    fetchProfiles();
  }, [account?.account_id]);

  // Follow check
  useEffect(() => {
    if (!account) return;
    if (!isLoggedIn) return;
    if (account.account_id === accountId) return;

    const checkFollow = async () => {
      try {
        const res = await fetch(`/api/follows/check?accountIds=${account.account_id}`);
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.accounts[String(account.account_id)] ?? false);
        }
      } catch {
        // silently fail
      } finally {
        setFollowCheckDone(true);
      }
    };
    checkFollow();
  }, [account?.account_id, isLoggedIn, accountId]);

  if (loading) {
    return (
      <div className="py-16 text-center text-amber-700 italic">Loading...</div>
    );
  }

  if (notFound || !account) {
    return (
      <div className="py-16 text-center text-amber-700 italic">User not found.</div>
    );
  }

  const joinDate = new Date(account.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const isOwnProfile = isLoggedIn && account.account_id === accountId;

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-fantasy text-3xl font-bold text-amber-900">{account.username}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-600">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Member since {joinDate}
          </p>
        </div>

        {isLoggedIn && !isOwnProfile && followCheckDone && (
          <FollowButton type="account" id={account.account_id} initialFollowing={isFollowing} />
        )}
      </div>

      {/* Public profiles */}
      <section>
        <h2 className="mb-4 font-fantasy text-xl font-semibold text-amber-900">
          {account.username}&apos;s Profiles
        </h2>

        {profiles.length === 0 ? (
          <p className="text-sm text-amber-700 italic">No public profiles yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profiles.map((profile) => (
              <ProfileCard key={profile.profile_id} profile={profile} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
