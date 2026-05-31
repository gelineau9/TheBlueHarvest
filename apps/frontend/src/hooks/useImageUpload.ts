'use client';

import { useState, useRef, useCallback } from 'react';

export interface UploadedImage {
  filename: string;
  originalName: string;
  url: string;
  size?: number;
}

interface UseImageUploadOptions {
  maxImages?: number;
  initialImages?: UploadedImage[];
}

interface UseImageUploadReturn {
  uploadedImages: UploadedImage[];
  setUploadedImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  isUploading: boolean;
  uploadError: string | null;
  setUploadError: (error: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveImage: (filename: string) => void;
  clearImages: () => void;
}

export function useImageUpload({
  maxImages = 10,
  initialImages = [],
}: UseImageUploadOptions = {}): UseImageUploadReturn {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Check total image count
      if (uploadedImages.length + files.length > maxImages) {
        setUploadError(`Maximum ${maxImages} images allowed per post`);
        return;
      }

      // Client-side size check — reject before hitting the 4.5MB Route Handler limit
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (matches backend Multer limit)
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(
            `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`,
          );
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append('images', file);
        });

        const response = await fetch('/api/uploads/images', {
          method: 'POST',
          body: formData,
        });

        // Handle non-JSON responses (e.g. 413 from Next.js body limit)
        let data: { error?: string; files?: UploadedImage[] };
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          if (response.status === 413) {
            setUploadError('Image too large. Please use an image under 10 MB.');
          } else {
            setUploadError(data.error || 'Failed to upload images');
          }
          return;
        }

        setUploadedImages((prev) => [...prev, ...(data.files ?? [])]);
      } catch {
        setUploadError('Failed to upload images. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadedImages.length, maxImages],
  );

  const handleRemoveImage = useCallback((filename: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.filename !== filename));
  }, []);

  const clearImages = useCallback(() => {
    setUploadedImages([]);
  }, []);

  return {
    uploadedImages,
    setUploadedImages,
    isUploading,
    uploadError,
    setUploadError,
    fileInputRef,
    handleFileSelect,
    handleRemoveImage,
    clearImages,
  };
}
