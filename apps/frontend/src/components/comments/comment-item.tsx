'use client';

import { User } from 'lucide-react';

export interface Comment {
  comment_id: number;
  post_id: number;
  user_id: number;
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
}

export function CommentItem({ comment }: CommentItemProps) {
  const formattedDate = new Date(comment.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Display name: use profile_name (character) if attributed, otherwise username
  const displayName = comment.profile_name || comment.username;
  const isCharacterAttributed = !!comment.profile_name;

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
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-amber-900">{displayName}</span>
            {isCharacterAttributed && <span className="text-xs text-amber-600">({comment.username})</span>}
            <span className="text-xs text-amber-500">{formattedDate}</span>
          </div>
          <p className="text-amber-800 whitespace-pre-wrap break-words">{comment.content}</p>
        </div>
      </div>
    </div>
  );
}
