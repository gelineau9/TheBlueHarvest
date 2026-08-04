'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/components/nav-item';
import { FileText, FolderOpen, Users, FilePlus, FolderPlus, UserPlus, BookOpen, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-provider';
import { useSidebarRefresh } from '@/contexts/SidebarRefreshContext';
import type { Resource } from '@/types/resources';

export function LeftSidebar() {
  const pathname = usePathname();
  const { isLoggedIn, isGuideAuthor, isAdmin, isModerator } = useAuth();
  const { refreshKey } = useSidebarRefresh();
  const mayAuthorGuides = isGuideAuthor || isAdmin || isModerator;

  const [guides, setGuides] = useState<Resource[]>([]);

  // Published guides are listed directly in the nav so they're reachable
  // without a detour through the Resources index
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/resources?type=guide', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { resources: Resource[] }) => setGuides(data.resources ?? []))
      .catch(() => {
        // Silently degrade — the Resources link still works
      });

    return () => controller.abort();
  }, [refreshKey]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 text-center">
        {/* Hover affordance so it reads as the home link, matching the nav items */}
        <Link
          href="/"
          title="Back to home"
          className="group block rounded-md px-3 py-2 transition-colors hover:bg-amber-100/80"
        >
          <h1 className="font-fantasy text-xl font-bold tracking-wide text-amber-900 transition-colors group-hover:text-amber-950">
            The Brandy Hall Archives
          </h1>
        </Link>
      </div>

      {/* User Dashboard - Only visible when logged in */}
      {isLoggedIn && (
        <div className="mb-4">
          <Separator className="mb-4 bg-amber-800/20" />
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-amber-700">My Dashboard</h3>
          <div className="space-y-1">
            <Link
              href="/my/posts"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                pathname === '/my/posts' ? 'bg-amber-800 text-amber-50' : 'text-amber-900 hover:bg-amber-100/80'
              }`}
            >
              <FileText className="h-4 w-4" />
              My Posts
            </Link>
            <Link
              href="/my/collections"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                pathname === '/my/collections' ? 'bg-amber-800 text-amber-50' : 'text-amber-900 hover:bg-amber-100/80'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              My Collections
            </Link>
            <Link
              href="/my/profiles"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                pathname === '/my/profiles' ? 'bg-amber-800 text-amber-50' : 'text-amber-900 hover:bg-amber-100/80'
              }`}
            >
              <Users className="h-4 w-4" />
              My Profiles
            </Link>
            {mayAuthorGuides && (
              <Link
                href="/my/guides"
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === '/my/guides' ? 'bg-amber-800 text-amber-50' : 'text-amber-900 hover:bg-amber-100/80'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                My Guides
              </Link>
            )}
          </div>
          <Separator className="mb-4 mt-4 bg-amber-800/20" />
          <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-amber-700">Quick Create</h4>
          <div className="space-y-1">
            <Link
              href="/posts/create"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100/80"
            >
              <FilePlus className="h-4 w-4" />
              New Post
            </Link>
            <Link
              href="/collections/create"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100/80"
            >
              <FolderPlus className="h-4 w-4" />
              New Collection
            </Link>
            <Link
              href="/profiles/create"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100/80"
            >
              <UserPlus className="h-4 w-4" />
              New Profile
            </Link>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {isLoggedIn && <Separator className="mb-4 bg-amber-800/20" />}
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-amber-700">Browse</h3>
        <NavItem href="/archive?postTypes=1" label="Writing" />
        <NavItem href="/archive?postTypes=2" label="Art" />
        <NavItem href="/characters" label="Characters" />
        <NavItem href="/kinships" label="Kinships" />
        <NavItem href="/archive" label="Archive" />
        <NavItem href="/collections" label="Collections" />
        <NavItem href="/about" label="About and Rules" />

        {/* Resources — sits below the main nav as its own list of links */}
        <div className="pt-4">
          <Separator className="mb-4 bg-amber-800/20" />
          <Link
            href="/resources"
            className="mb-2 block px-3 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:text-amber-900"
          >
            Resources
          </Link>

          <div className="space-y-0.5">
            {guides.length === 0 ? (
              <p className="px-3 py-1 text-sm text-amber-600 italic">No guides yet</p>
            ) : (
              guides.map((guide) => (
                <Link
                  key={guide.resource_id}
                  href={`/resources/${guide.slug}`}
                  className={`block rounded-md px-3 py-1.5 text-sm ${
                    pathname === `/resources/${guide.slug}`
                      ? 'bg-amber-800 text-amber-50'
                      : 'text-amber-900 hover:bg-amber-100/80'
                  }`}
                >
                  {guide.title}
                </Link>
              ))
            )}

            {mayAuthorGuides && (
              <Link
                href="/resources/create"
                className="mt-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100/80"
              >
                <Plus className="h-4 w-4" />
                Create Resource
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
