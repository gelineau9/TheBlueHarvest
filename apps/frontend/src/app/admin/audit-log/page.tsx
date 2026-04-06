'use client';

import { useEffect, useState, useCallback } from 'react';
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

export default function AdminAuditLogPage() {
  const { isAdmin, isModerator } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchEntries = useCallback(async (currentOffset: number, replace: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/audit-log?limit=20&offset=${currentOffset}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) {
        setError('You do not have permission to view this page.');
        return;
      }
      if (!res.ok) {
        setError('Failed to load audit log.');
        return;
      }
      const data = await res.json();
      setEntries((prev) => (replace ? data.entries : [...prev, ...data.entries]));
      setTotal(data.total);
      setHasMore(data.hasMore);
      setOffset(currentOffset + data.entries.length);
    } catch {
      setError('Failed to load audit log.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin || isModerator) {
      fetchEntries(0, true);
    }
  }, [isAdmin, isModerator, fetchEntries]);

  function toggleExpand(logId: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  const pageTitle = isModerator && !isAdmin ? 'Your Activity Log' : 'Audit Log';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-amber-900">{pageTitle}</h2>
        <p className="text-sm text-amber-700">{total} entr{total !== 1 ? 'ies' : 'y'}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-300">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 border-b border-amber-300">
            <tr>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Time</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Actor</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Action</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Target</th>
              <th className="text-left px-4 py-2 text-amber-700 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-amber-600 text-sm">
                  No activity yet.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <>
                <tr key={entry.log_id} className="border-b border-amber-100 last:border-0">
                  <td className="px-4 py-2 text-xs text-amber-600 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-amber-900">
                    {entry.actor_username ?? 'System'}
                  </td>
                  <td className="px-4 py-2">
                    <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">
                      {entry.action_type}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-xs text-amber-700">
                    {entry.target_type && entry.target_id
                      ? `${entry.target_type} #${entry.target_id}`
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {entry.metadata != null && (
                      <button
                        onClick={() => toggleExpand(entry.log_id)}
                        className="text-xs text-amber-700 hover:underline"
                      >
                        {expandedIds.has(entry.log_id) ? 'Hide' : 'Details'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedIds.has(entry.log_id) && entry.metadata != null && (
                  <tr key={`meta-${entry.log_id}`} className="bg-amber-50 border-b border-amber-100">
                    <td colSpan={5} className="px-4 pb-3">
                      <pre className="text-xs bg-amber-50 p-2 rounded mt-1 overflow-x-auto text-amber-900">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
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
          onClick={() => fetchEntries(offset, false)}
          className="mt-4 text-sm text-amber-800 hover:underline"
        >
          Load more
        </button>
      )}
    </div>
  );
}
