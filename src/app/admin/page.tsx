
"use client";

import { useEffect, useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  Trash,
  ShieldAlert,
  Zap,
  BookOpen,
  MessageSquare,
  Edit,
  Plus,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, runTransaction } from "firebase/firestore";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function MemberChallengeStats({ userId, allChallenges, allDiscussions }: { userId: string, allChallenges: any[] | null, allDiscussions: any[] | null }) {
  const db = useFirestore();
  const [isChallengeDetailsOpen, setIsChallengeDetailsOpen] = useState(false);
  const [isDiscussionDetailsOpen, setIsDiscussionDetailsOpen] = useState(false);

  const userChallengesQuery = useMemoFirebase(() => {
    if (!userId || !db) return null;
    return collection(db, "users", userId, "userChallenges");
  }, [db, userId]);

  const { data: userChallenges } = useCollection(userChallengesQuery);

  const completedChallenges = userChallenges?.filter(c => !c.id.startsWith('att_')) || [];
  const attendedDiscussions = userChallenges?.filter(c => c.id.startsWith('att_')) || [];

  const challengesCount = completedChallenges.length;
  const discussionsCount = attendedDiscussions.length;

  const getCompletedChallengeTitle = (userChallenge: any) => {
    const { id, challengeId } = userChallenge;
    if (id.startsWith('refl_')) return "Reflection of the Day";
    
    const chall = allChallenges?.find(c => c.id === challengeId);
    if (chall) return chall.title;
    
    return "Unknown Challenge";
  }

  const getAttendedDiscussionTopic = (userChallenge: any) => {
    const { challengeId } = userChallenge;
    const disc = allDiscussions?.find(d => d.id === challengeId);
    return disc?.topic || "Unknown Discussion";
  }

  return (
    <>
      <Dialog open={isChallengeDetailsOpen} onOpenChange={setIsChallengeDetailsOpen}>
        <DialogTrigger asChild>
          <TableCell className="font-mono text-xs text-center cursor-pointer hover:bg-muted/50">
            {challengesCount}
          </TableCell>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completed Challenges</DialogTitle>
            <CardDescription>List of all challenges this member has completed.</CardDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {completedChallenges.length > 0 ? (
              <ul className="space-y-4">
                {completedChallenges.map(uc => (
                  <li key={uc.id} className="text-sm border-b pb-4 last:border-0 last:pb-0">
                    <div className="font-medium text-primary">{getCompletedChallengeTitle(uc)}</div>
                    <div className="text-muted-foreground text-xs mb-2">({new Date(uc.completedAt).toLocaleString()})</div>
                    {uc.submissionText && (
                      <blockquote className="mt-1 pl-2 text-xs italic border-l-2 text-muted-foreground bg-muted/20 p-2 rounded-r-md">
                        {uc.submissionText}
                      </blockquote>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm italic text-center py-4">No challenges completed yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDiscussionDetailsOpen} onOpenChange={setIsDiscussionDetailsOpen}>
        <DialogTrigger asChild>
           <TableCell className="font-mono text-xs text-center cursor-pointer hover:bg-muted/50">
            {discussionsCount}
          </TableCell>
        </DialogTrigger>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>Attended Discussions</DialogTitle>
            <CardDescription>List of all discussions this member has checked into.</CardDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {attendedDiscussions.length > 0 ? (
              <ul className="list-disc list-inside space-y-2">
                {attendedDiscussions.map(uc => (
                  <li key={uc.id} className="text-sm">
                    {getAttendedDiscussionTopic(uc)}
                    <span className="text-muted-foreground text-xs ml-2">({new Date(uc.completedAt).toLocaleDateString()})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm italic text-center py-4">No discussions attended yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  const [isBookOpen, setIsBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [isChallOpen, setIsChallOpen] = useState(false);
  const [editingChall, setEditingChall] = useState<any>(null);
  const [isDiscOpen, setIsDiscOpen] = useState(false);
  const [adjustingMember, setAdjustingMember] = useState<any>(null);
  const [pointsAdjustment, setPointsAdjustment] = useState<number>(0);
  const [editingGroupMember, setEditingGroupMember] = useState<any>(null);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  const membersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "users");
  }, [db, user]);
  const { data: members } = useCollection(membersQuery);

  const booksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "books"), orderBy("createdAt", "desc"));
  }, [db, user]);
  const { data: books } = useCollection(booksQuery);

  const challengesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "challenges");
  }, [db, user]);
  const { data: challenges } = useCollection(challengesQuery);

  const discussionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "discussions");
  }, [db, user]);
  const { data: discussions } = useCollection(discussionsQuery);

  const avgReadingProgress = useMemo(() => {
    if (!members || !books || members.length === 0) return 0;
    
    let totalProgress = 0;
    let countedMembers = 0;

    members.forEach(m => {
      if (m.currentBookId) {
        const book = books.find(b => b.id === m.currentBookId);
        if (book) {
          const progress = ((m.currentPagesRead || 0) / book.totalPages) * 100;
          totalProgress += Math.min(100, progress);
          countedMembers++;
        }
      }
    });

    return countedMembers > 0 ? Math.round(totalProgress / countedMembers) : 0;
  }, [members, books]);

  if (loading || !user || !isAdmin) return null;

  const handleSetCurrent = async (bookToSet: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "books", bookToSet.id), { status: 'current' });
    toast({ title: "Book Activated", description: `${bookToSet.title} is now available for members to select.` });
  };

  const handleMarkFinished = (bookToFinish: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "books", bookToFinish.id), { status: 'finished' });
    toast({ title: "Book Finished" });
  };

  const handleSaveBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      totalPages: parseInt(formData.get("pages") as string),
      currentReadingPlanDueDate: formData.get("due") as string,
    };

    if (editingBook) {
      updateDocumentNonBlocking(doc(db, "books", editingBook.id), data);
      toast({ title: "Book Saved" });
    } else {
      const id = Math.random().toString(36).substring(7);
      const newBook = { 
        ...data, 
        id, 
        createdAt: new Date().toISOString(),
        status: 'pending' 
      };
      await setDoc(doc(db, "books", id), newBook);
      toast({ title: "New Book Added", description: "You can now set it as current to make it available." });
    }
    setIsBookOpen(false);
    setEditingBook(null);
  };

  const handleSaveChallenge = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    
    if (editingChall) {
      const data = {
        title,
        description: formData.get("description") as string,
        pointsReward: parseInt(formData.get("points") as string),
        type: formData.get("type") as string,
        completionCriteria: formData.get("criteria") as string,
      };
      updateDocumentNonBlocking(doc(db, "challenges", editingChall.id), data);
    } else {
      const data = {
        title,
        description: formData.get("description") as string,
        pointsReward: parseInt(formData.get("points") as string),
        type: formData.get("type") as string,
        completionCriteria: formData.get("criteria") as string,
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const id = Math.random().toString(36).substring(7);
      setDoc(doc(db, "challenges", id), { ...data, id });

      members?.forEach(member => {
        const notifId = Math.random().toString(36).substring(7);
        setDoc(doc(db, "users", member.id, "notifications", notifId), {
          id: notifId,
          userId: member.id,
          type: "NewChallenge",
          message: `New fellowship challenge released: "${title}"!`,
          isRead: false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });
      });
    }

    setIsChallOpen(false);
    setEditingChall(null);
    toast({ title: "Challenge Saved" });
  };

  const handleSaveDiscussion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const topic = formData.get("topic") as string;
    const dateTime = formData.get("dateTime") as string;
    
    const id = Math.random().toString(36).substring(7);
    const discData = {
      id,
      topic,
      scheduledDateTime: dateTime,
      isActive: true,
    };
    
    setDoc(doc(db, "discussions", id), discData);

    members?.forEach(member => {
      const notifId = Math.random().toString(36).substring(7);
      setDoc(doc(db, "users", member.id, "notifications", notifId), {
        id: notifId,
        userId: member.id,
        type: "DiscussionScheduled",
        message: `New discussion announced: "${topic}" on ${new Date(dateTime).toLocaleString()}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
    });

    setIsDiscOpen(false);
    toast({ title: "Discussion Announced", description: "Notifications sent to all members." });
  };

  const handleConfirmAdjustPoints = async () => {
    if (!adjustingMember || !db) return;
    
    const userRef = doc(db, "users", adjustingMember.id);
    const adjustment = pointsAdjustment || 0;

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("User not found");
        }
        const currentProfile = userSnap.data();
        
        const newPoints = (currentProfile.points || 0) + adjustment;

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const newMonthlyPoints =
          currentProfile.currentMonth === currentMonthStr
            ? (currentProfile.monthlyPoints || 0) + adjustment
            : adjustment;

        transaction.update(userRef, { 
          points: newPoints,
          monthlyPoints: newMonthlyPoints,
          currentMonth: currentMonthStr,
        });

        const notifId = Math.random().toString(36).substring(7);
        transaction.set(doc(db, "users", adjustingMember.id, "notifications", notifId), {
          id: notifId,
          userId: adjustingMember.id,
          type: "LeaderboardUpdate",
          message: `Your points have been updated! Your new total is ${newPoints.toLocaleString()}.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });
      });

      toast({ 
        title: "Points Adjusted", 
        description: `${adjustingMember.name}'s points have been updated.` 
      });
      setAdjustingMember(null);
      setPointsAdjustment(0);
    } catch (error: any) {
      console.error("Failed to adjust points:", error);
      toast({
        variant: "destructive",
        title: "Adjustment Failed",
        description: error.message || "Could not update points.",
      });
    }
  };

  const handleConfirmUpdateGroup = () => {
    if (!editingGroupMember || !db) return;

    const userRef = doc(db, "users", editingGroupMember.id);
    const finalGroupName = groupName.trim();

    updateDocumentNonBlocking(userRef, { groupName: finalGroupName });

    toast({
      title: "Group Updated",
      description: finalGroupName
        ? `${editingGroupMember.name}'s group has been set to "${finalGroupName}".`
        : `${editingGroupMember.name}'s group has been removed.`,
    });
    setEditingGroupMember(null);
    setGroupName("");
  };

  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter(m => m.status === 'Active').length || 0;
  const avgPoints = totalMembers ? Math.round(members!.reduce((acc, m) => acc + (m.points || 0), 0) / totalMembers) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2 font-headline">
              <ShieldAlert className="h-6 w-6 text-accent" /> Admin Command Center
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Manage the fellowship's spiritual progress</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setEditingBook(null); setIsBookOpen(true); }} size="sm" className="bg-primary rounded-full">
              <BookOpen className="h-4 w-4 mr-1" /> New Book
            </Button>
            <Button onClick={() => { setEditingChall(null); setIsChallOpen(true); }} size="sm" variant="outline" className="rounded-full border-accent text-accent">
              <Zap className="h-4 w-4 mr-1" /> New Challenge
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Users className="h-3 w-3" /> Total Members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold text-primary">{totalMembers}</p>
              <p className="text-[10px] text-accent font-medium mt-1">{activeMembers} Active currently</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Average Points
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold text-primary">{avgPoints.toLocaleString()}</p>
              <p className="text-[10px] text-accent font-medium mt-1">Steady growth in wisdom</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-3 w-3" /> Reading Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold text-primary">{avgReadingProgress}%</p>
              <p className="text-[10px] text-accent font-medium mt-1">Overall fellowship completion</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Current Study</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Streak</TableHead>
                    <TableHead className="text-center">Challenges</TableHead>
                    <TableHead className="text-center">Discussions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map(m => {
                    const activeBook = m.currentBookId ? books?.find(b => b.id === m.currentBookId) : null;
                    const pagesRead = m.currentPagesRead || 0;
                    const progress = activeBook ? Math.min(100, Math.round((pagesRead / activeBook.totalPages) * 100)) : 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <p className="font-bold text-sm">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.email}</p>
                        </TableCell>
                        <TableCell>
                           {m.groupName ? (
                            <Badge variant="outline" className="text-[10px]">{m.groupName}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">None</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                           <p className="text-xs font-medium truncate">{activeBook?.title || "Not started"}</p>
                        </TableCell>
                        <TableCell className="w-[150px]">
                          {activeBook ? (
                             <div className="space-y-1">
                                <Progress value={progress} className="h-1.5" />
                                <p className="text-[10px] text-muted-foreground">{pagesRead} / {activeBook.totalPages} pgs ({progress}%)</p>
                             </div>
                          ) : <span className="text-muted-foreground text-[10px]">-</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center">{m.points || 0}</TableCell>
                        <TableCell className="text-xs text-center">{m.streak || 0}d</TableCell>
                        <MemberChallengeStats userId={m.id} allChallenges={challenges} allDiscussions={discussions} />
                        <TableCell><Badge variant="outline" className="text-[10px] py-0">{m.status}</Badge></TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setEditingGroupMember(m); setGroupName(m.groupName || ""); }}>Edit Group</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setAdjustingMember(m); setPointsAdjustment(0); }}>+/- Pts</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => updateDocumentNonBlocking(doc(db, "users", m.id), { streak: 0 })}>Reset</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="library">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Book Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Pages</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books?.map(b => (
                    <TableRow key={b.id} className={b.status === 'current' ? 'bg-accent/10' : ''}>
                      <TableCell className="font-bold">{b.title}</TableCell>
                      <TableCell><Badge variant={b.status === 'current' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                      <TableCell>{b.totalPages} pgs</TableCell>
                      <TableCell className="text-xs">{b.currentReadingPlanDueDate ? new Date(b.currentReadingPlanDueDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {b.status !== 'current' && b.status !== 'finished' && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => handleSetCurrent(b)}>Activate</Button>
                        )}
                        {b.status === 'current' && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleMarkFinished(b)}>Mark Finished</Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { setEditingBook(b); setIsBookOpen(true); }}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, "books", b.id))}><Trash className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="challenges">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold">{c.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.type}</Badge></TableCell>
                      <TableCell className="text-accent font-bold">+{c.pointsReward}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{c.completionCriteria}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px]"
                          onClick={() => {
                            updateDocumentNonBlocking(doc(db, "challenges", c.id), { isActive: !c.isActive });
                            toast({ title: `Challenge ${c.title} ${c.isActive ? 'deactivated' : 'activated'}.` });
                          }}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingChall(c); setIsChallOpen(true); }}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, "challenges", c.id))}><Trash className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="discussions">
            <Card className="border-none shadow-sm p-6">
              <Button onClick={() => setIsDiscOpen(true)} className="mb-6 rounded-full bg-primary"><Plus className="h-4 w-4 mr-2" /> Schedule New Discussion</Button>
              <div className="grid md:grid-cols-2 gap-4">
                {discussions?.map(d => (
                  <div key={d.id} className="flex justify-between items-center p-4 border rounded-xl bg-accent/5">
                    <div>
                      <p className="font-bold text-sm text-primary">{d.topic}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <MessageSquare className="h-3 w-3" /> {new Date(d.scheduledDateTime).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteDocumentNonBlocking(doc(db, "discussions", d.id))}>
                      <Trash className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isBookOpen} onOpenChange={setIsBookOpen}>
          <DialogContent>
            <form onSubmit={handleSaveBook}>
              <DialogHeader><DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Title</Label><Input name="title" defaultValue={editingBook?.title} required /></div>
                <div className="space-y-1"><Label>Total Pages</Label><Input name="pages" type="number" defaultValue={editingBook?.totalPages} required /></div>
                <div className="space-y-1"><Label>Due Date</Label><Input name="due" type="date" defaultValue={editingBook?.currentReadingPlanDueDate} /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea name="description" defaultValue={editingBook?.description} /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full">Save Book</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isChallOpen} onOpenChange={setIsChallOpen}>
          <DialogContent>
            <form onSubmit={handleSaveChallenge}>
              <DialogHeader><DialogTitle>{editingChall ? "Edit Challenge" : "Create New Challenge"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Title</Label><Input name="title" defaultValue={editingChall?.title} required /></div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select name="type" defaultValue={editingChall?.type || "Daily"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Special">Special</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Points Reward</Label><Input name="points" type="number" defaultValue={editingChall?.pointsReward} required /></div>
                <div className="space-y-1"><Label>Completion Criteria</Label><Input name="criteria" defaultValue={editingChall?.completionCriteria} required /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea name="description" defaultValue={editingChall?.description} /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full">Activate Challenge</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDiscOpen} onOpenChange={setIsDiscOpen}>
          <DialogContent>
            <form onSubmit={handleSaveDiscussion}>
              <DialogHeader><DialogTitle>Schedule Discussion</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Topic</Label><Input name="topic" placeholder="The Gold of Silence" required /></div>
                <div className="space-y-1"><Label>Date & Time</Label><Input name="dateTime" type="datetime-local" required /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full">Announce Discussion</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!adjustingMember} onOpenChange={(open) => !open && setAdjustingMember(null)}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Points for {adjustingMember?.name}</DialogTitle>
                <CardDescription>Manually add or subtract points from a member's total.</CardDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label htmlFor="points-adjustment">Points to Add/Subtract (use a negative number to subtract)</Label>
                    <Input
                        id="points-adjustment"
                        type="number"
                        value={pointsAdjustment}
                        onChange={(e) => setPointsAdjustment(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 50 or -20"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current points: <span className="font-bold">{adjustingMember?.points || 0}</span>
                    <br />
                    New total will be: <span className="font-bold">{(adjustingMember?.points || 0) + pointsAdjustment}</span>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setAdjustingMember(null)}>Cancel</Button>
                  <Button onClick={handleConfirmAdjustPoints}>Confirm Adjustment</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingGroupMember} onOpenChange={(open) => !open && setEditingGroupMember(null)}>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Group for {editingGroupMember?.name}</DialogTitle>
                <CardDescription>Assign or change the member's group name.</CardDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input
                        id="group-name"
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Cohort Alpha"
                    />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingGroupMember(null)}>Cancel</Button>
                  <Button onClick={handleConfirmUpdateGroup}>Confirm Update</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
