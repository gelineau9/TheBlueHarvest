'use client';

import { FolderOpen, BookOpen, Image, Palette, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

type CollectionType = {
  id: number;
  name: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const collectionTypes: CollectionType[] = [
  {
    id: 1,
    name: 'collection',
    label: 'Collection',
    description: 'A general collection for any type of post',
    icon: FolderOpen,
  },
  {
    id: 2,
    name: 'chronicle',
    label: 'Chronicle',
    description: 'A series of writing posts telling a story',
    icon: BookOpen,
  },
  {
    id: 3,
    name: 'album',
    label: 'Album',
    description: 'A collection of media posts like screenshots',
    icon: Image,
  },
  {
    id: 4,
    name: 'gallery',
    label: 'Gallery',
    description: 'A showcase of art posts and illustrations',
    icon: Palette,
  },
  {
    id: 5,
    name: 'event-series',
    label: 'Event Series',
    description: 'A collection of related event posts',
    icon: Calendar,
  },
];

interface CollectionTypeSelectorProps {
  selectedType: number | null;
  onSelectType: (typeId: number) => void;
}

export function CollectionTypeSelector({ selectedType, onSelectType }: CollectionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {collectionTypes.map((type) => {
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
