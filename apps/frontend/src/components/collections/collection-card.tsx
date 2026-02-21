'use client';

import Link from 'next/link';
import { FolderOpen, BookOpen, Images, Palette, CalendarRange, User, Calendar, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CollectionCardProps {
  collectionId: number;
  collectionTypeId: number;
  typeName: string;
  title: string;
  description?: string | null;
  primaryAuthorName?: string | null;
  username: string;
  createdAt: string;
  postCount: number;
}

// Collection type icons (1-5)
const collectionTypeIcons: Record<number, typeof FolderOpen> = {
  1: FolderOpen, // Collection
  2: BookOpen, // Chronicle
  3: Images, // Album
  4: Palette, // Gallery
  5: CalendarRange, // Event Series
};

// Collection type colors for visual distinction
const collectionTypeColors: Record<number, { badge: string; icon: string }> = {
  1: { badge: 'bg-violet-100 text-violet-800', icon: 'bg-violet-100 text-violet-700' },
  2: { badge: 'bg-blue-100 text-blue-800', icon: 'bg-blue-100 text-blue-700' },
  3: { badge: 'bg-cyan-100 text-cyan-800', icon: 'bg-cyan-100 text-cyan-700' },
  4: { badge: 'bg-pink-100 text-pink-800', icon: 'bg-pink-100 text-pink-700' },
  5: { badge: 'bg-orange-100 text-orange-800', icon: 'bg-orange-100 text-orange-700' },
};

export function CollectionCard({
  collectionId,
  collectionTypeId,
  typeName,
  title,
  description,
  primaryAuthorName,
  username,
  createdAt,
  postCount,
}: CollectionCardProps) {
  const Icon = collectionTypeIcons[collectionTypeId] || FolderOpen;
  const colors = collectionTypeColors[collectionTypeId] || collectionTypeColors[1];
  const href = `/collections/${collectionId}`;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={href}>
      <Card className="bg-white border-amber-300 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer h-full overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-2.5 rounded-lg ${colors.icon} flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${colors.badge}`}>
                  {typeName}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-amber-900 mb-1 line-clamp-2">{title}</h3>

              {/* Description */}
              {description && <p className="text-sm text-amber-700 mb-2 line-clamp-2">{description}</p>}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-600">
                {/* Primary author (if exists) */}
                {primaryAuthorName && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{primaryAuthorName}</span>
                  </div>
                )}

                {/* Account username */}
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">@{username}</span>
                </div>

                {/* Post count */}
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>
                    {postCount} {postCount === 1 ? 'post' : 'posts'}
                  </span>
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
