'use client';

import { Users, Sword, Package, Building2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';

type ProfileType = {
  id: number;
  name: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const profileTypes: ProfileType[] = [
  {
    id: 1,
    name: 'character',
    label: 'Character',
    description: 'Create a roleplay character with their own story and background',
    icon: Users,
  },
  {
    id: 2,
    name: 'item',
    label: 'Item',
    description: 'Document an item owned by a character or organization',
    icon: Sword,
  },
  {
    id: 3,
    name: 'kinship',
    label: 'Kinship',
    description: 'Establish a kinship',
    icon: Package,
  },
  {
    id: 4,
    name: 'organization',
    label: 'Organization',
    description: 'Create an organization',
    icon: Building2,
  },
  {
    id: 5,
    name: 'location',
    label: 'Location',
    description: 'Document a location in Middle-earth',
    icon: MapPin,
  },
];

interface ProfileTypeSelectorProps {
  selectedType: number | null;
  onSelectType: (typeId: number) => void;
}

export function ProfileTypeSelector({ selectedType, onSelectType }: ProfileTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {profileTypes.map((type) => {
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
