import { Users, Sword, Package, Building2, MapPin } from 'lucide-react';

/**
 * Icon per profile_type_id, shared so the create page, cards, and profile
 * pages can't drift apart. These are the icons users first meet on the
 * Create A New Profile page, so they double as the default avatar.
 */
export const PROFILE_TYPE_ICONS = {
  1: Users, // Character
  2: Sword, // Item
  3: Package, // Kinship
  4: Building2, // Organization
  5: MapPin, // Location
} as const;

export function profileTypeIcon(profileTypeId: number) {
  return PROFILE_TYPE_ICONS[profileTypeId as keyof typeof PROFILE_TYPE_ICONS] ?? Users;
}
