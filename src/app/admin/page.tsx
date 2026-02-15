
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
  History
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc, addDoc } from "firebase/firestore";

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

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
    const newPoints = currentPoints + parseInt(amount);
    updateDocumentNonBlocking(doc(db, "users", memberId), { points: newPoints });
    logAction("adjust_points", memberId, `Adjusted points to ${newPoints}`);
    toast({ title: "Points Adjusted" });
  };

  const handleDeleteBook = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "books", id));
    logAction("delete_book", id, "Removed book from library");
    toast({ variant: "destructive", title: "Book Deleted" });
  };

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
            { label: "Total Students", value: members?.length || 0, icon: Users },
            { label: "Active Books", value: books?.length || 0, icon: BookOpen },
            { label: "Total Challenges", value: challenges?.length || 0, icon: Zap },
            { label: "Discussions", value: discussions?.length || 0, icon: Calendar },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
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
            <TabsTrigger value="books">Library</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card className="border-none shadow-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Streak</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.level}</TableCell>
                      <TableCell>{member.points.toLocaleString()}</TableCell>
                      <TableCell>{member.streak} days</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleAdjustPoints(member.id, member.points)}>Edit Pts</Button>
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
                      <TableCell className="text-xs">{new Date(log.timestamp).toLocaleString()}</TableCell>
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
