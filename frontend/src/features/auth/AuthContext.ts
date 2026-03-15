import { createContext } from "react";
import type { Me, SignupResult } from "../../api/auth";

export type AuthState = {
  me: Me | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<SignupResult>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);
