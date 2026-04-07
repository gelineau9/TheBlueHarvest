'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface AdminUser {
  account_id: number;
  username: string;
  email: string;
  role_name: string;
  user_role_id: number;
  is_banned: boolean;
  banned_reason: string | null;
  suspended_until: string | null;
  deleted: boolean;
  created_at: string;
}

interface UserContent {
  posts: { post_id: number; title: string; deleted: boolean; created_at: string }[];
  profiles: { profile_id: number; name: string; deleted: boolean; created_at: string }[];
  comments: { comment_id: number; content: string; is_deleted: boolean; created_at: string }[];
}

function RoleBadge({ roleId, roleName }: { roleId: number; roleName: string }) {
  const styles: Record<number, string> = {
    2: 'bg-amber-800 text-amber-50 text-xs px-2 py-0.5 rounded-full',
    3: 'bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full',
    1: 'bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full',
  };
  return <span className={styles[roleId] ?? styles[1]}>{roleName}</span>;
}

function isSuspended(until: string | null): boolean {
  if (!until) return false;
  return new Date(until) > new Date();
}

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [joinedAfter, setJoinedAfter] = useState('');
  const [joinedBefore, setJoinedBefore] = useState('');

  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  const [banReason, setBanReason] = useState('');
  const [suspendingUserId, setSuspendingUserId] = useState<number | null>(null);
  const [suspendUntil, setSuspendUntil] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [expandedContentId, setExpandedContentId] = useState<number | null>(null);
  const [userContent, setUserContent] = useState<Record<number, UserContent>>({});
  const [contentLoading, setContentLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    async (
      currentOffset: number,
      currentSearch: string,
      replace: boolean,
      role: string,
      status: string,
      after: string,
      before: string,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '20', offset: String(currentOffset) });
        if (currentSearch) params.set('search', currentSearch);
        if (role) params.set('role', role);
        if (status) params.set('status', status);
        if (after) params.set('joined_after', after);
        if (before) params.set('joined_before', before);

        const res = await fetch(`/api/admin/users?${params}`);
        if (res.status === 403) {
          setError('You do not have permission to view this page.');
          return;
        }
        if (!res.ok) {
          setError('Failed to load users.');
          return;
        }
        const data = await res.json();
        setUsers((prev) => (replace ? data.users : [...prev, ...data.users]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setOffset(currentOffset + data.users.length);
      } catch {
        setError('Failed to load users.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const refresh = useCallback(
    (newOffset = 0, replace = true) =>
      fetchUsers(newOffset, search, replace, filterRole, filterStatus, joinedAfter, joinedBefore),
    [fetchUsers, search, filterRole, filterStatus, joinedAfter, joinedBefore],
  );

  useEffect(() => {
    fetchUsers(0, '', true, '', '', '', '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setOffset(0);
      fetchUsers(0, value, true, filterRole, filterStatus, joinedAfter, joinedBefore);
    }, 300);
  }

  function handleFilterChange(role: string, status: string, after: string, before: string) {
    setOffset(0);
    fetchUsers(0, search, true, role, status, after, before);
  }

  async function handleRoleChange(accountId: number, roleId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to change role.');
        return;
      }
      refresh();
    } catch {
      setActionError('Failed to change role.');
    }
  }

  async function handleBan(accountId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banned: true, banned_reason: banReason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to ban user.');
        return;
      }
      setBanningUserId(null);
      setBanReason('');
      refresh();
    } catch {
      setActionError('Failed to ban user.');
    }
  }

  async function handleUnban(accountId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banned: false }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to unban user.');
        return;
      }
      refresh();
    } catch {
      setActionError('Failed to unban user.');
    }
  }

  async function handleSuspend(accountId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended_until: suspendUntil || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to suspend user.');
        return;
      }
      setSuspendingUserId(null);
      setSuspendUntil('');
      refresh();
    } catch {
      setActionError('Failed to suspend user.');
    }
  }

  async function handleUnsuspend(accountId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended_until: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to unsuspend user.');
        return;
      }
      refresh();
    } catch {
      setActionError('Failed to unsuspend user.');
    }
  }

  async function handleDeleteAccount(accountId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${accountId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to delete account.');
        return;
      }
      setDeletingUserId(null);
      refresh();
    } catch {
      setActionError('Failed to delete account.');
    }
  }

  async function handleViewContent(accountId: number) {
    if (expandedContentId === accountId) {
      setExpandedContentId(null);
      return;
    }
    setExpandedContentId(accountId);
    if (userContent[accountId]) return;
    setContentLoading(accountId);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/content`);
      if (!res.ok) return;
      const data = await res.json();
      setUserContent((prev) => ({ ...prev, [accountId]: data }));
    } finally {
      setContentLoading(null);
    }
  }

  async function handleDeletePost(postId: number, forUserId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to delete post.');
        return;
      }
      setUserContent((prev) => ({
        ...prev,
        [forUserId]: {
          ...prev[forUserId],
          posts: prev[forUserId].posts.map((p) => (p.post_id === postId ? { ...p, deleted: true } : p)),
        },
      }));
    } catch {
      setActionError('Failed to delete post.');
    }
  }

  async function handleDeleteProfile(profileId: number, forUserId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to delete profile.');
        return;
      }
      setUserContent((prev) => ({
        ...prev,
        [forUserId]: {
          ...prev[forUserId],
          profiles: prev[forUserId].profiles.map((p) => (p.profile_id === profileId ? { ...p, deleted: true } : p)),
        },
      }));
    } catch {
      setActionError('Failed to delete profile.');
    }
  }

  async function handleDeleteComment(commentId: number, forUserId: number) {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to delete comment.');
        return;
      }
      setUserContent((prev) => ({
        ...prev,
        [forUserId]: {
          ...prev[forUserId],
          comments: prev[forUserId].comments.map((c) => (c.comment_id === commentId ? { ...c, is_deleted: true } : c)),
        },
      }));
    } catch {
      setActionError('Failed to delete comment.');
    }
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  const colSpan = isAdmin ? 7 : 5;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-amber-300 rounded px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            handleFilterChange(e.target.value, filterStatus, joinedAfter, joinedBefore);
          }}
          className="border border-amber-300 rounded px-2 py-1.5 text-sm bg-white text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">All roles</option>
          <option value="1">User</option>
          <option value="2">Admin</option>
          <option value="3">Moderator</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            handleFilterChange(filterRole, e.target.value, joinedAfter, joinedBefore);
          }}
          className="border border-amber-300 rounded px-2 py-1.5 text-sm bg-white text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-amber-700">
          From:
          <input
            type="date"
            value={joinedAfter}
            onChange={(e) => {
              setJoinedAfter(e.target.value);
              handleFilterChange(filterRole, filterStatus, e.target.value, joinedBefore);
            }}
            className="border border-amber-300 rounded px-2 py-1.5 text-sm bg-white text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-amber-700">
          To:
          <input
            type="date"
            value={joinedBefore}
            onChange={(e) => {
              setJoinedBefore(e.target.value);
              handleFilterChange(filterRole, filterStatus, joinedAfter, e.target.value);
            }}
            className="border border-amber-300 rounded px-2 py-1.5 text-sm bg-white text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>
        <p className="ml-auto text-sm text-amber-700 self-center">
          {total} user{total !== 1 ? 's' : ''}
        </p>
      </div>

      {actionError && <p className="text-red-600 text-sm mb-3">{actionError}</p>}

      <div className="overflow-x-auto rounded-lg border border-amber-300">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 border-b border-amber-300">
            <tr>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Username</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Role</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Status</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Joined</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Content</th>
              {isAdmin && (
                <>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Suspend</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <>
                <tr key={user.account_id} className="border-b border-amber-100 last:border-0">
                  <td className="px-4 py-2 text-amber-900 font-medium">
                    {user.username}
                    {user.deleted && <span className="ml-2 text-xs text-amber-500 italic">(deleted)</span>}
                  </td>
                  <td className="px-4 py-2">
                    {isAdmin && !user.deleted ? (
                      <select
                        value={user.user_role_id}
                        onChange={(e) => handleRoleChange(user.account_id, parseInt(e.target.value))}
                        className="text-sm border border-amber-300 rounded px-2 py-1 bg-white text-amber-800"
                      >
                        <option value={1}>User</option>
                        <option value={2}>Admin</option>
                        <option value={3}>Moderator</option>
                      </select>
                    ) : (
                      <RoleBadge roleId={user.user_role_id} roleName={user.role_name} />
                    )}
                  </td>
                  <td className="px-4 py-2 flex flex-wrap gap-1">
                    {user.is_banned && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Banned</span>
                    )}
                    {isSuspended(user.suspended_until) && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">Suspended</span>
                    )}
                    {!user.is_banned && !isSuspended(user.suspended_until) && !user.deleted && (
                      <span className="text-xs text-amber-500">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-amber-600">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleViewContent(user.account_id)}
                      className="text-xs text-amber-700 hover:underline"
                    >
                      {expandedContentId === user.account_id ? 'Hide' : 'View'}
                    </button>
                  </td>
                  {isAdmin && (
                    <>
                      <td className="px-4 py-2">
                        {isSuspended(user.suspended_until) ? (
                          <button
                            onClick={() => handleUnsuspend(user.account_id)}
                            className="text-xs text-green-700 hover:underline"
                          >
                            Lift
                          </button>
                        ) : (
                          !user.deleted && (
                            <button
                              onClick={() => {
                                setSuspendingUserId(user.account_id);
                                setSuspendUntil('');
                              }}
                              className="text-xs text-orange-700 hover:underline"
                            >
                              Suspend
                            </button>
                          )
                        )}
                      </td>
                      <td className="px-4 py-2 flex flex-wrap gap-2">
                        {!user.deleted && (
                          <>
                            {user.is_banned ? (
                              <button
                                onClick={() => handleUnban(user.account_id)}
                                className="text-xs text-green-700 hover:underline"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setBanningUserId(user.account_id);
                                  setBanReason('');
                                }}
                                className="text-xs text-red-700 hover:underline"
                              >
                                Ban
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingUserId(user.account_id)}
                              className="text-xs text-red-900 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </>
                  )}
                </tr>

                {/* Suspend picker */}
                {isAdmin && suspendingUserId === user.account_id && (
                  <tr key={`suspend-${user.account_id}`} className="bg-orange-50 border-b border-amber-100">
                    <td colSpan={colSpan} className="px-4 py-3">
                      <p className="text-xs text-orange-700 font-medium mb-2">
                        Suspend <strong>{user.username}</strong> until:
                      </p>
                      <input
                        type="datetime-local"
                        value={suspendUntil}
                        onChange={(e) => setSuspendUntil(e.target.value)}
                        className="border border-orange-300 rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSuspend(user.account_id)}
                          disabled={!suspendUntil}
                          className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 disabled:opacity-50"
                        >
                          Confirm Suspend
                        </button>
                        <button
                          onClick={() => setSuspendingUserId(null)}
                          className="text-xs text-amber-700 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Ban reason picker */}
                {isAdmin && banningUserId === user.account_id && (
                  <tr key={`ban-${user.account_id}`} className="bg-red-50 border-b border-amber-100">
                    <td colSpan={colSpan} className="px-4 py-3">
                      <p className="text-xs text-red-700 font-medium mb-2">
                        Ban reason for <strong>{user.username}</strong>:
                      </p>
                      <textarea
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Optional reason..."
                        rows={2}
                        className="w-full border border-red-300 rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-red-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBan(user.account_id)}
                          className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Confirm Ban
                        </button>
                        <button
                          onClick={() => setBanningUserId(null)}
                          className="text-xs text-amber-700 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Delete account confirm */}
                {isAdmin && deletingUserId === user.account_id && (
                  <tr key={`delete-${user.account_id}`} className="bg-red-50 border-b border-amber-100">
                    <td colSpan={colSpan} className="px-4 py-3">
                      <p className="text-xs text-red-700 font-medium mb-2">
                        Soft-delete account <strong>{user.username}</strong> and all their content? This cannot be
                        undone from the UI.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteAccount(user.account_id)}
                          className="text-xs bg-red-700 text-white px-3 py-1 rounded hover:bg-red-800"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeletingUserId(null)}
                          className="text-xs text-amber-700 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* User content panel */}
                {expandedContentId === user.account_id && (
                  <tr key={`content-${user.account_id}`} className="bg-amber-50 border-b border-amber-200">
                    <td colSpan={colSpan} className="px-4 py-3">
                      {contentLoading === user.account_id ? (
                        <p className="text-xs text-amber-600">Loading content...</p>
                      ) : userContent[user.account_id] ? (
                        <div className="space-y-3">
                          {/* Posts */}
                          <div>
                            <p className="text-xs font-semibold text-amber-800 mb-1">
                              Posts ({userContent[user.account_id].posts.length})
                            </p>
                            {userContent[user.account_id].posts.length === 0 ? (
                              <p className="text-xs text-amber-500">None.</p>
                            ) : (
                              <ul className="space-y-1">
                                {userContent[user.account_id].posts.map((p) => (
                                  <li key={p.post_id} className="flex items-center justify-between text-xs">
                                    <span className={p.deleted ? 'line-through text-amber-400' : 'text-amber-900'}>
                                      #{p.post_id} — {p.title}
                                    </span>
                                    {!p.deleted && (
                                      <button
                                        onClick={() => handleDeletePost(p.post_id, user.account_id)}
                                        className="text-red-600 hover:underline ml-4"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {/* Profiles */}
                          <div>
                            <p className="text-xs font-semibold text-amber-800 mb-1">
                              Profiles ({userContent[user.account_id].profiles.length})
                            </p>
                            {userContent[user.account_id].profiles.length === 0 ? (
                              <p className="text-xs text-amber-500">None.</p>
                            ) : (
                              <ul className="space-y-1">
                                {userContent[user.account_id].profiles.map((p) => (
                                  <li key={p.profile_id} className="flex items-center justify-between text-xs">
                                    <span className={p.deleted ? 'line-through text-amber-400' : 'text-amber-900'}>
                                      #{p.profile_id} — {p.name}
                                    </span>
                                    {!p.deleted && (
                                      <button
                                        onClick={() => handleDeleteProfile(p.profile_id, user.account_id)}
                                        className="text-red-600 hover:underline ml-4"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {/* Comments */}
                          <div>
                            <p className="text-xs font-semibold text-amber-800 mb-1">
                              Comments ({userContent[user.account_id].comments.length})
                            </p>
                            {userContent[user.account_id].comments.length === 0 ? (
                              <p className="text-xs text-amber-500">None.</p>
                            ) : (
                              <ul className="space-y-1">
                                {userContent[user.account_id].comments.map((c) => (
                                  <li key={c.comment_id} className="flex items-center justify-between text-xs">
                                    <span className={c.is_deleted ? 'line-through text-amber-400' : 'text-amber-900'}>
                                      #{c.comment_id} — {c.content.slice(0, 80)}
                                      {c.content.length > 80 ? '…' : ''}
                                    </span>
                                    {!c.is_deleted && (
                                      <button
                                        onClick={() => handleDeleteComment(c.comment_id, user.account_id)}
                                        className="text-red-600 hover:underline ml-4"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-500">No content data.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading && <p className="text-sm text-amber-700 mt-3">Loading...</p>}

      {hasMore && !isLoading && (
        <button
          onClick={() => fetchUsers(offset, search, false, filterRole, filterStatus, joinedAfter, joinedBefore)}
          className="mt-4 text-sm text-amber-800 hover:underline"
        >
          Load more
        </button>
      )}
    </div>
  );
}
