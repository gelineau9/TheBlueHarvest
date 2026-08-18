'use client';

import { useRef, useState } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DEFAULT_FOCAL_X, DEFAULT_FOCAL_Y, focalStyle, hasFocalPoint } from '@/lib/image-focus';

interface FocalPointPickerProps {
  url: string;
  focalX?: number;
  focalY?: number;
  onChange: (focalX: number | undefined, focalY: number | undefined) => void;
  disabled?: boolean;
  label?: string;
}

/** The ratios cards actually use, so the author previews the real crops. */
const PREVIEW_RATIOS: Array<{ label: string; className: string }> = [
  { label: 'Wide card', className: 'aspect-video' },
  { label: 'Square', className: 'aspect-square' },
  { label: 'Banner', className: 'aspect-[3/1]' },
];

/**
 * Click the image to say which part matters. Cards crop to six different
 * aspect ratios, so rather than cropping once we store a focal point and let
 * every card anchor its own crop there.
 */
export function FocalPointPicker({
  url,
  focalX,
  focalY,
  onChange,
  disabled,
  label = 'Card framing',
}: FocalPointPickerProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const x = focalX ?? DEFAULT_FOCAL_X;
  const y = focalY ?? DEFAULT_FOCAL_Y;

  const setFromEvent = (clientX: number, clientY: number) => {
    const box = imageRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const nextX = Math.min(100, Math.max(0, Math.round(((clientX - box.left) / box.width) * 100)));
    const nextY = Math.min(100, Math.max(0, Math.round(((clientY - box.top) / box.height) * 100)));
    onChange(nextX, nextY);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-amber-900 font-semibold">{label}</Label>
        {hasFocalPoint({ url, focalX, focalY }) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(undefined, undefined)}
            className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to centre
          </Button>
        )}
      </div>
      <p className="text-sm text-amber-700">
        Click the part of the image that should stay visible when it&apos;s cropped into a card.
      </p>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
        {/* The full image, with the chosen point marked */}
        <div
          ref={imageRef}
          role="application"
          aria-label="Choose the focal point"
          onMouseDown={(e) => {
            if (disabled) return;
            setIsDragging(true);
            setFromEvent(e.clientX, e.clientY);
          }}
          onMouseMove={(e) => {
            if (disabled || !isDragging) return;
            setFromEvent(e.clientX, e.clientY);
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          className={`relative overflow-hidden rounded-md border border-amber-300 bg-amber-50 ${
            disabled ? '' : 'cursor-crosshair'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied image at unknown ratio */}
          <img src={url} alt="" className="max-h-72 w-full object-contain" />
          <span
            aria-hidden="true"
            style={{ left: `${x}%`, top: `${y}%` }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-amber-900 shadow ring-2 ring-amber-700"
          >
            <Crosshair className="h-4 w-4" />
          </span>
        </div>

        {/* Live previews at the ratios cards really use */}
        <div className="space-y-2">
          {PREVIEW_RATIOS.map((ratio) => (
            <div key={ratio.label}>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-amber-600">{ratio.label}</p>
              <div className={`relative ${ratio.className} w-full overflow-hidden rounded border border-amber-200`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- preview mirrors the card crop exactly */}
                <img
                  src={url}
                  alt=""
                  style={focalStyle({ url, focalX, focalY })}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
