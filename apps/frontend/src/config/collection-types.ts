/**
 * Collection type configuration
 * Maps URL slugs to collection type metadata
 */

export interface CollectionTypeConfig {
  id: number;
  slug: string;
  name: string;
  label: string;
}

export const COLLECTION_TYPES: Record<string, CollectionTypeConfig> = {
  collection: { id: 1, slug: 'collection', name: 'collection', label: 'Collection' },
  chronicle: { id: 2, slug: 'chronicle', name: 'chronicle', label: 'Chronicle' },
  album: { id: 3, slug: 'album', name: 'album', label: 'Album' },
  gallery: { id: 4, slug: 'gallery', name: 'gallery', label: 'Gallery' },
  'event-series': { id: 5, slug: 'event-series', name: 'event series', label: 'Event Series' },
};

export const getCollectionTypeBySlug = (slug: string): CollectionTypeConfig | undefined => {
  return COLLECTION_TYPES[slug];
};

export const getCollectionTypeById = (id: number): CollectionTypeConfig | undefined => {
  return Object.values(COLLECTION_TYPES).find((type) => type.id === id);
};

export const VALID_COLLECTION_SLUGS = Object.keys(COLLECTION_TYPES);
