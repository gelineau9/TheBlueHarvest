'use client';

import DOMPurify from 'isomorphic-dompurify';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  ArrowLeft,
  User,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
  Image as ImageIcon,
  BookOpen,
  Package,
  ChevronRight,
  Heart,
  Swords,
  PlusCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UsernameInput } from '@/components/ui/username-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PublicPost, PublicPostsResponse } from '@/types/posts';
import { profileTypeIcon } from '@/components/profiles/profile-type-icons';
import { useAuth } from '@/components/auth/auth-provider';
import { FollowButton } from '@/components/follows/FollowButton';
import { htmlToPlainText } from '@/lib/html-text';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileDetails {
  description?: string;
  appearance?: string;
  avatar?: { url: string; filename: string; credit?: string };
  banner?: { url: string; filename: string; credit?: string };
  race?: string;
  character_type?: string;
  occupation?: string;
  age?: string;
  kinship?: string;
  kinship_profile_id?: number;
  residence?: string;
  in_game_name?: string;
  // Kinship-specific
  founding_date?: string;
  kinship_type?: string;
  status?: string;
  recruiters?: number[];
  // Location-specific
  location_type?: string;
  region?: string;
  // Organization-specific
  org_type?: string;
  area_of_operation?: string;
  // Item / Location
  images?: { url: string; filename: string; originalName?: string }[];
}

interface KinshipMember {
  character_id: number;
  character_name: string;
  avatar_url: string | null;
  joined_at: string;
}

interface Profile {
  profile_id: number;
  account_id: number;
  profile_type_id: number;
  type_name: string;
  name: string;
  details: ProfileDetails | null;
  created_at: string;
  updated_at: string;
  username: string;
  parent_profile_id?: number | null;
  parent_name?: string | null;
  parent_id?: number | null;
  can_edit?: boolean;
  is_owner?: boolean;
}

interface Editor {
  editor_id: number;
  account_id: number;
  username: string;
  invited_by_account_id: number | null;
  invited_by_username: string | null;
  created_at: string;
}

interface ItemProfile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  details: { avatar?: { url: string } } | null;
}

interface ItemsResponse {
  profiles: ItemProfile[];
  total: number;
}

interface LiveRelationship {
  relationship_id: number;
  other_profile_id: number;
  other_profile_name: string;
  other_profile_avatar_url: string | null;
  type_name: string;
  label: string | null;
}

// ─── Small inline cards ───────────────────────────────────────────────────────

function WritingPostCard({ post }: { post: PublicPost }) {
  const preview = htmlToPlainText(typeof post.content?.body === 'string' ? post.content.body : '').slice(0, 160);

  return (
    <Link href={`/posts/${post.post_id}`} className="block">
      <Card className="flex flex-col gap-2 border-amber-800/20 bg-amber-50/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <span className="inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {post.type_name.charAt(0).toUpperCase() + post.type_name.slice(1)}
        </span>
        <h3 className="line-clamp-2 text-xs font-semibold text-amber-900 leading-snug sm:text-sm">{post.title}</h3>
        {preview && <p className="line-clamp-2 text-[11px] text-amber-700 leading-relaxed sm:text-xs">{preview}</p>}
        <p className="text-xs text-amber-500 mt-auto">
          {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </Card>
    </Link>
  );
}

function GalleryPostCard({ post }: { post: PublicPost }) {
  const thumbnailUrl = post.content?.images?.[0]?.url ?? null;

  return (
    <Link href={`/posts/${post.post_id}`} className="block">
      {/* pb-0 cancels the base Card's pb-6, which otherwise leaves a white band
          under the image — the other inline cards avoid it by passing p-4. */}
      <Card className="overflow-hidden gap-0 pb-0 border-amber-800/20 bg-amber-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <div className="relative aspect-square w-full bg-amber-100">
          {thumbnailUrl ? (
            <NextImage
              fill
              src={thumbnailUrl}
              alt={post.title}
              sizes="(max-width: 768px) 50vw, 200px"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-amber-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 to-transparent" />
          {/* Inset from the edges so the ellipsis has room and doesn't run into the
              rounded corner; truncate needs no display override, unlike line-clamp. */}
          <p className="absolute bottom-1.5 left-1.5 right-1.5 truncate px-1 text-[11px] font-semibold text-amber-50 drop-shadow-sm sm:text-xs">
            {post.title}
          </p>
        </div>
      </Card>
    </Link>
  );
}

function ItemCard({ item }: { item: ItemProfile }) {
  return (
    <Link href={`/profiles/${item.profile_id}`} className="block">
      <Card className="flex flex-col items-center gap-2 border-amber-800/20 bg-amber-50/90 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-amber-200 bg-amber-100 flex-shrink-0">
          {item.details?.avatar?.url ? (
            <NextImage fill src={item.details.avatar.url} alt={item.name} sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-8 w-8 text-amber-300" />
            </div>
          )}
        </div>
        <p className="line-clamp-2 text-xs font-semibold text-amber-900 leading-snug sm:text-sm">{item.name}</p>
      </Card>
    </Link>
  );
}

// ─── Shared content sections ──────────────────────────────────────────────────
// Gallery and Writing were duplicated once per profile type — four near-identical
// copies differing only in the noun. One implementation each, noun passed in.

function SectionHeading({
  icon: Icon,
  title,
  viewAllHref,
}: {
  icon: typeof ImageIcon;
  title: string;
  viewAllHref?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-amber-800" />
        <h2 className="text-xl font-bold text-amber-900">{title}</h2>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
        >
          View all <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      )}
    </div>
  );
}

function GallerySection({
  profileId,
  posts,
  isLoading,
  canEdit,
  noun,
  gridClass = 'grid-cols-2 sm:grid-cols-3',
  className,
}: {
  profileId: string;
  posts: PublicPost[];
  isLoading: boolean;
  canEdit: boolean;
  noun: string;
  gridClass?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionHeading icon={ImageIcon} title="Gallery" viewAllHref={`/profiles/${profileId}/gallery`} />
      {isLoading ? (
        <p className="text-amber-600 text-sm">Loading gallery…</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-amber-600 text-sm italic">No art or media featuring this {noun} yet.</p>
          {canEdit && (
            <div className="flex justify-center gap-4">
              <Link
                href="/posts/create/art"
                className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                <PlusCircle className="w-4 h-4" /> Post artwork
              </Link>
              <Link
                href="/posts/create/media"
                className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                <PlusCircle className="w-4 h-4" /> Post media
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className={`grid ${gridClass} gap-3`}>
          {posts.map((post) => (
            <GalleryPostCard key={post.post_id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

function WritingSection({
  profileId,
  posts,
  isLoading,
  canEdit,
  noun,
  className,
}: {
  profileId: string;
  posts: PublicPost[];
  isLoading: boolean;
  canEdit: boolean;
  noun: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionHeading icon={BookOpen} title="Writing" viewAllHref={`/profiles/${profileId}/writing`} />
      {isLoading ? (
        <p className="text-amber-600 text-sm">Loading writing…</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-amber-600 text-sm italic">No writing featuring this {noun} yet.</p>
          {canEdit && (
            <Link
              href="/posts/create/writing"
              className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              <PlusCircle className="w-4 h-4" /> Write a post
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {posts.map((post) => (
            <WritingPostCard key={post.post_id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

function MembersSection({
  members,
  isLoading,
  canEdit,
  removingMemberId,
  onRemove,
  className,
}: {
  members: KinshipMember[];
  isLoading: boolean;
  canEdit: boolean;
  removingMemberId: number | null;
  onRemove: (characterId: number) => void;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionHeading icon={Users} title="Members" />
      {isLoading ? (
        <p className="text-amber-600 text-sm">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="text-amber-600 text-sm italic">No members have joined yet.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.character_id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex-shrink-0 rounded-full border-2 border-amber-200 bg-amber-100 overflow-hidden">
                  {m.avatar_url ? (
                    <NextImage fill src={m.avatar_url} alt={m.character_name} sizes="32px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <User className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>
                <Link
                  href={`/profiles/${m.character_id}`}
                  className="text-amber-900 hover:underline font-semibold text-sm"
                >
                  {m.character_name}
                </Link>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(m.character_id)}
                  disabled={removingMemberId === m.character_id}
                  aria-label={`Remove ${m.character_name}`}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                >
                  {removingMemberId === m.character_id ? '…' : <X className="w-4 h-4" />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type RelationshipView = 'grid' | 'list';

/** Cards / list switch, matching the one on the community profile. */
function ViewToggle({
  value,
  onChange,
  label,
}: {
  value: RelationshipView;
  onChange: (v: RelationshipView) => void;
  label: string;
}) {
  const base = 'flex items-center justify-center rounded p-1.5 transition-colors';
  return (
    <div className="flex gap-0.5 rounded-md border border-amber-800/20 p-0.5" role="group" aria-label={`${label} view`}>
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-label={`${label} as cards`}
        aria-pressed={value === 'grid'}
        title="Cards"
        className={`${base} ${value === 'grid' ? 'bg-amber-800 text-amber-50' : 'text-amber-700 hover:bg-amber-100'}`}
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

/** Square tile: portrait fills the space, name and label sit over the bottom.
 *  Reads as a face wall rather than a bulleted list. */
function RelationshipTile({
  rel,
  canEdit,
  isRemoving,
  onRemove,
}: {
  rel: LiveRelationship;
  canEdit: boolean;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative">
      <Link href={`/profiles/${rel.other_profile_id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-amber-800/20 bg-amber-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
          {rel.other_profile_avatar_url ? (
            <NextImage
              fill
              src={rel.other_profile_avatar_url}
              alt={rel.other_profile_name}
              sizes="(max-width: 640px) 33vw, 160px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <User className="h-10 w-10 text-amber-300" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-950/85 to-transparent p-2 pt-6">
            <p className="truncate text-xs font-semibold text-amber-50 drop-shadow-sm">{rel.other_profile_name}</p>
            {rel.label && <p className="truncate text-[10px] text-amber-100/90">{rel.label}</p>}
          </div>
        </div>
      </Link>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${rel.other_profile_name}`}
          className="absolute right-1 top-1 h-7 w-7 bg-white/80 text-red-600 hover:bg-white hover:text-red-700"
        >
          {isRemoving ? '…' : <X className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { isLoggedIn, accountId } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCheckDone, setFollowCheckDone] = useState(false);

  // Editor management
  const [editors, setEditors] = useState<Editor[]>([]);
  const [showAddEditorDialog, setShowAddEditorDialog] = useState(false);
  const [newEditorUsername, setNewEditorUsername] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isAddingEditor, setIsAddingEditor] = useState(false);
  const [removingEditorId, setRemovingEditorId] = useState<number | null>(null);

  // Bottom sections (character only)
  const [items, setItems] = useState<ItemProfile[]>([]);
  const [galleryPosts, setGalleryPosts] = useState<PublicPost[]>([]);
  const [writingPosts, setWritingPosts] = useState<PublicPost[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [writingLoading, setWritingLoading] = useState(false);

  // Relationships (character only)
  const [relationships, setRelationships] = useState<LiveRelationship[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [removingRelId, setRemovingRelId] = useState<number | null>(null);
  const [relationshipView, setRelationshipView] = useState<RelationshipView>('grid');

  // Kinship members
  const [members, setMembers] = useState<KinshipMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Kinship profile link (for character info panel)
  const [kinshipProfileName, setKinshipProfileName] = useState<string | null>(null);

  const { id } = use(params);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${id}`);
        if (!response.ok) {
          setError(response.status === 404 ? 'Profile not found' : 'Failed to load profile');
          return;
        }
        const data = await response.json();
        setProfile(data);
      } catch {
        setError('An error occurred while loading the profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  // ── Follow check ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (!isLoggedIn) return;
    if (profile.account_id === accountId) return;
    if (profile.profile_type_id !== 1 && profile.profile_type_id !== 3) return;

    const checkFollow = async () => {
      try {
        const res = await fetch(`/api/follows/check?profileIds=${profile.profile_id}`);
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.profiles[String(profile.profile_id)] ?? false);
        }
      } catch {
        // silently fail — follow button just won't render
      } finally {
        setFollowCheckDone(true);
      }
    };
    checkFollow();
  }, [profile?.profile_id, isLoggedIn, accountId]);

  // ── Fetch editors ──────────────────────────────────────────────────────────
  const fetchEditors = async () => {
    try {
      const response = await fetch(`/api/profiles/${id}/editors`);
      if (response.ok) {
        const data = await response.json();
        setEditors(data.editors || []);
      }
    } catch (err) {
      console.error('Failed to fetch editors:', err);
    }
  };

  useEffect(() => {
    if (profile) fetchEditors();
  }, [profile?.profile_id]);

  // ── Fetch relationships ────────────────────────────────────────────────────
  const fetchRelationships = async () => {
    setRelationshipsLoading(true);
    try {
      const response = await fetch(`/api/profiles/${id}/relationships`);
      if (response.ok) {
        const data = await response.json();
        setRelationships(data.relationships || []);
      }
    } catch (err) {
      console.error('Failed to fetch relationships:', err);
    } finally {
      setRelationshipsLoading(false);
    }
  };

  useEffect(() => {
    if (profile && (profile.profile_type_id === 1 || profile.profile_type_id === 3)) fetchRelationships();
  }, [profile?.profile_id]);

  // ── Fetch kinship members ──────────────────────────────────────────────────
  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const response = await fetch(`/api/profiles/${id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.profile_type_id === 3) fetchMembers();
  }, [profile?.profile_id]);

  // ── Fetch kinship profile name (for character info panel) ──────────────────
  useEffect(() => {
    const kid = profile?.details?.kinship_profile_id;
    if (!kid) return;
    fetch(`/api/profiles/${kid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((k) => {
        if (k) setKinshipProfileName(k.name);
      })
      .catch(() => {});
  }, [profile?.profile_id, profile?.details?.kinship_profile_id]);

  // ── Fetch character bottom sections ───────────────────────────────────────
  useEffect(() => {
    if (!profile || profile.profile_type_id !== 1) return;

    const pid = profile.profile_id;

    // Items (children with parent_profile_id = pid)
    setItemsLoading(true);
    fetch(`/api/profiles/public?parent_profile_id=${pid}&profile_type_id=2&limit=6`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ItemsResponse) => setItems(data.profiles || []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));

    // Gallery (art + media)
    setGalleryLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=2,3&limit=6&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setGalleryPosts(data.posts || []))
      .catch(() => setGalleryPosts([]))
      .finally(() => setGalleryLoading(false));

    // Writing
    setWritingLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=1&limit=4&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setWritingPosts(data.posts || []))
      .catch(() => setWritingPosts([]))
      .finally(() => setWritingLoading(false));
  }, [profile?.profile_id, profile?.profile_type_id]);

  // ── Fetch kinship bottom sections ─────────────────────────────────────────
  useEffect(() => {
    if (!profile || profile.profile_type_id !== 3) return;

    const pid = profile.profile_id;

    // Gallery (art + media authored by or featuring the kinship)
    setGalleryLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=2,3&limit=6&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setGalleryPosts(data.posts || []))
      .catch(() => setGalleryPosts([]))
      .finally(() => setGalleryLoading(false));

    // Writing
    setWritingLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=1&limit=4&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setWritingPosts(data.posts || []))
      .catch(() => setWritingPosts([]))
      .finally(() => setWritingLoading(false));
  }, [profile?.profile_id, profile?.profile_type_id]);

  // ── Fetch organization bottom sections ────────────────────────────────────
  useEffect(() => {
    if (!profile || profile.profile_type_id !== 4) return;

    const pid = profile.profile_id;

    // Gallery (art + media)
    setGalleryLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=2,3&limit=6&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setGalleryPosts(data.posts || []))
      .catch(() => setGalleryPosts([]))
      .finally(() => setGalleryLoading(false));

    // Writing
    setWritingLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=1&limit=4&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setWritingPosts(data.posts || []))
      .catch(() => setWritingPosts([]))
      .finally(() => setWritingLoading(false));
  }, [profile?.profile_id, profile?.profile_type_id]);

  // ── Fetch item / location gallery ─────────────────────────────────────────
  useEffect(() => {
    if (!profile || (profile.profile_type_id !== 2 && profile.profile_type_id !== 5)) return;

    const pid = profile.profile_id;

    setGalleryLoading(true);
    fetch(`/api/posts/public?profile_id=${pid}&attribution=both&post_type_id=2,3&limit=12&sortBy=created_at&order=desc`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PublicPostsResponse) => setGalleryPosts(data.posts || []))
      .catch(() => setGalleryPosts([]))
      .finally(() => setGalleryLoading(false));
  }, [profile?.profile_id, profile?.profile_type_id]);

  // ── Editor actions ─────────────────────────────────────────────────────────
  const handleAddEditor = async () => {
    if (!newEditorUsername.trim()) {
      setEditorError('Please enter a username');
      return;
    }
    setIsAddingEditor(true);
    setEditorError(null);
    try {
      const response = await fetch(`/api/profiles/${id}/editors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newEditorUsername.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add editor');
      await fetchEditors();
      setNewEditorUsername('');
      setShowAddEditorDialog(false);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to add editor');
    } finally {
      setIsAddingEditor(false);
    }
  };

  const handleRemoveEditor = async (editorId: number) => {
    setRemovingEditorId(editorId);
    try {
      const response = await fetch(`/api/profiles/${id}/editors/${editorId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remove editor');
      }
      await fetchEditors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove editor');
    } finally {
      setRemovingEditorId(null);
    }
  };

  const handleRemoveRelationship = async (relId: number) => {
    setRemovingRelId(relId);
    try {
      const response = await fetch(`/api/profiles/${id}/relationships/${relId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remove relationship');
      }
      await fetchRelationships();
    } catch (err) {
      console.error('Failed to remove relationship:', err);
    } finally {
      setRemovingRelId(null);
    }
  };

  const handleRemoveMember = async (characterId: number) => {
    setRemovingMemberId(characterId);
    try {
      const response = await fetch(`/api/profiles/${id}/members/${characterId}`, { method: 'DELETE' });
      if (response.ok) await fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete profile');
      }
      router.push('/archive');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-amber-900">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error || 'Profile not found'}</h1>
            <p className="text-amber-700 mb-6">The profile you&#39;re looking for could not be found.</p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isCharacter = profile.profile_type_id === 1;
  const isKinship = profile.profile_type_id === 3;
  const isItem = profile.profile_type_id === 2;
  const isLocation = profile.profile_type_id === 5;
  const isOrganization = profile.profile_type_id === 4;
  const d = profile.details;

  // Back goes to the listing this profile belongs to, not the homepage.
  const backLink = isCharacter
    ? { href: '/characters', label: 'Back to Characters' }
    : isKinship
      ? { href: '/kinships', label: 'Back to Kinships' }
      : {
          href: `/archive?contentType=profiles&profileTypes=${profile.profile_type_id}`,
          label: `Back to ${profile.type_name.charAt(0).toUpperCase() + profile.type_name.slice(1)}s`,
        };

  const hasBanner = (isCharacter || isKinship || isOrganization) && !!d?.banner?.url;

  // Identity facts read as one row of bubbles rather than a labelled table —
  // the same treatment tags get on a post.
  // Each chip names what it is, the way a Featuring bubble on a post does —
  // without the qualifier "Rowantook" and "Bucklebury" are just loose words.
  const identityChips: Array<{ key: string; label: string; qualifier: string; href?: string; tone?: string }> = [];
  if (isCharacter) {
    if (d?.race) identityChips.push({ key: 'race', label: d.race, qualifier: 'race', tone: 'emerald' });
    if (d?.character_type) {
      identityChips.push({
        key: 'ctype',
        label: d.character_type,
        qualifier: 'type',
        tone: d.character_type === 'NPC' ? 'slate' : 'sky',
      });
    }
    if (d?.occupation) identityChips.push({ key: 'occupation', label: d.occupation, qualifier: 'occupation' });
    if (d?.age) identityChips.push({ key: 'age', label: d.age, qualifier: 'age' });
    if (d?.kinship_profile_id && kinshipProfileName) {
      identityChips.push({
        key: 'kinship',
        label: kinshipProfileName,
        qualifier: 'kinship',
        href: `/profiles/${d.kinship_profile_id}`,
      });
    } else if (d?.kinship) {
      identityChips.push({ key: 'kinship', label: d.kinship, qualifier: 'kinship' });
    }
    if (d?.residence) identityChips.push({ key: 'residence', label: d.residence, qualifier: 'residence' });
    if (d?.in_game_name) identityChips.push({ key: 'ign', label: d.in_game_name, qualifier: 'in-game' });
  }
  if (isKinship) {
    if (d?.kinship_type) identityChips.push({ key: 'ktype', label: d.kinship_type, qualifier: 'type', tone: 'violet' });
    if (d?.founding_date) identityChips.push({ key: 'founded', label: d.founding_date, qualifier: 'founded' });
    if (d?.status) identityChips.push({ key: 'status', label: d.status, qualifier: 'status' });
  }
  if (isLocation) {
    if (d?.location_type) identityChips.push({ key: 'ltype', label: d.location_type, qualifier: 'type' });
    if (d?.region) identityChips.push({ key: 'region', label: d.region, qualifier: 'region' });
    if (d?.status) identityChips.push({ key: 'status', label: d.status, qualifier: 'status' });
  }
  if (isOrganization) {
    if (d?.org_type) identityChips.push({ key: 'otype', label: d.org_type, qualifier: 'type' });
    if (d?.founding_date) identityChips.push({ key: 'founded', label: d.founding_date, qualifier: 'founded' });
    if (d?.area_of_operation) {
      identityChips.push({ key: 'area', label: d.area_of_operation, qualifier: 'area of operation' });
    }
    if (d?.status) identityChips.push({ key: 'status', label: d.status, qualifier: 'status' });
    // Organizations surface their parent as a contact rather than an owner
    if (profile.parent_name) {
      identityChips.push({
        key: 'contact',
        label: profile.parent_name,
        qualifier: 'contact',
        href: profile.parent_id ? `/profiles/${profile.parent_id}` : undefined,
      });
    }
  }

  const chipTone = (tone?: string) => {
    switch (tone) {
      case 'emerald':
        return 'bg-emerald-100 border-emerald-200 text-emerald-800';
      case 'sky':
        return 'bg-sky-100 border-sky-200 text-sky-800';
      case 'slate':
        return 'bg-slate-100 border-slate-200 text-slate-700';
      case 'violet':
        return 'bg-violet-100 border-violet-200 text-violet-800';
      default:
        return 'bg-amber-100/70 border-amber-200 text-amber-800';
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href={backLink.href}
          className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLink.label}
        </Link>

        {/* Profile Header — no card; the banner and title carry the page */}
        <div>
          {/* Banner (character + kinship + organization) */}
          {hasBanner && (
            <div className="relative h-48 w-full overflow-hidden rounded-md bg-amber-100 shadow-lg shadow-amber-950/25 ring-1 ring-amber-900/10">
              <NextImage
                fill
                src={d!.banner!.url}
                alt={`${profile.name} banner`}
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Artwork credits for the images above — kept out of the description */}
          {(d?.banner?.credit || d?.avatar?.credit) && (
            <p className="mt-1.5 text-right text-xs italic text-amber-600">
              {d?.banner?.credit && <span>Banner: {d.banner.credit}</span>}
              {d?.banner?.credit && d?.avatar?.credit && <span className="mx-1.5 text-amber-800/40">·</span>}
              {d?.avatar?.credit && <span>Avatar: {d.avatar.credit}</span>}
            </p>
          )}

          <div className={hasBanner ? 'pt-0' : ''}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-6">
                {/* Avatar — overlaps the banner's bottom-left when one is present */}
                <div
                  className={`relative flex-shrink-0 ${
                    hasBanner
                      ? '-mt-14 w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-amber-100'
                      : 'w-24 h-24 rounded-full border-4 border-amber-200 overflow-hidden bg-amber-100'
                  }`}
                >
                  {d?.avatar?.url ? (
                    <NextImage
                      fill
                      src={d.avatar.url}
                      alt={`${profile.name} avatar`}
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {(() => {
                        // Default avatar matches the type icon shown on the create page
                        const TypeIcon = profileTypeIcon(profile.profile_type_id);
                        return <TypeIcon className="w-12 h-12 text-amber-400" />;
                      })()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="text-4xl font-bold text-amber-900">{profile.name}</h1>

                  {/* Byline — who made it, and when */}
                  <div className="mt-2 text-sm text-amber-700">
                    Created by{' '}
                    <Link href={`/users/${profile.username}`} className="text-amber-900 hover:underline font-semibold">
                      {profile.username}
                    </Link>
                    <span className="mx-2 text-amber-800/40">·</span>
                    <span>{formattedDate}</span>
                  </div>

                  {/* Attribution — who else can edit, and the owning profile */}
                  <div className="mt-1 text-xs text-amber-600">
                    {editors.length > 0 && (
                      <>
                        Editors:{' '}
                        {editors.map((editor, index) => (
                          <span key={editor.editor_id}>
                            <Link href={`/users/${editor.username}`} className="hover:underline text-amber-700">
                              {editor.username}
                            </Link>
                            {index < editors.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </>
                    )}
                    {profile.can_edit && (
                      <>
                        {editors.length > 0 && <span className="mx-2 text-amber-800/40">·</span>}
                        <button
                          type="button"
                          onClick={() => {
                            setEditorError(null);
                            setNewEditorUsername('');
                            setShowAddEditorDialog(true);
                          }}
                          className="underline hover:text-amber-800 cursor-pointer"
                        >
                          {editors.length > 0 ? 'Manage' : 'Manage editors'}
                        </button>
                      </>
                    )}
                    {/* Organizations surface their parent as a contact chip instead */}
                    {!isOrganization && profile.parent_name && profile.parent_id && (
                      <>
                        {(editors.length > 0 || profile.can_edit) && <span className="mx-2 text-amber-800/40">|</span>}
                        Owned by{' '}
                        <Link href={`/profiles/${profile.parent_id}`} className="hover:underline text-amber-700">
                          {profile.parent_name}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-none items-center gap-0.5 pt-1">
                {/* Follow keeps its label — it's the visitor's action, not an owner tool */}
                {isLoggedIn &&
                  profile.account_id !== accountId &&
                  (profile.profile_type_id === 1 || profile.profile_type_id === 3) &&
                  followCheckDone && (
                    <FollowButton type="profile" id={profile.profile_id} initialFollowing={isFollowing} />
                  )}
                {profile.can_edit && (
                  <Button
                    onClick={() => router.push(`/profiles/${profile.profile_id}/edit`)}
                    variant="ghost"
                    size="icon"
                    aria-label="Edit profile"
                    title="Edit profile"
                    className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {profile.is_owner && (
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="ghost"
                    size="icon"
                    aria-label="Delete profile"
                    title="Delete profile"
                    className="text-amber-700 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Identity chips — the same bubble treatment tags get on a post */}
            {identityChips.length > 0 && (
              <div className="mt-6 mb-6 flex flex-wrap gap-2">
                {identityChips.map((chip) => {
                  const body = (
                    <>
                      {chip.label}
                      <span className="opacity-60"> · {chip.qualifier}</span>
                    </>
                  );
                  return chip.href ? (
                    <Link
                      key={chip.key}
                      href={chip.href}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:brightness-95 ${chipTone(chip.tone)}`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <span
                      key={chip.key}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${chipTone(chip.tone)}`}
                    >
                      {body}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Appearance — sits with the identity chips, not buried in the background */}
            {isCharacter && d?.appearance && (
              <div className="mb-6">
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">Appearance</h2>
                <div
                  className="prose prose-amber rte-content text-sm text-amber-800 [&_a]:text-amber-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-amber-700 [&_img]:rounded [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(d.appearance) }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Item image — bare hero, same treatment artwork gets on a post */}
        {isItem && d?.images?.[0]?.url && (
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-md bg-amber-50 shadow-lg shadow-amber-950/25 ring-1 ring-amber-900/10">
            <NextImage src={d.images[0].url} alt={profile.name} fill className="object-contain" />
          </div>
        )}

        {/* Location image — bare hero */}
        {isLocation && d?.images?.[0]?.url && (
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-md bg-amber-50 shadow-lg shadow-amber-950/25 ring-1 ring-amber-900/10">
            <NextImage src={d.images[0].url} alt={profile.name} fill className="object-cover" />
          </div>
        )}

        {/* Background / Description */}
        {(isCharacter || isKinship || isItem || isLocation || isOrganization) && (
          <Card className="p-8 bg-white/80 border-amber-300 mb-6">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">
              {isCharacter ? 'Background' : isKinship || isOrganization ? 'Background / Description' : 'Description'}
            </h2>
            {d?.description ? (
              <div
                className="prose prose-amber rte-content text-amber-800 [&_h2]:text-amber-900 [&_h3]:text-amber-900 [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-900 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-amber-700 [&_hr]:border-amber-200 [&_img]:rounded [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(d.description) }}
              />
            ) : (
              <p className="text-amber-700 italic">No details have been added to this profile yet.</p>
            )}
          </Card>
        )}

        {/* Fallback generic */}
        {!isCharacter && !isKinship && !isItem && !isLocation && !isOrganization && d?.description && (
          <Card className="p-8 bg-white border-amber-300 mb-6">
            <div
              className="prose prose-amber rte-content text-amber-800 [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-900 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-amber-700 [&_hr]:border-amber-200 [&_img]:rounded [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(d.description) }}
            />
          </Card>
        )}

        {/* ── Character content — one card, four sections ──────────────────── */}
        {isCharacter && (
          <Card className="p-6 bg-white/80 border-amber-300 mb-6 divide-y divide-amber-200">
            {/* Relationships */}
            <section className="pb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Relationships</h2>
                </div>
                {relationships.length > 0 && (
                  <ViewToggle value={relationshipView} onChange={setRelationshipView} label="Relationships" />
                )}
              </div>

              {relationshipsLoading ? (
                <p className="text-amber-600 text-sm">Loading relationships…</p>
              ) : relationships.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No relationships have been added yet.</p>
              ) : (
                <div className="space-y-6">
                  {[
                    { label: 'Friends', color: 'text-emerald-600', filter: (t: string) => t === 'friend' },
                    { label: 'Allies', color: 'text-teal-600', filter: (t: string) => t === 'ally' },
                    { label: 'Relatives', color: 'text-blue-600', filter: (t: string) => t === 'relative' },
                    { label: 'Rivals', color: 'text-orange-600', filter: (t: string) => t === 'rival' },
                    { label: 'Enemies', color: 'text-red-600', filter: (t: string) => t === 'enemy' },
                  ].map(({ label: groupLabel, color, filter }) => {
                    const group = relationships.filter((r) => filter(r.type_name));
                    if (group.length === 0) return null;
                    return (
                      <div key={groupLabel}>
                        <h3 className={`text-sm font-semibold mb-2 ${color}`}>{groupLabel}</h3>
                        {relationshipView === 'grid' ? (
                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                            {group.map((rel) => (
                              <RelationshipTile
                                key={rel.relationship_id}
                                rel={rel}
                                canEdit={!!profile.can_edit}
                                isRemoving={removingRelId === rel.relationship_id}
                                onRemove={() => handleRemoveRelationship(rel.relationship_id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {group.map((rel) => (
                              <li
                                key={rel.relationship_id}
                                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative w-7 h-7 flex-shrink-0 rounded-full border-2 border-amber-200 bg-amber-100 overflow-hidden">
                                    {rel.other_profile_avatar_url ? (
                                      <NextImage
                                        fill
                                        src={rel.other_profile_avatar_url}
                                        alt={rel.other_profile_name}
                                        sizes="28px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-amber-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <Link
                                      href={`/profiles/${rel.other_profile_id}`}
                                      className="text-amber-900 hover:underline font-semibold text-sm leading-tight"
                                    >
                                      {rel.other_profile_name}
                                    </Link>
                                    {rel.label && <span className="text-xs text-amber-600">{rel.label}</span>}
                                  </div>
                                </div>
                                {profile.can_edit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveRelationship(rel.relationship_id)}
                                    disabled={removingRelId === rel.relationship_id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                  >
                                    {removingRelId === rel.relationship_id ? '…' : <X className="w-4 h-4" />}
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Owned Items */}
            <section className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Items</h2>
                </div>
                <Link
                  href={`/profiles/${id}/items`}
                  className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {itemsLoading ? (
                <p className="text-amber-600 text-sm">Loading items…</p>
              ) : items.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-amber-600 text-sm italic">No items owned by this character yet.</p>
                  {profile.can_edit && (
                    <Link
                      href="/profiles/create"
                      className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
                    >
                      <PlusCircle className="w-4 h-4" /> Create an Item profile
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {items.map((item) => (
                    <ItemCard key={item.profile_id} item={item} />
                  ))}
                </div>
              )}
            </section>

            <GallerySection
              className="py-6"
              profileId={id}
              posts={galleryPosts}
              isLoading={galleryLoading}
              canEdit={!!profile.can_edit}
              noun="character"
            />

            <WritingSection
              className="pt-6"
              profileId={id}
              posts={writingPosts}
              isLoading={writingLoading}
              canEdit={!!profile.can_edit}
              noun="character"
            />
          </Card>
        )}

        {/* ── Kinship content — one card, five sections ────────────────── */}
        {isKinship && (
          <Card className="p-6 bg-white/80 border-amber-300 mb-6 divide-y divide-amber-200">
            {/* Recruiters */}
            <section className="pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-900">Recruiters</h3>
              </div>
              {membersLoading ? (
                <p className="text-amber-600 text-sm">Loading recruiters…</p>
              ) : !d?.recruiters || d.recruiters.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No recruiters have been designated yet.</p>
              ) : (
                (() => {
                  const recruiters = members.filter((m) => d.recruiters!.includes(m.character_id));
                  return recruiters.length === 0 ? (
                    <p className="text-amber-600 text-sm italic">No recruiters have been designated yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {recruiters.map((m) => (
                        <Link
                          key={m.character_id}
                          href={`/profiles/${m.character_id}`}
                          className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-900 hover:border-amber-500 hover:bg-amber-100 transition-colors"
                        >
                          <div className="relative w-5 h-5 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 border border-amber-200">
                            {m.avatar_url ? (
                              <NextImage
                                fill
                                src={m.avatar_url}
                                alt={m.character_name}
                                sizes="20px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <User className="w-3 h-3 text-amber-400" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{m.character_name}</span>
                        </Link>
                      ))}
                    </div>
                  );
                })()
              )}
            </section>

            {/* Relationships (Friends & Allies / Rivals & Enemies) */}
            <section className="py-6">
              <div className="flex items-center gap-2 mb-3">
                <Swords className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-900">Relationships</h3>
              </div>
              {relationshipsLoading ? (
                <p className="text-amber-600 text-sm">Loading relationships…</p>
              ) : relationships.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No relationships have been added yet.</p>
              ) : (
                <div className="space-y-4">
                  {[
                    {
                      label: 'Friends',
                      color: 'text-emerald-600',
                      filter: (t: string) => t === 'friend',
                    },
                    {
                      label: 'Allies',
                      color: 'text-teal-600',
                      filter: (t: string) => t === 'ally',
                    },
                    {
                      label: 'Relatives',
                      color: 'text-blue-600',
                      filter: (t: string) => t === 'relative',
                    },
                    {
                      label: 'Rivals',
                      color: 'text-orange-600',
                      filter: (t: string) => t === 'rival',
                    },
                    {
                      label: 'Enemies',
                      color: 'text-red-600',
                      filter: (t: string) => t === 'enemy',
                    },
                  ].map(({ label: groupLabel, color, filter }) => {
                    const group = relationships.filter((r) => filter(r.type_name));
                    if (group.length === 0) return null;
                    return (
                      <div key={groupLabel}>
                        <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${color}`}>{groupLabel}</h4>
                        <ul className="space-y-2">
                          {group.map((rel) => (
                            <li
                              key={rel.relationship_id}
                              className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-7 h-7 flex-shrink-0 rounded-full border-2 border-amber-200 bg-amber-100 overflow-hidden">
                                  {rel.other_profile_avatar_url ? (
                                    <NextImage
                                      fill
                                      src={rel.other_profile_avatar_url}
                                      alt={rel.other_profile_name}
                                      sizes="28px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      <User className="w-3.5 h-3.5 text-amber-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <Link
                                    href={`/profiles/${rel.other_profile_id}`}
                                    className="text-amber-900 hover:underline font-semibold text-sm leading-tight"
                                  >
                                    {rel.other_profile_name}
                                  </Link>
                                  {rel.label && <span className="text-xs text-amber-600">{rel.label}</span>}
                                </div>
                              </div>
                              {profile.can_edit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRelationship(rel.relationship_id)}
                                  disabled={removingRelId === rel.relationship_id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                >
                                  {removingRelId === rel.relationship_id ? '…' : <X className="w-4 h-4" />}
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <MembersSection
              className="py-6"
              members={members}
              isLoading={membersLoading}
              canEdit={!!profile.can_edit}
              removingMemberId={removingMemberId}
              onRemove={handleRemoveMember}
            />

            <GallerySection
              className="py-6"
              profileId={id}
              posts={galleryPosts}
              isLoading={galleryLoading}
              canEdit={!!profile.can_edit}
              noun="kinship"
            />

            <WritingSection
              className="pt-6"
              profileId={id}
              posts={writingPosts}
              isLoading={writingLoading}
              canEdit={!!profile.can_edit}
              noun="kinship"
            />
          </Card>
        )}

        {/* ── Organization content — one card, two sections ────────────── */}
        {isOrganization && (
          <Card className="p-6 bg-white/80 border-amber-300 mb-6 divide-y divide-amber-200">
            <GallerySection
              className="pb-6"
              profileId={id}
              posts={galleryPosts}
              isLoading={galleryLoading}
              canEdit={!!profile.can_edit}
              noun="organization"
            />

            <WritingSection
              className="pt-6"
              profileId={id}
              posts={writingPosts}
              isLoading={writingLoading}
              canEdit={!!profile.can_edit}
              noun="organization"
            />
          </Card>
        )}

        {/* ── Item / Location gallery ──────────────────────────────── */}
        {(isItem || isLocation) && (
          <Card className="p-6 bg-white/80 border-amber-300 mb-6">
            <GallerySection
              profileId={id}
              posts={galleryPosts}
              isLoading={galleryLoading}
              canEdit={!!profile.can_edit}
              noun={isItem ? 'item' : 'location'}
              gridClass="grid-cols-2 sm:grid-cols-4"
            />
          </Card>
        )}
      </div>

      {/* Editors Dialog — list, add and remove, opened from the header */}
      <Dialog open={showAddEditorDialog} onOpenChange={setShowAddEditorDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Editors</DialogTitle>
            <DialogDescription className="text-amber-700">
              Editors can change this profile. The creator always keeps access.
            </DialogDescription>
          </DialogHeader>

          {editors.length === 0 ? (
            <p className="text-amber-700 text-sm italic">No editors have been added to this profile yet.</p>
          ) : (
            <ul className="space-y-2">
              {editors.map((editor) => (
                <li
                  key={editor.editor_id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div>
                    <Link href={`/users/${editor.username}`} className="font-medium text-amber-900 hover:underline">
                      {editor.username}
                    </Link>
                    {editor.invited_by_username && (
                      <span className="text-sm text-amber-600 ml-2">
                        (invited by{' '}
                        <Link href={`/users/${editor.invited_by_username}`} className="hover:underline">
                          {editor.invited_by_username}
                        </Link>
                        )
                      </span>
                    )}
                  </div>
                  {(profile.is_owner || profile.can_edit) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEditor(editor.editor_id)}
                      disabled={removingEditorId === editor.editor_id}
                      aria-label={`Remove ${editor.username}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {removingEditorId === editor.editor_id ? 'Removing…' : <X className="w-4 h-4" />}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {profile.is_owner && (
            <div className="pt-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <UsernameInput
                    value={newEditorUsername}
                    onChange={(v) => {
                      setNewEditorUsername(v);
                      setEditorError(null);
                    }}
                    onSubmit={() => {
                      if (!isAddingEditor) handleAddEditor();
                    }}
                    disabled={isAddingEditor}
                    exclude={editors.map((editor) => editor.username)}
                  />
                </div>
                <Button
                  onClick={handleAddEditor}
                  disabled={isAddingEditor || !newEditorUsername.trim()}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isAddingEditor ? 'Adding…' : 'Add'}
                </Button>
              </div>
              {editorError && <p className="text-red-600 text-sm mt-2">{editorError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddEditorDialog(false)}
              className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Delete Profile</DialogTitle>
            <DialogDescription className="text-amber-700">
              Are you sure you want to delete this profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="border-amber-600 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
