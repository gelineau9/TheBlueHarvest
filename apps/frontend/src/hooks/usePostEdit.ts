'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface UploadedImage {
  filename: string;
  originalName: string;
  url: string;
  size?: number;
}

export interface Post {
  post_id: number;
  account_id: number;
  post_type_id: number;
  title: string;
  content: {
    body?: string;
    description?: string;
    images?: UploadedImage[];
    embeds?: Array<{ type: string; url: string; title?: string }>;
    eventDateTime?: string; // UTC ISO string
    location?: string;
    maxAttendees?: number;
    contactProfileId?: number;
    headerImage?: UploadedImage;
    tags?: string[];
  };
  authors?: Array<{
    profile_id: number;
    name: string;
    is_primary: boolean;
  }>;
  featured_profiles?: Array<{
    featured_profile_id: number;
    profile_id: number;
    name: string;
    profile_type_id: number;
    type_name: string;
  }>;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
}

export interface CharacterProfile {
  profile_id: number;
  name: string;
}

// Post type constants
export const POST_TYPES = {
  WRITING: 1,
  ART: 2,
  MEDIA: 3,
  EVENT: 4,
} as const;

export const POST_TYPE_NAMES: Record<number, string> = {
  1: 'Writing',
  2: 'Art',
  3: 'Media',
  4: 'Event',
};

interface UsePostEditOptions {
  postId: string;
}

interface UsePostEditReturn {
  // Post data
  post: Post | null;
  isLoading: boolean;
  error: string | null;

  // Save state
  isSaving: boolean;
  saveError: string | null;
  setSaveError: (error: string | null) => void;

  // Image upload
  isUploading: boolean;
  uploadImages: (files: FileList, maxImages?: number) => Promise<UploadedImage[]>;
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Characters (for event contact dropdown)
  characters: CharacterProfile[];
  charactersLoaded: boolean;

  // Actions
  savePost: (
    title: string,
    content: Post['content'],
    primaryAuthorProfileId?: number | null,
    isPublished?: boolean,
  ) => Promise<boolean>;
  navigateBack: () => void;

  // Helpers
  router: ReturnType<typeof useRouter>;
}

export function usePostEdit({ postId }: UsePostEditOptions): UsePostEditReturn {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);

  // Fetch characters for event contact dropdown
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch('/api/profiles?type=1');
        if (response.ok) {
          const data = await response.json();
          // Backend returns flat array, not { profiles: [] }
          setCharacters(Array.isArray(data) ? data : data.profiles || []);
        }
      } catch (err) {
        console.error('Failed to fetch characters:', err);
      } finally {
        setCharactersLoaded(true);
      }
    };

    fetchCharacters();
  }, []);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          return;
        }

        const data: Post = await response.json();

        // Check if user can edit this post
        if (!data.can_edit) {
          setError('You do not have permission to edit this post');
          return;
        }

        setPost(data);
      } catch {
        setError('An error occurred while loading the post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // Upload images
  const uploadImages = useCallback(async (files: FileList, _maxImages = 10): Promise<UploadedImage[]> => {
    if (!files || files.length === 0) return [];

    setIsUploading(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch('/api/uploads/images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error || 'Failed to upload images');
        return [];
      }

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return data.files as UploadedImage[];
    } catch {
      setSaveError('Failed to upload images. Please try again.');
      return [];
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Save post
  const savePost = useCallback(
    async (
      title: string,
      content: Post['content'],
      primaryAuthorProfileId?: number | null,
      isPublished?: boolean,
    ): Promise<boolean> => {
      setSaveError(null);
      setIsSaving(true);

      try {
        const body: Record<string, unknown> = {
          title: title.trim(),
          content,
        };

        // Include primary_author_profile_id if provided (null = clear the author)
        if (primaryAuthorProfileId !== undefined) {
          body.primary_author_profile_id = primaryAuthorProfileId;
        }

        // Include is_published if provided
        if (isPublished !== undefined) {
          body.is_published = isPublished;
        }

        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json();
          // express-validator returns { errors: [{msg, path, ...}] }
          // other backend errors return { message } or { error }
          const firstValidationMsg = Array.isArray(data.errors) ? data.errors[0]?.msg : undefined;
          setSaveError(firstValidationMsg || data.message || data.error || 'Failed to save changes');
          return false;
        }

        return true;
      } catch {
        setSaveError('An error occurred while saving changes');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [postId],
  );

  // Navigate back to post
  const navigateBack = useCallback(() => {
    router.push(`/posts/${postId}`);
  }, [router, postId]);

  return {
    post,
    isLoading,
    error,
    isSaving,
    saveError,
    setSaveError,
    isUploading,
    uploadImages,
    fileInputRef,
    characters,
    charactersLoaded,
    savePost,
    navigateBack,
    router,
  };
}
