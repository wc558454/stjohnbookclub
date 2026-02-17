
"use client";

import { useEffect, useState } from "react";
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
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, setDoc, getDocs, updateDoc } from "firebase/firestore";
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
          <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {completedChallenges.length > 0 ? (
              <ul className="list-disc list-inside space-y-2">
                {completedChallenges.map(uc => (
                  <li key={uc.id} className="text-sm">
                    {getCompletedChallengeTitle(uc)}
                    <span className="text-muted-foreground text-xs ml-2">({new Date(uc.completedAt).toLocaleDateString()})</span>
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
  const currentBook = books?.[0]; 

  const challengesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "challenges"));
  }, [db, user]);
  const { data: challenges } = useCollection(challengesQuery);

  const discussionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "discussions"), orderBy("scheduledDateTime", "desc"));
  }, [db, user]);
  const { data: discussions } = useCollection(discussionsQuery);

  if (loading || !user || !isAdmin) return null;

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
      await setDoc(doc(db, "books", id), { ...data, id, createdAt: new Date().toISOString() });

      // Reset all users' reading progress for the new book
      const membersCollection = collection(db, "users");
      const membersSnapshot = await getDocs(membersCollection);
      const updates = membersSnapshot.docs.map(memberDoc => {
        return updateDoc(doc(db, "users", memberDoc.id), { currentPagesRead: 0 });
      });
      await Promise.all(updates);
      
      toast({ title: "New Book Added", description: "All member progress has been reset for the new book." });
    }
    setIsBookOpen(false);
    setEditingBook(null);
  };

  const handleSaveChallenge = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (editingChall) {
      const data = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        pointsReward: parseInt(formData.get("points") as string),
        type: formData.get("type") as string,
        completionCriteria: formData.get("criteria") as string,
      };
      updateDocumentNonBlocking(doc(db, "challenges", editingChall.id), data);
    } else {
      const data = {
        title: formData.get("title") as string,
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

    // Announce to all members via notification
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

  const handleConfirmAdjustPoints = () => {
    if (!adjustingMember) return;
    
    const currentPoints = adjustingMember.points || 0;
    const newPoints = currentPoints + (pointsAdjustment || 0);

    updateDocumentNonBlocking(doc(db, "users", adjustingMember.id), { points: newPoints });
    
    toast({ title: "Points Adjusted", description: `${adjustingMember.name}'s points updated to ${newPoints}.` });
    setAdjustingMember(null);
    setPointsAdjustment(0);
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
              <p className="text-3xl font-bold text-primary">84%</p>
              <p className="text-[10px] text-accent font-medium mt-1">Average book completion</p>
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
                    const pagesRead = m.currentPagesRead || 0;
                    const progress = currentBook ? Math.min(100, Math.round((pagesRead / currentBook.totalPages) * 100)) : 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <p className="font-bold text-sm">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.email}</p>
                        </TableCell>
                        <TableCell className="w-[180px]">
                          <div className="space-y-1">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground">{pagesRead} / {currentBook?.totalPages || '?'} pgs ({progress}%)</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center">{m.points || 0}</TableCell>
                        <TableCell className="text-xs text-center">{m.streak || 0}d</TableCell>
                        <MemberChallengeStats userId={m.id} allChallenges={challenges} allDiscussions={discussions} />
                        <TableCell><Badge variant="outline" className="text-[10px] py-0">{m.status}</Badge></TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
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
                    <TableHead>Total Pages</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books?.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-bold">{b.title}</TableCell>
                      <TableCell>{b.totalPages} pgs</TableCell>
                      <TableCell className="text-xs">{b.currentReadingPlanDueDate ? new Date(b.currentReadingPlanDueDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
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
      </main>
    </div>
  );
}
