'use client';

import { useState, useRef, useCallback } from 'react';

export interface Avatar {
  filename: string;
  originalName: string;
  url: string;
}

interface UseAvatarUploadOptions {
  initialAvatar?: Avatar | null;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UseAvatarUploadReturn {
  // Avatar state
  avatar: Avatar | null;
  setAvatar: React.Dispatch<React.SetStateAction<Avatar | null>>;

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
  handleRemoveAvatar: () => void;
  triggerFileSelect: () => void;
}

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 5;

export function useAvatarUpload({
  initialAvatar = null,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: UseAvatarUploadOptions = {}): UseAvatarUploadReturn {
  const [avatar, setAvatar] = useState<Avatar | null>(initialAvatar);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Crop dialog state
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1: User selects a file - validate and show crop dialog
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset error state
      setUploadError(null);

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only image files allowed (JPG, PNG, GIF, WEBP)');
        return;
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setUploadError(`Image must be under ${maxSizeMB}MB`);
        return;
      }

      // Store the filename for later
      setSelectedFileName(file.name);

      // Create object URL for preview in crop dialog
      const objectUrl = URL.createObjectURL(file);
      setPreviewImageSrc(objectUrl);
      setIsCropDialogOpen(true);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [allowedTypes, maxSizeMB],
  );

  // Step 2: User confirms crop - upload the cropped blob
  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setIsUploading(true);

      try {
        const formData = new FormData();
        // Create a File from the blob with the original filename
        const file = new File([croppedBlob], selectedFileName || 'avatar.webp', {
          type: 'image/webp',
        });
        formData.append('avatar', file);

        const response = await fetch('/api/uploads/avatar', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setUploadError(data.error || 'Failed to upload avatar');
          return;
        }

        setAvatar({
          filename: data.file.filename,
          url: data.file.url,
          originalName: data.file.originalName,
        });

        // Close dialog and cleanup
        setIsCropDialogOpen(false);
        if (previewImageSrc) {
          URL.revokeObjectURL(previewImageSrc);
        }
        setPreviewImageSrc(null);
      } catch {
        setUploadError('Failed to upload avatar. Please try again.');
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

  const handleRemoveAvatar = useCallback(() => {
    setAvatar(null);
  }, []);

  // Convenience method to trigger file input click
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    avatar,
    setAvatar,
    isUploading,
    uploadError,
    setUploadError,
    isCropDialogOpen,
    previewImageSrc,
    fileInputRef,
    handleFileSelect,
    handleCropComplete,
    handleCropCancel,
    handleRemoveAvatar,
    triggerFileSelect,
  };
}
