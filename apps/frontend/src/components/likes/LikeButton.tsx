'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

interface LikeButtonProps {
  /** 'post' or 'comment' */
  type: 'post' | 'comment';
  id: number;
  initialLikeCount: number;
  /** null = unauthenticated (don't know), true/false = known state */
  initialLikedByMe: boolean | null;
  /**
   * Passive mode: render a static heart + count, no interaction.
   * Used in carousel cards where the whole card is a link.
   */
  passive?: boolean;
}

export function LikeButton({ type, id, initialLikeCount, initialLikedByMe, passive = false }: LikeButtonProps) {
  const { isLoggedIn } = useAuth();
  const [liked, setLiked] = useState<boolean>(initialLikedByMe ?? false);
  const [likeCount, setLikeCount] = useState<number>(initialLikeCount);
  const [isPending, setIsPending] = useState(false);

  const apiPath = type === 'post' ? `/api/likes/posts/${id}` : `/api/likes/comments/${id}`;

  const handleToggle = async (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent links
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn || isPending) return;

    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    setIsPending(true);

    try {
      const response = await fetch(apiPath, {
        method: nextLiked ? 'POST' : 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        // Reconcile with server count
        setLikeCount(data.like_count);
        setLiked(data.liked);
      } else {
        // Revert on failure
        setLiked(!nextLiked);
        setLikeCount((c) => c + (nextLiked ? -1 : 1));
      }
    } catch {
      // Revert on network error
      setLiked(!nextLiked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setIsPending(false);
    }
  };

  if (passive || !isLoggedIn) {
    // Static display: show heart and count (only if count > 0 in carousel context)
    if (likeCount === 0 && passive) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <Heart className={`h-3 w-3 ${likeCount > 0 ? 'fill-amber-500 text-amber-500' : ''}`} aria-hidden="true" />
        <span>{likeCount}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={liked ? 'Unlike' : 'Like'}
      aria-pressed={liked}
      className={`
        inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
        transition-colors duration-150 select-none
        ${
          liked
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            : 'text-amber-600 hover:bg-amber-100/80 hover:text-amber-700'
        }
        disabled:opacity-60 disabled:cursor-not-allowed
      `}
    >
      <Heart
        className={`h-3.5 w-3.5 transition-transform duration-150 ${liked ? 'fill-amber-600 text-amber-600 scale-110' : ''}`}
        aria-hidden="true"
      />
      <span>{likeCount}</span>
    </button>
  );
}
