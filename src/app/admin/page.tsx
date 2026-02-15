
"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Settings, 
  BookOpen, 
  Users, 
  BarChart3, 
  Edit, 
  Trash 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const INITIAL_BOOKS = [
  { id: 1, title: "Homilies on the Statues", members: 450, status: "Active" },
  { id: 2, title: "On Wealth and Poverty", members: 120, status: "Completed" },
  { id: 3, title: "Commentary on Galatians", members: 85, status: "Draft" },
];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [books, setBooks] = useState(INITIAL_BOOKS);

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || !user.isAdmin) return null;

  const handleDelete = (id: number) => {
    setBooks(books.filter(b => b.id !== id));
    toast({
      variant: "destructive",
      title: "Deleted",
      description: "Book selection removed from database.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold text-primary">Content Management</h1>
            <p className="text-muted-foreground">Control book selections, reading schedules, and user roles.</p>
          </div>
          <Button className="bg-accent text-primary font-bold hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" /> New Reading Plan
          </Button>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: "Active Readers", value: "1,248", icon: Users },
            { label: "Completion Rate", value: "78%", icon: BarChart3 },
            { label: "Open Discussions", value: "32", icon: BookOpen },
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

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-primary text-white border-b-0">
            <CardTitle>Reading Selections</CardTitle>
            <CardDescription className="text-primary-foreground/70">Manage the library of spiritual texts and their status.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">Book Title</TableHead>
                  <TableHead className="font-bold">Readers</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.members}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        book.status === "Active" ? "bg-green-100 text-green-700" :
                        book.status === "Completed" ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {book.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(book.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">User Role Simulation</CardTitle>
              <CardDescription>Configure access levels for members and moderators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="role-select">Default New User Role</Label>
                <select id="role-select" className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option>Catechumen (Visitor)</option>
                  <option>Reader (Standard)</option>
                  <option>Moderator (Admin Lite)</option>
                </select>
              </div>
              <Button variant="outline" className="w-full border-accent text-accent">Update Permissions</Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" /> Club Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Public Signups</span>
                <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full translate-x-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AI Content Moderation</span>
                <div className="h-6 w-11 bg-muted rounded-full relative cursor-pointer">
                  <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full" />
                </div>
              </div>
              <Button variant="default" className="w-full bg-primary">Save System Config</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
