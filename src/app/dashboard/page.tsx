
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
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
  Zap,
  CalendarDays,
  Loader2,
  Snowflake,
  MessageSquare,
  Search,
  Footprints,
  Milestone,
  Mountain,
  Sunrise,
  BookUp,
  GaugeCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, UserProfile } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, orderBy, limit, doc, setDoc, where, getDoc, runTransaction } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [pagesReadToday, setPagesReadToday] = useState<number>(0);
  const [reflection, setReflection] = useState("");
  const [hasMounted, setHasMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completingChallenge, setCompletingChallenge] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const currentBookQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "books"), where("status", "==", "current"), limit(1));
  }, [db, user]);
  const { data: currentBooks } = useCollection(currentBookQuery);
  const currentBook = currentBooks?.[0];

  const challengesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "challenges"), where("isActive", "==", true));
  }, [db, user]);
  const { data: challenges } = useCollection(challengesQuery);

  const userChallengesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return collection(db, "users", user.uid, "userChallenges");
  }, [db, user?.uid]);
  const { data: userChallenges } = useCollection(userChallengesQuery);

  const discussionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "discussions"), orderBy("scheduledDateTime", "desc"), limit(5));
  }, [db, user]);
  const { data: discussions } = useCollection(discussionsQuery);

  const leaderboardMembersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("monthlyPoints", "desc"), limit(20));
  }, [db, user]);
  const { data: leaderboardMembers } = useCollection(leaderboardMembersQuery);

  const allTimeLeaderboardQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("points", "desc"), limit(20));
  }, [db, user]);
  const { data: allTimeLeaderboardMembers } = useCollection(allTimeLeaderboardQuery);

  const pagesPerDayToFinish = useMemo(() => {
    if (!currentBook || !profile || !currentBook.currentReadingPlanDueDate) return 0;
    
    const remainingPages = currentBook.totalPages - (profile.currentPagesRead || 0);
    if (remainingPages <= 0) return 0;

    const dueDate = new Date(currentBook.currentReadingPlanDueDate);
    dueDate.setHours(23, 59, 59, 999); // End of due day
    const today = new Date();
    
    if (dueDate < today) return remainingPages; // If due date is past, they need to read all remaining pages today.

    const diffTime = dueDate.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) return remainingPages;

    return Math.ceil(remainingPages / remainingDays);
  }, [currentBook, profile]);
  
  if (loading || !user || !profile) return null;

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
    if (pagesReadToday <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a positive number of pages." });
      return;
    }

    if (currentBook && (readingTotal + pagesReadToday) > currentBook.totalPages) {
      toast({ variant: "destructive", title: "Page Limit Exceeded", description: `Cannot log more than ${currentBook.totalPages} pages.` });
      return;
    }

    setIsSubmitting(true);

    const userRef = doc(db, "users", user.uid);
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const lastReadDay = profile.lastReadAt ? new Date(profile.lastReadAt) : null;
    let lastReadDayStart: Date | null = null;
    if(lastReadDay) {
        lastReadDayStart = new Date(lastReadDay.getFullYear(), lastReadDay.getMonth(), lastReadDay.getDate());
    }

    if (lastReadDayStart && lastReadDayStart.getTime() === todayStart.getTime()) {
      toast({
        variant: "destructive",
        title: "Already Submitted",
        description: "You have already recorded your reading for today.",
      });
      setIsSubmitting(false);
      return;
    }

    const ptsToAdd = pagesReadToday * 2;
    let toastTitle = "Progress Recorded";
    let toastDescription = `+${ptsToAdd} points earned!`;

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw "Document does not exist!";
        }
        const currentProfile = userSnap.data() as UserProfile;

        const transactionLastReadDay = currentProfile.lastReadAt ? new Date(currentProfile.lastReadAt) : null;
        let transactionLastReadDayStart: Date | null = null;
        if(transactionLastReadDay) {
            transactionLastReadDayStart = new Date(transactionLastReadDay.getFullYear(), transactionLastReadDay.getMonth(), transactionLastReadDay.getDate());
        }

        let newStreak = currentProfile.streak || 0;
        let newFreezeCount = currentProfile.freezeCount ?? 2;

        if (!transactionLastReadDayStart) {
            newStreak = 1;
            toastDescription += ` Your streak starts at 1 day!`;
        } else {
            const diffTime = todayStart.getTime() - transactionLastReadDayStart.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak += 1;
                toastDescription += ` Streak extended to ${newStreak} days!`;
            } else if (diffDays > 1) {
                const daysToCover = diffDays - 1;
                if (newFreezeCount >= daysToCover) {
                    newFreezeCount -= daysToCover;
                    toastTitle = "Streak Preserved!";
                    toastDescription = `You missed ${daysToCover} day(s), but ${daysToCover} freeze(s) were used. You have ${newFreezeCount} freeze(s) left.`;
                } else {
                    newStreak = 1;
                    toastTitle = "Streak Reset";
                    toastDescription = `You missed ${diffDays-1} day(s) with only ${newFreezeCount} freeze(s) left. Your streak resets to 1.`;
                }
            }
        }

        const lastRefillDate = currentProfile.lastFreezeRefill ? new Date(currentProfile.lastFreezeRefill) : new Date(0);
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        lastMonday.setHours(0, 0, 0, 0);

        let needsRefill = false;
        let finalFreezeCount = newFreezeCount;
        if (lastRefillDate < lastMonday) {
            finalFreezeCount = 2 - ( (currentProfile.freezeCount ?? 2) - newFreezeCount);
            needsRefill = true;
        }

        const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + ptsToAdd
            : ptsToAdd;

        const progressUpdate: any = {
          points: (currentProfile.points || 0) + ptsToAdd,
          currentPagesRead: (currentProfile.currentPagesRead || 0) + pagesReadToday,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
          streak: newStreak,
          freezeCount: finalFreezeCount,
          lastReadAt: new Date().toISOString()
        };
        if (needsRefill) {
            progressUpdate.lastFreezeRefill = new Date().toISOString();
            toast({ title: "Streak Freezes Refilled!", description: "You have 2 freezes for the week." });
        }
        
        transaction.update(userRef, progressUpdate);
      });
      toast({ title: toastTitle, description: toastDescription });
      setPagesReadToday(0);
    } catch (e) {
      console.error("Error marking complete:", e);
      const errorData: any = {
        pagesRead: pagesReadToday,
        pointsToAdd: ptsToAdd
      };
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path, operation: 'update', requestResourceData: errorData
      }));
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save your progress." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReflectionSubmit = async () => {
    const words = reflection.trim().split(/\s+/).filter(Boolean);
    if (words.length < 50) {
      toast({ variant: "destructive", title: "Invalid Reflection", description: "Reflection must be at least 50 words long." });
      return;
    }

    const reward = 10;
    const reflectionId = `refl_${new Date().toISOString().split('T')[0]}`;
    
    const challRef = doc(db, "users", user.uid, "userChallenges", reflectionId);
    const challSnap = await getDoc(challRef);
    if(challSnap.exists()) {
      toast({ variant: "destructive", title: "Already Reflected", description: "You can only submit one reflection per day."});
      return;
    }

    const userRef = doc(db, "users", user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data();

        transaction.set(challRef, {
          id: reflectionId,
          challengeId: "reflection_daily",
          userId: user.uid,
          status: "Completed",
          completedAt: new Date().toISOString(),
          pointsEarned: reward,
          submissionText: reflection
        });

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + reward
            : reward;

        transaction.update(userRef, {
          points: (currentProfile.points || 0) + reward,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
        });
      });

      setReflection("");
      toast({ title: "Reflection Shared", description: `+${reward} points earned!` });
    } catch(e) {
      console.error(e);
      toast({ variant: "destructive", title: "Submission Failed", description: "Could not save your reflection." });
    }
  };

  const handleCheckIn = async (discussion: any) => {
    const discDate = new Date(discussion.scheduledDateTime);
    const now = new Date();
    const diffHours = (now.getTime() - discDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0 || diffHours > 24) {
      toast({ variant: "destructive", title: "Check-in Not Available", description: "You can only check-in within 24 hours of the discussion start time." });
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

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + reward
            : reward;
        
        transaction.update(userRef, {
          points: (currentProfile.points || 0) + reward,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
        });
      });
      toast({ title: "Checked In", description: `+${reward} points for attending discussion!` });
    } catch(e) {
      console.error(e);
      toast({ variant: "destructive", title: "Check-in Failed", description: "Could not save your check-in." });
    }
  };

  const handleSubmissionForChallenge = async () => {
    if (!completingChallenge || !submissionText.trim() || !user) return;

    const reward = completingChallenge.pointsReward;
    const userChallengeId = `dynamic_${completingChallenge.id}`;
    
    const userChallengeData = {
      id: userChallengeId,
      challengeId: completingChallenge.id,
      userId: user.uid,
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward,
      submissionText: submissionText
    };

    const challengeDocRef = doc(db, "users", user.uid, "userChallenges", userChallengeId);
    const userRef = doc(db, "users", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data();

        transaction.set(challengeDocRef, userChallengeData);

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + reward
            : reward;

        transaction.update(userRef, {
          points: (currentProfile.points || 0) + reward,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
        });
      });
      toast({ title: "Challenge Completed", description: `+${reward} points awarded!` });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: challengeDocRef.path,
        operation: 'create',
        requestResourceData: userChallengeData
      }));
      toast({ variant: "destructive", title: "Submission Failed", description: "Could not save your submission." });
    }
    
    setCompletingChallenge(null);
    setSubmissionText("");
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
              <h1 className="text-2xl font-bold text-primary font-headline">{profile.name}</h1>
              <div className="mt-2 flex items-center">
                <div className={`inline-flex items-center gap-3 p-2 pr-4 rounded-full bg-card border shadow-sm`}>
                   <div className={`p-2 rounded-full bg-accent/10 ${rank.color}`}>
                        <rank.icon className="h-5 w-5" />
                   </div>
                   <div>
                       <p className={`font-bold text-lg leading-tight ${rank.color}`}>{rank.title}</p>
                       <p className="text-xs font-medium text-muted-foreground">Level {rank.level}</p>
                   </div>
                </div>
              </div>
              {profile.spiritualGoal && (
                <blockquote className="mt-4 border-l-2 pl-4 italic text-muted-foreground text-sm max-w-md">
                  {profile.spiritualGoal}
                </blockquote>
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Star className="h-4 w-4 text-accent fill-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Points</p>
                <p className="text-lg font-bold text-primary">{profile.points?.toLocaleString() || 0}</p>
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
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {currentBook && (
              <Card className="border-none shadow-sm bg-primary text-white overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-white/10 text-accent mb-2">CURRENT BOOK</Badge>
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
            )}

            <Card className="border-none shadow-sm bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 font-headline">
                  <Target className="h-4 w-4 text-accent" /> Daily Progress Tracker
                </CardTitle>
                <CardDescription className="text-xs">Submit your reading for the day to earn points and maintain your streak.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end gap-3 pb-6">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pages Read Today</Label>
                  <Input type="number" value={pagesReadToday} onChange={(e) => setPagesReadToday(parseInt(e.target.value) || 0)} className="h-10 bg-white" />
                </div>
                <Button onClick={handleMarkComplete} disabled={pagesReadToday <= 0 || isSubmitting} className="h-10 px-8 rounded-full font-bold">
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Reading"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-headline text-lg font-bold text-primary flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" /> Spiritual Challenges
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-none shadow-sm flex flex-col bg-secondary/20">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <Badge variant="outline" className="text-[9px] uppercase border-accent/30">Daily</Badge>
                      <span className="text-[10px] font-bold text-accent">+10 Pts</span>
                    </div>
                    <CardTitle className="text-sm font-headline">Reflection of the Day</CardTitle>
                    <CardDescription className="text-[10px] line-clamp-2">Submit a reflection of at least 50 words on today's reading.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-2">
                    <Textarea 
                      placeholder="Today's meditation..." 
                      className="text-xs min-h-[80px] bg-white resize-none"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button onClick={handleReflectionSubmit} disabled={!reflection.trim()} className="w-full h-8 text-xs rounded-full">Share Reflection</Button>
                  </CardFooter>
                </Card>

                {challenges?.map(chall => {
                  const completed = userChallenges?.some(uc => uc.challengeId === chall.id && uc.status === "Completed");
                  return (
                    <Card key={chall.id} className="border-none shadow-sm flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center mb-1">
                          <Badge variant="outline" className="text-[9px] uppercase border-accent/30">{chall.type}</Badge>
                          <span className="text-[10px] font-bold text-accent">+{chall.pointsReward} Pts</span>
                        </div>
                        <CardTitle className="text-sm font-headline">{chall.title}</CardTitle>
                        <CardDescription className="text-[10px] line-clamp-2">{chall.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 text-[10px] italic text-muted-foreground pb-2">
                        Criteria: {chall.completionCriteria}
                      </CardContent>
                      <CardFooter className="pt-0">
                        {completed ? (
                          <div className="w-full flex items-center justify-center gap-1.5 text-green-600 font-bold text-[10px] h-8 bg-green-50 rounded-full">
                            <CheckCircle2 className="h-3.3" /> COMPLETED
                          </div>
                        ) : (
                          <Button onClick={() => setCompletingChallenge(chall)} variant="outline" className="w-full h-8 text-xs rounded-full border-accent text-accent hover:bg-accent hover:text-white transition-colors">
                            Complete Challenge
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-secondary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent" /> Upcoming Discussions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {discussions?.length ? discussions.map(disc => {
                  const attended = userChallenges?.some(uc => uc.challengeId === disc.id);
                  return (
                    <div key={disc.id} className="p-3 bg-white rounded-md border border-accent/5 flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-primary">{disc.topic}</p>
                        <p className="text-[10px] text-muted-foreground">{hasMounted ? new Date(disc.scheduledDateTime).toLocaleString() : '...'}</p>
                      </div>
                      {!attended && (
                        <Button variant="ghost" size="sm" onClick={() => handleCheckIn(disc)} className="h-6 text-[9px] px-2 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors">
                          Check-in (+20)
                        </Button>
                      )}
                      {attended && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  );
                }) : <p className="text-[10px] text-center text-muted-foreground py-4 italic">No scheduled discussions.</p>}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <Tabs defaultValue="monthly" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto p-0 rounded-none bg-accent/5">
                  <TabsTrigger value="monthly" className="py-3 text-sm rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary data-[state=active]:shadow-inner font-semibold">
                    <Award className="h-4 w-4 mr-2" /> Monthly Leaderboard
                  </TabsTrigger>
                  <TabsTrigger value="all-time" className="py-3 text-sm rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-primary data-[state=active]:shadow-inner font-semibold">
                    <Trophy className="h-4 w-4 mr-2" /> All-Time Rank
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="monthly" className="mt-0">
                  {leaderboardMembers?.length ? leaderboardMembers.map((m, i) => (
                    <div key={m.id} className={`flex items-center gap-3 p-3 border-t ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                      <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{m.monthlyPoints || 0} PTS</p>
                      </div>
                      {m.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                          <Flame className="h-4 w-4 fill-orange-500" /> {m.streak}
                        </div>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-center text-muted-foreground italic p-6 border-t">No rankings yet this month.</p>
                  )}
                </TabsContent>
                <TabsContent value="all-time" className="mt-0">
                  {allTimeLeaderboardMembers?.length ? allTimeLeaderboardMembers.map((m, i) => (
                    <div key={m.id} className={`flex items-center gap-3 p-3 border-t ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                      <span className="font-headline font-bold text-muted-foreground text-base w-8 text-center">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{m.points || 0} PTS</p>
                      </div>
                      {m.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                          <Flame className="h-4 w-4 fill-orange-500" /> {m.streak}
                        </div>
                      )}
                    </div>
                  )) : (
                     <p className="text-sm text-center text-muted-foreground italic p-6 border-t">No rankings yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        <Dialog open={!!completingChallenge} onOpenChange={(open) => { if (!open) { setCompletingChallenge(null); setSubmissionText(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete: {completingChallenge?.title}</DialogTitle>
              <DialogDescription>{completingChallenge?.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="submission-text" className="font-medium">Your Submission</Label>
              <Textarea
                id="submission-text"
                placeholder="Share your thoughts or evidence of completion..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                className="min-h-[100px] bg-white"
              />
              <p className="text-xs text-muted-foreground">Criteria: {completingChallenge?.completionCriteria}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCompletingChallenge(null); setSubmissionText(""); }}>Cancel</Button>
              <Button onClick={handleSubmissionForChallenge} disabled={!submissionText.trim()}>Submit and Complete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
