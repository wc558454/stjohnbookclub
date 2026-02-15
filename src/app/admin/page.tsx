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
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, setDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  const membersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: members } = useCollection(membersQuery);

  const booksQuery = useMemoFirebase(() => query(collection(db, "books"), orderBy("title")), [db]);
  const { data: books } = useCollection(booksQuery);

  const challengesQuery = useMemoFirebase(() => query(collection(db, "challenges")), [db]);
  const { data: challenges } = useCollection(challengesQuery);

  const discussionsQuery = useMemoFirebase(() => query(collection(db, "discussions"), orderBy("scheduledDateTime", "desc")), [db]);
  const { data: discussions } = useCollection(discussionsQuery);

  if (loading || !user || !isAdmin) return null;

  const handleSaveBook = (e: React.FormEvent<HTMLFormElement>) => {
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
    } else {
      const id = Math.random().toString(36).substring(7);
      setDoc(doc(db, "books", id), { ...data, id });
    }
    setIsBookOpen(false);
    setEditingBook(null);
    toast({ title: "Book Saved" });
  };

  const handleSaveChallenge = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      pointsReward: parseInt(formData.get("points") as string),
      type: formData.get("type") as string,
      completionCriteria: formData.get("criteria") as string,
      isActive: true,
      startDate: new Date().toISOString(),
    };

    if (editingChall) {
      updateDocumentNonBlocking(doc(db, "challenges", editingChall.id), data);
    } else {
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
    const data = {
      topic: formData.get("topic") as string,
      scheduledDateTime: formData.get("dateTime") as string,
      isActive: true,
    };
    const id = Math.random().toString(36).substring(7);
    setDoc(doc(db, "discussions", id), { ...data, id });
    setIsDiscOpen(false);
    toast({ title: "Discussion Announced" });
  };

  const handleAdjustPoints = (id: string, current: number) => {
    const val = prompt("Add/Subtract Points:");
    if (!val) return;
    updateDocumentNonBlocking(doc(db, "users", id), { points: (current || 0) + parseInt(val) });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-accent" /> Admin Center
            </h1>
            <p className="text-xs text-muted-foreground">Manage books, members, and spiritual growth challenges.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setEditingBook(null); setIsBookOpen(true); }} size="sm" className="bg-primary rounded-full">
              <BookOpen className="h-4 w-4 mr-1" /> Add Book
            </Button>
            <Button onClick={() => { setEditingChall(null); setIsChallOpen(true); }} size="sm" variant="outline" className="rounded-full border-accent text-accent">
              <Zap className="h-4 w-4 mr-1" /> Add Challenge
            </Button>
          </div>
        </header>

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
                    <TableHead>Points</TableHead>
                    <TableHead>Streak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold">{m.name}</TableCell>
                      <TableCell>{m.points || 0}</TableCell>
                      <TableCell>{m.streak || 0}d</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.status}</Badge></TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleAdjustPoints(m.id, m.points)}>Pts</Button>
                        <Button variant="ghost" size="sm" onClick={() => updateDocumentNonBlocking(doc(db, "users", m.id), { streak: 0 })}>Reset</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="library">
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books?.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-bold">{b.title}</TableCell>
                      <TableCell>{b.totalPages}</TableCell>
                      <TableCell>{b.currentReadingPlanDueDate || '-'}</TableCell>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold">{c.title}</TableCell>
                      <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                      <TableCell>+{c.pointsReward}</TableCell>
                      <TableCell className="text-right">
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
            <Card className="border-none shadow-sm p-4">
              <Button onClick={() => setIsDiscOpen(true)} className="mb-4"><Plus className="h-4 w-4 mr-2" /> Announce Topic</Button>
              <div className="space-y-3">
                {discussions?.map(d => (
                  <div key={d.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <p className="font-bold text-sm">{d.topic}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(d.scheduledDateTime).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, "discussions", d.id))}><Trash className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={isBookOpen} onOpenChange={setIsBookOpen}>
          <DialogContent>
            <form onSubmit={handleSaveBook}>
              <DialogHeader><DialogTitle>{editingBook ? "Edit Book" : "Add Book"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Title</Label><Input name="title" defaultValue={editingBook?.title} required /></div>
                <div className="space-y-1"><Label>Total Pages</Label><Input name="pages" type="number" defaultValue={editingBook?.totalPages} required /></div>
                <div className="space-y-1"><Label>Due Date</Label><Input name="due" type="date" defaultValue={editingBook?.currentReadingPlanDueDate} /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea name="description" defaultValue={editingBook?.description} /></div>
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isChallOpen} onOpenChange={setIsChallOpen}>
          <DialogContent>
            <form onSubmit={handleSaveChallenge}>
              <DialogHeader><DialogTitle>{editingChall ? "Edit Challenge" : "Add Challenge"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Title</Label><Input name="title" defaultValue={editingChall?.title} required /></div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select name="type" defaultValue={editingChall?.type || "Daily"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Points Reward</Label><Input name="points" type="number" defaultValue={editingChall?.pointsReward} required /></div>
                <div className="space-y-1"><Label>Completion Criteria</Label><Input name="criteria" defaultValue={editingChall?.completionCriteria} required /></div>
                <div className="space-y-1"><Label>Description</Label><Textarea name="description" defaultValue={editingChall?.description} /></div>
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDiscOpen} onOpenChange={setIsDiscOpen}>
          <DialogContent>
            <form onSubmit={handleSaveDiscussion}>
              <DialogHeader><DialogTitle>Announce Discussion</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1"><Label>Topic</Label><Input name="topic" placeholder="The Gold of Silence" required /></div>
                <div className="space-y-1"><Label>Date & Time</Label><Input name="dateTime" type="datetime-local" required /></div>
              </div>
              <DialogFooter><Button type="submit">Announce</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}