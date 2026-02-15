
"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Trophy, 
  BookOpen, 
  Flame, 
  Target, 
  Star, 
  MessageSquare, 
  FileText, 
  Award,
  ChevronRight,
  TrendingUp,
  HandMetal,
  History,
  Send
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const [pagesReadToday, setPagesReadToday] = useState<number>(0);
  const [selectedNudgeMember, setSelectedNudgeMember] = useState<string>("");
  const [nudgeMessage, setNudgeMessage] = useState<string>("Keep up the great reading today!");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const booksQuery = useMemoFirebase(() => query(collection(db, "books"), limit(1)), [db]);
  const { data: books } = useCollection(booksQuery);
  const currentBook = books?.[0];

  const challengesQuery = useMemoFirebase(() => query(collection(db, "challenges"), orderBy("startDate", "desc")), [db]);
  const { data: challenges } = useCollection(challengesQuery);

  const userChallengesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return collection(db, "users", user.uid, "userChallenges");
  }, [db, user?.uid]);
  const { data: userChallenges } = useCollection(userChallengesQuery);

  const membersQuery = useMemoFirebase(() => query(collection(db, "users"), orderBy("points", "desc"), limit(10)), [db]);
  const { data: leaderboardMembers } = useCollection(membersQuery);

  const nudgesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(db, "users", user.uid, "receivedNudges"), orderBy("sentAt", "desc"), limit(5));
  }, [db, user?.uid]);
  const { data: receivedNudges } = useCollection(nudgesQuery);

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

  const handleMarkComplete = () => {
    if (!user?.uid || !profile) return;
    const ptsToAdd = pagesReadToday * 2;
    const userRef = doc(db, "users", user.uid);
    
    updateDocumentNonBlocking(userRef, {
      points: profile.points + ptsToAdd,
      streak: profile.streak + 1, // Simplified for MVP logic
    });

    toast({ title: "Progress Recorded", description: `You earned ${ptsToAdd} points!` });
    setPagesReadToday(0);
  };

  const handleStartChallenge = (challengeId: string) => {
    if (!user?.uid) return;
    const challengeRef = collection(db, "users", user.uid, "userChallenges");
    addDocumentNonBlocking(challengeRef, {
      challengeId,
      userId: user.uid,
      status: "InProgress",
      startedAt: new Date().toISOString(),
      progress: "Started",
      pointsEarned: 0
    });
    toast({ title: "Challenge Started", description: "Good luck with your spiritual goal!" });
  };

  const handleCompleteChallenge = (userChallengeId: string, reward: number) => {
    if (!user?.uid || !profile) return;
    const challengeDocRef = doc(db, "users", user.uid, "userChallenges", userChallengeId);
    const userRef = doc(db, "users", user.uid);

    updateDocumentNonBlocking(challengeDocRef, {
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward
    });

    updateDocumentNonBlocking(userRef, {
      points: profile.points + reward
    });

    toast({ title: "Challenge Completed!", description: `Reward: +${reward} points!` });
  };

  const handleSendNudge = async () => {
    if (!user?.uid || !selectedNudgeMember || !profile) return;
    
    const nudgeId = Math.random().toString(36).substring(7);
    const nudgeData = {
      senderId: user.uid,
      senderName: profile.name,
      receiverId: selectedNudgeMember,
      message: nudgeMessage,
      sentAt: new Date().toISOString(),
      isBonusAwarded: false
    };

    // Store in both paths for structural segregation
    const senderNudgeRef = doc(db, "users", user.uid, "sentNudges", nudgeId);
    const receiverNudgeRef = doc(db, "users", selectedNudgeMember, "receivedNudges", nudgeId);
    const notificationRef = doc(db, "users", selectedNudgeMember, "notifications", nudgeId);

    setDoc(senderNudgeRef, nudgeData);
    setDoc(receiverNudgeRef, nudgeData);
    setDoc(notificationRef, {
      id: nudgeId,
      userId: selectedNudgeMember,
      type: "NudgeReceived",
      message: `You received a nudge from ${profile.name}: "${nudgeMessage}"`,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    });

    toast({ title: "Nudge Sent", description: "Encouragement shared with your fellow member." });
    setSelectedNudgeMember("");
  };

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
                <p className="text-xl font-bold text-primary">{profile.points.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
              <Flame className={`h-6 w-6 ${profile.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted'}`} />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Streak</p>
                <p className="text-xl font-bold text-primary">{profile.streak} Days</p>
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
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-xs text-primary-foreground/50 uppercase font-bold">Total Pages</p>
                      <p className="text-lg font-bold">{currentBook.totalPages}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-xs text-primary-foreground/50 uppercase font-bold">Your Plan</p>
                      <p className="text-lg font-bold">{profile.pagesPerDay || 5} Daily</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-xs text-primary-foreground/50 uppercase font-bold">Due Date</p>
                      <p className="text-lg font-bold">{currentBook.currentReadingPlanDueDate ? new Date(currentBook.currentReadingPlanDueDate).toLocaleDateString() : 'TBD'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border-none bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Personal Reading Tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Pages Read Today</Label>
                    <Input 
                      type="number" 
                      value={pagesReadToday} 
                      onChange={(e) => setPagesReadToday(parseInt(e.target.value) || 0)}
                      className="bg-white"
                    />
                  </div>
                  <Button 
                    onClick={handleMarkComplete}
                    className="bg-primary text-white hover:bg-primary/90 font-bold px-8 h-10"
                    disabled={pagesReadToday <= 0}
                  >
                    Mark Today Complete
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" /> Active Challenges
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {challenges?.map(challenge => {
                  const userChallenge = userChallenges?.find(uc => uc.challengeId === challenge.id);
                  const isCompleted = userChallenge?.status === "Completed";
                  const isInProgress = userChallenge?.status === "InProgress";

                  return (
                    <Card key={challenge.id} className="border-none shadow-sm relative overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <Badge variant="secondary" className="text-[10px]">{challenge.type}</Badge>
                          <span className="text-xs font-bold text-accent">+{challenge.pointsReward} PTS</span>
                        </div>
                        <CardTitle className="text-base mt-2">{challenge.title}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{challenge.description}</CardDescription>
                      </CardHeader>
                      <CardFooter>
                        {!userChallenge && (
                          <Button onClick={() => handleStartChallenge(challenge.id)} className="w-full text-xs" size="sm">Start Challenge</Button>
                        )}
                        {isInProgress && (
                          <Button onClick={() => handleCompleteChallenge(userChallenge.id, challenge.pointsReward)} className="w-full text-xs bg-green-600 hover:bg-green-700" size="sm">Complete</Button>
                        )}
                        {isCompleted && (
                          <Badge className="w-full justify-center bg-accent text-primary py-1">Completed</Badge>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <HandMetal className="h-5 w-5 text-accent" />
                  Nudge a Brother/Sister
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">Encourage others to keep their streaks alive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedNudgeMember} onValueChange={setSelectedNudgeMember}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select a member..." />
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
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
                <Button onClick={handleSendNudge} disabled={!selectedNudgeMember} className="w-full bg-accent text-primary font-bold hover:bg-accent/90">
                  <Send className="mr-2 h-4 w-4" /> Send Nudge
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  Fellowship Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leaderboardMembers?.map((member, i) => (
                  <div key={member.id} className={`flex items-center gap-3 p-3 rounded-lg ${member.id === user?.uid ? 'bg-accent/10 border border-accent/20' : ''}`}>
                    <div className="font-headline font-bold text-lg text-primary/20 w-6">#{i + 1}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${member.id === user?.uid ? 'text-primary' : 'text-muted-foreground'}`}>{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.points.toLocaleString()} pts</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none overflow-hidden">
              <CardHeader className="bg-accent/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-accent" />
                  Recent Received Nudges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {receivedNudges?.length ? receivedNudges.map(nudge => (
                  <div key={nudge.id} className="text-xs border-b pb-2 last:border-0">
                    <p className="font-bold text-primary">From {nudge.senderName}</p>
                    <p className="text-muted-foreground italic">"{nudge.message}"</p>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No nudges received yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
