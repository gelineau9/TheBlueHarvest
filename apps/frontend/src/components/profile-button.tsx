'use client';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import { AuthDialog } from './auth/auth-dialog';
import { useAuth } from './auth/auth-provider';

export function ProfileButton() {
  const { isLoggedIn, isLoading, username, avatarUrl, email } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Refresh the page to update auth state
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full bg-amber-50/30 backdrop-blur-sm hover:bg-amber-50/50 cursor-pointer"
        >
          <Avatar className="h-10 w-10 border border-amber-800/20">
            {isLoading ? (
              <AvatarFallback className="bg-amber-100 text-amber-900">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
              </AvatarFallback>
            ) : isLoggedIn ? (
              <>
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback className="bg-amber-100 text-amber-900">
                  {username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </>
            ) : (
              <>
                <AvatarFallback className="bg-amber-100 text-amber-900">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 border-amber-800/20 bg-amber-50" align="end" forceMount>
        {isLoading ? (
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
              <p className="text-sm font-medium leading-none text-amber-900">Loading...</p>
            </div>
          </DropdownMenuLabel>
        ) : isLoggedIn ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-amber-900">{username}</p>
                <p className="text-xs leading-none text-amber-700">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-amber-800/20" />
            <DropdownMenuItem asChild className="text-amber-900 hover:bg-amber-100">
              <Link href="/profile">
                <User className="mr-2 h-4 w-4 text-amber-700" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-amber-900 hover:bg-amber-100">
              <Settings className="mr-2 h-4 w-4 text-amber-700" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-amber-800/20" />
            <DropdownMenuItem className="text-amber-900 hover:bg-amber-100" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 text-amber-700" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium leading-none text-amber-900">Account</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-amber-800/20" />
            <DropdownMenuItem asChild className="text-amber-900 ">
              <AuthDialog
                trigger={
                  <div className="flex items-center w-full cursor-pointer hover:bg-amber-100 px-2 py-[6px] gap-2">
                    <User className="h-4 w-4 text-amber-700 " />
                    <span className="font-medium leading-none text-amber-900">Log in</span>
                  </div>
                }
              />
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-amber-900 hover:bg-amber-100">
              <Link href="/register">
                <User className="h-4 w-4 text-amber-700" />
                <span>Register</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
