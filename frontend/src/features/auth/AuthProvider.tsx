import React, { useEffect, useMemo, useState } from "react";
import { fetchMe, login as apiLogin, logout as apiLogout } from "../../api/auth";
import { AuthContext } from "./authContext";
import type { AuthState } from "./authContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthState["me"]>(null);
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

  const logout = async () => {
    await apiLogout();
    setMe(null);
  };

  const value = useMemo<AuthState>(
    () => ({ me, isLoading, refresh, login, logout }),
    [me, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
