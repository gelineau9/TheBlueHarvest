'use client';

import Link from 'next/link';
import {
  Users,
  Sword,
  Package,
  Building2,
  MapPin,
  User,
  Calendar,
  FileText,
  Image,
  Film,
  CalendarDays,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ContentCardProps {
  id: number;
  contentCategory: 'profile' | 'post';
  typeId: number;
  typeName: string;
  name: string;
  thumbnail?: string | null;
  preview?: string;
  authorName?: string | null;
  username: string;
  createdAt: string;
}

// Profile type icons (1-5)
const profileTypeIcons = {
  1: Users, // Character
  2: Sword, // Item
  3: Package, // Kinship
  4: Building2, // Organization
  5: MapPin, // Location
};

// Post type icons (1-4)
const postTypeIcons = {
  1: FileText, // Writing
  2: Image, // Art
  3: Film, // Media
  4: CalendarDays, // Event
};

// Category colors for visual distinction
const categoryColors = {
  profile: {
    badge: 'bg-amber-100 text-amber-800',
    icon: 'bg-amber-100 text-amber-700',
  },
  post: {
    badge: 'bg-emerald-100 text-emerald-800',
    icon: 'bg-emerald-100 text-emerald-700',
  },
};

export function ContentCard({
  id,
  contentCategory,
  typeId,
  typeName,
  name,
  thumbnail,
  preview,
  authorName,
  username,
  createdAt,
}: ContentCardProps) {
  const Icon =
    contentCategory === 'profile'
      ? profileTypeIcons[typeId as keyof typeof profileTypeIcons] || Users
      : postTypeIcons[typeId as keyof typeof postTypeIcons] || FileText;

  const colors = categoryColors[contentCategory];
  const href = contentCategory === 'profile' ? `/profiles/${id}` : `/posts/${id}`;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const hasThumbnail = thumbnail && contentCategory === 'post' && [2, 3, 4].includes(typeId);

  return (
    <Link href={href}>
      <Card className="bg-white border-amber-300 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer h-full overflow-hidden">
        {/* Thumbnail for art/media/event posts */}
        {hasThumbnail && (
          <div className="aspect-video w-full bg-amber-50 overflow-hidden">
            <img
              src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}${thumbnail}`}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon - only show if no thumbnail */}
            {!hasThumbnail && (
              <div className={`p-2.5 rounded-lg ${colors.icon} flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-2">
                {hasThumbnail && (
                  <div className={`p-1.5 rounded ${colors.icon}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${colors.badge}`}>
                  {typeName}
                </span>
              </div>

              {/* Name/Title */}
              <h3 className="text-base font-bold text-amber-900 mb-1 line-clamp-2">{name}</h3>

              {/* Preview text */}
              {preview && <p className="text-sm text-amber-700 mb-2 line-clamp-2">{preview}</p>}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-600">
                {/* Author (for posts with character authors) */}
                {authorName && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{authorName}</span>
                  </div>
                )}

                {/* Account username */}
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{username}</span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
