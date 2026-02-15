
"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Clock, ChevronRight, MessageSquare, Bell } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Dashboard() {
  const bookImg = PlaceHolderImages.find(img => img.id === 'book-on-table');
  const user1 = PlaceHolderImages.find(img => img.id === 'member-avatar-1');
  const user2 = PlaceHolderImages.find(img => img.id === 'member-avatar-2');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold text-primary">Member Dashboard</h1>
            <p className="text-muted-foreground italic">"He who reads the word of God with understanding is like a man who finds a treasure."</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-accent rounded-full border-2 border-background" />
            </Button>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Progress & Active Reading */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-md overflow-hidden bg-primary text-white">
              <div className="grid md:grid-cols-2">
                <div className="p-8 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-accent text-xs font-bold uppercase tracking-wider">
                    Current Reading
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-headline text-2xl font-bold">Homilies on the Statues</h2>
                    <p className="text-primary-foreground/70 text-sm">Homily VI: On the Consolations of Suffering</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Course Progress</span>
                      <span>65% Complete</span>
                    </div>
                    <Progress value={65} className="bg-white/10" />
                  </div>
                  <Button className="w-full bg-accent hover:bg-accent/90 text-primary font-bold">
                    Continue Reading
                  </Button>
                </div>
                <div className="relative hidden md:block">
                  {bookImg && (
                    <Image 
                      src={bookImg.imageUrl} 
                      alt="Active Reading" 
                      fill 
                      className="object-cover"
                    />
                  )}
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    Reading Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { title: "Homily VII", date: "Coming Mar 15" },
                    { title: "Homily VIII", date: "Coming Mar 22" },
                    { title: "Homily IX", date: "Coming Mar 29" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-none">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-accent" />
                    Latest Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { title: "The nature of true fasting", replies: 12 },
                    { title: "Chrysostom's view on wealth", replies: 45 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border group cursor-pointer hover:bg-accent/5">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {item.replies} <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Challenges & Leaderboard */}
          <div className="space-y-8">
            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  Monthly Leaderboard
                </CardTitle>
                <CardDescription>Top spiritual scholars this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { name: "Sr. Maria", pts: 1250, img: user1 },
                  { name: "Thomas K.", pts: 1100, img: user2 },
                  { name: "John Chrysostom (Fan)", pts: 980, img: null },
                ].map((member, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="relative h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent overflow-hidden">
                      {member.img ? (
                        <Image src={member.img.imageUrl} alt={member.name} fill className="object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.pts} Insight Points</p>
                    </div>
                    <div className="font-headline font-bold text-lg text-primary/30">#{i + 1}</div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-accent hover:text-accent/80 text-sm">View Full Leaderboard</Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-accent/5 border border-accent/20">
              <CardHeader>
                <CardTitle className="text-lg">Reading Challenge</CardTitle>
                <CardDescription>Lenten Devotional Reading</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">Read all 21 Homilies on the Statues before Easter Sunday.</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Your Progress</span>
                    <span>6/21</span>
                  </div>
                  <Progress value={(6/21) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
