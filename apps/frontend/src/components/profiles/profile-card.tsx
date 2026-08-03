'use client';

import Link from 'next/link';
import { NestedLink } from '@/components/ui/nested-link';
import NextImage from 'next/image';
import { User, Calendar } from 'lucide-react';
import { profileTypeIcon } from '@/components/profiles/profile-type-icons';
import { Card } from '@/components/ui/card';

interface ProfileCardProps {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  created_at: string;
  username: string;
  avatar_url?: string;
}

export function ProfileCard({
  profile_id,
  name,
  profile_type_id,
  type_name,
  created_at,
  username,
  avatar_url,
}: ProfileCardProps) {
  const Icon = profileTypeIcon(profile_type_id);

  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/profiles/${profile_id}`}>
      <Card className="p-6 bg-white border-amber-300 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer h-full">
        <div className="flex items-start gap-4">
          {/* Avatar or type icon */}
          {avatar_url ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-200 flex-shrink-0">
              <NextImage fill src={avatar_url} alt={`${name} avatar`} sizes="48px" className="object-cover" />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
              <Icon className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full mb-2">
              {type_name.charAt(0).toUpperCase() + type_name.slice(1)}
            </div>

            <h3 className="text-lg font-bold text-amber-900 mb-3 truncate">{name}</h3>

            <div className="space-y-1 text-sm text-amber-700">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3" />
                <NestedLink href={`/users/${username}`} className="truncate hover:underline">
                  {username}
                </NestedLink>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
