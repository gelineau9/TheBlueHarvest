'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CollectionForm } from '@/components/collections/collection-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Collection {
  collection_id: number;
  title: string;
  description: string | null;
  collection_type_id: number;
  type_name: string;
  can_edit: boolean;
  authors: Array<{
    profile_id: number;
    profile_name: string;
    is_primary: boolean;
  }>;
  posts: Array<{
    post_id: number;
    title: string;
    post_type_id: number;
    post_type_name: string;
  }>;
}

// Collection type mappings
const collectionTypeConfig: Record<number, { name: string; label: string }> = {
  1: { name: 'collection', label: 'Collection' },
  2: { name: 'chronicle', label: 'Chronicle' },
  3: { name: 'album', label: 'Album' },
  4: { name: 'gallery', label: 'Gallery' },
  5: { name: 'event-series', label: 'Event Series' },
};

export default function EditCollectionPage() {
  const params = useParams();
  const id = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch(`/api/collections/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Collection not found');
          } else if (response.status === 401) {
            setError('Please log in to edit this collection');
          } else if (response.status === 403) {
            setError('You do not have permission to edit this collection');
          } else {
            setError('Failed to load collection');
          }
          return;
        }

        const data = await response.json();

        if (!data.can_edit) {
          setError('You do not have permission to edit this collection');
          return;
        }

        setCollection(data);
      } catch (err) {
        console.error('Error fetching collection:', err);
        setError('An error occurred while loading the collection');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollection();
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-700">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading collection...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !collection) {
    return (
      <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-300 bg-white">
            <CardHeader>
              <CardTitle className="text-amber-900">
                {error === 'Collection not found' ? 'Collection Not Found' : 'Unable to Edit Collection'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 mb-4">{error || 'Collection not found'}</p>
              <div className="flex gap-4">
                <Link href="/collections">
                  <Button variant="outline" className="border-amber-600 text-amber-700">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Collections
                  </Button>
                </Link>
                {collection && (
                  <Link href={`/collections/${id}`}>
                    <Button variant="outline" className="border-amber-600 text-amber-700">
                      View Collection
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get primary author profile id
  const primaryAuthor = collection.authors.find((a) => a.is_primary);
  const typeConfig = collectionTypeConfig[collection.collection_type_id] || collectionTypeConfig[1];

  return (
    <CollectionForm
      collectionTypeId={collection.collection_type_id}
      collectionTypeName={typeConfig.name}
      collectionTypeLabel={typeConfig.label}
      mode="edit"
      collectionId={collection.collection_id}
      initialData={{
        title: collection.title,
        description: collection.description || '',
        primary_author_profile_id: primaryAuthor?.profile_id,
      }}
      initialPosts={collection.posts}
    />
  );
}
