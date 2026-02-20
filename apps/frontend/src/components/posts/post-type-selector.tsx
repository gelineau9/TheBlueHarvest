'use client';

import { PenLine, Palette, Image, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

type PostType = {
  id: number;
  name: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const postTypes: PostType[] = [
  {
    id: 1,
    name: 'writing',
    label: 'Writing',
    description: 'Stories, narratives, and prose',
    icon: PenLine,
  },
  {
    id: 2,
    name: 'art',
    label: 'Art',
    description: 'Visual artwork and illustrations',
    icon: Palette,
  },
  {
    id: 3,
    name: 'media',
    label: 'Media',
    description: 'Screenshots, videos, and links',
    icon: Image,
  },
  {
    id: 4,
    name: 'event',
    label: 'Event',
    description: 'Event announcements and recaps',
    icon: Calendar,
  },
];

interface PostTypeSelectorProps {
  selectedType: number | null;
  onSelectType: (typeId: number) => void;
}

export function PostTypeSelector({ selectedType, onSelectType }: PostTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {postTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selectedType === type.id;

        return (
          <Card
            key={type.id}
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'border-amber-600 bg-amber-50 shadow-md' : 'border-amber-300 bg-white hover:border-amber-500'
            }`}
            onClick={() => onSelectType(type.id)}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`p-3 rounded-lg ${isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-1 ${isSelected ? 'text-amber-900' : 'text-amber-800'}`}>
                  {type.label}
                </h3>
                <p className="text-sm text-amber-700">{type.description}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
