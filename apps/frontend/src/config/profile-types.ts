/**
 * Profile type configuration
 * Maps URL slugs to profile type metadata
 */

import { Users, Sword, Heart, Building2, MapPin, LucideIcon } from 'lucide-react';

export interface ProfileTypeConfig {
  id: number;
  slug: string;
  name: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const PROFILE_TYPES: Record<string, ProfileTypeConfig> = {
  character: {
    id: 1,
    slug: 'character',
    name: 'character',
    label: 'Character',
    icon: Users,
    description:
      'Document your roleplay persona on LOTRO\'s Meriadoc server.',
  },
  item: {
    id: 2,
    slug: 'item',
    name: 'item',
    label: 'Item',
    icon: Sword,
    description: 'Document weapons, artifacts, heirlooms, or any other significant item that appears in your writing and/or roleplay.',
  },
  kinship: {
    id: 3,
    slug: 'kinship',
    name: 'kinship',
    label: 'Kinship',
    icon: Heart,
    description: 'Document your in-game roleplay kinship on LOTRO\'s Meriadoc server.',
  },
  organization: {
    id: 4,
    slug: 'organization',
    name: 'organization',
    label: 'Organization',
    icon: Building2,
    description: 'Document factions, councils, guilds, or other groups that appear in your writing and/or roleplay.',
  },
  location: {
    id: 5,
    slug: 'location',
    name: 'location',
    label: 'Location',
    icon: MapPin,
    description: 'Document places, settlements, or landmarks that appear in your writing and/or roleplay.',
  },
};

export const getProfileTypeBySlug = (slug: string): ProfileTypeConfig | undefined => {
  return PROFILE_TYPES[slug];
};

export const getProfileTypeById = (id: number): ProfileTypeConfig | undefined => {
  return Object.values(PROFILE_TYPES).find((type) => type.id === id);
};

export const VALID_PROFILE_SLUGS = Object.keys(PROFILE_TYPES);
