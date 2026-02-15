
"use client";

import { useState, useEffect } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sim_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = (isAdmin = false) => {
    const newUser = {
      id: "u1",
      name: isAdmin ? "Admin Member" : "John Doe",
      email: isAdmin ? "admin@chrysostom.org" : "john@example.com",
      isAdmin,
    };
    setUser(newUser);
    localStorage.setItem("sim_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sim_user");
  };

  return { user, login, logout, loading };
}
