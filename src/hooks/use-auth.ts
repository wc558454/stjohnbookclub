
"use client";

import { useUser, useFirestore, useDoc } from "@/firebase";
import { useMemoFirebase } from "@/firebase/provider";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { getAuth } from "firebase/auth";

export type BadgeData = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  awardedAt: string;
  message?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  batchYear: string;
  guidingSaint: string;
  points: number;
  level: number;
  streak: number;
  status: string;
  role: string;
  profilePictureUrl?: string;
  pagesPerWeek?: number;
  currentPagesRead?: number;
  currentBookId?: string;
  lastReadAt?: string;
  freezeCount?: number;
  lastFreezeRefill?: string;
  spiritualGoal?: string;
  monthlyPoints?: number;
  currentMonth?: string;
  personalBestPages?: number;
  dailyPagesRead?: number;
  groupName?: string;
  badges?: BadgeData[];
};

export function useAuth() {
  const { user, isUserLoading: loading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user?.uid || !db) {
        setIsAdmin(false);
        setIsAdminLoading(false);
        return;
      }
      const adminRef = doc(db, "roles_admin", user.uid);
      const adminSnap = await getDoc(adminRef);
      setIsAdmin(adminSnap.exists());
      setIsAdminLoading(false);
    }
    checkAdmin();
  }, [user?.uid, db]);

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push("/");
  };

  return {
    user,
    profile,
    loading: loading || isProfileLoading || isAdminLoading,
    isAdmin,
    logout
  };
}
