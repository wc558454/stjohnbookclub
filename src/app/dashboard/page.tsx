
"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trophy, 
  BookOpen, 
  Flame, 
  Target, 
  Star, 
  Award,
  Send,
  CheckCircle2,
  Zap,
  CalendarDays,
  Settings2,
  Loader2
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, setDoc, where, getDocs, getDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [pagesReadToday, setPagesReadToday] = useState<number>(0);
  const [pagesGoal, setPagesGoal] = useState<number>(0);
  const [reflection, setReflection] = useState("");
  const [selectedNudgeMember, setSelectedNudgeMember] = useState<string>("");
  const [nudgeMessage, setNudgeMessage] = useState<string>("Keep up the great reading today!");
  const [hasMounted, setHasMounted] = useState(false);
  const [todayNudgeCount, setTodayNudgeCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (profile) {
      setPagesGoal(profile.pagesPerDay || 5);
    }
  }, [user, loading, router, profile]);

  useEffect(() => {
    async function checkNudges() {
      if (!user?.uid || !db) return;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const q = query(
        collection(db, "users", user.uid, "sentNudges"),
        where("sentAt", ">=", startOfDay.toISOString())
      );
      const snap = await getDocs(q);
      setTodayNudgeCount(snap.size);
    }
    if (user?.uid) checkNudges();
  }, [db, user?.uid]);

  const booksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "books"), orderBy("createdAt", "desc"), limit(1));
  }, [db, user]);
  const { data: books } = useCollection(booksQuery);
  const currentBook = books?.[0];

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

  const membersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users"), orderBy("points", "desc"), limit(10));
  }, [db, user]);
  const { data: leaderboardMembers } = useCollection(membersQuery);

  if (loading || !user || !profile) return null;

  const getRank = (pts: number) => {
    if (pts <= 1000) return { title: "Seeker", level: 1 };
    if (pts <= 3000) return { title: "Golden Seeker", level: 2 };
    if (pts <= 5000) return { title: "Pilgrim", level: 3 };
    if (pts <= 7000) return { title: "Golden Pilgrim", level: 4 };
    if (pts <= 10000) return { title: "Beacon", level: 5 };
    return { title: "Golden Beacon", level: 6 };
  };

  const rank = getRank(profile.points || 0);
  const readingTotal = profile.currentPagesRead || 0;
  const progressPercent = currentBook ? Math.min(100, Math.round((readingTotal / currentBook.totalPages) * 100)) : 0;

  const handleUpdateGoal = () => {
    updateDocumentNonBlocking(doc(db, "users", user.uid), { pagesPerDay: pagesGoal });
    toast({ title: "Goal Updated", description: `Your daily reading goal is now ${pagesGoal} pages.` });
  };

  const handleMarkComplete = () => {
    if (pagesReadToday <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a positive number of pages.",
      });
      return;
    }

    if (currentBook && (readingTotal + pagesReadToday) > currentBook.totalPages) {
      toast({
        variant: "destructive",
        title: "Page Limit Exceeded",
        description: `Cannot log more than ${currentBook.totalPages} pages for this book. You have already logged ${readingTotal} pages.`,
      });
      return;
    }

    setIsSubmitting(true);
    
    const ptsToAdd = pagesReadToday * 2;
    const userRef = doc(db, "users", user.uid);
    const newPagesRead = (profile.currentPagesRead || 0) + pagesReadToday;
    
    const lastRead = profile.lastReadAt ? new Date(profile.lastReadAt) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let newStreak = profile.streak || 0;
    
    if (!lastRead) {
      newStreak = 1;
    } else {
      const lastReadDate = new Date(lastRead);
      lastReadDate.setHours(0, 0, 0, 0);
      
      if (lastReadDate.getTime() === today.getTime()) {
        // Already read today, add points but streak remains
      } else if (lastReadDate.getTime() === yesterday.getTime()) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    updateDocumentNonBlocking(userRef, {
      points: (profile.points || 0) + ptsToAdd,
      currentPagesRead: newPagesRead,
      streak: newStreak,
      lastReadAt: new Date().toISOString()
    });

    toast({ title: "Progress Recorded", description: `+${ptsToAdd} points! Streak: ${newStreak} days.` });
    setPagesReadToday(0);
    setIsSubmitting(false);
  };

  const handleReflectionSubmit = async () => {
    const sentences = reflection.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length < 2 || sentences.length > 5) {
      toast({ variant: "destructive", title: "Invalid Reflection", description: "Reflection must be between 2 and 5 sentences." });
      return;
    }

    const reward = 10;
    const reflectionId = `refl_${new Date().toISOString().split('T')[0]}`;
    
    // Check if already completed today
    const challRef = doc(db, "users", user.uid, "userChallenges", reflectionId);
    const challSnap = await getDoc(challRef);
    if(challSnap.exists()) {
      toast({ variant: "destructive", title: "Already Reflected", description: "You can only submit one reflection per day."});
      return;
    }

    setDoc(challRef, {
      id: reflectionId,
      challengeId: "reflection_daily",
      userId: user.uid,
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward
    });

    updateDocumentNonBlocking(doc(db, "users", user.uid), { points: (profile.points || 0) + reward });
    setReflection("");
    toast({ title: "Reflection Shared", description: `+${reward} points earned!` });
  };

  const handleSendNudge = () => {
    if (todayNudgeCount >= 3) {
      toast({ variant: "destructive", title: "Limit Reached", description: "Maximum 3 nudges per day." });
      return;
    }
    
    const reward = 3;
    const nudgeId = Math.random().toString(36).substring(7);

    setDoc(doc(db, "users", user.uid, "sentNudges", nudgeId), {
      id: nudgeId,
      senderId: user.uid,
      receiverId: selectedNudgeMember,
      message: nudgeMessage,
      sentAt: new Date().toISOString(),
      isBonusAwarded: false
    });

    const notifId = Math.random().toString(36).substring(7);
    setDoc(doc(db, "users", selectedNudgeMember, "notifications", notifId), {
      id: notifId,
      userId: selectedNudgeMember,
      type: "NudgeReceived",
      message: `${profile.name} sent you an encouragement nudge!`,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    });

    updateDocumentNonBlocking(doc(db, "users", user.uid), { points: (profile.points || 0) + reward });
    setTodayNudgeCount(prev => prev + 1);
    toast({ title: "Nudge Sent", description: `+${reward} points earned!` });
  };

  const handleCheckIn = (discussion: any) => {
    const discDate = new Date(discussion.scheduledDateTime);
    const now = new Date();
    const diffHours = (now.getTime() - discDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0 || diffHours > 24) {
      toast({ variant: "destructive", title: "Check-in Not Available", description: "You can only check-in within 24 hours of the discussion start time." });
      return;
    }

    const reward = 20;
    const checkInId = `att_${discussion.id}`;
    setDoc(doc(db, "users", user.uid, "userChallenges", checkInId), {
      id: checkInId,
      challengeId: discussion.id,
      userId: user.uid,
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward
    });

    updateDocumentNonBlocking(doc(db, "users", user.uid), { points: (profile.points || 0) + reward });
    toast({ title: "Checked In", description: `+${reward} points for attending discussion!` });
  };

  const handleCompleteDynamicChallenge = (challenge: any) => {
    const reward = challenge.pointsReward;
    const userChallengeId = `dynamic_${challenge.id}`;
    
    setDoc(doc(db, "users", user.uid, "userChallenges", userChallengeId), {
      id: userChallengeId,
      challengeId: challenge.id,
      userId: user.uid,
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward
    });

    updateDocumentNonBlocking(doc(db, "users", user.uid), { points: (profile.points || 0) + reward });
    toast({ title: "Challenge Completed", description: `+${reward} points awarded!` });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2 flex items-center gap-6">
            <div className="relative h-20 w-20 rounded-full border-2 border-accent overflow-hidden shadow-sm bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {profile.profilePictureUrl ? (
                <Image src={profile.profilePictureUrl} alt={profile.name} fill className="object-cover" />
              ) : profile.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary font-headline">{profile.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-accent text-primary uppercase text-[10px] tracking-tighter">{rank.title}</Badge>
                <span className="text-xs text-muted-foreground">Level {rank.level}</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Star className="h-4 w-4 text-accent fill-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Points</p>
                <p className="text-lg font-bold text-primary">{profile.points?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-accent/10 flex items-center gap-2">
              <Flame className={`h-4 w-4 ${profile.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted'}`} />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Streak</p>
                <p className="text-lg font-bold text-primary">{profile.streak || 0}d</p>
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
                      <p className="text-[10px] text-primary-foreground/40 font-bold uppercase">Due</p>
                      <p className="text-sm font-bold">{currentBook.currentReadingPlanDueDate ? new Date(currentBook.currentReadingPlanDueDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-md text-center">
                      <p className="text-[10px] text-primary-foreground/40 font-bold uppercase">Total Pages</p>
                      <p className="text-sm font-bold">{currentBook.totalPages}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-md text-center group cursor-pointer hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-primary-foreground/40 font-bold uppercase">Daily Goal</p>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm font-bold">{profile.pagesPerDay || 5}</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Settings2 className="h-3 w-3 text-accent opacity-50 hover:opacity-100" />
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Edit Daily Goal</DialogTitle></DialogHeader>
                            <div className="py-4 space-y-2">
                              <Label>Pages per Day</Label>
                              <Input type="number" value={pagesGoal} onChange={(e) => setPagesGoal(parseInt(e.target.value) || 0)} />
                            </div>
                            <DialogFooter><Button onClick={handleUpdateGoal} className="w-full">Update Goal</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
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
                    <CardDescription className="text-[10px] line-clamp-2">Submit 2-5 sentences reflecting on today's reading.</CardDescription>
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
                          <Button onClick={() => handleCompleteDynamicChallenge(chall)} variant="outline" className="w-full h-8 text-xs rounded-full border-accent text-accent hover:bg-accent hover:text-white transition-colors">
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
            <Card className="border-none shadow-sm bg-primary text-white">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">Fellowship Nudge</CardTitle>
                  <Badge className="bg-white/10 text-accent">{todayNudgeCount}/3 Sent</Badge>
                </div>
                <CardDescription className="text-[10px] text-primary-foreground/60 italic">Encourage a brother or sister today.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedNudgeMember} onValueChange={setSelectedNudgeMember}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs">
                    <SelectValue placeholder="Select member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leaderboardMembers?.filter(m => m.id !== user.uid).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={nudgeMessage} onChange={(e) => setNudgeMessage(e.target.value)} className="bg-white/5 border-white/10 h-9 text-xs" />
                <Button onClick={handleSendNudge} disabled={!selectedNudgeMember || todayNudgeCount >= 3} className="w-full bg-accent text-primary h-9 rounded-full font-bold text-xs hover:bg-accent/90">
                  <Send className="h-3 w-3 mr-1.5" /> Send Nudge (+3)
                </Button>
              </CardContent>
            </Card>

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
              <CardHeader className="bg-accent/5 pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-accent" /> Fellowship Rank</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {leaderboardMembers?.map((m, i) => (
                  <div key={m.id} className={`flex items-center gap-3 p-3 border-b last:border-0 ${m.id === user.uid ? 'bg-accent/5' : ''}`}>
                    <span className="font-headline font-bold text-muted-foreground text-xs">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold">{m.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{m.points || 0} PTS</p>
                    </div>
                    {m.streak > 0 && (
                      <div className="flex items-center gap-0.5 text-orange-500 font-bold text-[10px]">
                        <Flame className="h-3 w-3 fill-orange-500" /> {m.streak}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
