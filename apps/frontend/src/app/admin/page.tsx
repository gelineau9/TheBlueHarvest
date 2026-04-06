'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface AuditEntry {
  log_id: number;
  actor_account_id: number | null;
  actor_username: string | null;
  action_type: string;
  target_type: string | null;
  target_id: number | null;
  metadata: unknown;
  created_at: string;
}

interface Stats {
  users: number | string;
  posts: number | string;
  profiles: number | string;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-amber-300 p-4">
      <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-amber-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isAdmin, isModerator } = useAuth();
  const [stats, setStats] = useState<Stats>({ users: '—', posts: '—', profiles: '—' });
  const [recentEntries, setRecentEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin && !isModerator) return;

    const token = localStorage.getItem('token');
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    async function loadStats() {
      try {
        const [usersRes, postsRes, profilesRes, auditRes] = await Promise.all([
          fetch('/api/admin/users?limit=1', { headers: authHeader }),
          fetch('/api/posts/public?limit=1'),
          fetch('/api/profiles/public?limit=1'),
          fetch('/api/admin/audit-log?limit=5', { headers: authHeader }),
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          setStats((prev) => ({ ...prev, users: data.total ?? '—' }));
        }
        if (postsRes.ok) {
          const data = await postsRes.json();
          setStats((prev) => ({ ...prev, posts: data.total ?? '—' }));
        }
        if (profilesRes.ok) {
          const data = await profilesRes.json();
          setStats((prev) => ({ ...prev, profiles: data.total ?? '—' }));
        }
        if (auditRes.ok) {
          const data = await auditRes.json();
          setRecentEntries(data.entries ?? []);
        } else if (auditRes.status === 403) {
          setError('You do not have permission to view this page.');
        }
      } catch {
        setError('Failed to load dashboard data.');
      }
    }

    loadStats();
  }, [isAdmin, isModerator]);

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.users} />
        <StatCard label="Total Posts" value={stats.posts} />
        <StatCard label="Total Profiles" value={stats.profiles} />
        <StatCard label="Comments" value="—" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-amber-900 mb-3">Recent Activity</h2>
        {recentEntries.length === 0 ? (
          <p className="text-sm text-amber-700">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-amber-300">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-300">
                <tr>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Time</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Actor</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Action</th>
                  <th className="text-left px-4 py-2 text-amber-700 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => (
                  <tr key={entry.log_id} className="border-b border-amber-100 last:border-0">
                    <td className="px-4 py-2 text-xs text-amber-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-amber-900">
                      {entry.actor_username ?? 'System'}
                    </td>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-amber-100 px-1 rounded">{entry.action_type}</code>
                    </td>
                    <td className="px-4 py-2 text-amber-700 text-xs">
                      {entry.target_type && entry.target_id
                        ? `${entry.target_type} #${entry.target_id}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
