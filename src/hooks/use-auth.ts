
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  pin: string;
  batchYear: string;
  readingLevel: string;
  pagesPerDay: number;
  spiritualGoal?: string;
  points: number;
  currentStreak: number;
  longestStreak: number;
  lastChallengeDate?: string;
  totalPagesRead: number;
  discussionsAttended: number;
  badges: string[];
  isAdmin: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("chrysostom_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = (email: string, pin: string) => {
    // In a real app, this would be a Firebase Auth call or Firestore lookup
    // For simulation, we check against "sim_registration" or a default admin
    const registrationsRaw = localStorage.getItem("sim_registrations") || "[]";
    const registrations: UserProfile[] = JSON.parse(registrationsRaw);
    
    const found = registrations.find(r => r.email === email && r.pin === pin);
    
    if (found) {
      setUser(found);
      localStorage.setItem("chrysostom_user", JSON.stringify(found));
      router.push("/dashboard");
      return true;
    }
    
    if (email === "admin@chrysostom.org" && pin === "1234") {
      const adminUser: UserProfile = {
        id: "admin-1",
        name: "Admin Member",
        email: "admin@chrysostom.org",
        pin: "1234",
        batchYear: "2011",
        readingLevel: "Advanced",
        pagesPerDay: 10,
        points: 15000,
        currentStreak: 5,
        longestStreak: 10,
        totalPagesRead: 5000,
        discussionsAttended: 50,
        badges: ["7-Day Streak", "1000 Pages Read"],
        isAdmin: true,
      };
      setUser(adminUser);
      localStorage.setItem("chrysostom_user", JSON.stringify(adminUser));
      router.push("/dashboard");
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("chrysostom_user");
    router.push("/");
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem("chrysostom_user", JSON.stringify(updatedUser));
    
    // Also update in "database"
    const registrationsRaw = localStorage.getItem("sim_registrations") || "[]";
    const registrations: UserProfile[] = JSON.parse(registrationsRaw);
    const index = registrations.findIndex(r => r.id === user.id);
    if (index !== -1) {
      registrations[index] = updatedUser;
      localStorage.setItem("sim_registrations", JSON.stringify(registrations));
    }
  };

  return { user, login, logout, updateUser, loading };
}
