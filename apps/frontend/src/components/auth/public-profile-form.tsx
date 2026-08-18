'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth/auth-provider';

const MAX_BIO = 500;
const MAX_FEATURED = 4;

interface OwnCollection {
  collection_id: number;
  title: string;
  type_name: string;
}

/**
 * Public profile editor — banner, a short bio, and up to four featured
 * collections. Deliberately small: the point is to let members show who they
 * are and what they have made, not to build a page builder.
 */
export function PublicProfileForm() {
  const { username } = useAuth();

  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFilename, setBannerFilename] = useState<string | null>(null);
  const [featured, setFeatured] = useState<number[]>([]);
  const [collections, setCollections] = useState<OwnCollection[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Seed from the caller's own public profile, plus the collections they own
  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, collRes] = await Promise.all([
          username ? fetch(`/api/users/public/${encodeURIComponent(username)}`) : Promise.resolve(null),
          fetch('/api/users/me/collections?limit=100'),
        ]);

        if (meRes && meRes.ok) {
          const me = await meRes.json();
          setBio(me.bio ?? '');
          setBannerUrl(me.banner_url ?? null);
          setFeatured((me.featured_collections ?? []).map((c: { collection_id: number }) => c.collection_id));
        }
        if (collRes.ok) {
          const data = await collRes.json();
          setCollections(data.collections ?? data.items ?? []);
        }
      } catch {
        setMessage({ kind: 'error', text: 'Could not load your profile.' });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [username]);

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const res = await fetch('/api/uploads/images', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.files?.[0]?.url) {
        setMessage({ kind: 'error', text: data.error || 'Banner upload failed.' });
        return;
      }
      setBannerUrl(data.files[0].url);
      setBannerFilename(data.files[0].filename ?? file.name);
    } catch {
      setMessage({ kind: 'error', text: 'Banner upload failed.' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const toggleFeatured = (collectionId: number) => {
    setFeatured((prev) =>
      prev.includes(collectionId)
        ? prev.filter((cid) => cid !== collectionId)
        : prev.length >= MAX_FEATURED
          ? prev
          : [...prev, collectionId],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio.trim() || null,
          banner: bannerUrl ? { url: bannerUrl, filename: bannerFilename ?? 'banner' } : null,
          featuredCollections: featured,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ kind: 'error', text: data.error || 'Could not save your profile.' });
        return;
      }
      setMessage({ kind: 'ok', text: 'Profile saved.' });
    } catch {
      setMessage({ kind: 'error', text: 'Could not save your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-amber-700 italic">Loading your profile...</p>;
  }

  return (
    <Card className="border-amber-300 bg-white/80 p-6">
      <h2 className="mb-1 font-fantasy text-xl font-semibold text-amber-900">Public profile</h2>
      <p className="mb-6 text-sm text-amber-700">
        This is what other members see at{' '}
        {username ? (
          <Link href={`/users/${username}`} className="text-amber-800 underline hover:text-amber-900">
            /users/{username}
          </Link>
        ) : (
          'your profile page'
        )}
        .
      </p>

      {/* Banner */}
      <div className="mb-6 space-y-2">
        <Label className="text-amber-900 font-semibold">Header image</Label>
        {bannerUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- user upload, no fixed size */}
            <img src={bannerUrl} alt="Your header" className="h-32 w-full rounded-md object-cover" />
            <Button
              type="button"
              onClick={() => {
                setBannerUrl(null);
                setBannerFilename(null);
              }}
              size="icon"
              variant="ghost"
              aria-label="Remove header image"
              className="absolute right-2 top-2 bg-white/80 text-red-600 hover:bg-white hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-amber-300 p-6 text-sm text-amber-700 hover:border-amber-500 hover:bg-amber-50">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? 'Uploading...' : 'Upload a header image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
          </label>
        )}
      </div>

      {/* Bio */}
      <div className="mb-6 space-y-2">
        <Label htmlFor="bio" className="text-amber-900 font-semibold">
          About you
        </Label>
        <Textarea
          id="bio"
          value={bio}
          maxLength={MAX_BIO}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What you write, what you draw, who you play — whatever you would want another member to know."
          className="min-h-28 border-amber-300 bg-white focus:border-amber-600 focus:ring-amber-600"
        />
        <p className="text-xs text-amber-600">
          {bio.length}/{MAX_BIO} characters
        </p>
      </div>

      {/* Featured collections */}
      <div className="space-y-2">
        <Label className="text-amber-900 font-semibold">Featured collections</Label>
        <p className="text-sm text-amber-700">
          Choose up to {MAX_FEATURED} to show on your profile. {featured.length}/{MAX_FEATURED} selected.
        </p>

        {collections.length === 0 ? (
          <p className="text-sm text-amber-600 italic">
            You have no collections yet.{' '}
            <Link href="/collections/create" className="text-amber-700 underline">
              Create one
            </Link>{' '}
            to feature it here.
          </p>
        ) : (
          <ul className="space-y-2">
            {collections.map((collection) => {
              const checked = featured.includes(collection.collection_id);
              const atLimit = !checked && featured.length >= MAX_FEATURED;
              return (
                <li key={collection.collection_id}>
                  <label
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      checked ? 'border-amber-500 bg-amber-100/70' : 'border-amber-200 bg-amber-50'
                    } ${atLimit ? 'opacity-50' : 'cursor-pointer hover:border-amber-400'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atLimit}
                      onChange={() => toggleFeatured(collection.collection_id)}
                      className="h-4 w-4 accent-amber-800"
                    />
                    <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-700" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-amber-900">
                      {collection.title}
                    </span>
                    <span className="flex-shrink-0 text-xs text-amber-600">{collection.type_name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
          {isSaving ? 'Saving...' : 'Save profile'}
        </Button>
        {message && (
          <p className={`text-sm ${message.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>
        )}
      </div>
    </Card>
  );
}
