'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { CommentItem, Comment } from './comment-item';

interface Character {
  profile_id: number;
  name: string;
}

interface CommentListProps {
  postId: number;
}

export function CommentList({ postId }: CommentListProps) {
  const { isLoggedIn, accountId } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New comment form state
  const [newComment, setNewComment] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // User's characters for attribution
  const [characters, setCharacters] = useState<Character[]>([]);

  // Fetch comments
  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user's characters for attribution dropdown
  const fetchCharacters = async () => {
    try {
      const response = await fetch('/api/profiles?type=1'); // type 1 = characters
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in { profiles: [...] }
        setCharacters(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch characters:', err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCharacters();
    }
  }, [isLoggedIn]);

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

      // Clear form and refresh comments
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
        <h2 className="text-lg font-semibold text-amber-900">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>
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
        </div>
      )}
    </Card>
  );
}
