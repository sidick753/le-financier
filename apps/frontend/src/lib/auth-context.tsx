"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerPmeOwner: (data: RegisterData) => Promise<void>;
  registerInvestor: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = sessionStorage.getItem("accessToken");
    const storedUser = sessionStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  function persistSession(response: AuthResponse) {
    setToken(response.accessToken);
    setUser(response.user);
    sessionStorage.setItem("accessToken", response.accessToken);
    sessionStorage.setItem("user", JSON.stringify(response.user));
  }

  async function login(email: string, password: string) {
    const response = await api.post<AuthResponse>("/auth/login", { email, password });
    persistSession(response);
  }

  async function registerPmeOwner(data: RegisterData) {
    const response = await api.post<AuthResponse>("/auth/register/pme-owner", data);
    persistSession(response);
  }

  async function registerInvestor(data: RegisterData) {
    const response = await api.post<AuthResponse>("/auth/register/investor", data);
    persistSession(response);
  }

  function logout() {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, registerPmeOwner, registerInvestor, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider.");
  }
  return context;
}
