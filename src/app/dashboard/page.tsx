
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
  MessageSquare, 
  Award,
  ChevronRight,
  TrendingUp,
  HandMetal,
  History,
  Send,
  Bell,
  CheckCircle2,
  Zap,
  Clock,
  CalendarDays,
  PenLine,
  Settings2
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, setDoc, where, getDocs, Timestamp } from "firebase/firestore";
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

  const booksQuery = useMemoFirebase(() => query(collection(db, "books"), orderBy("title"), limit(1)), [db]);
  const { data: books } = useCollection(booksQuery);
  const currentBook = books?.[0];

  const challengesQuery = useMemoFirebase(() => query(collection(db, "challenges"), where("isActive", "==", true), orderBy("startDate", "desc")), [db]);
  const { data: challenges } = useCollection(challengesQuery);

  const userChallengesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return collection(db, "users", user.uid, "userChallenges");
  }, [db, user?.uid]);
  const { data: userChallenges } = useCollection(userChallengesQuery);

  const discussionsQuery = useMemoFirebase(() => query(collection(db, "discussions"), orderBy("scheduledDateTime", "desc"), limit(5)), [db]);
  const { data: discussions } = useCollection(discussionsQuery);

  const membersQuery = useMemoFirebase(() => query(collection(db, "users"), orderBy("points", "desc"), limit(20)), [db]);
  const { data: leaderboardMembers } = useCollection(membersQuery);

  // Check today's nudges
  const [todayNudgeCount, setTodayNudgeCount] = useState(0);
  useEffect(() => {
    async function checkNudges() {
      if (!user?.uid) return;
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const q = query(
        collection(db, "users", user.uid, "sentNudges"),
        where("sentAt", ">=", startOfDay.toISOString())
      );
      const snap = await getDocs(q);
      setTodayNudgeCount(snap.size);
    }
    if (user?.uid) checkNudges();
  }, [db, user?.uid, selectedNudgeMember]);

  if (loading || !user || !profile) return null;

  const getRank = (pts: number) => {
    if (pts <= 1000) return { title: "Seeker", level: 1 };
    if (pts <= 3000) return { title: "Golden Seeker", level: 2 };
    if (pts <= 5000) return { title: "Pilgrim", level: 3 };
    if (pts <= 7000) return { title: "Golden Pilgrim", level: 4 };
    if (pts <= 10000) return { title: "Beacon", level: 5 };
    return { title: "Golden Beacon", level: 6 };
  };

  const rank = getRank(profile.points);

  const handleUpdateGoal = () => {
    if (!user?.uid) return;
    updateDocumentNonBlocking(doc(db, "users", user.uid), { pagesPerDay: pagesGoal });
    toast({ title: "Goal Updated", description: `Your daily reading goal is now ${pagesGoal} pages.` });
  };

  const handleMarkComplete = () => {
    if (!user?.uid || !profile) return;
    const ptsToAdd = pagesReadToday * 2;
    const userRef = doc(db, "users", user.uid);
    
    // Check if streak should increment
    const lastRead = profile.lastReadAt ? new Date(profile.lastReadAt) : null;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let newStreak = profile.streak || 0;
    if (!lastRead || lastRead.getTime() < today.getTime()) {
      newStreak += 1;
    }

    updateDocumentNonBlocking(userRef, {
      points: profile.points + ptsToAdd,
      streak: newStreak,
      lastReadAt: new Date().toISOString()
    });

    toast({ title: "Progress Recorded", description: `You earned ${ptsToAdd} points! Streak: ${newStreak} days.` });
    setPagesReadToday(0);
  };

  const handleReflectionSubmit = () => {
    if (!user?.uid || !profile) return;
    const sentences = reflection.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length < 2 || sentences.length > 5) {
      toast({ variant: "destructive", title: "Invalid Reflection", description: "Please write 2-5 complete sentences." });
      return;
    }

    const reward = 10;
    const userRef = doc(db, "users", user.uid);
    updateDocumentNonBlocking(userRef, { points: profile.points + reward });
    
    const reflectionId = Math.random().toString(36).substring(7);
    setDoc(doc(db, "users", user.uid, "userChallenges", reflectionId), {
      id: reflectionId,
      challengeId: "reflection_daily",
      userId: user.uid,
      status: "Completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: reflection,
      pointsEarned: reward
    });

    setReflection("");
    toast({ title: "Reflection Submitted", description: `+${reward} points earned!` });
  };

  const handleSendNudge = async () => {
    if (!user?.uid || !selectedNudgeMember || !profile) return;
    if (todayNudgeCount >= 3) {
      toast({ variant: "destructive", title: "Limit Reached", description: "You can only send 3 nudges per day." });
      return;
    }
    
    const nudgeId = Math.random().toString(36).substring(7);
    const reward = 3;

    // Save sent nudge
    setDoc(doc(db, "users", user.uid, "sentNudges", nudgeId), {
      id: nudgeId,
      senderId: user.uid,
      receiverId: selectedNudgeMember,
      message: nudgeMessage,
      sentAt: new Date().toISOString(),
      isBonusAwarded: false
    });

    // Notify receiver
    const notifId = Math.random().toString(36).substring(7);
    setDoc(doc(db, "users", selectedNudgeMember, "notifications", notifId), {
      id: notifId,
      userId: selectedNudgeMember,
      type: "NudgeReceived",
      message: `Encouragement from ${profile.name}: "${nudgeMessage}"`,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    });

    // Award sender points
    updateDocumentNonBlocking(doc(db, "users", user.uid), { points: profile.points + reward });

    toast({ title: "Nudge Sent", description: `+${reward} points earned!` });
    setSelectedNudgeMember("");
    setTodayNudgeCount(prev => prev + 1);
  };

  const handleDiscussionCheckIn = (discussion: any) => {
    if (!user?.uid || !profile) return;
    const discDate = new Date(discussion.scheduledDateTime);
    const now = new Date();
    const diffHours = (now.getTime() - discDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      toast({ title: "Too Early", description: "Discussion hasn't started yet!" });
      return;
    }
    if (diffHours > 24) {
      toast({ variant: "destructive", title: "Expired", description: "Attendance check-in window (24h) has closed." });
      return;
    }

    const reward = 20;
    const userRef = doc(db, "users", user.uid);
    updateDocumentNonBlocking(userRef, { points: profile.points + reward });

    const attendanceId = `disc_att_${discussion.id}`;
    setDoc(doc(db, "users", user.uid, "userChallenges", attendanceId), {
      id: attendanceId,
      challengeId: discussion.id,
      userId: user.uid,
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward
    });

    toast({ title: "Checked In", description: `+${reward} points for attending "${discussion.topic}"!` });
  };

  const progressPercentage = currentBook ? Math.min(100, Math.round(((profile.points / 10) / currentBook.totalPages) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2 flex items-center gap-6">
            <div className="relative h-24 w-24 rounded-full border-4 border-accent overflow-hidden shadow-lg bg-primary flex items-center justify-center text-3xl font-bold text-white">
              {profile.profilePictureUrl ? (
                <Image src={profile.profilePictureUrl} alt={profile.name} fill className="object-cover" />
              ) : profile.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary font-headline">{profile.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-accent border-accent font-bold uppercase tracking-widest text-[10px]">
                  {rank.title}
                </Badge>
                <span className="text-sm text-muted-foreground">Level {rank.level}</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap justify-end gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
              <Star className="h-6 w-6 text-accent fill-accent" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Points</p>
                <p className="text-xl font-bold text-primary">{profile.points?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
              <Flame className={`h-6 w-6 ${profile.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted'}`} />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Streak</p>
                <p className="text-xl font-bold text-primary">{profile.streak || 0} Days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {currentBook && (
              <Card className="border-none shadow-md overflow-hidden bg-primary text-white">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-white/10 text-accent mb-2">CURRENT CLUB READING</Badge>
                      <CardTitle className="text-2xl font-headline">{currentBook.title}</CardTitle>
                      <CardDescription className="text-primary-foreground/70">
                        {currentBook.description}
                      </CardDescription>
                    </div>
                    <BookOpen className="h-8 w-8 text-accent/50" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span>Reading Progress</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3 bg-white/10" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-xs text-primary-foreground/50 uppercase font-bold">Total Pages</p>
                      <p className="text-lg font-bold">{currentBook.totalPages}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg flex flex-col justify-between">
                      <p className="text-xs text-primary-foreground/50 uppercase font-bold">Goal</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">{profile.pagesPerDay || 5} pgs</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-accent"><Settings2 className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Edit Reading Goal</DialogTitle></DialogHeader>
                            <div className="py-4 space-y-4">
                               <Label>Planned Pages Per Day</Label>
                               <Input type="number" value={pagesGoal} onChange={(e) => setPagesGoal(parseInt(e.target.value))} />
                            </div>
                            <DialogFooter><Button onClick={handleUpdateGoal}>Save Changes</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-xs text-primary-foreground/50 uppercase font-bold">Plan Due</p>
                      <p className="text-lg font-bold text-accent">
                        {currentBook.currentReadingPlanDueDate || 'TBD'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border-none bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Daily Progress Tracker
                </CardTitle>
                <CardDescription>Update your reading count and maintain your spiritual streak.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Pages Read Today</Label>
                    <Input 
                      type="number" 
                      value={pagesReadToday} 
                      onChange={(e) => setPagesReadToday(parseInt(e.target.value) || 0)}
                      className="bg-white border-accent/20 h-12 text-lg"
                    />
                  </div>
                  <Button 
                    onClick={handleMarkComplete}
                    className="bg-primary text-white hover:bg-primary/90 font-bold px-8 h-12 rounded-full"
                    disabled={pagesReadToday <= 0}
                  >
                    Mark Today Complete
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" /> Spiritual Challenges
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Reflection Challenge */}
                <Card className="border-none shadow-sm flex flex-col bg-secondary/20">
                  <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">Daily</Badge>
                      <span className="text-xs font-bold text-accent flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent" /> +10
                      </span>
                    </div>
                    <CardTitle className="text-base font-headline">Reflection of the Day</CardTitle>
                    <CardDescription className="text-xs">Share what you learned from your reading today.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <Textarea 
                      placeholder="Write 2-5 sentences about today's reading..."
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="bg-white text-xs min-h-[100px]"
                    />
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleReflectionSubmit}
                      disabled={!reflection.trim()}
                      className="w-full text-xs rounded-full h-9" 
                      variant="default"
                    >
                      Submit Reflection
                    </Button>
                  </CardFooter>
                </Card>

                {/* Fellow Member Challenges Managed by Admin */}
                {challenges?.map(challenge => {
                  const userChallenge = userChallenges?.find(uc => uc.challengeId === challenge.id);
                  const isCompleted = userChallenge?.status === "Completed";
                  const isInProgress = userChallenge?.status === "InProgress";

                  return (
                    <Card key={challenge.id} className="border-none shadow-sm flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase">{challenge.type}</Badge>
                          <span className="text-xs font-bold text-accent flex items-center gap-1">
                            <Star className="h-3 w-3 fill-accent" /> +{challenge.pointsReward}
                          </span>
                        </div>
                        <CardTitle className="text-base font-headline">{challenge.title}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2 mt-1">{challenge.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="py-2 flex-1">
                        <p className="text-[10px] text-muted-foreground font-bold italic">Criteria: {challenge.completionCriteria}</p>
                      </CardContent>
                      <CardFooter className="pt-2">
                        {!userChallenge && (
                          <Button onClick={() => handleStartChallenge(challenge.id)} className="w-full text-xs rounded-full h-9" variant="outline">Start Challenge</Button>
                        )}
                        {isInProgress && (
                          <Button onClick={() => handleCompleteChallenge(userChallenge.id, challenge.pointsReward, challenge.title)} className="w-full text-xs bg-primary text-white hover:bg-primary/90 rounded-full h-9">
                             Mark Completed
                          </Button>
                        )}
                        {isCompleted && (
                          <div className="w-full flex items-center justify-center gap-2 bg-accent/20 text-primary py-2 rounded-full text-[10px] font-bold uppercase tracking-widest h-9">
                            <CheckCircle2 className="h-4 w-4" /> Completed
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="shadow-sm border-none bg-primary text-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                   <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HandMetal className="h-5 w-5 text-accent" />
                      Fellowship Nudge
                    </CardTitle>
                    <CardDescription className="text-primary-foreground/70 text-xs">Support a fellow reader.</CardDescription>
                   </div>
                   <Badge className="bg-white/20 text-accent">{todayNudgeCount}/3 Sent</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedNudgeMember} onValueChange={setSelectedNudgeMember}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select a brother/sister..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leaderboardMembers?.filter(m => m.id !== user?.uid).map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="Encouragement message..." 
                  value={nudgeMessage}
                  onChange={(e) => setNudgeMessage(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-xs"
                />
                <Button onClick={handleSendNudge} disabled={!selectedNudgeMember || todayNudgeCount >= 3} className="w-full bg-accent text-primary font-bold hover:bg-accent/90 rounded-full">
                  <Send className="mr-2 h-4 w-4" /> Send Nudge (+3 Pts)
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-secondary/30 overflow-hidden">
              <CardHeader className="bg-secondary/50">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <CalendarDays className="h-5 w-5 text-accent" />
                  Upcoming Discussions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {discussions?.length ? discussions.map(disc => {
                  const isCompleted = userChallenges?.find(uc => uc.challengeId === disc.id)?.status === "Completed";
                  return (
                    <div key={disc.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-primary">{disc.topic}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {hasMounted ? new Date(disc.scheduledDateTime).toLocaleString() : "..."}
                          </p>
                        </div>
                        {!isCompleted ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[10px] h-7 border-accent text-accent"
                            onClick={() => handleDiscussionCheckIn(disc)}
                          >
                            Check-in (+20)
                          </Button>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 h-6"><CheckCircle2 className="h-3 w-3 mr-1" /> Attended</Badge>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No scheduled discussions yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none overflow-hidden">
              <CardHeader className="bg-accent/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {leaderboardMembers?.map((member, i) => (
                  <div key={member.id} className={`flex items-center gap-3 p-3 rounded-lg ${member.id === user?.uid ? 'bg-accent/10 border border-accent/20' : ''}`}>
                    <div className="font-headline font-bold text-lg text-primary/20 w-6">#{i + 1}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${member.id === user?.uid ? 'text-primary' : 'text-muted-foreground'}`}>{member.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{member.points?.toLocaleString() || 0} pts</p>
                    </div>
                    {member.streak > 0 && (
                      <div className="flex items-center gap-1 text-orange-500 font-bold text-xs">
                        <Flame className="h-3 w-3 fill-orange-500" /> {member.streak}
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
