import { createContext } from "react";
import type { Me } from "../../api/auth";

export type AuthState = {
  me: Me | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);
