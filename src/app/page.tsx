
"use client";

import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Trophy, MessageCircle } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-spiritual');

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[80vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            {heroImg && (
              <Image 
                src={heroImg.imageUrl} 
                alt={heroImg.description}
                fill
                className="object-cover opacity-20"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-2xl space-y-6">
              <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary leading-tight">
                Wisdom of the <br />
                <span className="text-accent italic">Golden-Mouthed</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
                Join a community dedicated to exploring the profound theological and moral teachings of St. John Chrysostom.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" className="bg-primary text-white hover:bg-primary/90 px-8">
                  Join the Club
                </Button>
                <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10 px-8">
                  Browse Readings
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">A Spiritual Journey Together</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our platform provides everything you need to engage deeply with sacred texts and a community of seekers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: BookOpen, title: "Structured Reading", desc: "Follow our curated plans through the Homilies and Epistles." },
                { icon: MessageCircle, title: "Deep Discussions", desc: "Engage in thoughtful dialogue with members around the world." },
                { icon: Trophy, title: "Spiritual Growth", desc: "Track your progress and participate in reading challenges." },
                { icon: Users, title: "Global Fellowship", desc: "Connect with like-minded individuals in a respectful environment." }
              ].map((feat, idx) => (
                <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8 space-y-4 text-center">
                    <div className="inline-flex p-3 rounded-full bg-accent/10 text-accent mx-auto">
                      <feat.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-headline text-xl font-bold text-primary">{feat.title}</h3>
                    <p className="text-sm text-muted-foreground">{feat.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center bg-primary rounded-3xl p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 space-y-6">
              <h2 className="font-headline text-4xl font-bold">Ready to Start Reading?</h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto text-lg">
                Create your account today and gain access to our current reading schedule: The Homilies on the Statues.
              </p>
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-primary font-bold px-12">
                Sign Up Now
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 text-center space-y-4">
          <span className="font-headline text-xl font-bold text-primary tracking-tight">
            Chrysostom <span className="text-accent">Bookclub</span>
          </span>
          <p className="text-sm text-muted-foreground">© 2024 St. John Chrysostom Bookclub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
