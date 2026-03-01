
"use client";

import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Trophy, MessageSquare, Quote } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-spiritual');
  const iconImg = PlaceHolderImages.find(img => img.id === 'book-on-table');

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[85vh] flex items-center overflow-hidden bg-primary/5">
          <div className="absolute inset-0 z-0">
            {heroImg && (
              <Image 
                src={heroImg.imageUrl} 
                alt={heroImg.description}
                fill
                className="object-cover opacity-10"
                priority
                data-ai-hint="ancient library"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-8">
              <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary leading-tight tracking-tight">
                St. John Chrysostom <br />
                <span className="text-accent italic">Bookclub</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium">
                “A community of spiritual reading students committed to disciplined study and growth.”
              </p>
              <div className="flex flex-wrap justify-center items-center gap-4 pt-6">
                <Button asChild size="lg" className="bg-primary text-white hover:bg-primary/90 px-10 h-14 text-lg rounded-full">
                  <Link href="/register">Join the Bookclub</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10 px-10 h-14 text-lg rounded-full">
                  <Link href="/dashboard">Member Login</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quote Section */}
        <section className="py-24 bg-background border-y border-accent/10">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <Quote className="h-12 w-12 text-accent/30 mx-auto" />
              <blockquote className="font-headline text-3xl md:text-4xl italic text-primary leading-snug">
                “Take heed to reading, to exhortation, to doctrine.”
              </blockquote>
              <footer className="text-accent font-bold tracking-widest uppercase text-sm">— St. John Chrysostom</footer>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { 
                  icon: BookOpen, 
                  title: "Structured Reading", 
                  desc: "Meticulously planned schedules through the golden-mouthed father's homilies and treatises." 
                },
                { 
                  icon: Trophy, 
                  title: "Accountability & Streaks", 
                  desc: "Stay disciplined with reading challenges, progress tracking, and daily meditation streaks." 
                },
                { 
                  icon: MessageSquare, 
                  title: "Community Discussions", 
                  desc: "Engage in meaningful fellowship with fellow students of the Word in our private forums." 
                }
              ].map((feat, idx) => (
                <div key={idx} className="space-y-6 text-center group">
                  <div className="inline-flex p-5 rounded-3xl bg-primary text-accent group-hover:scale-110 transition-transform shadow-lg">
                    <feat.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-white py-16">
        <div className="container mx-auto px-4 flex flex-col items-center space-y-8 text-center">
          {iconImg && (
            <Image
              src={iconImg.imageUrl}
              alt={iconImg.description}
              width={128}
              height={128}
              className="rounded-full border-4 border-accent/50 shadow-lg"
              data-ai-hint={iconImg.imageHint}
            />
          )}
          <div className="space-y-2">
            <p className="font-headline text-xl font-bold text-accent">የቅዱስ ጳውሎስ ህክምና ኮሌጅ ግቢ ጉባኤ</p>
            <p className="text-primary-foreground/60 text-sm">St. Paul Hospital Medical College Campus Fellowship</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-primary-foreground/40 pt-8 border-t border-white/10 w-full justify-between">
            <p>© 2024 St. John Chrysostom Bookclub. All rights reserved.</p>
            <p className="font-medium">Made by <span className="text-white">William</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
