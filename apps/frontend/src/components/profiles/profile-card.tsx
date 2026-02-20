'use client';

import Link from 'next/link';
import { Users, Sword, Package, Building2, MapPin, User, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ProfileCardProps {
  profile_id: number;
  name: string;
  profile_type_id: number;
  type_name: string;
  created_at: string;
  username: string;
}

const typeIcons = {
  1: Users, // Character
  2: Sword, // Item
  3: Package, // Kinship
  4: Building2, // Organization
  5: MapPin, // Location
};

export function ProfileCard({ profile_id, name, profile_type_id, type_name, created_at, username }: ProfileCardProps) {
  const Icon = typeIcons[profile_type_id as keyof typeof typeIcons] || Users;

  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/catalog/${profile_id}`}>
      <Card className="p-6 bg-white border-amber-300 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer h-full">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full mb-2">
              {type_name.charAt(0).toUpperCase() + type_name.slice(1)}
            </div>

            <h3 className="text-lg font-bold text-amber-900 mb-3 truncate">{name}</h3>

            <div className="space-y-1 text-sm text-amber-700">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3" />
                <span className="truncate">{username}</span>
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
