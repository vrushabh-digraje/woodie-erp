import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getActiveCompanyHeader, setActiveCompanyHeader, setAuthToken } from "../../lib/apiClient";
import { fetchCurrentUser, loginRequest } from "./authApi";
import type { AuthUser } from "./authTypes";

const USER_KEY = "woodie_auth_user";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  activeCompany: string;
  setActiveCompany: (companyId: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompanyState] = useState<string>(() => getActiveCompanyHeader());

  const setActiveCompany = useCallback((companyId: string) => {
    setActiveCompanyHeader(companyId);
    setActiveCompanyState(companyId);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setActiveCompanyHeader(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setActiveCompanyState("all");
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: nextUser } = await loginRequest(email, password);
    setAuthToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    if (nextUser.role === "master_admin") {
      setActiveCompany("all");
    } else {
      setActiveCompanyHeader(null);
      setActiveCompanyState(nextUser.companyId || "woodie-1");
    }
  }, [setActiveCompany]);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const token = localStorage.getItem("woodie_auth_token");
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const me = await fetchCurrentUser();
        if (!mounted) return;
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      } catch {
        logout();
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      loading,
      activeCompany,
      setActiveCompany,
      login,
      logout,
    }),
    [user, loading, activeCompany, setActiveCompany, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
