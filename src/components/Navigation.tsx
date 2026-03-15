
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, User, Menu, LogOut, Info, UserPlus, LogIn, Shield, Bell, CheckCheck, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, deleteDoc } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import AddToHomeScreen from "./AddToHomeScreen";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function Navigation() {
  const { user, profile, isAdmin, logout, loading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [db, user?.uid]);

  const { data: allNotifications } = useCollection(notificationsQuery);

  const notifications = useMemo(() => {
    if (!allNotifications) return [];
    const now = new Date();
    // Filter out notifications that have expired (48 hours expiry logic)
    return allNotifications.filter(n => new Date(n.expiresAt) > now).slice(0, 15);
  }, [allNotifications]);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    if (!user?.uid || !db) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid, "notifications", id), { isRead: true });
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid || !db || notifications.length === 0) return;
    
    notifications.forEach(n => {
      if (!n.isRead) {
        updateDocumentNonBlocking(doc(db, "users", user.uid, "notifications", n.id), { isRead: true });
      }
    });
  };

  const handleDeleteAccount = async () => {
    if (!user || !db || isDeleting) return;
    setIsDeleting(true);
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // 1. Delete Firestore document first to ensure it's removed from lists
        await deleteDoc(doc(db, "users", user.uid));
        
        // 2. Delete Auth account
        await deleteUser(currentUser);
        
        toast({
          title: "Account Deleted",
          description: "Your fellowship data has been permanently removed."
        });
        
        setIsDeleteDialogOpen(false);
        router.push("/");
      }
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.code === 'auth/requires-recent-login' 
          ? "Please log out and log back in to perform this sensitive action."
          : "An error occurred while deleting your account."
      });
    } finally {
      setIsDeleting(false);
    }
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
          <Link href="/" className="text-sm font-medium hover:text-accent transition-colors">Home</Link>
          {user && (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-accent transition-colors">Dashboard</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <AddToHomeScreen />
          {!user && !loading && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="flex">
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
              <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
                <div className="p-4 font-bold border-b bg-muted/50 flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Fellowship Alerts</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-accent hover:bg-accent/10" onClick={handleMarkAllAsRead}>
                      <CheckCheck className="h-3 w-3 mr-1" /> Clear All
                    </Button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 border-b text-xs hover:bg-muted transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-accent/5' : ''}`}
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                         <p className={`font-bold uppercase tracking-widest text-[9px] ${!n.isRead ? 'text-accent' : 'text-muted-foreground'}`}>
                           {n.type}
                         </p>
                         <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {hasMounted ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                         </div>
                      </div>
                      <p className={`text-xs leading-relaxed ${!n.isRead ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{n.message}</p>
                      {!n.isRead && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-full" />
                      )}
                    </div>
                  )) : (
                    <div className="p-12 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                       <Bell className="h-8 w-8 opacity-20" />
                       No current alerts in your harbor.
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 text-center bg-muted/20">
                     <p className="text-[10px] text-muted-foreground italic">Alerts expire automatically after 48 hours.</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-accent/20 overflow-hidden">
                  <div className="h-full w-full bg-accent/20 flex items-center justify-center font-bold text-primary">
                    {profile?.profilePictureUrl ? (
                      <Image src={profile.profilePictureUrl} alt={profile.name || 'User'} fill className="object-cover" />
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
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your fellowship progress, points, and profile from the St. John Chrysostom Bookclub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
