'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LeftSidebar } from '@/components/left-side-bar';
import { RightSidebar } from '@/components/right-sidebar';
import { ProfileButton } from '@/components/profile-button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout — persistent three-column shell rendered in RootLayout.
 *
 * Desktop (lg+):
 *   [LeftSidebar ~16rem] | [main content flex-1] | [RightSidebar ~20rem]
 *
 * Mobile (<lg):
 *   Sticky top bar with hamburger → Sheet (left sidebar drawer)
 *               + search + profile buttons
 *   Content scrolls below the bar; RightSidebar stacks underneath main on mobile.
 *
 * This is a Client Component because LeftSidebar/RightSidebar each use
 * 'use client' hooks (usePathname, useAuth, useEffect, useState).
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f5e6c8] font-serif text-[#3a2921]">
      {/* ── Mobile header ──────────────────────────────────────────────── */}
      <header
        aria-label="Mobile navigation"
        className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-800/20 bg-[#f5e6c8] p-4 lg:hidden"
      >
        <div className="flex items-center gap-2">
          {/* Hamburger → left sidebar sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="border-amber-800/30" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-[#f5e6c8] p-0">
              <LeftSidebar />
            </SheetContent>
          </Sheet>

          <Link href="/" className="font-fantasy text-lg font-bold tracking-wide text-amber-900">
            Brandy Hall Archives
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="border-amber-800/30" aria-label="Search archive" asChild>
            <Link href="/archive">
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <ProfileButton />
        </div>
      </header>

      {/* ── Three-column body ───────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* Left sidebar — fixed-width desktop column, hidden on mobile */}
        <aside
          aria-label="Site navigation"
          className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-amber-800/20 bg-[#f5e6c8] p-4 lg:block"
        >
          <LeftSidebar />
        </aside>

        {/* Main content area */}
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>

        {/* Right sidebar — fixed-width desktop column, stacks below main on mobile */}
        <aside
          aria-label="Events and activity"
          className="w-full shrink-0 border-t border-amber-800/20 bg-[#f5e6c8] p-4 lg:w-80 lg:border-l lg:border-t-0"
        >
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
