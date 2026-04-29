
"use client";

import { useEffect, useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  BookOpen, 
  Flame, 
  Target, 
  Star, 
  Award,
  CheckCircle2,
  CalendarDays,
  Loader2,
  Snowflake,
  Search,
  Footprints,
  Milestone,
  Mountain,
  Sunrise,
  BookUp,
  GaugeCircle,
  PartyPopper,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Library,
  Medal,
  Heart,
  Shield,
  Quote,
  History,
  Edit,
  Clock,
  Sparkle,
  Settings,
  BellRing,
  Zap,
  ShieldAlert
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, UserProfile, BadgeData } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useFirebaseApp } from "@/firebase";
import { collection, query, orderBy, limit, doc, setDoc, where, runTransaction, getDocs } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { requestNotificationPermission } from "@/firebase/messaging";
import { FirebaseApp } from "firebase/app";
import Link from "next/link";

const ICON_MAP: Record<string, any> = {
  Award, Star, Trophy, Medal, Flame, Sparkles, Heart, Shield
};

function UserBadgeList({ badges, size = "md" }: { badges?: BadgeData[], size?: "sm" | "md" }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {badges.map((badge) => {
        const Icon = ICON_MAP[badge.iconName] || Award;
        return (
          <Dialog key={badge.id}>
            <DialogTrigger asChild>
              <button className={`cursor-pointer rounded-full bg-accent/10 p-1 border border-accent/30 text-accent transition-transform hover:scale-110 ${size === 'sm' ? 'scale-75' : ''}`}>
                <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
              <DialogHeader className="items-center text-center">
                <div className="p-4 bg-accent/10 rounded-full inline-flex my-2">
                   <Icon className="h-10 w-10 text-accent" />
                </div>
                <DialogTitle className="text-xl font-headline">{badge.name}</DialogTitle>
                <DialogDescription className="text-sm px-4">{badge.description}</DialogDescription>
              </DialogHeader>
              <div className="text-center space-y-4 py-4">
                {badge.message && (
                  <blockquote className="text-sm italic border-l-2 pl-4 text-left bg-muted/30 p-3 rounded-r-lg mx-6">"{badge.message}"</blockquote>
                )}
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Awarded on {new Date(badge.awardedAt).toLocaleDateString()}</p>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const app = useFirebaseApp() as FirebaseApp;
  const { toast } = useToast();
  
  const [pagesReadToday, setPagesReadToday] = useState<number>(0);
  const [reflection, setReflection] = useState("");
  const [hasMounted, setHasMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [showReflectionHistory, setShowReflectionHistory] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string>("default");

  const [editingReflection, setEditingReflection] = useState<any>(null);
  const [editReflectionText, setEditReflectionText] = useState("");
  const [userRank, setUserRank] = useState<number>(-1);

  const reflectionWordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const editReflectionWordCount = editReflectionText.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    setHasMounted(true);
    if ("Notification" in window) {
      setNotificationPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function calculateRank() {
      if (!user?.uid || profile?.points === undefined || !db) return;
      
      const q = query(
        collection(db, "users"),
        where("points", ">", profile.points)
      );
      
      try {
        const snapshot = await getDocs(q);
        setUserRank(snapshot.size + 1);
      } catch (e) {
      }
    }
    
    if (profile?.points !== undefined) {
      calculateRank();
    }
  }, [user?.uid, profile?.points, db]);

  const activeBooksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "books"), where("status", "==", "current"));
  }, [db, user]);
  const { data: activeBooks } = useCollection(activeBooksQuery);

  const currentBook = useMemo(() => {
    if (!activeBooks || !profile?.currentBookId) return null;
    return activeBooks.find(b => b.id === profile.currentBookId);
  }, [activeBooks, profile?.currentBookId]);

  const challengesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "challenges"), where("isActive", "==", true));
  }, [db, user]);
  const { data: challenges } = useCollection(challengesQuery);

  const userChallengesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(db, "users", user.uid, "userChallenges"), orderBy("completedAt", "desc"));
  }, [db, user?.uid]);
  const { data: userChallenges } = useCollection(userChallengesQuery);

  const reflections = useMemo(() => {
    return userChallenges?.filter(uc => uc.id.startsWith('refl_')) || [];
  }, [userChallenges]);

  const discussionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "discussions"), orderBy("scheduledDateTime", "asc"), limit(50));
  }, [db, user]);
  const { data: discussions } = useCollection(discussionsQuery);

  const weeklyLeaderboardQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("weeklyPoints", "desc"), limit(10));
  }, [db, user]);
  const { data: weeklyLeaderboardMembers } = useCollection(weeklyLeaderboardQuery);

  const monthlyLeaderboardQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("monthlyPoints", "desc"), limit(10));
  }, [db, user]);
  const { data: monthlyLeaderboardMembers } = useCollection(monthlyLeaderboardQuery);

  const allTimeLeaderboardQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("points", "desc"), limit(10));
  }, [db, user]);
  const { data: allTimeLeaderboardMembers } = useCollection(allTimeLeaderboardQuery);

  const streakLeaderboardQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("streak", "desc"), limit(10));
  }, [db, user]);
  const { data: streakLeaderboardMembers } = useCollection(streakLeaderboardQuery);

  const pagesPerDayToFinish = useMemo(() => {
    if (!currentBook || !profile || !currentBook.currentReadingPlanDueDate) return 0;
    
    const remainingPages = currentBook.totalPages - (profile.currentPagesRead || 0);
    if (remainingPages <= 0) return 0;

    const dueDate = new Date(currentBook.currentReadingPlanDueDate);
    dueDate.setHours(23, 59, 59, 999);
    const today = new Date();
    
    if (dueDate < today) return remainingPages;

    const diffTime = dueDate.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) return remainingPages;

    return Math.ceil(remainingPages / remainingDays);
  }, [currentBook, profile]);

  const todayReflection = useMemo(() => {
    if (!userChallenges) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return userChallenges.find(uc => uc.id === `refl_${todayStr}`) || null;
  }, [userChallenges]);

  const hasReflectedToday = !!todayReflection;

  const upcomingDiscussions = useMemo(() => {
    if (!discussions) return [];
    const now = new Date();
    const cutOff = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return discussions.filter(d => new Date(d.scheduledDateTime) >= cutOff);
  }, [discussions]);

  const completedTodayChallengesCount = useMemo(() => {
    if (!challenges || !userChallenges) return 0;
    const now = new Date().toDateString();
    return userChallenges.filter(uc => {
      const chall = challenges.find(c => c.id === uc.challengeId);
      if (!chall || chall.type !== 'Daily') return false;
      return new Date(uc.completedAt).toDateString() === now;
    }).length;
  }, [challenges, userChallenges]);

  const getStreakUpdate = (currentProfile: UserProfile, now: Date) => {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    lastMonday.setHours(0, 0, 0, 0);

    const lastRefillAt = currentProfile.lastFreezeRefill ? new Date(currentProfile.lastFreezeRefill) : new Date(0);
    let tempFreezeCount = currentProfile.freezeCount ?? 2;
    let newRefillDate = currentProfile.lastFreezeRefill;

    if (lastRefillAt.getTime() < lastMonday.getTime()) {
      tempFreezeCount = 2;
      newRefillDate = now.toISOString();
    }

    const lastActivityAt = currentProfile.lastStreakActivityAt ? new Date(currentProfile.lastStreakActivityAt) : null;
    let newStreak = currentProfile.streak || 0;
    let streakToastInfo = { title: "Progress Recorded", description: "Keep going!" };
    let streakAlertNotif: { id: string, message: string, type: 'StreakProtection' | 'StreakReset' } | null = null;

    if (!lastActivityAt) {
      newStreak = 1;
    } else {
      const lastActivityStart = new Date(lastActivityAt.getFullYear(), lastActivityAt.getMonth(), lastActivityAt.getDate()).getTime();
      const diffDays = Math.round((todayStart - lastActivityStart) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = currentProfile.streak || 1;
      } else if (diffDays === 1) {
        newStreak += 1;
        streakToastInfo = { title: "Streak Extended!", description: `Your streak is now ${newStreak} days!` };
      } else if (diffDays > 1) {
        const missedDays = diffDays - 1;
        if (tempFreezeCount >= missedDays) {
          tempFreezeCount -= missedDays;
          newStreak += 1; 
          streakToastInfo = { title: "Streak Preserved!", description: `You missed ${missedDays} day(s), but freezes were used. Streak is now ${newStreak} days.` };
          
          streakAlertNotif = {
            id: `streak_prot_${now.getTime()}`,
            message: `Streak Protection Alert! You missed ${missedDays} day(s), but your streak was saved using freezes.`,
            type: 'StreakProtection'
          };
        } else {
          newStreak = 1;
          streakToastInfo = { title: "Streak Reset", description: "You missed too many days. Starting fresh at 1." };

          streakAlertNotif = {
            id: `streak_reset_${now.getTime()}`,
            message: `Your reading streak has been reset because you ran out of freezes. Let's start a new journey today!`,
            type: 'StreakReset'
          };
        }
      }
    }

    const newLongestStreak = Math.max(currentProfile.longestStreak || 0, newStreak);

    return {
      streak: newStreak,
      longestStreak: newLongestStreak,
      freezeCount: tempFreezeCount,
      lastStreakActivityAt: now.toISOString(),
      lastFreezeRefill: newRefillDate,
      streakToastInfo,
      streakAlertNotif
    };
  };

  if (loading || !user || !profile) return null;

  if (profile.status === "Deactivated") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative bg-white p-10 rounded-full shadow-xl border-2 border-red-200">
            <ShieldAlert className="h-20 w-20 text-red-500" />
          </div>
          <div className="max-w-xl space-y-4">
             <Badge variant="destructive" className="px-4 py-1 text-xs font-bold uppercase tracking-widest">Membership Suspended</Badge>
             <h1 className="text-4xl font-bold text-primary font-headline leading-tight">Access Restricted</h1>
             <p className="text-lg text-muted-foreground leading-relaxed italic">
               "Discipline is the root of all good things." — St. John Chrysostom
             </p>
             <p className="text-sm text-muted-foreground/80 font-medium">
               Your access to the St. John Chrysostom Bookclub has been deactivated due to inactivity or admin review.
               If you believe this is an error, please contact the fellowship administrators.
             </p>
          </div>
          <Button variant="ghost" className="rounded-full px-8 h-12 text-muted-foreground" onClick={() => logout()}>
            Sign Out
          </Button>
        </main>
      </div>
    );
  }

  if (profile.status === "Pending Approval" || profile.status === "Deactivated") {
    const isDeactivated = profile.status === "Deactivated";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative bg-white p-10 rounded-full shadow-xl border-2 border-accent/20">
              {isDeactivated ? <ShieldAlert className="h-20 w-20 text-destructive" /> : <Clock className="h-20 w-20 text-accent" />}
            </div>
          </div>
          
          <div className="max-w-xl space-y-4">
            <Badge variant="outline" className={`${isDeactivated ? 'text-destructive border-destructive bg-destructive/5' : 'text-accent border-accent bg-accent/5'} px-4 py-1 text-xs font-bold uppercase tracking-widest`}>
              {isDeactivated ? 'Account Restricted' : 'Verification in Progress'}
            </Badge>
            <h1 className="text-4xl font-bold text-primary font-headline leading-tight">
              {isDeactivated ? 'Access Restrictred' : `Welcome to the Harbor, \n ${profile.name}`}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed italic px-4">
              {isDeactivated 
                ? "Your account access has been restricted by an administrator. Please contact the fellowship leaders for more information."
                : "As a ship entering a harbor finds rest from the waves, so your soul will find peace in spiritual instruction."}
            </p>
            {!isDeactivated && (
              <p className="text-sm text-muted-foreground/80 font-medium">
                Your application is currently being reviewed by the fellowship administrators. 
                We'll have you reading and reflecting in no time!
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" className="rounded-full px-8 h-12" onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
            <Button variant="ghost" className="rounded-full px-8 h-12 text-muted-foreground" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>

          <div className="pt-12 flex items-center gap-2 text-muted-foreground/40">
             <Sparkle className="h-4 w-4" />
             <p className="text-[10px] font-bold uppercase tracking-widest">St. Paul Hospital Medical College Campus Fellowship</p>
             <Sparkle className="h-4 w-4" />
          </div>
        </main>
      </div>
    );
  }

  const handleSelectBook = (bookId: string) => {
    if (!user?.uid || !db || !profile) return;
    
    const savedProgress = profile.bookProgress?.[bookId] || 0;
    
    updateDocumentNonBlocking(doc(db, "users", user.uid), {
      currentBookId: bookId,
      currentPagesRead: savedProgress
    });
    
    toast({ 
      title: savedProgress > 0 ? "Study Resumed" : "Study Selected", 
      description: savedProgress > 0 
        ? `Resuming from page ${savedProgress}.` 
        : "You have started a new book study." 
    });
  };

  const getRank = (pts: number) => {
    if (pts <= 1000) return { title: "Seeker", level: 1, icon: Search, color: "text-muted-foreground" };
    if (pts <= 3000) return { title: "Golden Seeker", level: 2, icon: Footprints, color: "text-accent" };
    if (pts <= 5000) return { title: "Pilgrim", level: 3, icon: Milestone, color: "text-primary" };
    if (pts <= 7000) return { title: "Golden Pilgrim", level: 4, icon: Mountain, color: "text-accent" };
    if (pts <= 10000) return { title: "Beacon", level: 5, icon: Sunrise, color: "text-primary" };
    return { title: "Golden Beacon", level: 6, icon: Award, color: "text-accent" };
  };

  const rank = getRank(profile.points || 0);
  const readingTotal = profile.currentPagesRead || 0;
  const progressPercent = currentBook ? Math.min(100, Math.round((readingTotal / currentBook.totalPages) * 100)) : 0;
  
  const handleMarkComplete = async () => {
    if (!currentBook) return;
    if (pagesReadToday <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a positive number of pages." });
      return;
    }

    if ((readingTotal + pagesReadToday) > currentBook.totalPages) {
      toast({ variant: "destructive", title: "Page Limit Exceeded", description: `Cannot log more than ${currentBook.totalPages} pages.` });
      return;
    }

    setIsSubmitting(true);
    const userRef = doc(db, "users", user.uid);
    const now = new Date();
    
    try {
      let finalToastTitle = "Progress Recorded";
      let finalToastDescription = `Progress recorded! Keep going.`;

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data() as UserProfile;

        const streakUpdate = getStreakUpdate(currentProfile, now);
        finalToastTitle = streakUpdate.streakToastInfo.title;
        finalToastDescription = streakUpdate.streakToastInfo.description;
        
        const ptsToAdd = pagesReadToday * 2;
        
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const lastActivityAt = currentProfile.lastStreakActivityAt ? new Date(currentProfile.lastStreakActivityAt) : null;
        let currentDailyPagesSum = pagesReadToday;
        
        if (lastActivityAt) {
            const lastActivityStart = new Date(lastActivityAt.getFullYear(), lastActivityAt.getMonth(), lastActivityAt.getDate()).getTime();
            const diffDays = Math.round((todayStart - lastActivityStart) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) { 
                 currentDailyPagesSum = (currentProfile.dailyPagesRead || 0) + pagesReadToday;
                 finalToastTitle = "Progress Updated"; 
                 finalToastDescription = `You've read ${currentDailyPagesSum} pages today.`
            }
        }
        
        const newPersonalBest = Math.max(currentProfile.personalBestPages || 0, currentDailyPagesSum);
        const newPagesReadTotal = (currentProfile.currentPagesRead || 0) + pagesReadToday;
        const updatedBookProgress = {
          ...(currentProfile.bookProgress || {}),
          [currentProfile.currentBookId!]: newPagesReadTotal
        };

        const currentMonthStr = now.toISOString().slice(0, 7);
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        lastMonday.setHours(0, 0, 0, 0);
        const currentWeekStr = lastMonday.toISOString().split('T')[0];

        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + ptsToAdd
            : ptsToAdd;

        const newWeeklyPoints =
          currentProfile.currentWeek === currentWeekStr
            ? (currentProfile.weeklyPoints || 0) + ptsToAdd
            : ptsToAdd;

        transaction.update(userRef, {
          points: (currentProfile.points || 0) + ptsToAdd,
          currentPagesRead: newPagesReadTotal,
          bookProgress: updatedBookProgress,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
          weeklyPoints: newWeeklyPoints,
          currentWeek: currentWeekStr,
          personalBestPages: newPersonalBest,
          dailyPagesRead: currentDailyPagesSum,
          streak: streakUpdate.streak,
          longestStreak: streakUpdate.longestStreak,
          freezeCount: streakUpdate.freezeCount,
          lastStreakActivityAt: streakUpdate.lastStreakActivityAt,
          lastFreezeRefill: streakUpdate.lastFreezeRefill,
        });

        if (streakUpdate.streakAlertNotif) {
          const { id, message, type } = streakUpdate.streakAlertNotif;
          transaction.set(doc(db, "users", user.uid, "notifications", id), {
            id,
            userId: user.uid,
            type,
            message,
            isRead: false,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
          });
        }
      });
      
      toast({ title: finalToastTitle, description: finalToastDescription });
      
      if (readingTotal + pagesReadToday >= currentBook.totalPages) {
        setShowCompletionCelebration(true);
      }

      setPagesReadToday(0);
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: typeof e === 'string' ? e : "Could not record progress." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReflectionSubmit = async () => {
    const words = reflection.trim().split(/\s+/).filter(Boolean);
    if (words.length < 30) {
      toast({ variant: "destructive", title: "Invalid Reflection", description: "Reflection must be at least 30 words long." });
      return;
    }

    const reward = 5;
    const reflectionId = `refl_${new Date().toISOString().split('T')[0]}`;
    const challRef = doc(db, "users", user.uid, "userChallenges", reflectionId);
    
    setIsSubmitting(true);
    const userRef = doc(db, "users", user.uid);
    const now = new Date();
    try {
      let toastTitle = "Reflection Shared";
      let toastDescription = `Reflection saved!`;

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data() as UserProfile;

        const existingRefl = await transaction.get(challRef);
        if (existingRefl.exists()) throw "Already submitted today";

        transaction.set(challRef, {
          id: reflectionId,
          challengeId: "reflection_daily",
          userId: user.uid,
          status: "Completed",
          completedAt: new Date().toISOString(),
          pointsEarned: reward,
          submissionText: reflection
        });

        const streakUpdate = getStreakUpdate(currentProfile, now);
        toastTitle = streakUpdate.streakToastInfo.title;
        toastDescription = streakUpdate.streakToastInfo.description;

        const currentMonthStr = now.toISOString().slice(0, 7);
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        lastMonday.setHours(0, 0, 0, 0);
        const currentWeekStr = lastMonday.toISOString().split('T')[0];

        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + reward
            : reward;

        const newWeeklyPoints =
          currentProfile.currentWeek === currentWeekStr
            ? (currentProfile.weeklyPoints || 0) + reward
            : reward;

        transaction.update(userRef, {
          points: (currentProfile.points || 0) + reward,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
          weeklyPoints: newWeeklyPoints,
          currentWeek: currentWeekStr,
          streak: streakUpdate.streak,
          longestStreak: streakUpdate.longestStreak,
          freezeCount: streakUpdate.freezeCount,
          lastStreakActivityAt: streakUpdate.lastStreakActivityAt,
          lastFreezeRefill: streakUpdate.lastFreezeRefill,
        });
        
        if (streakUpdate.streakAlertNotif) {
          const { id, message, type } = streakUpdate.streakAlertNotif;
          transaction.set(doc(db, "users", user.uid, "notifications", id), {
            id,
            userId: user.uid,
            type,
            message,
            isRead: false,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
          });
        }
      });

      setReflection("");
      toast({ title: toastTitle, description: toastDescription });
    } catch(e) {
      console.error(e);
      toast({ variant: "destructive", title: "Submission Failed", description: e === "Already submitted today" ? e : "Could not save reflection." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReflection = async () => {
    const words = editReflectionText.trim().split(/\s+/).filter(Boolean);
    if (words.length < 30) {
      toast({ variant: "destructive", title: "Invalid Reflection", description: "Reflection must be at least 30 words long." });
      return;
    }

    if (!editingReflection || !user) return;

    setIsSubmitting(true);
    const reflectionRef = doc(db, "users", user.uid, "userChallenges", editingReflection.id);
    
    try {
      updateDocumentNonBlocking(reflectionRef, {
        submissionText: editReflectionText
      });
      toast({ title: "Reflection Updated", description: "Your spiritual note has been corrected." });
      setEditingReflection(null);
      setEditReflectionText("");
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async (discussion: any) => {
    const discDate = new Date(discussion.scheduledDateTime);
    const now = new Date();
    const diffHours = (now.getTime() - discDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0 || diffHours > 24) {
      toast({ variant: "destructive", title: "Check-in Not Available", description: "Check-in within 24 hours of start." });
      return;
    }

    const reward = 20;
    const checkInId = `att_${discussion.id}`;
    const userRef = doc(db, "users", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data();

        transaction.set(doc(db, "users", user.uid, "userChallenges", checkInId), {
          id: checkInId,
          challengeId: discussion.id,
          userId: user.uid,
          status: "Completed",
          completedAt: new Date().toISOString(),
          pointsEarned: reward
        });

        const currentMonthStr = now.toISOString().slice(0, 7);
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        lastMonday.setHours(0, 0, 0, 0);
        const currentWeekStr = lastMonday.toISOString().split('T')[0];

        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + reward
            : reward;

        const newWeeklyPoints =
          currentProfile.currentWeek === currentWeekStr
            ? (currentProfile.weeklyPoints || 0) + reward
            : reward;
        
        transaction.update(userRef, {
          points: (currentProfile.points || 0) + reward,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
          weeklyPoints: newWeeklyPoints,
          currentWeek: currentWeekStr,
        });
      });
      toast({ title: "Checked In", description: `Check-in successful!` });
    } catch(e) {
      toast({ variant: "destructive", title: "Check-in Failed" });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid || !db) return;
    
    const formData = new FormData(e.currentTarget);
    const updatedData = {
      name: formData.get("name") as string,
      pagesPerWeek: parseInt(formData.get("pagesPerWeek") as string),
      guidingSaint: formData.get("guidingSaint") as string,
      spiritualGoal: formData.get("spiritualGoal") as string,
    };

    updateDocumentNonBlocking(doc(db, "users", user.uid), updatedData);
    toast({ title: "Profile Updated", description: "Your spiritual profile has been refreshed." });
    setIsEditProfileOpen(false);
  };

  const handleRequestPermission = async () => {
    if (!user || !app) return;
    const token = await requestNotificationPermission(app, db, user.uid);
    if (token) {
      toast({ title: "Notifications Enabled!", description: "You'll now receive updates on your device." });
      setNotificationPermissionStatus("granted");
    } else {
      toast({ variant: "destructive", title: "Permission Denied", description: "You can enable notifications in your browser settings." });
      setNotificationPermissionStatus("denied");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-4 gap-6 items-start">
          <div className="md:col-span-2 flex items-start gap-6">
            <div className="relative h-20 w-20 rounded-full border-2 border-accent overflow-hidden shadow-sm bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.profilePictureUrl ? (
                <Image src={profile.profilePictureUrl} alt={profile.name} fill className="object-cover" />
              ) : profile.name?.charAt(0)}
            </div>
            <div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary font-headline">{profile.name}</h1>
                  <UserBadgeList badges={profile.badges} />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-accent" onClick={() => setIsEditProfileOpen(true)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.groupName && <Badge variant="secondary">{profile.groupName}</Badge>}
                  {profile.guidingSaint && <Badge variant="outline" className="border-accent text-accent">Guided by {profile.guidingSaint}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Goal: {profile.pagesPerWeek || 0} pages per week</p>
                {profile.spiritualGoal && (
                  <div className="mt-2 max-w-sm">
                    <p className="text-[10px] uppercase font-bold text-accent flex items-center gap-1">
                       <Quote className="h-3 w-3" /> My Spiritual Goal
                    </p>
                    <p className="text-xs text-muted-foreground italic leading-snug mt-0.5 line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                      "{profile.spiritualGoal}"
                    </p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <div className={`inline-flex items-center gap-3 p-2 pr-4 rounded-full bg-card border shadow-sm`}>
                     <div className={`p-2 rounded-full bg-accent/10 ${rank.color}`}>
                          <rank.icon className="h-5 w-5" />
                     </div>
                     <div>
                         <p className={`font-bold text-lg leading-tight ${rank.color}`}>{rank.title}</p>
                         <p className="text-xs font-medium text-muted-foreground">Level {rank.level}</p>
                     </div>
                  </div>
                  {userRank !== -1 && (
                    <div className="bg-accent/5 px-3 py-1 rounded-full border border-accent/20 flex items-center gap-1.5 shadow-sm">
                       <Trophy className="h-3.5 w-3.5 text-accent" />
                       <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Rank #{userRank}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Star className="h-4 w-4 text-accent fill-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Points (W / M / Total)</p>
                <p className="text-base font-bold text-primary">
                  {profile.weeklyPoints || 0} / {profile.monthlyPoints || 0} / {profile.points?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Flame className={`h-4 w-4 ${profile.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Streak</p>
                <p className="text-lg font-bold text-primary">{profile.streak || 0}d</p>
              </div>
            </div>
             <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Snowflake className={`h-4 w-4 ${(profile.freezeCount ?? 0) > 0 ? 'text-blue-400' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Freezes</p>
                <p className="text-lg font-bold text-primary">{profile.freezeCount ?? 0}</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Longest Streak</p>
                <p className="text-lg font-bold text-primary">{profile.longestStreak || 0}d</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2 col-span-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Personal Best per day</p>
                <p className="text-lg font-bold text-primary">{profile.personalBestPages || 0} pgs</p>
              </div>
            </div>
          </div>
        </div>

        {!currentBook ? (
          <div className="space-y-6">
            <header className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-primary font-headline">Choose Your Path</h2>
              <p className="text-muted-foreground">Select an active book study to begin your spiritual journey.</p>
            </header>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBooks?.map(book => {
                const savedPages = profile.bookProgress?.[book.id] || 0;
                return (
                  <Card key={book.id} className="border-none shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
                    <div className="h-48 bg-primary relative flex items-center justify-center overflow-hidden">
                      <BookOpen className="h-20 w-20 text-white/10 group-hover:scale-125 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-60" />
                      {savedPages > 0 && (
                        <Badge className="absolute top-4 left-4 bg-accent text-primary font-bold">
                          RESUME (Pg {savedPages})
                        </Badge>
                      )}
                      <Badge className="absolute top-4 right-4 bg-white/20 text-white font-bold">ACTIVE</Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl font-headline text-primary">{book.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{book.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><BookUp className="h-3 w-3" /> {book.totalPages} Pages</span>
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Due: {book.currentReadingPlanDueDate ? new Date(book.currentReadingPlanDueDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={() => handleSelectBook(book.id)} className="w-full rounded-full bg-primary font-bold group">
                        {savedPages > 0 ? "Resume Study" : "Begin Study"} <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
              {activeBooks?.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4 bg-muted/20 rounded-xl border border-dashed">
                   <Library className="h-12 w-12 text-muted-foreground mx-auto" />
                   <p className="text-muted-foreground italic">No studies currently available. Check back soon!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-none shadow-sm bg-primary text-white overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/10 text-accent">MY CURRENT STUDY</Badge>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-white/60 hover:text-white hover:bg-white/10" onClick={() => updateDocumentNonBlocking(doc(db, "users", user.uid), { currentBookId: null })}>
                          Change Book
                        </Button>
                      </div>
                      <CardTitle className="text-xl font-headline">{currentBook.title}</CardTitle>
                    </div>
                    <BookOpen className="h-6 w-6 text-accent/50" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60">
                      <span>Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-white/10" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 p-3 rounded-md text-center">
                      <p className="text-[10px] text-primary-foreground/40 font-bold uppercase flex items-center justify-center gap-1"><BookUp className="h-3 w-3" /> Current Page</p>
                      <p className="text-sm font-bold">{readingTotal} <span className="text-primary-foreground/60">of {currentBook.totalPages}</span></p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-md text-center">
                      <p className="text-[10px] text-primary-foreground/40 font-bold uppercase flex items-center justify-center gap-1"><GaugeCircle className="h-3 w-3" /> Pace to Finish</p>
                      <p className="text-sm font-bold">{pagesPerDayToFinish} pgs/day</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-md text-center">
                      <p className="text-[10px] text-primary-foreground/40 font-bold uppercase flex items-center justify-center gap-1"><CalendarDays className="h-3 w-3" /> Due Date</p>
                      <p className="text-sm font-bold">{currentBook.currentReadingPlanDueDate ? new Date(currentBook.currentReadingPlanDueDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-accent/5">
                <CardHeader className="pb-2">
                  <Target className="h-4 w-4 text-accent" /> Daily Progress Tracker
                  <CardDescription className="text-xs">Submit your reading to earn points. You can log progress multiple times a day!</CardDescription>
                </CardHeader>
                <CardContent className="flex items-end gap-3 pb-6">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pages Read Now</Label>
                    <Input type="number" value={pagesReadToday} onChange={(e) => setPagesReadToday(parseInt(e.target.value) || 0)} className="h-10 bg-white" />
                  </div>
                  <Button onClick={handleMarkComplete} disabled={pagesReadToday <= 0 || isSubmitting} className="h-10 px-8 rounded-full font-bold">
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Reading"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-accent/5">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 font-headline">
                        <MessageSquare className="h-4 w-4 text-accent" /> Daily Reading Reflection
                      </CardTitle>
                      <CardDescription className="text-xs">Share what you learned from today's reading (min. 30 words) to earn points and maintain your streak.</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowReflectionHistory(!showReflectionHistory)}
                      className="text-[10px] h-7 px-2 font-bold uppercase tracking-widest text-accent"
                    >
                      <History className="h-3 w-3 mr-1" /> {showReflectionHistory ? "Hide" : "View"} History
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <Collapsible open={showReflectionHistory} onOpenChange={setShowReflectionHistory}>
                    <CollapsibleContent className="space-y-4 mb-4 animate-in fade-in duration-300">
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest border-b pb-1 flex items-center gap-2">
                          <History className="h-3 w-3" /> Reflection Archive
                        </h4>
                        {reflections.length > 0 ? reflections.map((refl) => (
                          <div key={refl.id} className="p-3 bg-white border rounded-lg shadow-sm space-y-1 group relative">
                            <div className="flex justify-between items-center border-b pb-1 mb-1">
                              <span className="text-[9px] font-bold text-accent uppercase tracking-tighter">
                                {new Date(refl.completedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" 
                                  onClick={() => { setEditingReflection(refl); setEditReflectionText(refl.submissionText || ""); }}
                                >
                                  <Edit className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-foreground/80 leading-relaxed italic">"{refl.submissionText}"</p>
                          </div>
                        )) : (
                          <p className="text-[10px] text-center text-muted-foreground italic py-4">Your spiritual journal is empty. Begin reflecting today!</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {hasReflectedToday ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-green-600 font-bold p-4 bg-green-50 border border-green-100 rounded-xl">
                        <CheckCircle2 className="h-6 w-6" />
                        <div className="flex-1">
                          <p className="text-sm">Reflection submitted for today!</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] font-bold text-green-700 hover:bg-green-100"
                          onClick={() => { setEditingReflection(todayReflection); setEditReflectionText(todayReflection?.submissionText || ""); }}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit Today's Note
                        </Button>
                      </div>
                      <div className="p-3 bg-white/50 border rounded-lg italic text-xs text-muted-foreground">
                        "{todayReflection?.submissionText}"
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea 
                        placeholder="Today I learned..." 
                        value={reflection} 
                        onChange={(e) => setReflection(e.target.value)}
                        className="bg-white min-h-[120px] shadow-inner focus-visible:ring-accent"
                      />
                      <div className="flex justify-between items-center">
                         <p className={`text-[10px] font-bold uppercase tracking-tight ${reflectionWordCount < 30 ? 'text-muted-foreground' : 'text-green-600'}`}>
                           Words: {reflectionWordCount} / 30
                         </p>
                         <Button onClick={handleReflectionSubmit} disabled={reflectionWordCount < 30 || isSubmitting} size="sm" className="rounded-full px-6 bg-primary font-bold">
                           {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Reflection"}
                         </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-accent/5">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 font-headline">
                        <Zap className="h-4 w-4 text-accent" /> Spiritual Challenges
                      </CardTitle>
                      <CardDescription className="text-xs">Deepen your practice beyond reading. Earn additional points!</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-accent text-accent font-bold">
                       <Link href="/challenges">View All Challenges <ArrowRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="bg-white p-4 rounded-xl border flex items-center justify-between shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-accent/10 rounded-full flex items-center justify-center">
                           <Zap className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-primary">Daily Goals Completed</p>
                           <p className="text-xs text-muted-foreground">You finished {completedTodayChallengesCount} challenge(s) today.</p>
                        </div>
                     </div>
                     <Link href="/challenges">
                        <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-accent">Go to Dashboard</Button>
                     </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
               <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4 text-accent" /> Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notificationPermissionStatus === 'granted' ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Push notifications are enabled.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Enable push notifications to get reminders and updates directly on your device.</p>
                      <Button 
                        onClick={handleRequestPermission} 
                        disabled={notificationPermissionStatus === 'denied'}
                        className="w-full"
                      >
                        <BellRing className="h-4 w-4 mr-2" /> Enable Notifications
                      </Button>
                      {notificationPermissionStatus === 'denied' && (
                        <p className="text-[10px] text-destructive text-center">You have blocked notifications. Please enable them in your browser settings.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-4 border-b bg-accent/5">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-accent" /> Upcoming Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 min-h-[200px]">
                  {upcomingDiscussions.length > 0 ? upcomingDiscussions.map(disc => {
                    const attended = userChallenges?.some(uc => uc.challengeId === disc.id);
                    return (
                      <div key={disc.id} className="p-3 bg-white rounded-md border border-accent/5 flex justify-between items-start shadow-sm hover:border-accent/20 transition-colors">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-primary">{disc.topic}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {hasMounted ? new Date(disc.scheduledDateTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '...'}
                          </p>
                        </div>
                        {!attended && (
                          <Button variant="ghost" size="sm" onClick={() => handleCheckIn(disc)} className="h-6 text-[9px] px-2 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors">
                            Check-in
                          </Button>
                        )}
                        {attended && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
                       <Clock className="h-8 w-8 mb-2" />
                       <p className="text-xs italic">No upcoming discussions scheduled.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden">
                <Tabs defaultValue="weekly" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-auto p-0 rounded-none bg-accent/5">
                    <TabsTrigger value="weekly" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Weekly
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value="all-time" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      All-Time
                    </TabsTrigger>
                    <TabsTrigger value="streaks" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Streaks
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="weekly" className="mt-0">
                    {weeklyLeaderboardMembers?.length ? weeklyLeaderboardMembers.map((m, i) => {
                      const mRank = getRank(m.points || 0);
                      return (
                        <div key={m.id} className={`flex items-center gap-3 p-3 border-t ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                          <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold">{m.name}</p>
                              {m.groupName && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0">{m.groupName}</Badge>}
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" />
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] text-accent font-bold uppercase tracking-widest">{m.weeklyPoints || 0} WEEKLY POINTS</p>
                              <p className="text-[9px] text-muted-foreground italic">Best: {m.personalBestPages || 0} pgs/day</p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-center text-muted-foreground italic p-6">No rankings yet.</p>}
                  </TabsContent>
                  <TabsContent value="monthly" className="mt-0">
                    {monthlyLeaderboardMembers?.length ? monthlyLeaderboardMembers.map((m, i) => {
                      const mRank = getRank(m.points || 0);
                      return (
                        <div key={m.id} className={`flex items-center gap-3 p-3 border-t ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                          <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold">{m.name}</p>
                              {m.groupName && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0">{m.groupName}</Badge>}
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" />
                            </div>
                            <div className="flex justify-between items-end">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest italic">Personal Best: {m.personalBestPages || 0} pgs</p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-center text-muted-foreground italic p-6">No rankings yet.</p>}
                  </TabsContent>
                  <TabsContent value="all-time" className="mt-0">
                    {allTimeLeaderboardMembers?.length ? allTimeLeaderboardMembers.map((m, i) => {
                      const mRank = getRank(m.points || 0);
                      return (
                        <div key={m.id} className={`flex items-center gap-3 p-3 border-t ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                          <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold">{m.name}</p>
                              {m.groupName && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0">{m.groupName}</Badge>}
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" />
                            </div>
                            <div className="flex justify-between items-end">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest italic">Personal Best: {m.personalBestPages || 0} pgs</p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-center text-muted-foreground italic p-6">No rankings yet.</p>}
                  </TabsContent>
                  <TabsContent value="streaks" className="mt-0">
                    {streakLeaderboardMembers?.length ? streakLeaderboardMembers.map((m, i) => {
                      const mRank = getRank(m.points || 0);
                      return (
                        <div key={m.id} className={`flex items-center gap-3 p-3 border-t ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                          <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold">{m.name}</p>
                              {m.groupName && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 py-0">{m.groupName}</Badge>}
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" />
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{m.streak || 0} DAY STREAK</p>
                              <p className="text-[9px] text-accent font-bold italic">Personal Best: {m.personalBestPages || 0} pgs</p>
                            </div>
                          </div>
                          {m.streak > 0 && <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />}
                        </div>
                      );
                    }) : <p className="text-sm text-center text-muted-foreground italic p-6">No rankings yet.</p>}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={!!editingReflection} onOpenChange={(open) => { if (!open) { setEditingReflection(null); setEditReflectionText(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Reflection</DialogTitle>
              <DialogDescription>Refine your meditation from {editingReflection && new Date(editingReflection.completedAt).toLocaleDateString()}.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="edit-reflection-text" className="font-medium">Your Meditation</Label>
              <Textarea 
                id="edit-reflection-text" 
                value={editReflectionText} 
                onChange={(e) => setEditReflectionText(e.target.value)} 
                className="min-h-[150px] bg-white" 
              />
              <p className={`text-[10px] font-bold uppercase tracking-tight ${editReflectionWordCount < 30 ? 'text-muted-foreground' : 'text-green-600'}`}>
                Words: {editReflectionWordCount} / 30
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateReflection} disabled={editReflectionWordCount < 30 || isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCompletionCelebration} onOpenChange={setShowCompletionCelebration}>
          <DialogContent className="max-w-md text-center py-10">
            <div className="flex justify-center mb-6">
              <div className="bg-accent/10 p-6 rounded-full">
                <PartyPopper className="h-16 w-16 text-accent animate-bounce" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-headline text-primary mb-2">Congratulations!</DialogTitle>
              <DialogDescription className="text-lg">
                You have finished reading <span className="font-bold">"{currentBook?.title}"</span>.
                Your discipline and commitment to spiritual growth are a beacon for the whole fellowship.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex justify-center gap-4">
              <div className="text-center">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground">Pages Read</p>
                 <p className="text-2xl font-bold text-primary">{currentBook?.totalPages}</p>
              </div>
              <div className="text-center">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground">Wisdom Gained</p>
                 <p className="text-2xl font-bold text-accent">Infinite</p>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setShowCompletionCelebration(false)} className="rounded-full px-10 bg-primary h-12 text-lg font-bold">
                Continue the Journey
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateProfile}>
              <DialogHeader>
                <DialogTitle>Edit Spiritual Profile</DialogTitle>
                <DialogDescription>Update your registration details and spiritual goals.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" defaultValue={profile.name} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guidingSaint">Guiding Saint</Label>
                  <Input id="guidingSaint" name="guidingSaint" defaultValue={profile.guidingSaint} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pagesPerWeek">Weekly Page Goal</Label>
                  <Input id="pagesPerWeek" name="pagesPerWeek" type="number" defaultValue={profile.pagesPerWeek} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="spiritualGoal">Spiritual Goal</Label>
                  <Textarea id="spiritualGoal" name="spiritualGoal" defaultValue={profile.spiritualGoal} className="min-h-[100px]" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
