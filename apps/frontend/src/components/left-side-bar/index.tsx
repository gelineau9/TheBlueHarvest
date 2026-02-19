'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavItem } from '@/components/nav-item';
import { Search, PlusCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/components/auth/auth-provider';

export function LeftSidebar() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginDialogType, setLoginDialogType] = useState<'profile' | 'post'>('profile');

  const handleCreateProfileClick = () => {
    if (isLoggedIn) {
      router.push('/profiles/create');
    } else {
      setLoginDialogType('profile');
      setShowLoginDialog(true);
    }
  };

  const handleCreatePostClick = () => {
    if (isLoggedIn) {
      router.push('/posts/create/writing');
    } else {
      setLoginDialogType('post');
      setShowLoginDialog(true);
    }
  };

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

      <div className="mb-4 space-y-2">
        <Button onClick={handleCreateProfileClick} className="w-full bg-amber-800 text-amber-50 hover:bg-amber-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Profile
        </Button>
        <Button
          onClick={handleCreatePostClick}
          variant="outline"
          className="w-full border-amber-800 text-amber-800 hover:bg-amber-100"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </div>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="bg-[#f5e6c8] border-amber-800/30">
          <DialogHeader>
            <DialogTitle className="text-amber-900">Login Required</DialogTitle>
            <DialogDescription className="text-amber-800">
              You need to be logged in to create a {loginDialogType}. Please log in or create an account to continue.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <nav className="flex-1 space-y-1">
        <NavItem href="#" label="Home" active />
        <NavItem href="#" label="News" />
        <NavItem href="#" label="Writing" />
        <NavItem href="#" label="Art" />
        <NavItem href="/profiles" label="Catalog" />
        <NavItem href="#" label="About" />
        <NavItem href="#" label="Rules" />
        <Separator className="my-4 bg-amber-800/20" />
        <NavItem href="#" label="Discord" />
      </nav>
    </div>
  );
}
