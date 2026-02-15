
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
  BarChart3, 
  Trash,
  ShieldAlert,
  Zap,
  UserCheck,
  Plus,
  BookOpen,
  Calendar,
  Settings2,
  Edit,
  MessageSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, Timestamp } from "firebase/firestore";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
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

const chartConfig = {
  engagement: {
    label: "Engagement",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const [hasMounted, setHasMounted] = useState(false);

  // Form States
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);

  const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  const membersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: members } = useCollection(membersQuery);

  const booksQuery = useMemoFirebase(() => query(collection(db, "books"), orderBy("title")), [db]);
  const { data: books } = useCollection(booksQuery);

  const challengesQuery = useMemoFirebase(() => query(collection(db, "challenges"), orderBy("startDate", "desc")), [db]);
  const { data: challenges } = useCollection(challengesQuery);

  const discussionsQuery = useMemoFirebase(() => query(collection(db, "discussions"), orderBy("scheduledDateTime", "desc")), [db]);
  const { data: discussions } = useCollection(discussionsQuery);

  const logsQuery = useMemoFirebase(() => query(collection(db, "adminActionLogs"), orderBy("timestamp", "desc"), limit(20)), [db]);
  const { data: logs } = useCollection(logsQuery);

  if (loading || !user || !isAdmin) return null;

  const logAction = (type: string, targetId: string, details: string) => {
    addDocumentNonBlocking(collection(db, "adminActionLogs"), {
      adminId: user.uid,
      actionType: type,
      targetEntityType: "Entity",
      targetEntityId: targetId,
      details,
      timestamp: new Date().toISOString()
    });
  };

  const handleSaveBook = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bookData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      totalPages: parseInt(formData.get("totalPages") as string),
      currentReadingPlanDueDate: formData.get("dueDate") as string,
    };

    if (editingBook) {
      updateDocumentNonBlocking(doc(db, "books", editingBook.id), bookData);
      logAction("edit_book", editingBook.id, `Updated book: ${bookData.title}`);
      toast({ title: "Book Updated" });
    } else {
      const id = Math.random().toString(36).substring(7);
      addDocumentNonBlocking(collection(db, "books"), { ...bookData, id });
      logAction("create_book", id, `Created book: ${bookData.title}`);
      toast({ title: "Book Created" });
    }
    setIsBookDialogOpen(false);
    setEditingBook(null);
  };

  const handleSaveChallenge = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const challengeData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      pointsReward: parseInt(formData.get("points") as string),
      type: formData.get("type") as string,
      completionCriteria: formData.get("criteria") as string,
      startDate: new Date().toISOString(),
      endDate: formData.get("endDate") as string,
      isActive: true,
    };

    if (editingChallenge) {
      updateDocumentNonBlocking(doc(db, "challenges", editingChallenge.id), challengeData);
      logAction("edit_challenge", editingChallenge.id, `Updated challenge: ${challengeData.title}`);
      toast({ title: "Challenge Updated" });
    } else {
      const id = Math.random().toString(36).substring(7);
      addDocumentNonBlocking(collection(db, "challenges"), { ...challengeData, id });
      logAction("create_challenge", id, `Created challenge: ${challengeData.title}`);
      toast({ title: "Challenge Created" });
    }
    setIsChallengeDialogOpen(false);
    setEditingChallenge(null);
  };

  const handleSaveDiscussion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const discussionData = {
      topic: formData.get("topic") as string,
      scheduledDateTime: formData.get("dateTime") as string,
      isActive: true,
      organizerId: user.uid,
    };

    const id = Math.random().toString(36).substring(7);
    addDocumentNonBlocking(collection(db, "discussions"), { ...discussionData, id });
    logAction("create_discussion", id, `Announced discussion: ${discussionData.topic}`);
    toast({ title: "Discussion Scheduled" });
    setIsDiscussionDialogOpen(false);
  };

  const handleAdjustPoints = (memberId: string, currentPoints: number) => {
    const amount = prompt("Adjust points by (use negative for deduction):");
    if (!amount) return;
    const newPoints = (currentPoints || 0) + parseInt(amount);
    updateDocumentNonBlocking(doc(db, "users", memberId), { points: newPoints });
    logAction("adjust_points", memberId, `Adjusted points to ${newPoints}`);
    toast({ title: "Points Adjusted" });
  };

  const handleResetStreak = (memberId: string) => {
    if (!confirm("Are you sure you want to reset this streak?")) return;
    updateDocumentNonBlocking(doc(db, "users", memberId), { streak: 0 });
    logAction("reset_streak", memberId, "Reset streak to 0");
    toast({ title: "Streak Reset" });
  };

  const chartData = [
    { day: "Mon", engagement: 45 },
    { day: "Tue", engagement: 52 },
    { day: "Wed", engagement: 38 },
    { day: "Thu", engagement: 65 },
    { day: "Fri", engagement: 48 },
    { day: "Sat", engagement: 72 },
    { day: "Sun", engagement: 85 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold text-primary flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-accent" /> Control Center
            </h1>
            <p className="text-muted-foreground">Comprehensive management of books, users, and spiritual content.</p>
          </div>
          <div className="flex gap-2">
             <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 rounded-full text-xs" onClick={() => setEditingBook(null)}>
                    <BookOpen className="h-4 w-4 mr-2" /> Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveBook}>
                    <DialogHeader>
                      <DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input name="title" defaultValue={editingBook?.title} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Pages</Label>
                        <Input name="totalPages" type="number" defaultValue={editingBook?.totalPages} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input name="dueDate" type="date" defaultValue={editingBook?.currentReadingPlanDueDate} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea name="description" defaultValue={editingBook?.description} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingBook ? "Update" : "Create"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
             </Dialog>

             <Dialog open={isChallengeDialogOpen} onOpenChange={setIsChallengeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 rounded-full text-xs" onClick={() => setEditingChallenge(null)}>
                    <Zap className="h-4 w-4 mr-2" /> New Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveChallenge}>
                    <DialogHeader>
                      <DialogTitle>{editingChallenge ? "Edit Challenge" : "Add Challenge"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input name="title" defaultValue={editingChallenge?.title} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Points Reward</Label>
                        <Input name="points" type="number" defaultValue={editingChallenge?.pointsReward} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select name="type" defaultValue={editingChallenge?.type || "Daily"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Special">Special</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input name="endDate" type="date" defaultValue={editingChallenge?.endDate} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Completion Criteria (Limit)</Label>
                        <Input name="criteria" defaultValue={editingChallenge?.completionCriteria} placeholder="e.g. Read 10 pages" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea name="description" defaultValue={editingChallenge?.description} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingChallenge ? "Update" : "Create"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
             </Dialog>

             <Dialog open={isDiscussionDialogOpen} onOpenChange={setIsDiscussionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="rounded-full text-xs">
                    <MessageSquare className="h-4 w-4 mr-2" /> Announce Discussion
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveDiscussion}>
                    <DialogHeader>
                      <DialogTitle>Announce Discussion</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Topic</Label>
                        <Input name="topic" placeholder="The Mystery of Silence" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Date & Time</Label>
                        <Input name="dateTime" type="datetime-local" required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Announce</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
             </Dialog>
          </div>
        </header>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { label: "Total Members", value: members?.length || 0, icon: Users, sub: "Registered Students" },
            { label: "Active Today", value: members?.filter(m => m.status === "Active").length || 0, icon: UserCheck, sub: "Current Readers" },
            { label: "Avg. Points", value: Math.round((members?.reduce((acc, m) => acc + (m.points || 0), 0) || 0) / (members?.length || 1)), icon: Zap, sub: "Per Student" },
            { label: "Engagement", value: "84%", icon: BarChart3, sub: "Weekly Avg" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{stat.sub}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/5 text-primary">
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="content">Books & Content</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="logs">Full Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card className="border-none shadow-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Streak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.batchYear}</TableCell>
                      <TableCell>{(member.points || 0).toLocaleString()}</TableCell>
                      <TableCell>{member.streak || 0}d</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {member.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleAdjustPoints(member.id, member.points)}>Pts</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleResetStreak(member.id)}>Reset</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Library Management</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books?.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell className="text-xs">{book.currentReadingPlanDueDate}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingBook(book); setIsBookDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, "books", book.id))}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Discussions</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discussions?.map((disc) => (
                      <TableRow key={disc.id}>
                        <TableCell className="font-medium">{disc.topic}</TableCell>
                        <TableCell className="text-xs">
                          {hasMounted ? new Date(disc.scheduledDateTime).toLocaleString() : "..."}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, "discussions", disc.id))}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="challenges">
            <Card className="border-none shadow-md">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges?.map((chall) => (
                    <TableRow key={chall.id}>
                      <TableCell className="font-medium">{chall.title}</TableCell>
                      <TableCell><Badge variant="outline">{chall.type}</Badge></TableCell>
                      <TableCell>+{chall.pointsReward}</TableCell>
                      <TableCell className="text-xs italic">{chall.completionCriteria}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingChallenge(chall); setIsChallengeDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, "challenges", chall.id))}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border-none shadow-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {hasMounted ? new Date(log.timestamp).toLocaleString() : '...'}
                      </TableCell>
                      <TableCell className="text-xs font-bold">{log.adminId}</TableCell>
                      <TableCell className="text-xs font-medium uppercase">{log.actionType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
