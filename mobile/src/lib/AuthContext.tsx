import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  decodeTokenPayload,
} from "./auth";
import { API_URL } from "./config";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionTier: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const payload = decodeTokenPayload(token);
    if (!payload?.exp) return;

    // Refresh 1 minute before expiry
    const expiresIn = payload.exp * 1000 - Date.now() - 60_000;
    if (expiresIn <= 0) return;

    refreshTimerRef.current = setTimeout(() => {
      refreshAuth();
    }, expiresIn);
  }, []);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/api/auth/mobile/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await clearTokens();
        setUser(null);
        return false;
      }

      const data = await res.json();
      await setTokens(data.token, data.refreshToken);
      scheduleRefresh(data.token);

      // Decode user info from new token
      const payload = decodeTokenPayload(data.token);
      if (payload?.userId) {
        setUser({
          id: payload.userId,
          email: payload.email ?? "",
          name: null,
          role: payload.role ?? "user",
          subscriptionTier: payload.subscriptionTier ?? "free",
        });
      }

      return true;
    } catch {
      return false;
    }
  }, [scheduleRefresh]);

  // On mount: check for stored token and verify/refresh
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const payload = decodeTokenPayload(token);
        if (!payload?.exp) {
          await clearTokens();
          setIsLoading(false);
          return;
        }

        // If token is expired or will expire within 1 minute, refresh
        if (payload.exp * 1000 - Date.now() < 60_000) {
          const success = await refreshAuth();
          if (!success) {
            setIsLoading(false);
            return;
          }
        } else {
          // Token is still valid
          setUser({
            id: payload.userId ?? "",
            email: payload.email ?? "",
            name: null,
            role: payload.role ?? "user",
            subscriptionTier: payload.subscriptionTier ?? "free",
          });
          scheduleRefresh(token);
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refreshAuth, scheduleRefresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/api/auth/mobile/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Login failed");
      }

      await setTokens(data.token, data.refreshToken);
      setUser(data.user);
      scheduleRefresh(data.token);
    },
    [scheduleRefresh]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${API_URL}/api/auth/mobile/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      await setTokens(data.token, data.refreshToken);
      setUser(data.user);
      scheduleRefresh(data.token);
    },
    [scheduleRefresh]
  );

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
