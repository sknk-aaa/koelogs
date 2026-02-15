import { useEffect, useMemo, useState } from "react";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  type Me,
} from "../../api/auth";
import { AuthContext, type AuthState } from "./AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMe();
      setMe(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    await apiLogin(email, password);
    await refresh();
  };

  const signup = async (
    email: string,
    password: string,
    passwordConfirmation: string
  ) => {
    await apiSignup(email, password, passwordConfirmation);
    await refresh();
  };

  const logout = async () => {
    await apiLogout();
    setMe(null);
  };

  const value: AuthState = useMemo(
    () => ({ me, isLoading, refresh, login, signup, logout }),
    [me, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
