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

        const data = await response.json();

        if (!response.ok) {
          setUploadError(data.error || 'Failed to upload images');
          return;
        }

        setUploadedImages((prev) => [...prev, ...data.files]);
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
