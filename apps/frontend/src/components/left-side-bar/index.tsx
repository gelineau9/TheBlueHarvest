'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/components/nav-item';
import { Search, FileText, FolderOpen, Users, FilePlus, FolderPlus, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-provider';

export function LeftSidebar() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 text-center">
        <Image
          src="/placeholder.svg?height=120&width=200"
          alt="Brandy Hall Archives"
          width={200}
          height={120}
          className="mx-auto mb-2"
        />
        <h1 className="font-fantasy text-xl font-bold tracking-wide text-amber-900">Brandy Hall Archives</h1>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
          <input
            type="search"
            placeholder="Search archives..."
            className="w-full rounded-md border border-amber-800/30 bg-amber-50/50 py-2 pl-10 pr-4 text-sm placeholder:text-amber-700/50 focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
        </div>
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
          </div>
          <h4 className="mb-2 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-amber-700">Quick Create</h4>
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
        <NavItem href="#" label="Home" active />
        <NavItem href="#" label="News" />
        <NavItem href="#" label="Writing" />
        <NavItem href="#" label="Art" />
        <NavItem href="/archive" label="Archive" />
        <NavItem href="/collections" label="Collections" />
        <NavItem href="#" label="About" />
        <NavItem href="#" label="Rules" />
        <Separator className="my-4 bg-amber-800/20" />
        <NavItem href="#" label="Discord" />
      </nav>
    </div>
  );
}
