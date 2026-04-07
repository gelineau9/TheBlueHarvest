'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface Post {
  post_id: number;
  title: string;
  post_type_id: number;
  username: string;
  created_at: string;
}

interface Profile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  username: string;
  created_at: string;
}

const POST_TYPE_LABELS: Record<number, string> = {
  1: 'Writing',
  2: 'Art',
  3: 'Resource',
};

const PROFILE_TYPE_LABELS: Record<number, string> = {
  1: 'Character',
  2: 'Item',
  3: 'Kinship',
  4: 'Organisation',
  5: 'Location',
};

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">{label}</span>
  );
}

export default function AdminModerationPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'profiles'>('posts');

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<number | null>(null);

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesOffset, setProfilesOffset] = useState(0);
  const [profilesHasMore, setProfilesHasMore] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<number | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (currentOffset: number, replace: boolean) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/posts/public?limit=20&offset=${currentOffset}`);
      if (!res.ok) return;
      const data = await res.json();
      const newPosts: Post[] = (data.posts ?? []).map((p: Record<string, unknown>) => ({
        post_id: p.post_id,
        title: p.title,
        post_type_id: p.post_type_id,
        username: p.username ?? p.author_username ?? '',
        created_at: p.created_at,
      }));
      setPosts((prev) => (replace ? newPosts : [...prev, ...newPosts]));
      setPostsHasMore(data.hasMore ?? false);
      setPostsOffset(currentOffset + newPosts.length);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const fetchProfiles = useCallback(async (currentOffset: number, replace: boolean) => {
    setProfilesLoading(true);
    try {
      const res = await fetch(`/api/profiles/public?limit=20&offset=${currentOffset}`);
      if (!res.ok) return;
      const data = await res.json();
      const newProfiles: Profile[] = (data.profiles ?? []).map((p: Record<string, unknown>) => ({
        profile_id: p.profile_id,
        name: p.name,
        profile_type_id: p.profile_type_id,
        username: p.username ?? p.account_username ?? '',
        created_at: p.created_at,
      }));
      setProfiles((prev) => (replace ? newProfiles : [...prev, ...newProfiles]));
      setProfilesHasMore(data.hasMore ?? false);
      setProfilesOffset(currentOffset + newProfiles.length);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  useEffect(() => {
    if (activeTab === 'profiles' && profiles.length === 0) {
      fetchProfiles(0, true);
    }
  }, [activeTab, profiles.length, fetchProfiles]);

  async function handleDeletePost(postId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to delete post.');
        return;
      }
      setPosts((prev) => prev.filter((p) => p.post_id !== postId));
      setConfirmDeletePostId(null);
    } catch {
      setActionError('Failed to delete post.');
    }
  }

  async function handleDeleteProfile(profileId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to delete profile.');
        return;
      }
      setProfiles((prev) => prev.filter((p) => p.profile_id !== profileId));
      setConfirmDeleteProfileId(null);
    } catch {
      setActionError('Failed to delete profile.');
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['posts', 'profiles'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md border transition-colors ${
              activeTab === tab
                ? 'bg-amber-800 text-amber-50 border-amber-800'
                : 'text-amber-800 border-amber-300 hover:bg-amber-100/80'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {actionError && <p className="text-red-600 text-sm mb-3">{actionError}</p>}

      {activeTab === 'posts' && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-amber-300">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-300">
                <tr>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Title</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Author</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <>
                    <tr key={post.post_id} className="border-b border-amber-100 last:border-0">
                      <td className="px-4 py-2 text-amber-900 font-medium">{post.title}</td>
                      <td className="px-4 py-2">
                        <TypeBadge
                          label={POST_TYPE_LABELS[post.post_type_id] ?? `Type ${post.post_type_id}`}
                        />
                      </td>
                      <td className="px-4 py-2 text-amber-700">{post.username}</td>
                      <td className="px-4 py-2 text-xs text-amber-600">
                        {new Date(post.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setConfirmDeletePostId(post.post_id)}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {confirmDeletePostId === post.post_id && (
                      <tr key={`confirm-post-${post.post_id}`} className="bg-red-50 border-b border-amber-100">
                        <td colSpan={5} className="px-4 py-3">
                          <p className="text-xs text-red-700 mb-2">
                            {isAdmin
                              ? 'This will hard-delete this post permanently. Are you sure?'
                              : 'This will soft-delete this post. Are you sure?'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeletePost(post.post_id)}
                              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeletePostId(null)}
                              className="text-xs text-amber-700 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {postsLoading && <p className="text-sm text-amber-700 mt-3">Loading...</p>}
          {postsHasMore && !postsLoading && (
            <button
              onClick={() => fetchPosts(postsOffset, false)}
              className="mt-4 text-sm text-amber-800 hover:underline"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {activeTab === 'profiles' && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-amber-300">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-300">
                <tr>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Name</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Account</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <>
                    <tr key={profile.profile_id} className="border-b border-amber-100 last:border-0">
                      <td className="px-4 py-2 text-amber-900 font-medium">{profile.name}</td>
                      <td className="px-4 py-2">
                        <TypeBadge
                          label={
                            PROFILE_TYPE_LABELS[profile.profile_type_id] ??
                            `Type ${profile.profile_type_id}`
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-amber-700">{profile.username}</td>
                      <td className="px-4 py-2 text-xs text-amber-600">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setConfirmDeleteProfileId(profile.profile_id)}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {confirmDeleteProfileId === profile.profile_id && (
                      <tr
                        key={`confirm-profile-${profile.profile_id}`}
                        className="bg-red-50 border-b border-amber-100"
                      >
                        <td colSpan={5} className="px-4 py-3">
                          <p className="text-xs text-red-700 mb-2">
                            {isAdmin
                              ? 'This will hard-delete this profile permanently. Are you sure?'
                              : 'This will soft-delete this profile. Are you sure?'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteProfile(profile.profile_id)}
                              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteProfileId(null)}
                              className="text-xs text-amber-700 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {profilesLoading && <p className="text-sm text-amber-700 mt-3">Loading...</p>}
          {profilesHasMore && !profilesLoading && (
            <button
              onClick={() => fetchProfiles(profilesOffset, false)}
              className="mt-4 text-sm text-amber-800 hover:underline"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
