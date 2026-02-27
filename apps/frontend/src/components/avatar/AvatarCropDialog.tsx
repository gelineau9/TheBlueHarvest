'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AvatarCropDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}

// Helper to create a centered square crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

// Extract cropped image as blob using canvas
async function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate scale factors between displayed size and natural size
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Scale crop coordinates to natural image dimensions
  const naturalCrop = {
    x: crop.x * scaleX,
    y: crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  };

  // Set canvas size to the natural crop size
  canvas.width = naturalCrop.width;
  canvas.height = naturalCrop.height;

  // Draw the cropped portion of the image at natural resolution
  ctx.drawImage(
    image,
    naturalCrop.x,
    naturalCrop.y,
    naturalCrop.width,
    naturalCrop.height,
    0,
    0,
    naturalCrop.width,
    naturalCrop.height,
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/webp',
      0.9,
    );
  });
}

export function AvatarCropDialog({
  isOpen,
  onCancel,
  imageSrc,
  onCropComplete,
  isUploading = false,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // Create a centered square crop
    const initialCrop = centerAspectCrop(width, height, 1);
    setCrop(initialCrop);
  }, []);

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Failed to crop image:', error);
    }
  }, [completedCrop, onCropComplete]);

  const handleClose = useCallback(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    onCancel();
  }, [onCancel]);

  // Don't render if no image to crop
  if (!imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-amber-50 border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-amber-900">Adjust Avatar</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            className="max-h-[400px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: '400px', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>

        <p className="text-sm text-amber-600 text-center">
          Drag to reposition. Drag corners to resize.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUploading || !completedCrop}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Save Avatar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
