
"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Heart, Share2, CornerDownRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

function CommentSection({ postId }: { postId: string }) {
  const db = useFirestore();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "forumPosts", postId, "comments"), orderBy("createdAt", "asc"));
  }, [db, postId, user]);

  const { data: comments } = useCollection(commentsQuery);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !profile || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentId = Math.random().toString(36).substring(7);
      const commentRef = doc(db, "forumPosts", postId, "comments", commentId);
      const commentData = {
        id: commentId,
        postId,
        authorId: user.uid,
        authorName: profile.name,
        content: newComment,
        createdAt: new Date().toISOString()
      };

      setDoc(commentRef, commentData)
        .catch((e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: commentRef.path,
            operation: 'create',
            requestResourceData: commentData,
          }));
          toast({ variant: "destructive", title: "Error", description: "Failed to post comment." });
        });

      // Optimistic updates
      updateDocumentNonBlocking(doc(db, "users", user.uid), {
        points: (profile.points || 0) + 2
      });

      setNewComment("");
      toast({ title: "Comment Added", description: "+2 points earned!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {comments?.map(reply => (
        <div key={reply.id} className="ml-8 pl-4 border-l-2 border-accent/20 flex gap-3">
          <CornerDownRight className="h-4 w-4 text-accent/40 mt-1" />
          <Card className="border-none shadow-sm flex-1 bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <p className="font-bold text-xs text-primary">{reply.authorName}</p>
              <p className="text-sm text-foreground/70">{reply.content}</p>
            </CardContent>
          </Card>
        </div>
      ))}
      {user && (
        <form onSubmit={handleCommentSubmit} className="ml-8 flex gap-2">
          <Input 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            placeholder="Write a reply..." 
            className="text-xs h-8 bg-white"
          />
          <Button type="submit" size="sm" className="h-8 text-[10px]" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin h-3 w-3" /> : "Reply"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function Forum() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "forumPosts"), orderBy("createdAt", "desc"));
  }, [db, user]);

  const { data: posts } = useCollection(postsQuery);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || !profile || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const postId = Math.random().toString(36).substring(7);
      const postRef = doc(db, "forumPosts", postId);
      const postData = {
        id: postId,
        authorId: user.uid,
        authorName: profile.name,
        content: newPost,
        likes: 0,
        createdAt: new Date().toISOString()
      };

      setDoc(postRef, postData)
        .catch((e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: postRef.path,
            operation: 'create',
            requestResourceData: postData,
          }));
          toast({ variant: "destructive", title: "Error", description: "Failed to post reflection." });
        });

      // Optimistic UI updates
      updateDocumentNonBlocking(doc(db, "users", user.uid), {
        points: (profile.points || 0) + 5
      });

      setNewPost("");
      toast({ title: "Reflection Shared", description: "Your reflection is live! +5 points earned." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = (postId: string, currentLikes: number) => {
    if (!user) return;
    updateDocumentNonBlocking(doc(db, "forumPosts", postId), {
      likes: (currentLikes || 0) + 1
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-3xl font-bold text-primary">Fellowship Reflections</h1>
          <p className="text-muted-foreground">Actual reflections from our community members. Share and interact to grow in wisdom.</p>
        </header>

        {user && (
          <Card className="border-none shadow-sm bg-accent/5">
            <form onSubmit={handlePostSubmit}>
              <CardContent className="p-6">
                <Textarea 
                  placeholder="Share your meditation on today's reading..." 
                  className="min-h-[120px] bg-white border-none shadow-inner resize-none focus-visible:ring-accent"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
              </CardContent>
              <CardFooter className="px-6 pb-6 pt-0 flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter italic">Earn +5 points per reflection</p>
                <Button type="submit" disabled={isSubmitting || !newPost.trim()} className="bg-primary text-white hover:bg-primary/90 rounded-full">
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  Share Reflection
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <div className="space-y-8">
          {posts?.map((post) => (
            <div key={post.id} className="space-y-2">
              <Card className="border-none shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                      {post.authorName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-primary">{post.authorName}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-base text-foreground/80 leading-relaxed">{post.content}</p>
                </CardContent>
                <CardFooter className="px-6 py-4 border-t flex gap-6">
                  <button 
                    onClick={() => handleLike(post.id, post.likes)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${post.likes > 0 ? 'fill-accent text-accent' : ''}`} /> {post.likes || 0} Likes
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageCircle className="h-4 w-4" /> Discussion
                  </div>
                </CardFooter>
              </Card>

              <CommentSection postId={post.id} />
            </div>
          ))}

          {posts?.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <p className="text-muted-foreground italic">No reflections shared yet. Be the first!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
