'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateMediaPostPage() {
  return (
    <div className="min-h-screen bg-[#f5e6c8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/posts/create" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post Types
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Create Media Post</h1>
          <p className="text-lg text-amber-700">
            Share screenshots, videos, and links
          </p>
        </div>

        <div className="bg-amber-100 border border-amber-300 rounded-lg p-8 text-center">
          <p className="text-amber-800">Media post creation coming soon...</p>
        </div>
      </div>
    </div>
  );
}
