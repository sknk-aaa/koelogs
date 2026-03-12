import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMe,
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  logout as apiLogout,
  signup as apiSignup,
  type Me,
} from "../../api/auth";
import { AuthContext, type AuthState } from "./AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMe();
      setMe(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await refresh();
  }, [refresh]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    await apiLoginWithGoogle(credential);
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (
    email: string,
    password: string,
    passwordConfirmation: string
  ) => {
    return apiSignup(email, password, passwordConfirmation);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setMe(null);
  }, []);

  const value: AuthState = useMemo(
    () => ({ me, isLoading, refresh, login, loginWithGoogle, signup, logout }),
    [me, isLoading, refresh, login, loginWithGoogle, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
