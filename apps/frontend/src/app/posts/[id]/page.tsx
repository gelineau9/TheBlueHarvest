'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Author {
  profile_id: number;
  profile_name: string;
  is_primary: boolean;
}

interface Post {
  post_id: number;
  account_id: number;
  title: string;
  content: {
    body?: string;
    tags?: string[];
  };
  post_type_id: number;
  type_name: string;
  username: string;
  authors: Author[];
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
  is_owner?: boolean;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { id } = use(params);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }

        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError('An error occurred while loading the post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete post');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="text-amber-900">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <Card className="p-8 bg-white border-amber-300">
            <h1 className="text-2xl font-bold text-amber-900 mb-4">{error || 'Post not found'}</h1>
            <p className="text-amber-700 mb-6">The post you're looking for could not be found.</p>
            <Button onClick={() => router.push('/')} className="bg-amber-800 text-amber-50 hover:bg-amber-700">
              Go to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const primaryAuthor = post.authors.find((a) => a.is_primary);
  const coAuthors = post.authors.filter((a) => !a.is_primary);

  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Post Header */}
        <Card className="p-8 bg-white border-amber-300 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full mb-3">
                <FileText className="w-4 h-4" />
                {post.type_name.charAt(0).toUpperCase() + post.type_name.slice(1)}
              </div>
              <h1 className="text-4xl font-bold text-amber-900 mb-2">{post.title}</h1>
            </div>
            {/* Edit/Delete Buttons */}
            {post.can_edit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/posts/${post.post_id}/edit`)}
                  className="bg-amber-800 text-amber-50 hover:bg-amber-700"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {post.is_owner && (
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Author and Date Info */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-amber-700">
            {primaryAuthor && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  By{' '}
                  <Link
                    href={`/profiles/${primaryAuthor.profile_id}`}
                    className="text-amber-900 hover:underline font-semibold"
                  >
                    {primaryAuthor.profile_name}
                  </Link>
                </span>
              </div>
            )}
            {coAuthors.length > 0 && (
              <div className="flex items-center gap-2">
                <span>
                  with{' '}
                  {coAuthors.map((author, index) => (
                    <span key={author.profile_id}>
                      <Link
                        href={`/profiles/${author.profile_id}`}
                        className="text-amber-900 hover:underline font-semibold"
                      >
                        {author.profile_name}
                      </Link>
                      {index < coAuthors.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Account owner info (smaller, secondary) */}
          <div className="mt-4 pt-4 border-t border-amber-200 text-xs text-amber-600">
            Posted by account: {post.username}
          </div>
        </Card>

        {/* Post Content */}
        <Card className="p-8 bg-white border-amber-300 mb-6">
          <div className="prose prose-amber max-w-none">
            <p className="text-amber-800 whitespace-pre-wrap leading-relaxed">{post.content.body || ''}</p>
          </div>
        </Card>

        {/* Tags */}
        {post.content.tags && post.content.tags.length > 0 && (
          <Card className="p-6 bg-white border-amber-300">
            <h2 className="text-lg font-semibold text-amber-900 mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {post.content.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full border border-amber-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border-amber-300">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Delete Post</DialogTitle>
            <DialogDescription className="text-amber-700">
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="border-amber-600 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
