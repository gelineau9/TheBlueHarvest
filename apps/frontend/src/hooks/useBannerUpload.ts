'use client';

import { useState, useRef, useCallback } from 'react';

export interface BannerImage {
  filename: string;
  originalName: string;
  url: string;
}

interface UseBannerUploadOptions {
  initialBanner?: BannerImage | null;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UseBannerUploadReturn {
  // Banner state
  banner: BannerImage | null;
  setBanner: React.Dispatch<React.SetStateAction<BannerImage | null>>;

  // Upload state
  isUploading: boolean;
  uploadError: string | null;
  setUploadError: (error: string | null) => void;

  // Crop dialog state
  isCropDialogOpen: boolean;
  previewImageSrc: string | null;

  // Refs and handlers
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCropComplete: (croppedBlob: Blob) => Promise<void>;
  handleCropCancel: () => void;
  handleRemoveBanner: () => void;
  triggerFileSelect: () => void;
}

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 5;

/**
 * Hook for uploading a banner image (3:1 aspect ratio).
 * Uses /api/uploads/images (field name: "images") and reads data.files[0].
 * Pass the returned isCropDialogOpen + previewImageSrc into AvatarCropDialog
 * with aspect={3} and circularCrop={false}.
 */
export function useBannerUpload({
  initialBanner = null,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: UseBannerUploadOptions = {}): UseBannerUploadReturn {
  const [banner, setBanner] = useState<BannerImage | null>(initialBanner);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1: User selects a file — validate and open the crop dialog
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);

      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only image files are allowed (JPG, PNG, GIF, WEBP)');
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setUploadError(`Image must be under ${maxSizeMB}MB`);
        return;
      }

      setSelectedFileName(file.name);
      const objectUrl = URL.createObjectURL(file);
      setPreviewImageSrc(objectUrl);
      setIsCropDialogOpen(true);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [allowedTypes, maxSizeMB],
  );

  // Step 2: User confirms crop — upload the cropped blob to /api/uploads/images
  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setIsUploading(true);

      try {
        const formData = new FormData();
        const file = new File([croppedBlob], selectedFileName || 'banner.webp', {
          type: 'image/webp',
        });
        formData.append('images', file);

        const response = await fetch('/api/uploads/images', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setUploadError(data.error || 'Failed to upload banner');
          return;
        }

        const uploaded = data.files?.[0];
        if (!uploaded) {
          setUploadError('No file returned from upload');
          return;
        }

        setBanner({
          filename: uploaded.filename,
          url: uploaded.url,
          originalName: uploaded.originalName,
        });

        setIsCropDialogOpen(false);
        if (previewImageSrc) {
          URL.revokeObjectURL(previewImageSrc);
        }
        setPreviewImageSrc(null);
      } catch {
        setUploadError('Failed to upload banner. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [selectedFileName, previewImageSrc],
  );

  // User cancels crop dialog
  const handleCropCancel = useCallback(() => {
    setIsCropDialogOpen(false);
    if (previewImageSrc) {
      URL.revokeObjectURL(previewImageSrc);
    }
    setPreviewImageSrc(null);
    setSelectedFileName('');
  }, [previewImageSrc]);

  const handleRemoveBanner = useCallback(() => {
    setBanner(null);
  }, []);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    banner,
    setBanner,
    isUploading,
    uploadError,
    setUploadError,
    isCropDialogOpen,
    previewImageSrc,
    fileInputRef,
    handleFileSelect,
    handleCropComplete,
    handleCropCancel,
    handleRemoveBanner,
    triggerFileSelect,
  };
}
