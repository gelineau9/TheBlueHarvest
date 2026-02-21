'use client';

import { useState } from 'react';
import { User, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface Comment {
  comment_id: number;
  post_id: number;
  account_id: number;
  profile_id: number | null;
  parent_comment_id: number | null;
  content: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  profile_name: string | null;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: number | null;
  onCommentUpdated: () => void;
}

export function CommentItem({ comment, currentUserId, onCommentUpdated }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const formattedDate = new Date(comment.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if comment was edited (updated_at is different from created_at)
  const isEdited = comment.created_at !== comment.updated_at;

  // Display name: use profile_name (character) if attributed, otherwise username
  const displayName = comment.profile_name || comment.username;
  const isCharacterAttributed = !!comment.profile_name;

  // Check if current user can edit this comment
  console.log('canEdit check:', {
    currentUserId,
    commentAccountId: comment.account_id,
    isDeleted: comment.is_deleted,
    canEdit: currentUserId !== null && currentUserId === comment.account_id && !comment.is_deleted,
  });
  const canEdit = currentUserId !== null && currentUserId === comment.account_id && !comment.is_deleted;

  const handleEditClick = () => {
    setEditContent(comment.content || '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content || '');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      setEditError('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/posts/${comment.post_id}/comments/${comment.comment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update comment');
      }

      setIsEditing(false);
      onCommentUpdated();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (comment.is_deleted) {
    return (
      <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
        <p className="text-amber-500 italic text-sm">[This comment has been deleted]</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-900">{displayName}</span>
              {isCharacterAttributed && <span className="text-xs text-amber-600">({comment.username})</span>}
              <span className="text-xs text-amber-500">{formattedDate}</span>
              {isEdited && <span className="text-xs text-amber-500 italic">(edited)</span>}
            </div>
            {canEdit && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditClick}
                className="h-7 px-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 min-h-[60px] resize-none text-sm"
                disabled={isSubmitting}
                autoFocus
              />
              {editError && <p className="text-red-600 text-xs">{editError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || !editContent.trim()}
                  className="h-7 bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="h-7 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-amber-800 whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
