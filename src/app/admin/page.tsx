
"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus, 
  BookOpen, 
  Users, 
  BarChart3, 
  Edit, 
  Trash,
  ShieldAlert,
  Calendar,
  Zap,
  History,
  ArrowUpRight,
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, addDoc } from "firebase/firestore";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const [hasMounted, setHasMounted] = useState(false);

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

  const booksQuery = useMemoFirebase(() => collection(db, "books"), [db]);
  const { data: books } = useCollection(booksQuery);

  const challengesQuery = useMemoFirebase(() => collection(db, "challenges"), [db]);
  const { data: challenges } = useCollection(challengesQuery);

  const discussionsQuery = useMemoFirebase(() => collection(db, "discussions"), [db]);
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

  const handleDeleteBook = (id: string) => {
    if (!confirm("Delete this book?")) return;
    deleteDocumentNonBlocking(doc(db, "books", id));
    logAction("delete_book", id, "Removed book from library");
    toast({ variant: "destructive", title: "Book Deleted" });
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

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Engagement Trend</CardTitle>
              <CardDescription>Daily active user interactions over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="engagement" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorEngagement)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {logs?.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs border-l-2 border-accent pl-3 py-1">
                  <p className="font-bold text-primary uppercase">{log.actionType}</p>
                  <p className="text-muted-foreground line-clamp-1">{log.details}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {hasMounted ? new Date(log.timestamp).toLocaleTimeString() : '...'}
                  </p>
                </div>
              ))}
              <Button variant="outline" className="w-full text-xs" onClick={() => router.push("/admin?tab=logs")}>View All Logs</Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="books">Library</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
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

          <TabsContent value="books">
            <Card className="border-none shadow-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books?.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>{book.title}</TableCell>
                      <TableCell>{book.totalPages}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBook(book.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Button className="w-full bg-accent text-primary">Add New Book</Button>
              </div>
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
