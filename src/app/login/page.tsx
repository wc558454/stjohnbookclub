
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email, pin);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or PIN. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-primary text-white p-8 text-center space-y-2">
            <KeyRound className="h-12 w-12 text-accent mx-auto mb-2" />
            <CardTitle className="font-headline text-3xl">Secure Login</CardTitle>
            <CardDescription className="text-primary-foreground/70">
              Enter your credentials to access the fellowship.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">4-Digit PIN</Label>
                <Input 
                  id="pin" 
                  type="password" 
                  maxLength={4} 
                  placeholder="****" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary h-12 text-lg font-bold hover:bg-primary/90 rounded-full">
                <LogIn className="mr-2 h-5 w-5" /> Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
