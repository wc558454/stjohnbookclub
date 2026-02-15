
"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Heart, Share2, CornerDownRight, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INITIAL_POSTS = [
  {
    id: 1,
    author: "Gregory of Nazianzus",
    content: "The way Chrysostom describes the fear of the residents of Antioch is truly visceral. How do we find similar courage in our own modern trials?",
    likes: 24,
    replies: [
      { id: 101, author: "Basil the Great", content: "I believe it starts with the anchoring of the soul in the liturgy, as he suggests." }
    ]
  },
  {
    id: 2,
    author: "Monica S.",
    content: "Homily 3 really touched on the beauty of silence. Sometimes we speak too much even in prayer.",
    likes: 12,
    replies: []
  }
];

export default function Forum() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [newPost, setNewPost] = useState("");
  const { toast } = useToast();

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const post = {
      id: Date.now(),
      author: "Member You",
      content: newPost,
      likes: 0,
      replies: []
    };

    setPosts([post, ...posts]);
    setNewPost("");
    toast({
      title: "Success",
      description: "Your reflection has been posted to the community.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-3xl font-bold text-primary">Discussion Forum</h1>
          <p className="text-muted-foreground">Engage with fellow readers in a spirit of charity and wisdom.</p>
        </header>

        {/* New Post Form */}
        <Card className="border-none shadow-sm bg-accent/5">
          <form onSubmit={handlePostSubmit}>
            <CardContent className="p-6">
              <Textarea 
                placeholder="Share your reflection on the current reading..." 
                className="min-h-[120px] bg-white border-none shadow-inner resize-none focus-visible:ring-accent"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-0 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Please maintain a respectful tone.</p>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90">Post Reflection</Button>
            </CardFooter>
          </form>
        </Card>

        {/* Post List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="space-y-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-8 w-8 text-accent" />
                    <div>
                      <p className="font-bold text-sm text-primary">{post.author}</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <p className="text-base text-foreground/80 leading-relaxed">{post.content}</p>
                </CardContent>
                <CardFooter className="px-6 py-4 border-t flex gap-6">
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors">
                    <Heart className="h-4 w-4" /> {post.likes} Likes
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors">
                    <MessageCircle className="h-4 w-4" /> {post.replies.length} Replies
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors">
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </CardFooter>
              </Card>

              {/* Replies */}
              {post.replies.map(reply => (
                <div key={reply.id} className="ml-8 pl-4 border-l-2 border-accent/20 flex gap-3">
                  <CornerDownRight className="h-4 w-4 text-accent/40 mt-1" />
                  <Card className="border-none shadow-sm flex-1 bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <p className="font-bold text-xs text-primary">{reply.author}</p>
                      <p className="text-sm text-foreground/70">{reply.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
