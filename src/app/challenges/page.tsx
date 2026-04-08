
"use client";

import { useEffect, useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { 
  Zap,
  Flame, 
  Star, 
  CheckCircle2,
  CalendarDays,
  Loader2,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, doc, where, runTransaction } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ChallengesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [completingChallenge, setCompletingChallenge] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  const dailyChallenges = useMemo(() => challenges?.filter(c => c.type === 'Daily') || [], [challenges]);
  const weeklyChallenges = useMemo(() => challenges?.filter(c => c.type === 'Weekly') || [], [challenges]);
  const specialChallenges = useMemo(() => challenges?.filter(c => c.type === 'Special') || [], [challenges]);

  const isChallengeCompleted = (chall: any) => {
    return userChallenges?.some(uc => {
      if (uc.challengeId !== chall.id) return false;
      const completedAt = new Date(uc.completedAt);
      const now = new Date();
      if (chall.type === 'Daily') {
        return completedAt.toDateString() === now.toDateString();
      }
      if (chall.type === 'Weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        startOfWeek.setHours(0, 0, 0, 0);
        return completedAt >= startOfWeek;
      }
      return true; // Special challenges are once-off
    });
  };

  const handleSubmissionForChallenge = async () => {
    if (!completingChallenge || !submissionText.trim() || !user) return;

    setIsSubmitting(true);
    const reward = completingChallenge.pointsReward;
    let periodSuffix = "";
    const now = new Date();
    if (completingChallenge.type === 'Daily') {
      periodSuffix = `_d_${now.toISOString().split('T')[0]}`;
    } else if (completingChallenge.type === 'Weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      periodSuffix = `_w_${startOfWeek.toISOString().split('T')[0]}`;
    }
    
    const userChallengeId = `dynamic_${completingChallenge.id}${periodSuffix}`;
    const userChallengeData = {
      id: userChallengeId,
      challengeId: completingChallenge.id,
      userId: user.uid,
      status: "Completed",
      completedAt: new Date().toISOString(),
      pointsEarned: reward,
      submissionText: submissionText
    };

    const userRef = doc(db, "users", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw "User does not exist";
        const currentProfile = userSnap.data();

        transaction.set(doc(db, "users", user.uid, "userChallenges", userChallengeId), userChallengeData);

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
      toast({ title: "Challenge Completed", description: `You've earned ${reward} points!` });
      setCompletingChallenge(null);
      setSubmissionText("");
    } catch (e) {
      toast({ variant: "destructive", title: "Submission Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChallengeItem = (chall: any) => {
    const completed = isChallengeCompleted(chall);
    return (
      <Card key={chall.id} className="border shadow-sm flex flex-col justify-between group hover:border-accent/50 transition-colors bg-white">
        <CardHeader className="p-4 pb-2 space-y-1">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-sm text-primary leading-tight">{chall.title}</h4>
            <Badge variant="secondary" className="text-[10px] font-bold text-accent px-1.5 py-0">+{chall.pointsReward}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-3 hover:line-clamp-none transition-all">{chall.description}</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-[9px] text-muted-foreground italic font-medium">Target: {chall.completionCriteria}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-end">
          {completed ? (
            <div className="flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase">
              <CheckCircle2 className="h-4 w-4" />
              <span>Done</span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[10px] rounded-full border-primary text-primary hover:bg-primary hover:text-white" 
              onClick={() => setCompletingChallenge(chall)}
            >
              Complete Challenge
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8 max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
             <Link href="/dashboard" className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors mb-2">
                <ArrowLeft className="h-3 w-3" /> Back to Dashboard
             </Link>
             <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
               <Zap className="h-8 w-8 text-accent fill-accent" /> Spiritual Challenges
             </h1>
             <p className="text-muted-foreground text-sm">Deepen your practice and earn spiritual points through consistent discipline.</p>
          </div>
          <div className="hidden md:flex flex-col items-end">
             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Earned</p>
             <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-primary">{profile.points?.toLocaleString()}</span>
             </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Daily Challenges Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500 fill-orange-500" /> Daily Goals
              <Badge variant="outline" className="ml-auto text-[9px] py-0 h-4">{dailyChallenges.length}</Badge>
            </h3>
            <div className="space-y-4">
              {dailyChallenges.length > 0 ? dailyChallenges.map(renderChallengeItem) : (
                <p className="text-xs text-center text-muted-foreground italic py-10 bg-muted/20 rounded-lg">No daily goals active</p>
              )}
            </div>
          </div>

          {/* Weekly Challenges Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" /> Weekly Discipline
              <Badge variant="outline" className="ml-auto text-[9px] py-0 h-4">{weeklyChallenges.length}</Badge>
            </h3>
            <div className="space-y-4">
              {weeklyChallenges.length > 0 ? weeklyChallenges.map(renderChallengeItem) : (
                <p className="text-xs text-center text-muted-foreground italic py-10 bg-muted/20 rounded-lg">No weekly goals active</p>
              )}
            </div>
          </div>

          {/* Special Challenges Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Special Quests
              <Badge variant="outline" className="ml-auto text-[9px] py-0 h-4">{specialChallenges.length}</Badge>
            </h3>
            <div className="space-y-4">
              {specialChallenges.length > 0 ? specialChallenges.map(renderChallengeItem) : (
                <p className="text-xs text-center text-muted-foreground italic py-10 bg-muted/20 rounded-lg">No special quests active</p>
              )}
            </div>
          </div>
        </div>

        {(!challenges || challenges.length === 0) && (
          <div className="py-20 text-center space-y-4 bg-muted/10 rounded-3xl border border-dashed">
             <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto" />
             <p className="text-muted-foreground italic">The harbor is quiet. Check back later for new spiritual challenges.</p>
          </div>
        )}

        <Dialog open={!!completingChallenge} onOpenChange={(open) => { if (!open) { setCompletingChallenge(null); setSubmissionText(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" /> {completingChallenge?.title}
              </DialogTitle>
              <DialogDescription className="text-xs italic border-l-2 pl-3 py-1">
                {completingChallenge?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="submission-text" className="text-xs font-bold uppercase text-muted-foreground">Your Meditation / Submission</Label>
                <Textarea 
                  id="submission-text" 
                  placeholder="Record your thoughts, actions, or reflections here..." 
                  value={submissionText} 
                  onChange={(e) => setSubmissionText(e.target.value)} 
                  className="min-h-[150px] bg-white shadow-inner" 
                />
              </div>
              <div className="bg-accent/5 p-3 rounded-lg border border-accent/10">
                 <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Target Criteria</p>
                 <p className="text-xs text-primary font-medium">{completingChallenge?.completionCriteria}</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setCompletingChallenge(null)}>Cancel</Button>
              <Button onClick={handleSubmissionForChallenge} disabled={!submissionText.trim() || isSubmitting} className="rounded-full px-8 bg-primary font-bold">
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit and Earn +{completingChallenge?.pointsReward} pts
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
