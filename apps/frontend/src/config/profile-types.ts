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
      'Create a character profile for your roleplay persona. This can be a hero, villain, or any character you want to bring to life in Middle-earth.',
  },
  item: {
    id: 2,
    slug: 'item',
    name: 'item',
    label: 'Item',
    icon: Sword,
    description: 'Create an item profile for weapons, artifacts, heirlooms, or any significant object in your stories.',
  },
  kinship: {
    id: 3,
    slug: 'kinship',
    name: 'kinship',
    label: 'Kinship',
    icon: Heart,
    description: 'Create a kinship profile to represent guilds, fellowships, or groups of characters.',
  },
  organization: {
    id: 4,
    slug: 'organization',
    name: 'organization',
    label: 'Organization',
    icon: Building2,
    description: 'Create an organization profile for factions, councils, or other groups in Middle-earth.',
  },
  location: {
    id: 5,
    slug: 'location',
    name: 'location',
    label: 'Location',
    icon: MapPin,
    description: 'Create a location profile for places, settlements, or landmarks important to your stories.',
  },
};

export const getProfileTypeBySlug = (slug: string): ProfileTypeConfig | undefined => {
  return PROFILE_TYPES[slug];
};

export const getProfileTypeById = (id: number): ProfileTypeConfig | undefined => {
  return Object.values(PROFILE_TYPES).find((type) => type.id === id);
};

export const VALID_PROFILE_SLUGS = Object.keys(PROFILE_TYPES);
