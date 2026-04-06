'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/components/nav-item';
import { FileText, FolderOpen, Users, FilePlus, FolderPlus, UserPlus, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-provider';

export function LeftSidebar() {
  const pathname = usePathname();
  const { isLoggedIn, isAdmin, isModerator } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 text-center">
        <Link href="/">
          <h1 className="font-fantasy text-xl font-bold tracking-wide text-amber-900">Brandy Hall Archives</h1>
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

        {(isAdmin || isModerator) && (
          <div className="mt-4">
            <Separator className="mb-4 bg-amber-800/20" />
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-amber-700">
              Administration
            </h3>
            <div className="space-y-1">
              {[
                { href: '/admin', label: 'Dashboard' },
                { href: '/admin/users', label: 'Users' },
                { href: '/admin/moderation', label: 'Moderation' },
                { href: '/admin/audit-log', label: 'Audit Log' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    pathname === href
                      ? 'bg-amber-800 text-amber-50'
                      : 'text-amber-900 hover:bg-amber-100/80'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )}

      <nav className="flex-1 space-y-1">
        <NavItem href="/archive?postTypes=1" label="Writing" />
        <NavItem href="/archive?postTypes=2" label="Art" />
        <NavItem href="/characters" label="Characters" />
        <NavItem href="/archive?profileTypes=3" label="Kinships" />
        <NavItem href="/archive" label="Archive" />
        <NavItem href="/collections" label="Collections" />
        <NavItem href="/about" label="About And Rules" />
      </nav>
    </div>
  );
}
