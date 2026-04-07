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

interface DeletedPost extends Post {
  deleted: boolean;
}

interface Profile {
  profile_id: number;
  name: string;
  profile_type_id: number;
  username: string;
  created_at: string;
}

interface DeletedProfile extends Profile {
  deleted: boolean;
}

interface FeaturedPost {
  featured_post_id: number;
  post_id: number;
  title: string;
  display_order: number;
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

type ActiveTab = 'posts' | 'profiles' | 'deleted' | 'featured';

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">{label}</span>
  );
}

export default function AdminModerationPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('posts');

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<number | null>(null);

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesOffset, setProfilesOffset] = useState(0);
  const [profilesHasMore, setProfilesHasMore] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set());
  const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<number | null>(null);

  // Deleted content state
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([]);
  const [deletedProfiles, setDeletedProfiles] = useState<DeletedProfile[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  // Featured posts state
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featurePostId, setFeaturePostId] = useState('');
  const [featureOrder, setFeatureOrder] = useState('0');

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

  const fetchDeleted = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const [postsRes, profilesRes] = await Promise.all([
        fetch('/api/admin/deleted/posts'),
        fetch('/api/admin/deleted/profiles'),
      ]);
      if (postsRes.ok) {
        const data = await postsRes.json();
        setDeletedPosts(data.posts ?? []);
      }
      if (profilesRes.ok) {
        const data = await profilesRes.json();
        setDeletedProfiles(data.profiles ?? []);
      }
    } finally {
      setDeletedLoading(false);
    }
  }, []);

  const fetchFeatured = useCallback(async () => {
    setFeaturedLoading(true);
    try {
      const res = await fetch('/api/admin/featured-posts');
      if (res.ok) {
        const data = await res.json();
        setFeaturedPosts(data.featured_posts ?? []);
      }
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  useEffect(() => {
    if (activeTab === 'profiles' && profiles.length === 0) {
      fetchProfiles(0, true);
    }
    if (activeTab === 'deleted') {
      fetchDeleted();
    }
    if (activeTab === 'featured') {
      fetchFeatured();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Single delete --

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
      setSelectedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
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
      setSelectedProfiles((prev) => { const n = new Set(prev); n.delete(profileId); return n; });
      setConfirmDeleteProfileId(null);
    } catch {
      setActionError('Failed to delete profile.');
    }
  }

  // -- Bulk delete --

  async function handleBulkDeletePosts() {
    if (selectedPosts.size === 0) return;
    setActionError(null);
    try {
      const res = await fetch('/api/admin/posts/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedPosts) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Bulk delete failed.');
        return;
      }
      setPosts((prev) => prev.filter((p) => !selectedPosts.has(p.post_id)));
      setSelectedPosts(new Set());
    } catch {
      setActionError('Bulk delete failed.');
    }
  }

  async function handleBulkDeleteProfiles() {
    if (selectedProfiles.size === 0) return;
    setActionError(null);
    try {
      const res = await fetch('/api/admin/profiles/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedProfiles) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Bulk delete failed.');
        return;
      }
      setProfiles((prev) => prev.filter((p) => !selectedProfiles.has(p.profile_id)));
      setSelectedProfiles(new Set());
    } catch {
      setActionError('Bulk delete failed.');
    }
  }

  // -- Restore --

  async function handleRestorePost(postId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/restore`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to restore post.');
        return;
      }
      setDeletedPosts((prev) => prev.filter((p) => p.post_id !== postId));
    } catch {
      setActionError('Failed to restore post.');
    }
  }

  async function handleRestoreProfile(profileId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}/restore`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to restore profile.');
        return;
      }
      setDeletedProfiles((prev) => prev.filter((p) => p.profile_id !== profileId));
    } catch {
      setActionError('Failed to restore profile.');
    }
  }

  // -- Featured posts --

  async function handleFeaturePost(e: React.FormEvent) {
    e.preventDefault();
    const postId = parseInt(featurePostId);
    if (!postId) return;
    setActionError(null);
    try {
      const res = await fetch('/api/admin/featured-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, display_order: parseInt(featureOrder) || 0 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to feature post.');
        return;
      }
      setFeaturePostId('');
      setFeatureOrder('0');
      fetchFeatured();
    } catch {
      setActionError('Failed to feature post.');
    }
  }

  async function handleUnfeaturePost(postId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/featured-posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to unfeature post.');
        return;
      }
      setFeaturedPosts((prev) => prev.filter((fp) => fp.post_id !== postId));
    } catch {
      setActionError('Failed to unfeature post.');
    }
  }

  // -- Checkbox helpers --

  function togglePost(id: number) {
    setSelectedPosts((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleProfile(id: number) {
    setSelectedProfiles((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAllPosts() {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((p) => p.post_id)));
    }
  }

  function toggleAllProfiles() {
    if (selectedProfiles.size === profiles.length) {
      setSelectedProfiles(new Set());
    } else {
      setSelectedProfiles(new Set(profiles.map((p) => p.profile_id)));
    }
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'profiles', label: 'Profiles' },
    { key: 'deleted', label: 'Deleted Content' },
    { key: 'featured', label: 'Featured Posts' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md border transition-colors ${
              activeTab === key
                ? 'bg-amber-800 text-amber-50 border-amber-800'
                : 'text-amber-800 border-amber-300 hover:bg-amber-100/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && <p className="text-red-600 text-sm mb-3">{actionError}</p>}

      {/* ── Posts tab ── */}
      {activeTab === 'posts' && (
        <div>
          {selectedPosts.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-2 bg-amber-50 border border-amber-200 rounded">
              <span className="text-sm text-amber-800">
                {selectedPosts.size} selected
              </span>
              <button
                onClick={handleBulkDeletePosts}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedPosts(new Set())}
                className="text-xs text-amber-700 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-amber-300">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-300">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={posts.length > 0 && selectedPosts.size === posts.length}
                      onChange={toggleAllPosts}
                      className="accent-amber-700"
                    />
                  </th>
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
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPosts.has(post.post_id)}
                          onChange={() => togglePost(post.post_id)}
                          className="accent-amber-700"
                        />
                      </td>
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
                        <td colSpan={6} className="px-4 py-3">
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

      {/* ── Profiles tab ── */}
      {activeTab === 'profiles' && (
        <div>
          {selectedProfiles.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-2 bg-amber-50 border border-amber-200 rounded">
              <span className="text-sm text-amber-800">
                {selectedProfiles.size} selected
              </span>
              <button
                onClick={handleBulkDeleteProfiles}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedProfiles(new Set())}
                className="text-xs text-amber-700 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-amber-300">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-300">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={profiles.length > 0 && selectedProfiles.size === profiles.length}
                      onChange={toggleAllProfiles}
                      className="accent-amber-700"
                    />
                  </th>
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
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProfiles.has(profile.profile_id)}
                          onChange={() => toggleProfile(profile.profile_id)}
                          className="accent-amber-700"
                        />
                      </td>
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
                        <td colSpan={6} className="px-4 py-3">
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

      {/* ── Deleted Content tab ── */}
      {activeTab === 'deleted' && (
        <div className="space-y-6">
          {deletedLoading && <p className="text-sm text-amber-700">Loading...</p>}

          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-2">
              Soft-deleted Posts ({deletedPosts.length})
            </h3>
            {deletedPosts.length === 0 && !deletedLoading ? (
              <p className="text-sm text-amber-500">None.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-amber-300">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 border-b border-amber-300">
                    <tr>
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Title</th>
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Author</th>
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Date</th>
                      {isAdmin && (
                        <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {deletedPosts.map((post) => (
                      <tr key={post.post_id} className="border-b border-amber-100 last:border-0">
                        <td className="px-4 py-2 text-amber-700 line-through">{post.title}</td>
                        <td className="px-4 py-2 text-amber-600">{post.username}</td>
                        <td className="px-4 py-2 text-xs text-amber-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRestorePost(post.post_id)}
                              className="text-xs text-green-700 hover:underline"
                            >
                              Restore
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-2">
              Soft-deleted Profiles ({deletedProfiles.length})
            </h3>
            {deletedProfiles.length === 0 && !deletedLoading ? (
              <p className="text-sm text-amber-500">None.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-amber-300">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 border-b border-amber-300">
                    <tr>
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Name</th>
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Account</th>
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Date</th>
                      {isAdmin && (
                        <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {deletedProfiles.map((profile) => (
                      <tr key={profile.profile_id} className="border-b border-amber-100 last:border-0">
                        <td className="px-4 py-2 text-amber-700 line-through">{profile.name}</td>
                        <td className="px-4 py-2 text-amber-600">{profile.username}</td>
                        <td className="px-4 py-2 text-xs text-amber-500">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRestoreProfile(profile.profile_id)}
                              className="text-xs text-green-700 hover:underline"
                            >
                              Restore
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Featured Posts tab ── */}
      {activeTab === 'featured' && (
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={handleFeaturePost} className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-amber-700">Post ID</label>
                <input
                  type="number"
                  min={1}
                  value={featurePostId}
                  onChange={(e) => setFeaturePostId(e.target.value)}
                  placeholder="e.g. 42"
                  className="border border-amber-300 rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-amber-700">Display Order</label>
                <input
                  type="number"
                  value={featureOrder}
                  onChange={(e) => setFeatureOrder(e.target.value)}
                  className="border border-amber-300 rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="bg-amber-800 text-amber-50 text-sm px-4 py-1.5 rounded hover:bg-amber-900 transition-colors"
              >
                Feature Post
              </button>
            </form>
          )}

          {featuredLoading && <p className="text-sm text-amber-700">Loading...</p>}

          {featuredPosts.length === 0 && !featuredLoading ? (
            <p className="text-sm text-amber-500">No featured posts yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-amber-300">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 border-b border-amber-300">
                  <tr>
                    <th className="text-left px-4 py-2 text-amber-700 font-medium">Order</th>
                    <th className="text-left px-4 py-2 text-amber-700 font-medium">Post ID</th>
                    <th className="text-left px-4 py-2 text-amber-700 font-medium">Title</th>
                    <th className="text-left px-4 py-2 text-amber-700 font-medium">Featured</th>
                    {isAdmin && (
                      <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {featuredPosts.map((fp) => (
                    <tr key={fp.featured_post_id} className="border-b border-amber-100 last:border-0">
                      <td className="px-4 py-2 text-amber-700">{fp.display_order}</td>
                      <td className="px-4 py-2 text-amber-700">
                        <a
                          href={`/posts/${fp.post_id}`}
                          className="text-amber-800 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          #{fp.post_id}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-amber-900 font-medium">{fp.title}</td>
                      <td className="px-4 py-2 text-xs text-amber-600">
                        {new Date(fp.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleUnfeaturePost(fp.post_id)}
                            className="text-xs text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
