
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

  // Count challenges that are NOT reflections or discussion check-ins
  const challengesCompletedCount = useMemo(() => {
    if (!userChallenges) return 0;
    return userChallenges.filter(uc => !uc.id.startsWith('refl_') && !uc.id.startsWith('att_')).length;
  }, [userChallenges]);

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
      <Card key={chall.id} className="border shadow-md flex flex-col justify-between group hover:border-accent transition-all duration-300 bg-white">
        <CardHeader className="p-6 pb-2 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-xl text-primary leading-tight flex-1">{chall.title}</h4>
            <Badge variant="secondary" className="text-sm font-bold text-accent px-2 py-1 shrink-0">+{chall.pointsReward}</Badge>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            {chall.description}
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <div className="bg-muted/30 p-4 rounded-xl border border-muted">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Target Criteria</p>
            <p className="text-sm text-primary font-medium italic">{chall.completionCriteria}</p>
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0 flex justify-end">
          {completed ? (
            <div className="flex items-center gap-2 text-green-600 font-bold text-sm uppercase tracking-wider">
              <CheckCircle2 className="h-5 w-5" />
              <span>Completed</span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full text-sm font-bold rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-colors" 
              onClick={() => setCompletingChallenge(chall)}
            >
              Take Action
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
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
             <Link href="/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 hover:text-accent transition-colors mb-2">
                <ArrowLeft className="h-3 w-3" /> Back to Dashboard
             </Link>
             <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
               <Zap className="h-8 w-8 text-accent fill-accent" /> Spiritual Challenges
             </h1>
             <p className="text-muted-foreground text-sm max-w-2xl">
               Cultivate your spiritual discipline and earn points by engaging in daily, weekly, and special fellowship acts.
             </p>
          </div>
          <div className="bg-white px-6 py-4 rounded-2xl border border-accent/10 shadow-sm flex flex-col items-center md:items-end justify-center min-w-[200px]">
             <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Challenges Completed</p>
             <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-accent" />
                <span className="text-2xl font-bold text-primary">{challengesCompletedCount}</span>
             </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Daily Challenges Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-orange-100 pb-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-orange-600 flex items-center gap-2">
                <Flame className="h-5 w-5 fill-orange-500" /> Daily Rhythm
              </h3>
              <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700">{dailyChallenges.length} Active</Badge>
            </div>
            <div className="space-y-6">
              {dailyChallenges.length > 0 ? dailyChallenges.map(renderChallengeItem) : (
                <div className="py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                   <p className="text-sm text-muted-foreground italic">No daily goals at the moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Challenges Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-blue-100 pb-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Weekly Discipline
              </h3>
              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">{weeklyChallenges.length} Active</Badge>
            </div>
            <div className="space-y-6">
              {weeklyChallenges.length > 0 ? weeklyChallenges.map(renderChallengeItem) : (
                <div className="py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                   <p className="text-sm text-muted-foreground italic">No weekly discipline tasks yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Special Challenges Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-yellow-100 pb-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-600 flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-500" /> Special Quests
              </h3>
              <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">{specialChallenges.length} Active</Badge>
            </div>
            <div className="space-y-6">
              {specialChallenges.length > 0 ? specialChallenges.map(renderChallengeItem) : (
                <div className="py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                   <p className="text-sm text-muted-foreground italic">No special quests available.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {(!challenges || challenges.length === 0) && (
          <div className="py-24 text-center space-y-6 bg-muted/10 rounded-[3rem] border-4 border-dashed border-muted/30">
             <Zap className="h-20 w-20 text-muted-foreground/20 mx-auto" />
             <div className="space-y-2">
               <p className="text-2xl font-headline text-primary font-bold">The Harbor is Still</p>
               <p className="text-muted-foreground max-w-sm mx-auto">Check back later for new spiritual opportunities and challenges from the fellowship.</p>
             </div>
          </div>
        )}

        <Dialog open={!!completingChallenge} onOpenChange={(open) => { if (!open) { setCompletingChallenge(null); setSubmissionText(""); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <Zap className="h-6 w-6 text-accent fill-accent" /> {completingChallenge?.title}
              </DialogTitle>
              <DialogDescription className="text-base italic bg-accent/5 p-4 rounded-xl border-l-4 border-accent mt-2">
                {completingChallenge?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="submission-text" className="text-sm font-black uppercase text-primary tracking-widest">Your Spiritual Reflection</Label>
                <Textarea 
                  id="submission-text" 
                  placeholder="Share your experience, what you learned, or how you fulfilled this challenge..." 
                  value={submissionText} 
                  onChange={(e) => setSubmissionText(e.target.value)} 
                  className="min-h-[200px] bg-white border-muted-foreground/20 text-base leading-relaxed p-4 focus-visible:ring-accent" 
                />
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                 <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-1">Target Criteria</p>
                 <p className="text-sm text-primary font-medium">{completingChallenge?.completionCriteria}</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setCompletingChallenge(null)} className="font-bold">Cancel</Button>
              <Button onClick={handleSubmissionForChallenge} disabled={!submissionText.trim() || isSubmitting} className="rounded-full px-8 h-12 bg-primary font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                Complete and Claim +{completingChallenge?.pointsReward} pts
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
