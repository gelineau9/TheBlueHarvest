'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Calendar, User, FolderOpen, Pencil, LayoutGrid, List } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { FollowButton } from '@/components/follows/FollowButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicAccount {
  account_id: number;
  username: string;
  created_at: string;
  bio: string | null;
  banner_url: string | null;
  banner_credit: string | null;
  featured_collections: FeaturedCollection[];
}

interface FeaturedCollection {
  collection_id: number;
  title: string;
  description: string | null;
  collection_type_id: number;
  type_name: string;
  post_count: number;
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
          <img src={avatar} alt={profile.name} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
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

function CollectionCard({ collection }: { collection: FeaturedCollection }) {
  return (
    <Link href={`/collections/${collection.collection_id}`}>
      <Card className="flex h-full flex-col gap-1 border-amber-800/20 bg-amber-50/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-700" aria-hidden="true" />
          <p className="truncate font-semibold text-amber-900">{collection.title}</p>
        </div>
        {collection.description && (
          <p className="line-clamp-2 text-xs text-amber-700 leading-relaxed">{collection.description}</p>
        )}
        <p className="mt-auto text-xs text-amber-600">
          {collection.type_name} · {collection.post_count} {collection.post_count === 1 ? 'post' : 'posts'}
        </p>
      </Card>
    </Link>
  );
}

type ViewMode = 'cards' | 'list';

/** Cards / list switch. Two icon buttons rather than a dropdown — there are only
 *  ever two states and this keeps the section header quiet. */
function ViewToggle({ value, onChange, label }: { value: ViewMode; onChange: (v: ViewMode) => void; label: string }) {
  const base = 'flex items-center justify-center rounded p-1.5 transition-colors';
  return (
    <div className="flex gap-0.5 rounded-md border border-amber-800/20 p-0.5" role="group" aria-label={`${label} view`}>
      <button
        type="button"
        onClick={() => onChange('cards')}
        aria-label={`${label} as cards`}
        aria-pressed={value === 'cards'}
        title="Cards"
        className={`${base} ${value === 'cards' ? 'bg-amber-800 text-amber-50' : 'text-amber-700 hover:bg-amber-100'}`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label={`${label} as list`}
        aria-pressed={value === 'list'}
        title="List"
        className={`${base} ${value === 'list' ? 'bg-amber-800 text-amber-50' : 'text-amber-700 hover:bg-amber-100'}`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProfileRow({ profile }: { profile: PublicProfile }) {
  const avatar = profile.details?.avatar?.url;
  return (
    <Link
      href={`/profiles/${profile.profile_id}`}
      className="flex items-center gap-3 border-b border-amber-800/10 py-2 transition-colors hover:bg-amber-100/50"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" aria-hidden="true" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
          <User className="h-4 w-4 text-amber-700" aria-hidden="true" />
        </div>
      )}
      <span className="min-w-0 flex-1 truncate font-medium text-amber-900">{profile.name}</span>
      <span className="flex-shrink-0 text-xs text-amber-600">{profile.type_name}</span>
    </Link>
  );
}

function CollectionRow({ collection }: { collection: FeaturedCollection }) {
  return (
    <Link
      href={`/collections/${collection.collection_id}`}
      className="flex items-center gap-3 border-b border-amber-800/10 py-2 transition-colors hover:bg-amber-100/50"
    >
      <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-700" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium text-amber-900">{collection.title}</span>
      <span className="flex-shrink-0 text-xs text-amber-600">
        {collection.type_name} · {collection.post_count} {collection.post_count === 1 ? 'post' : 'posts'}
      </span>
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
  const [collectionsView, setCollectionsView] = useState<ViewMode>('cards');
  const [profilesView, setProfilesView] = useState<ViewMode>('cards');
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
    return <div className="py-16 text-center text-amber-700 italic">Loading...</div>;
  }

  if (notFound || !account) {
    return <div className="py-16 text-center text-amber-700 italic">User not found.</div>;
  }

  const joinDate = new Date(account.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const isOwnProfile = isLoggedIn && account.account_id === accountId;

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      {/* Banner — the one piece of the page that is purely the member's own */}
      {account.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied banner, no fixed size
        <img
          src={account.banner_url}
          alt=""
          aria-hidden="true"
          className="h-40 w-full rounded-md object-cover shadow-lg shadow-amber-950/25 ring-1 ring-amber-900/10 sm:h-52"
        />
      )}
      {account.banner_credit && (
        <p className="mt-1.5 text-right text-xs italic text-amber-600">Banner: {account.banner_credit}</p>
      )}
      {account.banner_url && <div className="mb-6" />}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-fantasy text-3xl font-bold text-amber-900">{account.username}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-600">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Member since {joinDate}
          </p>
        </div>

        <div className="flex flex-none items-center gap-2">
          {isOwnProfile && (
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-800/30 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit profile
            </Link>
          )}
          {isLoggedIn && !isOwnProfile && followCheckDone && (
            <FollowButton type="account" id={account.account_id} initialFollowing={isFollowing} />
          )}
        </div>
      </div>

      {/* Bio — plain text, rendered with its own line breaks preserved */}
      {account.bio && (
        <p className="mb-8 max-w-[68ch] whitespace-pre-line text-amber-800 leading-relaxed">{account.bio}</p>
      )}

      {/* Featured collections — the member picks these, so they lead: this is what
          they chose to show, and the only place collections surface outside their
          own page. */}
      {account.featured_collections?.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-fantasy text-xl font-semibold text-amber-900">Featured collections</h2>
            <ViewToggle value={collectionsView} onChange={setCollectionsView} label="Featured collections" />
          </div>
          {collectionsView === 'cards' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {account.featured_collections.map((collection) => (
                <CollectionCard key={collection.collection_id} collection={collection} />
              ))}
            </div>
          ) : (
            <div className="border-t border-amber-800/10">
              {account.featured_collections.map((collection) => (
                <CollectionRow key={collection.collection_id} collection={collection} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Public profiles */}
      <section className={account.featured_collections?.length > 0 ? 'mt-10' : ''}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-fantasy text-xl font-semibold text-amber-900">{account.username}&apos;s Profiles</h2>
          {profiles.length > 0 && <ViewToggle value={profilesView} onChange={setProfilesView} label="Profiles" />}
        </div>

        {profiles.length === 0 ? (
          <p className="text-sm text-amber-700 italic">No public profiles yet.</p>
        ) : profilesView === 'cards' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profiles.map((profile) => (
              <ProfileCard key={profile.profile_id} profile={profile} />
            ))}
          </div>
        ) : (
          <div className="border-t border-amber-800/10">
            {profiles.map((profile) => (
              <ProfileRow key={profile.profile_id} profile={profile} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
