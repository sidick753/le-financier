"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
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
  refreshToken: string;
  expiresIn: number;
  user: User;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  registrationNumber?: string;
  cniNumber?: string;
  institutionName?: string;
  bceaoNumber?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  registerPmeOwner: (data: RegisterData) => Promise<AuthResponse>;
  registerInvestor: (data: RegisterData) => Promise<AuthResponse>;
  registerInstitution: (data: RegisterData) => Promise<AuthResponse>;
  updateUser: (data: Partial<Pick<User, "firstName" | "lastName">>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_MARGIN_MS = 60 * 1000; // Renouvelle 1 minute avant expiration

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("expiresAt");
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const scheduleRefresh = useCallback(
    (expiresInSeconds: number, currentRefreshToken: string) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

      const delayMs = Math.max(0, expiresInSeconds * 1000 - REFRESH_MARGIN_MS);

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const response = await api.post<AuthResponse>("/auth/refresh", {
            refreshToken: currentRefreshToken,
          });
          persistSession(response);
        } catch {
          clearSession();
          router.push("/login");
        }
      }, delayMs);
    },
    // persistSession is stable (defined below with useCallback) — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearSession, router],
  );

  const persistSession = useCallback(
    (response: AuthResponse) => {
      const expiresAt = Date.now() + response.expiresIn * 1000;
      setToken(response.accessToken);
      setUser(response.user);
      sessionStorage.setItem("accessToken", response.accessToken);
      sessionStorage.setItem("refreshToken", response.refreshToken);
      sessionStorage.setItem("user", JSON.stringify(response.user));
      sessionStorage.setItem("expiresAt", String(expiresAt));
      scheduleRefresh(response.expiresIn, response.refreshToken);
    },
    [scheduleRefresh],
  );

  useEffect(() => {
    const storedToken = sessionStorage.getItem("accessToken");
    const storedRefreshToken = sessionStorage.getItem("refreshToken");
    const storedUser = sessionStorage.getItem("user");
    const storedExpiresAt = sessionStorage.getItem("expiresAt");

    if (storedToken && storedRefreshToken && storedUser && storedExpiresAt) {
      const remainingMs = Number(storedExpiresAt) - Date.now();

      if (remainingMs > 0) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        scheduleRefresh(Math.floor(remainingMs / 1000), storedRefreshToken);
      } else {
        // Access token expiré — tente un refresh immédiat
        api
          .post<AuthResponse>("/auth/refresh", { refreshToken: storedRefreshToken })
          .then(persistSession)
          .catch(() => clearSession());
      }
    }

    setIsLoading(false);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh, persistSession, clearSession]);

  async function login(email: string, password: string) {
    const response = await api.post<AuthResponse>("/auth/login", { email, password });
    persistSession(response);
    return response;
  }

  async function registerPmeOwner(data: RegisterData) {
    const response = await api.post<AuthResponse>("/auth/register/pme-owner", data);
    persistSession(response);
    return response;
  }

  async function registerInvestor(data: RegisterData) {
    const response = await api.post<AuthResponse>("/auth/register/investor", data);
    persistSession(response);
    return response;
  }

  async function registerInstitution(data: RegisterData) {
    const response = await api.post<AuthResponse>("/auth/register/institution", data);
    persistSession(response);
    return response;
  }

  function updateUser(data: Partial<Pick<User, "firstName" | "lastName">>) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      sessionStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }

  function logout() {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    clearSession();
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerPmeOwner,
        registerInvestor,
        registerInstitution,
        updateUser,
        logout,
      }}
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
