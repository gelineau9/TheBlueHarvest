'use client';

import { useState } from 'react';
import { User, Pencil, X, Check, Trash2 } from 'lucide-react';
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

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const formattedDate = new Date(comment.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if comment was edited (updated_at is different from created_at)
  const isEdited = comment.created_at !== comment.updated_at && !comment.is_deleted;

  // Display name: use profile_name (character) if attributed, otherwise username
  const displayName = comment.profile_name || comment.username;
  const isCharacterAttributed = !!comment.profile_name;

  // Check if current user can edit/delete this comment
  const canModify = currentUserId !== null && currentUserId === comment.account_id && !comment.is_deleted;

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

  const handleDeleteClick = () => {
    setDeleteError(null);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/posts/${comment.post_id}/comments/${comment.comment_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete comment');
      }

      setShowDeleteConfirm(false);
      onCommentUpdated();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  if (comment.is_deleted) {
    return (
      <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
        <p className="text-amber-500 italic text-sm">[deleted]</p>
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
            {canModify && !isEditing && !showDeleteConfirm && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditClick}
                  className="h-7 px-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-100"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this comment?</p>
              {deleteError && <p className="text-red-600 text-xs mb-2">{deleteError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="h-7 bg-red-600 text-white hover:bg-red-700"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="h-7 border-red-300 text-red-700 hover:bg-red-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

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
            !showDeleteConfirm && <p className="text-amber-800 whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
