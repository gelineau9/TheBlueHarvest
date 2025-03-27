"use client"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User } from "lucide-react"

interface ProfileButtonProps {
  isLoggedIn?: boolean
  username?: string
  avatarUrl?: string
}

export function ProfileButton({ isLoggedIn = false, username = "", avatarUrl = "" }: ProfileButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full bg-amber-50/30 backdrop-blur-sm hover:bg-amber-50/50"
        >
          <Avatar className="h-10 w-10 border-2 border-amber-800/20">
            {isLoggedIn ? (
              <>
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback className="bg-amber-100 text-amber-900">
                  {username.slice(0, 2).toUpperCase()}
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
        {isLoggedIn ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-amber-900">{username}</p>
                <p className="text-xs leading-none text-amber-700">user@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-amber-800/20" />
            <DropdownMenuItem className="text-amber-900 hover:bg-amber-100">
              <User className="mr-2 h-4 w-4 text-amber-700" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-amber-900 hover:bg-amber-100">
              <Settings className="mr-2 h-4 w-4 text-amber-700" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-amber-800/20" />
            <DropdownMenuItem className="text-amber-900 hover:bg-amber-100">
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
            <DropdownMenuItem asChild className="text-amber-900 hover:bg-amber-100">
              <Link href="/login">
                <User className="mr-2 h-4 w-4 text-amber-700" />
                <span>Log in</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-amber-900 hover:bg-amber-100">
              <Link href="/register">
                <User className="mr-2 h-4 w-4 text-amber-700" />
                <span>Register</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
