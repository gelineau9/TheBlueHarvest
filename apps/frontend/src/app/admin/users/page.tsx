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
  created_at: string;
}

function RoleBadge({ roleId, roleName }: { roleId: number; roleName: string }) {
  const styles: Record<number, string> = {
    2: 'bg-amber-800 text-amber-50 text-xs px-2 py-0.5 rounded-full',
    3: 'bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full',
    1: 'bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full',
  };
  return <span className={styles[roleId] ?? styles[1]}>{roleName}</span>;
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
  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  const [banReason, setBanReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    async (currentOffset: number, currentSearch: string, replace: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          limit: '20',
          offset: String(currentOffset),
          ...(currentSearch ? { search: currentSearch } : {}),
        });
        const res = await fetch(`/api/admin/users?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
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

  useEffect(() => {
    fetchUsers(0, search, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setOffset(0);
      fetchUsers(0, value, true);
    }, 300);
  }

  async function handleRoleChange(accountId: number, roleId: number) {
    setActionError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${accountId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role_id: roleId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to change role.');
        return;
      }
      fetchUsers(0, search, true);
    } catch {
      setActionError('Failed to change role.');
    }
  }

  async function handleBan(accountId: number) {
    setActionError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${accountId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_banned: true, banned_reason: banReason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to ban user.');
        return;
      }
      setBanningUserId(null);
      setBanReason('');
      fetchUsers(0, search, true);
    } catch {
      setActionError('Failed to ban user.');
    }
  }

  async function handleUnban(accountId: number) {
    setActionError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${accountId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_banned: false }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Failed to unban user.');
        return;
      }
      fetchUsers(0, search, true);
    } catch {
      setActionError('Failed to unban user.');
    }
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-amber-700">{total} user{total !== 1 ? 's' : ''} total</p>
        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-amber-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {actionError && (
        <p className="text-red-600 text-sm mb-3">{actionError}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-amber-300">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 border-b border-amber-300">
            <tr>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Username</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Role</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Status</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Joined</th>
              {isAdmin && (
                <th className="text-left px-4 py-2 text-amber-700 font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <>
                <tr key={user.account_id} className="border-b border-amber-100 last:border-0">
                  <td className="px-4 py-2 text-amber-900 font-medium">{user.username}</td>
                  <td className="px-4 py-2">
                    {isAdmin ? (
                      <select
                        value={user.user_role_id}
                        onChange={(e) =>
                          handleRoleChange(user.account_id, parseInt(e.target.value))
                        }
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
                  <td className="px-4 py-2">
                    {user.is_banned && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                        Banned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-amber-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2">
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
                    </td>
                  )}
                </tr>
                {isAdmin && banningUserId === user.account_id && (
                  <tr key={`ban-${user.account_id}`} className="bg-red-50 border-b border-amber-100">
                    <td colSpan={5} className="px-4 py-3">
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
              </>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading && <p className="text-sm text-amber-700 mt-3">Loading...</p>}

      {hasMore && !isLoading && (
        <button
          onClick={() => fetchUsers(offset, search, false)}
          className="mt-4 text-sm text-amber-800 hover:underline"
        >
          Load more
        </button>
      )}
    </div>
  );
}
