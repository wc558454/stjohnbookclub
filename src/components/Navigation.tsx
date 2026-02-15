
"use client";

import Link from "next/link";
import { BookOpen, User, Menu, LogOut, Info, UserPlus, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-accent" />
            <span className="font-headline text-xl font-bold text-primary tracking-tight">
              Chrysostom <span className="text-accent">Bookclub</span>
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/#about" className="text-sm font-medium hover:text-accent transition-colors">About</Link>
          {!user && (
            <Link href="/register" className="text-sm font-medium hover:text-accent transition-colors">Join</Link>
          )}
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-accent transition-colors">Dashboard</Link>
              <Link href="/forum" className="text-sm font-medium hover:text-accent transition-colors">Discussions</Link>
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium hover:text-accent transition-colors flex items-center gap-1.5">
              <LogIn className="h-4 w-4" /> Login
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-accent/20 overflow-hidden">
                  <div className="h-full w-full bg-accent/20 flex items-center justify-center font-bold text-primary">
                    {user.name.charAt(0)}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex flex-col space-y-1 p-4">
                  <p className="font-bold text-sm leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">Member Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/forum" className="cursor-pointer">Community Forum</Link>
                </DropdownMenuItem>
                {user.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" className="bg-primary hover:bg-primary/90 rounded-full px-6">
              <Link href="/register">Join Club</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
