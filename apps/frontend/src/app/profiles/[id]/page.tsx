'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  ArrowLeft,
  User,
  Calendar,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PublicPost, PublicPostsResponse } from '@/types/posts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileDetails {
  description?: string;
  appearance?: string;
  avatar?: { url: string; filename: string };
  banner?: { url: string; filename: string };
  race?: string;
  occupation?: string;
  age?: string;
  kinship?: string;
  kinship_profile_id?: number;
  residence?: string;
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
  const preview = typeof post.content?.body === 'string' ? post.content.body.replace(/<[^>]*>/g, '').slice(0, 160) : '';

  return (
    <Link href={`/posts/${post.post_id}`} className="block">
      <Card className="flex flex-col gap-2 border-amber-800/20 bg-amber-50/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
        <span className="inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {post.type_name.charAt(0).toUpperCase() + post.type_name.slice(1)}
        </span>
        <h3 className="line-clamp-2 text-sm font-semibold text-amber-900 leading-snug">{post.title}</h3>
        {preview && <p className="line-clamp-2 text-xs text-amber-700 leading-relaxed">{preview}</p>}
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
      <Card className="overflow-hidden border-amber-800/20 bg-amber-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
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
          <p className="absolute bottom-0 left-0 right-0 line-clamp-1 p-2 text-xs font-semibold text-amber-50 drop-shadow-sm">
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
        <p className="line-clamp-2 text-sm font-semibold text-amber-900 leading-snug">{item.name}</p>
      </Card>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Kinship members
  const [members, setMembers] = useState<KinshipMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Kinship profile link (for character info panel)
  const [kinshipProfileName, setKinshipProfileName] = useState<string | null>(null);

  // Organization contact (owner's character)
  const [orgContactName, setOrgContactName] = useState<string | null>(null);
  const [orgContactId, setOrgContactId] = useState<number | null>(null);

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
      .then((r) => r.ok ? r.json() : null)
      .then((k) => { if (k) setKinshipProfileName(k.name); })
      .catch(() => {});
  }, [profile?.profile_id, profile?.details?.kinship_profile_id]);

  // ── Fetch org contact (owner's character) ─────────────────────────────────
  useEffect(() => {
    if (!profile || profile.profile_type_id !== 4) return;
    fetch(`/api/profiles/public?profile_type_id=1&account_id=${profile.account_id}&limit=1`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const char = data?.profiles?.[0];
        if (char) {
          setOrgContactName(char.name);
          setOrgContactId(char.profile_id);
        }
      })
      .catch(() => {});
  }, [profile?.profile_id, profile?.account_id]);

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
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
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

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Profile Header Card */}
        <Card className="bg-white border-amber-300 mb-6 overflow-hidden">
          {/* Banner (character + kinship + organization) */}
          {(isCharacter || isKinship || isOrganization) && d?.banner?.url && (
            <div className="relative h-48 w-full bg-amber-100">
              <NextImage
                fill
                src={d.banner.url}
                alt={`${profile.name} banner`}
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className={`p-8 ${(isCharacter || isKinship || isOrganization) && d?.banner?.url ? 'pt-6' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-6">
                {/* Avatar — overlaps banner bottom-left when banner present */}
                <div
                  className={`relative flex-shrink-0 ${
                    (isCharacter || isKinship || isOrganization) && d?.banner?.url
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
                      <User className="w-12 h-12 text-amber-400" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
                    {profile.type_name.charAt(0).toUpperCase() + profile.type_name.slice(1)}
                  </div>
                  <h1 className="text-4xl font-bold text-amber-900 mb-2">{profile.name}</h1>
                </div>
              </div>

              {/* Edit / Delete buttons */}
              {profile.can_edit && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => router.push(`/profiles/${profile.profile_id}/edit`)}
                    className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {profile.is_owner && (
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Created by / date */}
            <div className="flex items-center gap-6 text-sm text-amber-700">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Created by {profile.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Parent ownership */}
            {profile.parent_name && profile.parent_id && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <User className="w-4 h-4" />
                  <span>
                    Owned by{' '}
                    <Link
                      href={`/profiles/${profile.parent_id}`}
                      className="text-amber-900 hover:underline font-semibold"
                    >
                      {profile.parent_name}
                    </Link>
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Item image */}
        {isItem && d?.images?.[0]?.url && (
          <Card className="overflow-hidden border-amber-300 mb-6">
            <div className="relative w-full aspect-video bg-amber-50">
              <NextImage
                src={d.images[0].url}
                alt={profile.name}
                fill
                className="object-contain"
              />
            </div>
          </Card>
        )}

        {/* Character info panel */}
        {isCharacter && (
          <Card className="p-6 bg-white border-amber-300 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-4">Character Info</h2>
            {d && (d.race || d.occupation || d.age || d.kinship_profile_id || d.kinship || d.residence) ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {d?.race && (
                  <div>
                    <dt className="text-amber-600 font-medium">Race</dt>
                    <dd className="text-amber-900">{d.race}</dd>
                  </div>
                )}
                {d?.occupation && (
                  <div>
                    <dt className="text-amber-600 font-medium">Occupation</dt>
                    <dd className="text-amber-900">{d.occupation}</dd>
                  </div>
                )}
                {d?.age && (
                  <div>
                    <dt className="text-amber-600 font-medium">Age</dt>
                    <dd className="text-amber-900">{d.age}</dd>
                  </div>
                )}
                {(d?.kinship_profile_id || d?.kinship) && (
                  <div>
                    <dt className="text-amber-600 font-medium">Kinship</dt>
                    <dd className="text-amber-900">
                      {d.kinship_profile_id && kinshipProfileName ? (
                        <Link
                          href={`/profiles/${d.kinship_profile_id}`}
                          className="text-amber-700 hover:text-amber-900 hover:underline font-medium"
                        >
                          {kinshipProfileName}
                        </Link>
                      ) : (
                        d.kinship || '—'
                      )}
                    </dd>
                  </div>
                )}
                {d?.residence && (
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-amber-600 font-medium">Residence</dt>
                    <dd className="text-amber-900">{d.residence}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-amber-600 text-sm italic">No character info has been added yet.</p>
            )}
            {d?.appearance && (
              <div className="border-t border-amber-100 mt-4 pt-4">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">Appearance</h3>
                <p className="text-amber-800 whitespace-pre-wrap text-sm">{d.appearance}</p>
              </div>
            )}
          </Card>
        )}

        {/* Kinship info panel (with Recruiters + Relationships embedded) */}
        {isKinship && (
          <Card className="p-6 bg-white border-amber-300 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-4">Kinship Info</h2>

            {/* Founded / Type / Status */}
            {d && (d.founding_date || d.kinship_type || d.status) ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm mb-6">
                {d.founding_date && (
                  <div>
                    <dt className="text-amber-600 font-medium">Founded</dt>
                    <dd className="text-amber-900">{d.founding_date}</dd>
                  </div>
                )}
                {d.kinship_type && (
                  <div>
                    <dt className="text-amber-600 font-medium">Type</dt>
                    <dd className="text-amber-900">{d.kinship_type}</dd>
                  </div>
                )}
                {d.status && (
                  <div>
                    <dt className="text-amber-600 font-medium">Status</dt>
                    <dd className="text-amber-900">{d.status}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-amber-600 text-sm italic mb-6">No kinship info has been added yet.</p>
            )}

            {/* Recruiters */}
            <div className="border-t border-amber-100 pt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-900">Recruiters</h3>
              </div>
              {membersLoading ? (
                <p className="text-amber-600 text-sm">Loading recruiters…</p>
              ) : !d?.recruiters || d.recruiters.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No recruiters have been designated yet.</p>
              ) : (() => {
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
                            <NextImage fill src={m.avatar_url} alt={m.character_name} sizes="20px" className="object-cover" />
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
              })()}
            </div>

            {/* Relationships (Friends & Allies / Rivals & Enemies) */}
            <div className="border-t border-amber-100 pt-4">
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
                  {(
                    [
                      {
                        label: 'Friends & Allies',
                        color: 'text-emerald-600',
                        filter: (t: string) => t === 'friend' || t === 'ally',
                      },
                      {
                        label: 'Rivals & Enemies',
                        color: 'text-red-600',
                        filter: (t: string) => t === 'rival' || t === 'enemy',
                      },
                    ] as const
                  ).map(({ label: groupLabel, color, filter }) => {
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
            </div>
          </Card>
        )}

        {/* Location info panel */}
        {isLocation && (
          <Card className="p-6 bg-white border-amber-300 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-4">Location Info</h2>
            {d && (d.location_type || d.region || d.status) ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {d.location_type && (
                  <div>
                    <dt className="text-amber-600 font-medium">Type</dt>
                    <dd className="text-amber-900">{d.location_type}</dd>
                  </div>
                )}
                {d.region && (
                  <div>
                    <dt className="text-amber-600 font-medium">Region / Area</dt>
                    <dd className="text-amber-900">{d.region}</dd>
                  </div>
                )}
                {d.status && (
                  <div>
                    <dt className="text-amber-600 font-medium">Status</dt>
                    <dd className="text-amber-900">{d.status}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-amber-600 text-sm italic">No location info has been added yet.</p>
            )}
          </Card>
        )}

        {/* Location image */}
        {isLocation && d?.images?.[0]?.url && (
          <Card className="overflow-hidden border-amber-300 mb-6">
            <div className="relative w-full aspect-video bg-amber-50">
              <NextImage
                src={d.images[0].url}
                alt={profile.name}
                fill
                className="object-cover"
              />
            </div>
          </Card>
        )}

        {/* Organization info panel */}
        {isOrganization && (
          <Card className="p-6 bg-white border-amber-300 mb-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-4">Organization Info</h2>
            {d && (d.founding_date || d.org_type || d.status || d.area_of_operation) ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {d.founding_date && (
                  <div>
                    <dt className="text-amber-600 font-medium">Founded</dt>
                    <dd className="text-amber-900">{d.founding_date}</dd>
                  </div>
                )}
                {d.org_type && (
                  <div>
                    <dt className="text-amber-600 font-medium">Organization Type</dt>
                    <dd className="text-amber-900">{d.org_type}</dd>
                  </div>
                )}
                {d.status && (
                  <div>
                    <dt className="text-amber-600 font-medium">Status</dt>
                    <dd className="text-amber-900">{d.status}</dd>
                  </div>
                )}
                {d.area_of_operation && (
                  <div>
                    <dt className="text-amber-600 font-medium">Area of Operation</dt>
                    <dd className="text-amber-900">{d.area_of_operation}</dd>
                  </div>
                )}
                {orgContactName && (
                  <div>
                    <dt className="text-amber-600 font-medium">Contact</dt>
                    <dd className="text-amber-900">
                      {orgContactId ? (
                        <Link href={`/profiles/${orgContactId}`} className="hover:underline">
                          {orgContactName}
                        </Link>
                      ) : (
                        orgContactName
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            ) : orgContactName ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-amber-600 font-medium">Contact</dt>
                  <dd className="text-amber-900">
                    {orgContactId ? (
                      <Link href={`/profiles/${orgContactId}`} className="hover:underline">
                        {orgContactName}
                      </Link>
                    ) : (
                      orgContactName
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-amber-600 text-sm italic">No organization info has been added yet.</p>
            )}
          </Card>
        )}

        {/* Relationships (character only) */}
        {isCharacter && (
          <Card className="p-6 bg-white border-amber-300 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-amber-800" />
              <h2 className="text-xl font-bold text-amber-900">Relationships</h2>
            </div>

            {relationshipsLoading ? (
              <p className="text-amber-600 text-sm">Loading relationships…</p>
            ) : relationships.length === 0 ? (
              <p className="text-amber-600 text-sm italic">No relationships have been added yet.</p>
            ) : (
              <div className="space-y-6">
                {(
                  [
                    { label: 'Friends', color: 'text-emerald-600', filter: (t: string) => t === 'friend' },
                    { label: 'Relatives', color: 'text-blue-600', filter: (t: string) => t === 'relative' },
                    {
                      label: 'Rivals & Enemies',
                      color: 'text-red-600',
                      filter: (t: string) => t === 'rival' || t === 'enemy',
                    },
                  ] as const
                ).map(({ label: groupLabel, color, filter }) => {
                  const group = relationships.filter((r) => filter(r.type_name));
                  if (group.length === 0) return null;
                  return (
                    <div key={groupLabel}>
                      <h3 className={`text-sm font-semibold mb-2 ${color}`}>{groupLabel}</h3>
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
          </Card>
        )}

        {/* Background / Description */}
        {(isCharacter || isKinship || isItem || isLocation || isOrganization) && (
          <Card className="p-8 bg-white border-amber-300 mb-6">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">
              {isCharacter ? 'Background' : (isKinship || isOrganization) ? 'Background / Description' : 'Description'}
            </h2>
            {d?.description ? (
              <div
                className="prose prose-amber max-w-none text-amber-800 [&_h2]:text-amber-900 [&_h3]:text-amber-900 [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-900 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-amber-700 [&_hr]:border-amber-200 [&_img]:rounded [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: d.description }}
              />
            ) : (
              <p className="text-amber-600 italic">No description has been added yet.</p>
            )}
          </Card>
        )}
        {!isCharacter && !isKinship && !isItem && !isLocation && !isOrganization && (
          <Card className="p-8 bg-white border-amber-300 mb-6">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">Details</h2>
            {d?.description ? (
              <div className="prose prose-amber max-w-none">
                <p className="text-amber-800 whitespace-pre-wrap">{d.description}</p>
              </div>
            ) : (
              <p className="text-amber-700 italic">No details have been added to this profile yet.</p>
            )}
          </Card>
        )}

        {/* ── Character bottom sections ───────────────────────────────────── */}
        {isCharacter && (
          <>
            {/* Owned Items */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
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
                <p className="text-amber-600 text-sm italic">No items owned by this character yet.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {items.map((item) => (
                    <ItemCard key={item.profile_id} item={item} />
                  ))}
                </div>
              )}
            </Card>

            {/* Gallery (art + media) */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Gallery</h2>
                </div>
                <Link
                  href={`/profiles/${id}/gallery`}
                  className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {galleryLoading ? (
                <p className="text-amber-600 text-sm">Loading gallery…</p>
              ) : galleryPosts.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No art or media featuring this character yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryPosts.map((post) => (
                    <GalleryPostCard key={post.post_id} post={post} />
                  ))}
                </div>
              )}
            </Card>

            {/* Writing */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Writing</h2>
                </div>
                <Link
                  href={`/profiles/${id}/writing`}
                  className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {writingLoading ? (
                <p className="text-amber-600 text-sm">Loading writing…</p>
              ) : writingPosts.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No writing featuring this character yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {writingPosts.map((post) => (
                    <WritingPostCard key={post.post_id} post={post} />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── Kinship bottom sections ──────────────────────────────────────── */}
        {isKinship && (
          <>
            {/* Members */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-amber-800" />
                <h2 className="text-xl font-bold text-amber-900">Members</h2>
              </div>
              {membersLoading ? (
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
                      {profile.can_edit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(m.character_id)}
                          disabled={removingMemberId === m.character_id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          {removingMemberId === m.character_id ? '…' : <X className="w-4 h-4" />}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Gallery (art + media) */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Gallery</h2>
                </div>
                <Link
                  href={`/profiles/${id}/gallery`}
                  className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {galleryLoading ? (
                <p className="text-amber-600 text-sm">Loading gallery…</p>
              ) : galleryPosts.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No art or media featuring this kinship yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryPosts.map((post) => (
                    <GalleryPostCard key={post.post_id} post={post} />
                  ))}
                </div>
              )}
            </Card>

            {/* Writing */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Writing</h2>
                </div>
                <Link
                  href={`/profiles/${id}/writing`}
                  className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {writingLoading ? (
                <p className="text-amber-600 text-sm">Loading writing…</p>
              ) : writingPosts.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No writing featuring this kinship yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {writingPosts.map((post) => (
                    <WritingPostCard key={post.post_id} post={post} />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── Organization bottom sections ─────────────────────────────────── */}
        {isOrganization && (
          <>
            {/* Gallery */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Gallery</h2>
                </div>
                <Link href={`/profiles/${id}/gallery`} className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors">
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              {galleryLoading ? (
                <p className="text-amber-600 text-sm">Loading gallery…</p>
              ) : galleryPosts.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No art or media featuring this organization yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryPosts.map((post) => (
                    <GalleryPostCard key={post.post_id} post={post} />
                  ))}
                </div>
              )}
            </Card>

            {/* Writing */}
            <Card className="p-6 bg-white border-amber-300 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-800" />
                  <h2 className="text-xl font-bold text-amber-900">Writing</h2>
                </div>
                <Link href={`/profiles/${id}/writing`} className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors">
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              {writingLoading ? (
                <p className="text-amber-600 text-sm">Loading writing…</p>
              ) : writingPosts.length === 0 ? (
                <p className="text-amber-600 text-sm italic">No writing featuring this organization yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {writingPosts.map((post) => (
                    <WritingPostCard key={post.post_id} post={post} />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── Item / Location gallery ──────────────────────────────────────── */}
        {(isItem || isLocation) && (
          <Card className="p-6 bg-white border-amber-300 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-800" />
                <h2 className="text-xl font-bold text-amber-900">Gallery</h2>
              </div>
              <Link
                href={`/profiles/${id}/gallery`}
                className="inline-flex items-center text-sm text-amber-700 hover:text-amber-900 transition-colors"
              >
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {galleryLoading ? (
              <p className="text-amber-600 text-sm">Loading gallery…</p>
            ) : galleryPosts.length === 0 ? (
              <p className="text-amber-600 text-sm italic">
                {isItem ? 'No art or media featuring this item yet.' : 'No art or media featuring this location yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryPosts.map((post) => (
                  <GalleryPostCard key={post.post_id} post={post} />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Editors Section */}
        <Card className="p-8 bg-white border-amber-300 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-800" />
              <h2 className="text-2xl font-bold text-amber-900">Editors</h2>
            </div>
            {profile.is_owner && (
              <Button
                onClick={() => {
                  setEditorError(null);
                  setNewEditorUsername('');
                  setShowAddEditorDialog(true);
                }}
                className="bg-amber-800 text-amber-50 hover:bg-amber-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Editor
              </Button>
            )}
          </div>

          {editors.length === 0 ? (
            <p className="text-amber-700 italic">No editors have been added to this profile yet.</p>
          ) : (
            <ul className="space-y-3">
              {editors.map((editor) => (
                <li
                  key={editor.editor_id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div>
                    <span className="font-medium text-amber-900">{editor.username}</span>
                    {editor.invited_by_username && (
                      <span className="text-sm text-amber-600 ml-2">(invited by {editor.invited_by_username})</span>
                    )}
                  </div>
                  {(profile.is_owner || profile.can_edit) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEditor(editor.editor_id)}
                      disabled={removingEditorId === editor.editor_id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {removingEditorId === editor.editor_id ? 'Removing…' : <X className="w-4 h-4" />}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Add Editor Dialog */}
      <Dialog open={showAddEditorDialog} onOpenChange={setShowAddEditorDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Add Editor</DialogTitle>
            <DialogDescription className="text-amber-700">
              Enter the username of the person you want to invite as an editor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Username"
              value={newEditorUsername}
              onChange={(e) => {
                setNewEditorUsername(e.target.value);
                setEditorError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAddingEditor) handleAddEditor();
              }}
              className="border-amber-300 focus:border-amber-500"
            />
            {editorError && <p className="text-red-600 text-sm mt-2">{editorError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddEditorDialog(false)}
              disabled={isAddingEditor}
              className="border-amber-600 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEditor}
              disabled={isAddingEditor || !newEditorUsername.trim()}
              className="bg-amber-800 text-amber-50 hover:bg-amber-700"
            >
              {isAddingEditor ? 'Adding…' : 'Add Editor'}
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
