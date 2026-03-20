
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
  Trash,
  ShieldAlert,
  Zap,
  BookOpen,
  Edit,
  Plus,
  Award,
  Search,
  Star,
  Trophy,
  Medal,
  Flame,
  Sparkles,
  Heart,
  Shield,
  CheckCircle,
  Eye,
  EyeOff,
  UserCheck
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

const BADGE_ICONS = [
  { name: "Award", icon: Award },
  { name: "Star", icon: Star },
  { name: "Trophy", icon: Trophy },
  { name: "Medal", icon: Medal },
  { name: "Flame", icon: Flame },
  { name: "Sparkles", icon: Sparkles },
  { name: "Heart", icon: Heart },
  { name: "Shield", icon: Shield },
];

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
  const [managingBadgesMember, setManagingBadgesMember] = useState<any>(null);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  const membersQuery = useMemoFirebase(() => {
    if (!user) return null;
    // Query members ordered by points descending to establish global ranking
    return query(collection(db, "users"), orderBy("points", "desc"));
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

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!memberSearch.trim()) return members;
    const s = memberSearch.toLowerCase();
    return members.filter(m => 
      m.name?.toLowerCase().includes(s) || 
      m.email?.toLowerCase().includes(s) || 
      m.groupName?.toLowerCase().includes(s)
    );
  }, [members, memberSearch]);

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

  const handleSetCurrentBook = async (bookToSet: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "books", bookToSet.id), { status: 'current' });
    toast({ title: "Book Activated", description: `${bookToSet.title} is now available for members to select.` });
  };

  const handleDeactivateBook = (bookToDeactivate: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "books", bookToDeactivate.id), { status: 'pending' });
    toast({ title: "Book Deactivated" });
  };

  const handleMarkFinishedBook = (bookToFinish: any) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "books", bookToFinish.id), { status: 'finished' });
    toast({ title: "Book Finished" });
  };

  const handleToggleChallenge = (challenge: any, isActive: boolean) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "challenges", challenge.id), { isActive });
    toast({ 
      title: isActive ? "Challenge Activated" : "Challenge Deactivated",
      description: `${challenge.title} is now ${isActive ? 'visible' : 'hidden'} to members.`
    });
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
      const newBook = { ...data, id, createdAt: new Date().toISOString(), status: 'pending' };
      await setDoc(doc(db, "books", id), newBook);
      toast({ title: "New Book Added" });
    }
    setIsBookOpen(false);
    setEditingBook(null);
  };

  const handleSaveChallenge = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const data = {
      title,
      description: formData.get("description") as string,
      pointsReward: parseInt(formData.get("points") as string),
      type: formData.get("type") as string,
      completionCriteria: formData.get("criteria") as string,
    };
    if (editingChall) {
      updateDocumentNonBlocking(doc(db, "challenges", editingChall.id), data);
    } else {
      const id = Math.random().toString(36).substring(7);
      setDoc(doc(db, "challenges", id), { ...data, id, isActive: true });
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
    setDoc(doc(db, "discussions", id), { id, topic, scheduledDateTime: dateTime, isActive: true });
    setIsDiscOpen(false);
    toast({ title: "Discussion Scheduled" });
  };

  const handleSaveBadge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!managingBadgesMember || !db) return;
    const formData = new FormData(e.currentTarget);
    const badgeData = {
      id: editingBadge ? editingBadge.id : Math.random().toString(36).substring(7),
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      iconName: formData.get("iconName") as string,
      awardedAt: editingBadge ? editingBadge.awardedAt : new Date().toISOString(),
      message: formData.get("message") as string,
    };
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", managingBadgesMember.id);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");
        const userData = userSnap.data();
        let currentBadges = userData.badges || [];
        if (editingBadge) {
          currentBadges = currentBadges.map((b: any) => b.id === editingBadge.id ? badgeData : b);
        } else {
          currentBadges = [...currentBadges, badgeData];
        }
        transaction.update(userRef, { badges: currentBadges });
      });
      toast({ title: "Badge Saved" });
      setEditingBadge(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!managingBadgesMember || !db) return;
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", managingBadgesMember.id);
        const userSnap = await transaction.get(userRef);
        const userData = userSnap.data();
        const currentBadges = (userData?.badges || []).filter((b: any) => b.id !== badgeId);
        transaction.update(userRef, { badges: currentBadges });
      });
      toast({ title: "Badge Removed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Removal Failed" });
    }
  };

  const handleConfirmAdjustPoints = async () => {
    if (!adjustingMember || !db) return;
    const userRef = doc(db, "users", adjustingMember.id);
    const adjustment = pointsAdjustment || 0;
    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const currentProfile = userSnap.data();
        if (!currentProfile) return;
        transaction.update(userRef, { 
          points: (currentProfile.points || 0) + adjustment,
          monthlyPoints: (currentProfile.monthlyPoints || 0) + adjustment
        });
      });
      toast({ title: "Points Adjusted" });
      setAdjustingMember(null);
      setPointsAdjustment(0);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Adjustment Failed" });
    }
  };

  const handleConfirmUpdateGroup = () => {
    if (!editingGroupMember || !db) return;
    updateDocumentNonBlocking(doc(db, "users", editingGroupMember.id), { groupName: groupName.trim() });
    toast({ title: "Group Updated" });
    setEditingGroupMember(null);
  };

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
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold text-primary">{members?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Reading Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold text-primary">{avgReadingProgress}%</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">System Health</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold text-green-600">Active</p>
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

          <TabsContent value="members" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or group..." 
                className="pl-10" 
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[60px] text-center">Rank</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Current Study</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Streak</TableHead>
                    <TableHead className="text-center">Challenges</TableHead>
                    <TableHead className="text-center">Discussions</TableHead>
                    <TableHead className="text-center">Member Approval</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers?.map((m, i) => {
                    const activeBook = m.currentBookId ? books?.find(b => b.id === m.currentBookId) : null;
                    const pagesRead = m.currentPagesRead || 0;
                    const progress = activeBook ? Math.min(100, Math.round((pagesRead / activeBook.totalPages) * 100)) : 0;
                    
                    // The 'members' array is already sorted by points from the query.
                    // We find the index in the global 'members' list to maintain rank stability during filtering.
                    const globalRank = (members?.findIndex(member => member.id === m.id) ?? i) + 1;

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-center font-headline font-bold text-muted-foreground">
                          #{globalRank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-bold text-sm leading-tight">{m.name}</p>
                              <p className="text-[10px] text-muted-foreground">{m.email}</p>
                            </div>
                            {m.badges && m.badges.length > 0 && (
                               <Badge variant="outline" className="text-[8px] h-4 px-1 border-accent text-accent">
                                 {m.badges.length} Badge(s)
                               </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                           {m.groupName ? (
                            <Badge variant="outline" className="text-[10px] rounded-sm">{m.groupName}</Badge>
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
                        <TableCell className="font-mono text-xs text-center font-bold">{m.points || 0}</TableCell>
                        <TableCell className="text-xs text-center">{m.streak || 0}d</TableCell>
                        <MemberChallengeStats userId={m.id} allChallenges={challenges} allDiscussions={discussions} />
                        <TableCell className="text-center">
                          {m.status === "Pending Approval" ? (
                             <Button 
                               size="sm" 
                               className="h-8 text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm" 
                               onClick={() => updateDocumentNonBlocking(doc(db, "users", m.id), { status: 'Active' })}
                             >
                               <UserCheck className="h-3 w-3 mr-1" /> Approve Member
                             </Button>
                          ) : (
                             <Badge variant="outline" className="text-[10px] py-0 px-3 h-6 rounded-full border-muted text-muted-foreground">
                               Verified Member
                             </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setManagingBadgesMember(m)}>Badges</Button>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books?.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-bold">{b.title}</TableCell>
                      <TableCell><Badge variant={b.status === 'current' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                      <TableCell>{b.totalPages} pgs</TableCell>
                      <TableCell className="text-right space-x-1">
                        {b.status !== 'current' && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => handleSetCurrentBook(b)}>Activate</Button>
                        )}
                        {b.status === 'current' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleDeactivateBook(b)}>Deactivate</Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleMarkFinishedBook(b)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Mark Finished
                            </Button>
                          </>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold">{c.title}</TableCell>
                      <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                      <TableCell className="text-accent font-bold">+{c.pointsReward}</TableCell>
                      <TableCell><Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        {c.isActive ? (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleToggleChallenge(c, false)}>
                            <EyeOff className="h-3 w-3 mr-1" /> Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => handleToggleChallenge(c, true)}>
                            <Eye className="h-3 w-3 mr-1" /> Activate
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingChall(c); setIsChallOpen(true); }}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDocumentNonBlocking(doc(db, "challenges", c.id))}><Trash className="h-4 w-4"/></Button>
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
                      <p className="text-[10px] text-muted-foreground">{new Date(d.scheduledDateTime).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "discussions", d.id))}>
                      <Trash className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Manage Badges Dialog */}
        <Dialog open={!!managingBadgesMember} onOpenChange={(open) => {
          if (!open) {
            setManagingBadgesMember(null);
            setEditingBadge(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Badges: {managingBadgesMember?.name}</DialogTitle>
              <CardDescription>Edit or remove existing badges, or award a new one.</CardDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Current Badges</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {managingBadgesMember?.badges?.map((b: any) => (
                    <div key={b.id} className="p-3 border rounded-lg flex items-center justify-between group bg-muted/30">
                      <div>
                        <p className="text-sm font-bold">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground">{b.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBadge(b)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteBadge(b.id)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!managingBadgesMember?.badges?.length && <p className="text-xs italic text-muted-foreground">No badges yet.</p>}
                </div>
              </div>
              <div className="space-y-4 border-l pl-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{editingBadge ? "Edit Badge" : "Award New"}</h3>
                <form onSubmit={handleSaveBadge} className="space-y-4">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input name="name" defaultValue={editingBadge?.name} required /></div>
                  <div className="space-y-1"><Label className="text-xs">Description</Label><Input name="description" defaultValue={editingBadge?.description} required /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Icon</Label>
                    <Select name="iconName" defaultValue={editingBadge?.iconName || "Award"}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BADGE_ICONS.map(bi => (
                          <SelectItem key={bi.name} value={bi.name}>
                            <div className="flex items-center gap-2"><bi.icon className="h-3 w-3" /> {bi.name}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Message</Label><Textarea name="message" defaultValue={editingBadge?.message} className="text-xs h-16" /></div>
                  <Button type="submit" className="w-full">{editingBadge ? "Save Changes" : "Award Badge"}</Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Other Dialogs */}
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
                <div className="space-y-1"><Label>Criteria</Label><Input name="criteria" defaultValue={editingChall?.completionCriteria} required /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea name="description" defaultValue={editingChall?.description} /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full">Save Challenge</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDiscOpen} onOpenChange={setIsDiscOpen}>
          <DialogContent>
            <form onSubmit={handleSaveDiscussion}>
              <DialogHeader><DialogTitle>Schedule Discussion</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Topic</Label><Input name="topic" required /></div>
                <div className="space-y-1"><Label>Date & Time</Label><Input name="dateTime" type="datetime-local" required /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full">Schedule</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!adjustingMember} onOpenChange={() => setAdjustingMember(null)}>
          <DialogContent>
              <DialogHeader><DialogTitle>Adjust Points: {adjustingMember?.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label>Points to Add/Subtract</Label>
                    <Input type="number" value={pointsAdjustment} onChange={(e) => setPointsAdjustment(parseInt(e.target.value) || 0)} />
                  </div>
              </div>
              <DialogFooter><Button onClick={handleConfirmAdjustPoints}>Confirm</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingGroupMember} onOpenChange={() => setEditingGroupMember(null)}>
          <DialogContent>
              <DialogHeader><DialogTitle>Edit Group: {editingGroupMember?.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label>Group Name</Label>
                    <Input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                  </div>
              </div>
              <DialogFooter><Button onClick={handleConfirmUpdateGroup}>Update</Button></DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
