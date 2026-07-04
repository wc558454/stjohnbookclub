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
  Settings,
  BellRing,
  Zap,
  ShieldAlert,
  Users,
  MoreHorizontal
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, UserProfile, BadgeData } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useFirebaseApp } from "@/firebase";
import { collection, query, orderBy, limit, doc, setDoc, where, runTransaction, getDocs } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FirebaseApp } from "firebase/app";
import Link from "next/link";
import { sendPushOnlyAction } from "@/app/actions/notifications";

const ICON_MAP: Record<string, any> = {
  Award, Star, Trophy, Medal, Flame, Sparkles, Heart, Shield
};

function UserBadgeList({ badges, size = "md", maxDisplay = 3 }: { badges?: BadgeData[], size?: "sm" | "md", maxDisplay?: number }) {
  const [showAllOpen, setShowAllOpen] = useState(false);
  if (!badges || badges.length === 0) return null;

  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {displayBadges.map((badge) => {
          const Icon = ICON_MAP[badge.iconName] || Award;
          return (
            <Dialog key={badge.id}>
              <DialogTrigger asChild>
                <button className={`cursor-pointer rounded-full bg-white p-1.5 border-2 border-accent text-accent shadow-sm transition-transform hover:scale-110 hover:z-10 relative ${size === 'sm' ? 'scale-90' : ''}`}>
                  <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xs border-accent/20">
                <DialogHeader className="items-center text-center">
                  <div className="p-4 bg-accent/10 rounded-full inline-flex my-2">
                     <Icon className="h-10 w-10 text-accent" />
                  </div>
                  <DialogTitle className="text-xl font-headline text-primary">{badge.name}</DialogTitle>
                  <DialogDescription className="text-sm px-4">{badge.description}</DialogDescription>
                </DialogHeader>
                <div className="text-center space-y-4 py-4">
                  {badge.message && (
                    <blockquote className="text-sm italic border-l-2 border-accent pl-4 text-left bg-accent/5 p-3 rounded-r-lg mx-6 text-primary/80">"{badge.message}"</blockquote>
                  )}
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Awarded on {new Date(badge.awardedAt).toLocaleDateString()}</p>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
      
      {remainingCount > 0 && (
        <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black text-accent uppercase tracking-widest hover:bg-accent/10">
              +{remainingCount} More
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-accent/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline text-primary">Fellowship Badges</DialogTitle>
              <DialogDescription>A collection of your spiritual milestones.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6 max-h-[60vh] overflow-y-auto">
              {badges.map((badge) => {
                const Icon = ICON_MAP[badge.iconName] || Award;
                return (
                  <div key={badge.id} className="p-4 rounded-2xl border border-accent/10 bg-accent/5 flex flex-col items-center text-center space-y-2 group hover:bg-accent/10 transition-colors">
                    <div className="p-3 bg-white rounded-full border border-accent/20 shadow-sm text-accent group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-primary">{badge.name}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">{badge.description}</p>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
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

  const [editingReflection, setEditingReflection] = useState<any>(null);
  const [editReflectionText, setEditReflectionText] = useState("");
  const [userRank, setUserRank] = useState<number>(-1);

  const reflectionWordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const editReflectionWordCount = editReflectionText.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    setHasMounted(true);
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
    return query(
      collection(db, "discussions"),
      where("isActive", "==", true),
      limit(50)
    );
  }, [db, user]);
  const { data: discussions } = useCollection(discussionsQuery);

  const sortedDiscussions = useMemo(() => {
    if (!discussions) return [];
    return [...discussions].sort((a, b) => 
      new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime()
    );
  }, [discussions]);

  const weeklyLeaderboardMembersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("weeklyPoints", "desc"), limit(10));
  }, [db, user]);
  const { data: weeklyLeaderboardMembers } = useCollection(weeklyLeaderboardMembersQuery);

  const monthlyLeaderboardMembersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("monthlyPoints", "desc"), limit(10));
  }, [db, user]);
  const { data: monthlyLeaderboardMembers } = useCollection(monthlyLeaderboardMembersQuery);

  const allTimeLeaderboardMembersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("points", "desc"), limit(10));
  }, [db, user]);
  const { data: allTimeLeaderboardMembers } = useCollection(allTimeLeaderboardMembersQuery);

  const streakLeaderboardMembersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("streak", "desc"), limit(10));
  }, [db, user]);
  const { data: streakLeaderboardMembers } = useCollection(streakLeaderboardMembersQuery);

  const groupMembersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), limit(500));
  }, [db, user]);
  const { data: allMembersForGroups } = useCollection(groupMembersQuery);

  const groupLeaderboard = useMemo(() => {
    if (!allMembersForGroups) return [];
    const groupMap: Record<string, { name: string, totalPoints: number, memberCount: number }> = {};
    
    allMembersForGroups.forEach(m => {
      if (m.groupName) {
        if (!groupMap[m.groupName]) {
          groupMap[m.groupName] = { name: m.groupName, totalPoints: 0, memberCount: 0 };
        }
        groupMap[m.groupName].totalPoints += (m.points || 0);
        groupMap[m.groupName].memberCount += 1;
      }
    });

    return Object.values(groupMap).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [allMembersForGroups]);

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

  const activeDiscussionsList = useMemo(() => {
    return sortedDiscussions || [];
  }, [sortedDiscussions]);

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
    let streakAlertNotif: any = null;

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

  const getRank = (pts: number) => {
    if (pts <= 1000) return { title: "Seeker", level: 1, icon: Search, color: "text-white" };
    if (pts <= 3000) return { title: "Golden Seeker", level: 2, icon: Footprints, color: "text-accent" };
    if (pts <= 5000) return { title: "Pilgrim", level: 3, icon: Milestone, color: "text-white" };
    if (pts <= 7000) return { title: "Golden Pilgrim", level: 4, icon: Mountain, color: "text-accent" };
    if (pts <= 10000) return { title: "Beacon", level: 5, icon: Sunrise, color: "text-white" };
    return { title: "Golden Beacon", level: 6, icon: Award, color: "text-accent" };
  };

  const getLevel = (pts: number) => {
    if (pts <= 1000) return 1;
    if (pts <= 3000) return 2;
    if (pts <= 5000) return 3;
    if (pts <= 7000) return 4;
    if (pts <= 10000) return 5;
    return 6;
  };

  if (loading || !user || !profile) return null;

  // Weekly Goal Calculation
  const weeklyPagesRead = profile.weeklyPagesRead || 0;
  const weeklyGoal = profile.pagesPerWeek || 35;
  const weeklyProgressPercent = Math.min(100, Math.round((weeklyPagesRead / weeklyGoal) * 100));
  const isWeeklyGoalAchieved = weeklyPagesRead >= weeklyGoal;

  if (profile.status === "Deactivated") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative bg-white p-10 rounded-full shadow-xl border-2 border-destructive/20">
              <ShieldAlert className="h-20 w-20 text-destructive" />
            </div>
          </div>
          <div className="max-w-xl space-y-4">
             <Badge variant="destructive" className="px-4 py-1 text-xs font-bold uppercase tracking-widest">Membership Suspended</Badge>
             <h1 className="text-4xl font-bold text-primary font-headline leading-tight">Access Restricted</h1>
             <p className="text-lg text-muted-foreground leading-relaxed italic">
               "Discipline is the root of all good things." — St. John Chrysostom
             </p>
             <p className="text-sm text-muted-foreground/80 font-medium">
               Your access to the St. John Chrysostom Bookclub has been deactivated by an administrator.
               If you believe this is an error or wish to appeal, please contact the fellowship leadership.
             </p>
          </div>
          <Button variant="ghost" className="rounded-full px-8 h-12 text-muted-foreground" onClick={() => logout()}>
            Sign Out
          </Button>
        </main>
      </div>
    );
  }

  if (profile.status === "Pending Approval") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative bg-white p-10 rounded-full shadow-xl border-2 border-accent/20">
              <Clock className="h-20 w-20 text-accent" />
            </div>
          </div>
          <div className="max-w-xl space-y-4">
            <Badge variant="outline" className="text-accent border-accent bg-accent/5 px-4 py-1 text-xs font-bold uppercase tracking-widest">
              Verification in Progress
            </Badge>
            <h1 className="text-4xl font-bold text-primary font-headline leading-tight">
              Welcome to the Harbor, <br /> {profile.name}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed italic px-4">
              "As a ship entering a harbor finds rest from the waves, so your soul will find peace in spiritual instruction."
            </p>
            <p className="text-sm text-muted-foreground/80 font-medium">
              Your application is currently being reviewed by the fellowship administrators. 
              We'll have you reading and reflecting in no time!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" className="rounded-full px-8 h-12" onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
            <Button variant="ghost" className="rounded-full px-8 h-12 text-muted-foreground" onClick={() => logout()}>
              Sign Out
            </Button>
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
      let alertNotif: any = null;
      let levelUpNotif: any = null;
      let bookFinishedNotif: any = null;
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data() as UserProfile;
        const streakUpdate = getStreakUpdate(currentProfile, now);
        finalToastTitle = streakUpdate.streakToastInfo.title;
        finalToastDescription = streakUpdate.streakToastInfo.description;
        alertNotif = streakUpdate.streakAlertNotif;
        const ptsToAdd = pagesReadToday * 2;
        const oldPoints = currentProfile.points || 0;
        const newTotalPoints = oldPoints + ptsToAdd;
        const oldLevel = getLevel(oldPoints);
        const newLevel = getLevel(newTotalPoints);
        if (newLevel > oldLevel) {
          const newRank = getRank(newTotalPoints);
          levelUpNotif = {
            id: `lvl_up_${now.getTime()}`,
            type: "Level Up!",
            message: `Congratulations! You've reached Level ${newLevel} and earned the rank of ${newRank.title}!`,
          };
        }
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
        if (newPagesReadTotal >= currentBook.totalPages) {
          bookFinishedNotif = {
            id: `bk_fin_${now.getTime()}`,
            type: "Book Finished!",
            message: `You've successfully completed "${currentBook.title}"! May the wisdom you gained guide your steps.`,
          };
        }
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
        const newWeeklyPagesRead =
          currentWeekStr === currentProfile.currentWeek
            ? (currentProfile.weeklyPagesRead || 0) + pagesReadToday
            : pagesReadToday;
        transaction.update(userRef, {
          points: newTotalPoints,
          currentPagesRead: newPagesReadTotal,
          bookProgress: updatedBookProgress,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
          weeklyPoints: newWeeklyPoints,
          weeklyPagesRead: newWeeklyPagesRead,
          currentWeek: currentWeekStr,
          personalBestPages: newPersonalBest,
          dailyPagesRead: currentDailyPagesSum,
          streak: streakUpdate.streak,
          longestStreak: streakUpdate.longestStreak,
          freezeCount: streakUpdate.freezeCount,
          lastStreakActivityAt: streakUpdate.lastStreakActivityAt,
          lastFreezeRefill: streakUpdate.lastFreezeRefill,
        });
        const pendingNotifs = [alertNotif, levelUpNotif, bookFinishedNotif].filter(Boolean);
        for (const n of pendingNotifs) {
          transaction.set(doc(db, "users", user.uid, "notifications", n.id), {
            ...n,
            userId: user.uid,
            isRead: false,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
          });
        }
      });
      toast({ title: finalToastTitle, description: finalToastDescription });
      if (readingTotal + pagesReadToday >= currentBook.totalPages) {
        setShowCompletionCelebration(true);
        await sendPushOnlyAction(user.uid, "Book Finished!", `You've completed "${currentBook.title}"! Glory to God.`);
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
      let alertNotif: any = null;
      let levelUpNotif: any = null;
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
        alertNotif = streakUpdate.streakAlertNotif;
        const oldPoints = currentProfile.points || 0;
        const newTotalPoints = oldPoints + reward;
        const oldLevel = getLevel(oldPoints);
        const newLevel = getLevel(newTotalPoints);
        if (newLevel > oldLevel) {
          const newRank = getRank(newTotalPoints);
          levelUpNotif = {
            id: `lvl_up_${now.getTime()}`,
            type: "Level Up!",
            message: `Glory to God! You've leveled up to Level ${newLevel} (${newRank.title}) through your meditations.`,
          };
        }
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
          points: newTotalPoints,
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
        const pendingNotifs = [alertNotif, levelUpNotif, bookFinishedNotif].filter(Boolean);
        for (const n of pendingNotifs) {
          transaction.set(doc(db, "users", user.uid, "notifications", n.id), {
            ...n,
            userId: user.uid,
            isRead: false,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
          });
        }
      });
      setReflection("");
      toast({ title: toastTitle, description: toastDescription });
      if (levelUpNotif) {
        await sendPushOnlyAction(user.uid, "Level Up!", levelUpNotif.message);
      }
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
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const lastMonday = new Date();
        lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7));
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-10">
        
        {/* Luxury Premium Profile Section */}
        <section className="space-y-6">
          <Card className="border-none shadow-2xl bg-primary overflow-hidden relative group">
            {/* Elegant Background Accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
            
            <CardContent className="p-8 md:p-12 relative z-10">
              <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                {/* Avatar with Luxury Gold Ring */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-accent/20 rounded-full blur-md animate-pulse" />
                  <div className="relative h-32 w-32 rounded-full border-4 border-accent p-1 bg-white shadow-xl overflow-hidden">
                    <div className="h-full w-full rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-4xl font-black shadow-inner">
                      {profile.profilePictureUrl ? (
                        <Image src={profile.profilePictureUrl} alt={profile.name} fill className="object-cover" />
                      ) : profile.name?.charAt(0)}
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-accent text-primary border-4 border-primary hover:bg-accent/90 shadow-lg"
                    onClick={() => setIsEditProfileOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div className="space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                      <h1 className="text-4xl md:text-5xl font-black text-white font-headline tracking-tight">
                        {profile.name}
                      </h1>
                      <div className="flex items-center gap-2 justify-center">
                        <Badge className="bg-accent text-primary font-black uppercase tracking-widest text-[10px] px-3 py-1 border-none shadow-lg">
                          {profile.role === 'admin' ? 'Admin' : 'Member'}
                        </Badge>
                        {profile.groupName && (
                          <Badge variant="outline" className="text-accent border-accent/40 bg-accent/5 font-bold uppercase tracking-tighter text-[10px]">
                            {profile.groupName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-accent font-bold tracking-[0.2em] uppercase text-xs flex items-center justify-center md:justify-start gap-2">
                      <Shield className="h-3 w-3" /> Guided by {profile.guidingSaint}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                    <div className="flex items-center gap-2 text-white/70">
                       <Target className="h-4 w-4 text-accent" />
                       <span className="text-sm font-medium">Goal: <strong className="text-white">{profile.pagesPerWeek || 0}</strong> pages per week</span>
                    </div>
                    {userRank !== -1 && (
                      <div className="flex items-center gap-2 text-white/70">
                         <Trophy className="h-4 w-4 text-accent" />
                         <span className="text-sm font-medium">Rank <strong className="text-white">#{userRank}</strong> in Fellowship</span>
                      </div>
                    )}
                  </div>

                  {profile.spiritualGoal && (
                    <div className="max-w-2xl relative">
                      <Quote className="absolute -top-3 -left-3 h-8 w-8 text-accent/20" />
                      <p className="text-lg md:text-xl text-white/90 italic font-medium leading-relaxed pl-6 border-l-2 border-accent/30 py-1">
                        "{profile.spiritualGoal}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standalone Achievements Section - Compacted */}
          <div className="bg-white/50 backdrop-blur-md rounded-[1.5rem] border border-accent/10 shadow-xl overflow-hidden">
            <div className="p-1 bg-accent/5 border-b border-accent/10">
               <p className="text-[9px] text-accent font-black uppercase tracking-[0.4em] text-center py-0.5">Achievements & Standing</p>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-accent/10">
               {/* Merged Rank & Points Card */}
               <div className="p-5 flex items-center gap-5 group hover:bg-accent/5 transition-colors">
                  <div className={`p-4 rounded-3xl bg-primary shadow-2xl ring-4 ring-primary/5 ${rank.color}`}>
                     <rank.icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <div>
                        <p className={`text-xl font-black font-headline leading-tight ${rank.color === 'text-accent' ? 'text-accent' : 'text-primary'}`}>{rank.title}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Spiritual Standing</p>
                     </div>
                     <div className="space-y-1.5 border-t border-accent/10 pt-2">
                        <div className="flex justify-between items-end">
                           <p className="text-base font-black text-primary">{profile.points?.toLocaleString()} <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">pts</span></p>
                           <p className="text-[9px] font-black text-accent uppercase tracking-tighter">Total Points</p>
                        </div>
                        <Progress value={(profile.points % 1000) / 10} className="h-1.5 bg-accent/10" />
                     </div>
                  </div>
               </div>

               {/* Badges Card */}
               <div className="p-5 flex items-center gap-4 group hover:bg-accent/5 transition-colors">
                  <div className="p-3 rounded-2xl bg-white border-2 border-accent text-accent shadow-md">
                     <Award className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Earned Badges</p>
                     <UserBadgeList badges={profile.badges} maxDisplay={3} />
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-accent/10 flex flex-col justify-center gap-1 group hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-accent fill-accent" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Weekly</span>
              </div>
              <p className="text-2xl font-black text-primary">{profile.weeklyPoints || 0} <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">pts</span></p>
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-accent/10 flex flex-col justify-center gap-1 group hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500 fill-blue-50" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Monthly</span>
              </div>
              <p className="text-2xl font-black text-primary">{profile.monthlyPoints || 0} <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">pts</span></p>
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-accent/10 flex flex-col justify-center gap-1 group hover:border-accent/30 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Flame className={`h-4 w-4 ${profile.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Streak</span>
                </div>
                <div className="text-right flex flex-col">
                   <span className="text-[9px] font-black text-accent uppercase leading-none">Longest</span>
                   <span className="text-sm font-black text-primary">{profile.longestStreak || 0}d</span>
                </div>
              </div>
              <p className="text-2xl font-black text-primary">{profile.streak || 0} <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">days</span></p>
            </div>
             <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-accent/10 flex flex-col justify-center gap-1 group hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <Snowflake className={`h-4 w-4 ${(profile.freezeCount ?? 0) > 0 ? 'text-blue-400' : 'text-muted-foreground'}`} />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Freezes</span>
              </div>
              <p className="text-2xl font-black text-primary">{profile.freezeCount ?? 0} <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">left</span></p>
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-accent/10 flex flex-col justify-center gap-1 group hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Best Day</span>
              </div>
              <p className="text-2xl font-black text-primary">{profile.personalBestPages || 0} <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">pgs</span></p>
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
              {/* Futuristic Glassmorphic Current Study Card */}
              <Card className="relative border shadow-2xl bg-white/40 backdrop-blur-xl border-white/20 overflow-hidden group transition-all duration-500 hover:shadow-accent/20">
                {/* Abstract Digital Art Background Elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                
                <CardHeader className="relative pb-4 border-b border-white/20 z-10">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 backdrop-blur-sm px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                          current reading
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-tighter"
                          onClick={() => updateDocumentNonBlocking(doc(db, "users", user.uid), { currentBookId: null })}
                        >
                          switch book
                        </Button>
                      </div>
                      <CardTitle className="text-3xl font-headline font-bold text-primary tracking-tight leading-none">
                        {currentBook.title}
                      </CardTitle>
                      <CardDescription className="text-foreground/70 mt-2 text-sm italic font-medium leading-relaxed max-w-lg">
                        {currentBook.description}
                      </CardDescription>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-accent/20 rounded-full blur-md animate-pulse" />
                      <div className="relative p-3 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/50 shadow-inner">
                         <BookOpen className="h-7 w-7 text-accent" />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-8 pt-8 z-10">
                  {/* Progress Visualization */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">reading progress</p>
                      <p className="text-2xl font-black text-accent font-mono">{progressPercent}%</p>
                    </div>
                    <div className="h-3 w-full bg-primary/5 rounded-full overflow-hidden p-0.5 border border-primary/5 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-primary via-blue-600 to-accent rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(50,65,84,0.3)]" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Weekly Reading Goal - Glass Panel */}
                  <div className="relative group/weekly p-5 rounded-2xl bg-gradient-to-br from-blue-600/10 to-accent/5 border border-white/40 shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/weekly:opacity-20 transition-opacity">
                      <Sparkles className="h-12 w-12 text-accent" />
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/60 rounded-lg shadow-sm">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary/80">weekly reading</span>
                      </div>
                      {isWeeklyGoalAchieved ? (
                        <Badge className="bg-accent text-primary font-black animate-bounce shadow-lg border-none">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> ACHIEVED
                        </Badge>
                      ) : (
                        <span className="text-xs font-bold text-blue-600">{weeklyProgressPercent}% toward target</span>
                      )}
                    </div>

                    <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
                        style={{ width: `${weeklyProgressPercent}%` }}
                      />
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-primary/60">
                      <p>{weeklyPagesRead} / {weeklyGoal} PAGES READ THIS WEEK</p>
                      <p className="italic uppercase tracking-widest">Ongoing Cycle</p>
                    </div>
                  </div>

                  {/* Metric Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'current book', val: readingTotal, sub: `/ ${currentBook.totalPages}`, icon: Footprints },
                      { label: 'pace', val: pagesPerDayToFinish, sub: 'pg/d', icon: GaugeCircle },
                      { label: 'Due date', val: currentBook.currentReadingPlanDueDate ? new Date(currentBook.currentReadingPlanDueDate).toLocaleDateString() : 'N/A', sub: '', icon: Milestone },
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col items-center justify-center p-4 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/50 hover:bg-white/50 transition-colors duration-300 shadow-sm group/stat">
                        <stat.icon className="h-4 w-4 text-accent/60 mb-2 group-hover/stat:scale-110 transition-transform" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/50 text-center mb-1">{stat.label}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-primary">{stat.val}</span>
                          <span className="text-[10px] text-primary/40 font-bold">{stat.sub}</span>
                        </div>
                      </div>
                    ))}
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
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-4 border-b bg-accent/5">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-accent" /> Upcoming Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 min-h-[200px]">
                  {activeDiscussionsList.length > 0 ? activeDiscussionsList.map(disc => {
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
                       <p className="text-xs italic">No active discussions scheduled.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden">
                <Tabs defaultValue="weekly" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 h-auto p-0 rounded-none bg-accent/5">
                    <TabsTrigger value="weekly" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Weekly
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value="all-time" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Global
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      Groups
                    </TabsTrigger>
                    <TabsTrigger value="streaks" className="py-3 text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary font-semibold">
                      🔥
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
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color === 'text-white' ? 'text-primary border-primary' : mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" maxDisplay={2} />
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
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color === 'text-white' ? 'text-primary border-primary' : mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" maxDisplay={2} />
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
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color === 'text-white' ? 'text-primary border-primary' : mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" maxDisplay={2} />
                            </div>
                            <div className="flex justify-between items-end">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest italic">Personal Best: {m.personalBestPages || 0} pgs</p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-center text-muted-foreground italic p-6">No rankings yet.</p>}
                  </TabsContent>
                  <TabsContent value="groups" className="mt-0">
                    {groupLeaderboard.length ? groupLeaderboard.map((g, i) => (
                      <div key={g.name} className={`flex items-center gap-3 p-4 border-t ${profile.groupName === g.name ? 'bg-accent/5' : ''}`}>
                        <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                             <Users className="h-3.5 w-3.5 text-accent" />
                             <p className="text-sm font-bold text-primary">{g.name}</p>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                             <p className="text-[10px] text-accent font-black uppercase tracking-widest">{g.totalPoints.toLocaleString()} TOTAL POINTS</p>
                             <p className="text-[9px] text-muted-foreground font-medium">{g.memberCount} members</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 opacity-20" />
                        No fellowship groups ranked yet.
                      </div>
                    )}
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
                              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 py-0 border-current ${mRank.color === 'text-white' ? 'text-primary border-primary' : mRank.color}`}>{mRank.title}</Badge>
                              <UserBadgeList badges={m.badges} size="sm" maxDisplay={2} />
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

        <Dialog open={isEditProfileOpen} onOpenChange={isEditProfileOpen => setIsEditProfileOpen(isEditProfileOpen)}>
          <DialogContent className="border-accent/20">
            <form onSubmit={handleUpdateProfile}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline text-primary">Edit Spiritual Profile</DialogTitle>
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
                <Button type="submit" className="w-full bg-primary font-bold">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
