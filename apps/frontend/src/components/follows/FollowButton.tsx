'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';

interface FollowButtonProps {
  type: 'account' | 'profile';
  id: number;
  initialFollowing: boolean;
}

export function FollowButton({ type, id, initialFollowing }: FollowButtonProps) {
  const { isLoggedIn } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  if (!isLoggedIn) return null;

  const handleClick = async () => {
    if (pending) return;

    const prev = following;
    setFollowing(!following);
    setPending(true);

    try {
      const method = prev ? 'DELETE' : 'POST';
      const endpoint = type === 'account' ? `/api/follows/accounts/${id}` : `/api/follows/profiles/${id}`;

      const res = await fetch(endpoint, { method });

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      setFollowing(data.following);
    } catch (err) {
      console.error('Follow toggle error:', err);
      setFollowing(prev);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={[
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        following
          ? 'bg-amber-800 text-amber-50 hover:bg-amber-700'
          : 'border border-amber-700 text-amber-800 hover:bg-amber-100/80',
        pending ? 'opacity-70 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
