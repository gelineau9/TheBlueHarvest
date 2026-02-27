'use client';

import { Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AvatarCropDialog } from './AvatarCropDialog';
import { useAvatarUpload, Avatar } from '@/hooks/useAvatarUpload';

interface AvatarUploaderProps {
  /** Current avatar value */
  avatar: Avatar | null;
  /** Callback when avatar changes (upload or remove) */
  onAvatarChange: (avatar: Avatar | null) => void;
  /** Optional label text */
  label?: string;
  /** Optional size for the preview circle */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the form is submitting (disables controls) */
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

/**
 * Reusable avatar upload component with crop functionality.
 * Used for profiles (characters, items, kinships, organizations, locations) and accounts.
 */
export function AvatarUploader({
  avatar: externalAvatar,
  onAvatarChange,
  label = 'Avatar',
  size = 'md',
  disabled = false,
}: AvatarUploaderProps) {
  const {
    avatar,
    setAvatar,
    isUploading,
    uploadError,
    isCropDialogOpen,
    previewImageSrc,
    fileInputRef,
    handleFileSelect,
    handleCropComplete,
    handleCropCancel,
    handleRemoveAvatar,
    triggerFileSelect,
  } = useAvatarUpload({ initialAvatar: externalAvatar });

  // Sync external avatar changes to internal state
  // and notify parent of internal changes
  const handleCropCompleteWithCallback = async (croppedBlob: Blob) => {
    await handleCropComplete(croppedBlob);
  };

  // Watch for avatar changes and notify parent
  const handleUploadComplete = async (croppedBlob: Blob) => {
    // The hook will update `avatar` state after successful upload
    // We need to get the new avatar and pass it to parent
    const formData = new FormData();
    const file = new File([croppedBlob], 'avatar.webp', { type: 'image/webp' });
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/uploads/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const newAvatar = {
          filename: data.file.filename,
          url: data.file.url,
          originalName: data.file.originalName,
        };
        setAvatar(newAvatar);
        onAvatarChange(newAvatar);
        handleCropCancel(); // Close the dialog after successful upload
      }
    } catch {
      // Error handled by hook
    }
  };

  const handleRemove = () => {
    handleRemoveAvatar();
    onAvatarChange(null);
  };

  // Use external avatar if provided, otherwise use internal state
  const displayAvatar = externalAvatar ?? avatar;

  return (
    <div className="space-y-2">
      <Label className="text-amber-900 font-semibold">{label}</Label>
      <div className="flex items-start gap-4">
        {/* Avatar Preview */}
        <div
          className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-amber-100 border-2 border-amber-300 flex-shrink-0`}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar.url}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-amber-400">
              <Upload className={iconSizes[size]} />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={triggerFileSelect}
              disabled={isUploading || disabled}
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {displayAvatar ? 'Change Avatar' : 'Upload Avatar'}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={!displayAvatar || isUploading || disabled}
              className="border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
          <p className="text-sm text-amber-600 mt-2">
            JPG, PNG, GIF, or WEBP. Max 5MB. Will be resized to 400x400px.
          </p>
          {uploadError && (
            <p className="text-sm text-red-600 mt-1">{uploadError}</p>
          )}
        </div>
      </div>

      {/* Crop Dialog */}
      <AvatarCropDialog
        isOpen={isCropDialogOpen}
        imageSrc={previewImageSrc}
        onCropComplete={handleUploadComplete}
        onCancel={handleCropCancel}
        isUploading={isUploading}
      />
    </div>
  );
}
