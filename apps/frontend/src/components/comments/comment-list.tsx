'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { CommentItem, Comment } from './comment-item';
import { useCharacterProfiles } from '@/hooks/useCharacterProfiles';

const PAGE_SIZE = 50;

interface CommentListProps {
  postId: number;
}

export function CommentList({ postId }: CommentListProps) {
  const { isLoggedIn, accountId } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New comment form state
  const [newComment, setNewComment] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // User's characters for attribution (only fetch when logged in)
  const { characters } = useCharacterProfiles({ enabled: isLoggedIn });

  // Fetch initial page of comments
  const fetchComments = async () => {
    setIsLoading(true);
    setOffset(0);
    try {
      const response = await fetch(`/api/posts/${postId}/comments?limit=${PAGE_SIZE}&offset=0`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments ?? []);
      setTotal(data.pagination?.total ?? 0);
      setHasMore(data.pagination?.hasMore ?? false);
      setOffset(data.comments?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  // Load next page
  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments?limit=${PAGE_SIZE}&offset=${offset}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      const newComments = data.comments ?? [];
      setComments((prev) => [...prev, ...newComments]);
      setHasMore(data.pagination?.hasMore ?? false);
      setOffset((prev) => prev + newComments.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more comments');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const body: { content: string; profile_id?: number } = {
        content: newComment.trim(),
      };
      if (selectedCharacterId) {
        body.profile_id = selectedCharacterId;
      }

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      // Clear form and refresh comments from the start
      setNewComment('');
      setSelectedCharacterId(null);
      fetchComments();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-white border-amber-300 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-amber-700" />
        <h2 className="text-lg font-semibold text-amber-900">Comments {total > 0 && `(${total})`}</h2>
      </div>

      {/* Comment Form - only for authenticated users */}
      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 min-h-[80px] resize-none"
              disabled={isSubmitting}
              maxLength={10000}
            />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {characters.length > 0 && (
                  <select
                    value={selectedCharacterId ?? ''}
                    onChange={(e) => setSelectedCharacterId(e.target.value ? Number(e.target.value) : null)}
                    className="text-sm border border-amber-300 rounded-md px-2 py-1.5 bg-white text-amber-800 focus:border-amber-500 focus:ring-amber-500"
                    disabled={isSubmitting}
                  >
                    <option value="">Post as account</option>
                    {characters.map((char) => (
                      <option key={char.profile_id} value={char.profile_id}>
                        Post as {char.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-amber-800 text-amber-50 hover:bg-amber-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
            {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
          </div>
        </form>
      )}

      {/* Comments List */}
      {isLoading ? (
        <p className="text-amber-600 text-sm">Loading comments...</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-amber-600 text-sm">
          No comments yet. {isLoggedIn ? 'Be the first to comment!' : 'Sign in to leave a comment.'}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.comment_id}
              comment={comment}
              currentUserId={accountId ?? null}
              onCommentUpdated={fetchComments}
            />
          ))}
          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load more comments'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
