
"use client";

import Link from "next/link";
import { BookOpen, User, Menu, LogOut, Info, UserPlus, LogIn, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export function Navigation() {
  const { user, profile, isAdmin, logout, loading } = useAuth();
  const db = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [db, user?.uid]);

  const { data: notifications } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAsRead = (id: string) => {
    if (!user?.uid) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid, "notifications", id), { isRead: true });
  };

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
          {user && (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-accent transition-colors">Dashboard</Link>
              <Link href="/forum" className="text-sm font-medium hover:text-accent transition-colors">Discussions</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!user && !loading && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden sm:flex">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
                <Link href="/register">Join Club</Link>
              </Button>
            </div>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-accent text-primary text-[10px] border-none">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-4 font-bold border-b flex justify-between items-center">
                  <span>Notifications</span>
                  {unreadCount > 0 && <span className="text-[10px] text-muted-foreground uppercase">{unreadCount} New</span>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications?.length ? notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 border-b text-xs hover:bg-muted transition-colors cursor-pointer ${!n.isRead ? 'bg-accent/5' : ''}`}
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      <p className={`font-medium ${!n.isRead ? 'text-primary' : 'text-muted-foreground'}`}>{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-xs text-muted-foreground italic">No new alerts.</div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-accent/20 overflow-hidden">
                  <div className="h-full w-full bg-accent/20 flex items-center justify-center font-bold text-primary">
                    {profile?.profilePictureUrl ? (
                      <Image src={profile.profilePictureUrl} alt={profile.name} fill className="object-cover" />
                    ) : (profile?.name?.charAt(0) || 'U')}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex flex-col space-y-1 p-4">
                  <p className="font-bold text-sm leading-none">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">Member Dashboard</Link>
                </DropdownMenuItem>
                {isAdmin && (
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
          )}
        </div>
      </div>
    </nav>
  );
}
