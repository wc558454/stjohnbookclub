
"use client";

import { useEffect, useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  BookOpen, 
  Flame, 
  Bell, 
  Target, 
  Star, 
  MessageSquare, 
  FileText, 
  Award,
  ChevronRight,
  TrendingUp,
  Calendar
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
};

export default function Dashboard() {
  const { user, updateUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [pagesReadToday, setPagesReadToday] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Rank Titles Logic
  const rankInfo = useMemo(() => {
    if (!user) return { title: "Visitor", level: 0 };
    const pts = user.points;
    if (pts <= 1000) return { title: "Seeker", level: 1 };
    if (pts <= 3000) return { title: "Golden Seeker", level: 2 };
    if (pts <= 5000) return { title: "Pilgrim", level: 3 };
    if (pts <= 7000) return { title: "Golden Pilgrim", level: 4 };
    if (pts <= 10000) return { title: "Beacon", level: 5 };
    return { title: "Golden Beacon", level: 6 };
  }, [user]);

  // Load notifications (filtered by 48 hours)
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`notifications_${user.id}`) || "[]";
    const parsed: Notification[] = JSON.parse(stored);
    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    const filtered = parsed.filter(n => n.timestamp > fortyEightHoursAgo);
    setNotifications(filtered);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(filtered));
  }, [user]);

  // Streak/Gamification Check on Mount
  useEffect(() => {
    if (user && !loading) {
      const now = new Date();
      const lastDate = user.lastChallengeDate ? new Date(user.lastChallengeDate) : null;
      
      if (lastDate) {
        const diffInHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
        if (diffInHours > 48) {
          // Streak reset if more than 24h missed (plus 24h grace = 48h total from last completion)
          updateUser({ currentStreak: 0 });
        }
      }
    }
  }, [user, loading, updateUser]);

  if (loading) return null;
  if (!user) {
    router.push("/login");
    return null;
  }

  const addNotification = (title: string, message: string) => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: Date.now(),
      read: false
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
  };

  const checkBadges = (updatedUser: Partial<UserProfile>) => {
    const current = { ...user, ...updatedUser };
    const newBadges: string[] = [...current.badges];
    let earned = false;

    if (current.currentStreak >= 7 && !newBadges.includes("7-Day Streak")) {
      newBadges.push("7-Day Streak");
      addNotification("New Badge Earned!", "You've unlocked the 7-Day Streak badge!");
      earned = true;
    }
    if (current.currentStreak >= 30 && !newBadges.includes("30-Day Streak")) {
      newBadges.push("30-Day Streak");
      addNotification("New Badge Earned!", "You've unlocked the 30-Day Streak badge!");
      earned = true;
    }
    if (current.totalPagesRead >= 1000 && !newBadges.includes("1000 Pages Read")) {
      newBadges.push("1000 Pages Read");
      addNotification("New Badge Earned!", "You've unlocked the 1000 Pages Read badge!");
      earned = true;
    }
    if (current.discussionsAttended >= 10 && !newBadges.includes("10 Discussions Attended")) {
      newBadges.push("10 Discussions Attended");
      addNotification("New Badge Earned!", "You've unlocked the 10 Discussions Attended badge!");
      earned = true;
    }

    if (earned) {
      updateUser({ badges: newBadges });
    }
  };

  const handleMarkComplete = () => {
    const ptsToAdd = pagesReadToday * 2;
    const isFirstToday = user.lastChallengeDate ? new Date(user.lastChallengeDate).toDateString() !== new Date().toDateString() : true;
    
    const updates: Partial<UserProfile> = {
      points: user.points + ptsToAdd,
      totalPagesRead: user.totalPagesRead + pagesReadToday,
    };

    if (isFirstToday) {
      updates.currentStreak = user.currentStreak + 1;
      updates.longestStreak = Math.max(updates.currentStreak, user.longestStreak);
      updates.lastChallengeDate = new Date().toISOString();
      updates.points = (updates.points || 0) + 50; // Challenge completion reward
    }

    updateUser(updates);
    checkBadges(updates);
    
    toast({
      title: "Reading Progress Saved",
      description: `Earned ${ptsToAdd + (isFirstToday ? 50 : 0)} points!`,
    });
    setPagesReadToday(0);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const avatarImg = PlaceHolderImages.find(img => img.id === 'member-avatar-1');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        {/* Top Header Section */}
        <div className="grid md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2 flex items-center gap-6">
            <div className="relative h-24 w-24 rounded-full border-4 border-accent overflow-hidden shadow-lg">
              {avatarImg ? (
                <Image src={avatarImg.imageUrl} alt={user.name} fill className="object-cover" />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-3xl font-bold text-white">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary font-headline">{user.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-accent border-accent font-bold uppercase tracking-widest text-[10px]">
                  {rankInfo.title}
                </Badge>
                <span className="text-sm text-muted-foreground">Level {rankInfo.level}</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap justify-end gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
              <Star className="h-6 w-6 text-accent fill-accent" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Points</p>
                <p className="text-xl font-bold text-primary">{user.points.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-3">
              <Flame className={`h-6 w-6 ${user.currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted'}`} />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Streak</p>
                <p className="text-xl font-bold text-primary">{user.currentStreak} Days</p>
              </div>
            </div>
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-xl relative">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Reading Tracking */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-md overflow-hidden bg-primary text-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-white/10 text-accent mb-2">CURRENT CLUB READING</Badge>
                    <CardTitle className="text-2xl font-headline">Homilies on the Statues</CardTitle>
                    <CardDescription className="text-primary-foreground/70">
                      Homily VI: On the Consolations of Suffering
                    </CardDescription>
                  </div>
                  <BookOpen className="h-8 w-8 text-accent/50" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-xs text-primary-foreground/50 uppercase font-bold">Total Pages</p>
                    <p className="text-lg font-bold">420</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-xs text-primary-foreground/50 uppercase font-bold">Your Goal</p>
                    <p className="text-lg font-bold">{user.pagesPerDay} Daily</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-xs text-primary-foreground/50 uppercase font-bold">Avg. Pace</p>
                    <p className="text-lg font-bold">12.5% / week</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reading Progress</span>
                    <span>{Math.round((user.totalPagesRead / 420) * 100)}%</span>
                  </div>
                  <Progress value={(user.totalPagesRead / 420) * 100} className="bg-white/10" />
                </div>
              </CardContent>
            </Card>

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
                <div className="pt-4 border-t border-accent/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Weekly Consistency: <span className="font-bold text-primary">85%</span>
                  </div>
                  <div className="text-xs text-muted-foreground italic">
                    Longest Streak: {user.longestStreak} Days
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" /> Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/30 rounded-lg flex justify-between items-center text-sm">
                    <span>Lenten Reflection #2</span>
                    <Badge variant="secondary">Tomorrow</Badge>
                  </div>
                  <Button variant="ghost" className="w-full text-xs text-accent">View Discussion Schedule</Button>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" /> Reflections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full border-dashed border-2 h-20 flex flex-col gap-1">
                    <span className="text-sm font-bold">Submit Weekly Reflection</span>
                    <span className="text-xs text-muted-foreground">+10 Points Reward</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar: Leaderboard & Badges */}
          <div className="space-y-8">
            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  Fellowship Ranking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Sr. Maria", pts: 12500, self: false },
                  { name: user.name, pts: user.points, self: true },
                  { name: "Thomas K.", pts: 8900, self: false },
                ].sort((a,b) => b.pts - a.pts).map((member, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${member.self ? 'bg-accent/10 border border-accent/20' : ''}`}>
                    <div className="font-headline font-bold text-xl text-primary/20 w-6">#{i + 1}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${member.self ? 'text-primary' : 'text-muted-foreground'}`}>{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.pts.toLocaleString()} Insights</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none overflow-hidden">
              <CardHeader className="bg-accent/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  Your Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 gap-3">
                {user.badges.length > 0 ? (
                  user.badges.map((badge, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-3 bg-muted/20 rounded-xl text-center gap-2">
                      <div className="h-10 w-10 bg-accent/20 rounded-full flex items-center justify-center">
                        <Award className="h-5 w-5 text-accent" />
                      </div>
                      <span className="text-[10px] font-bold uppercase text-primary leading-tight">{badge}</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-xs text-muted-foreground italic">
                    Complete challenges to earn badges.
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/10 border-t">
                <Button variant="ghost" className="w-full text-xs gap-2" asChild>
                  <a href="/profile">
                    View My Profile <ChevronRight className="h-3 w-3" />
                  </a>
                </Button>
              </CardFooter>
            </Card>

            <div className="bg-primary text-white p-6 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <h3 className="font-headline font-bold text-xl">Daily Challenge</h3>
                <p className="text-sm text-primary-foreground/70 leading-relaxed">
                  Read {user.pagesPerDay} pages today to maintain your streak and earn +50 bonus points.
                </p>
                <div className="pt-2">
                  <Badge className="bg-accent text-primary">REWARD: +50 PTS</Badge>
                </div>
              </div>
              <Calendar className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
