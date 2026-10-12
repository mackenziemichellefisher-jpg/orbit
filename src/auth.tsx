import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User as AuthUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithProvider: (provider: "google" | "apple") => Promise<{ error: string | null }>;
  sendPhoneCode: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneCode: (phone: string, code: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Turns what people type into E.164 (+15551234567). Ten-digit numbers are assumed to be US/Canada. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function messageForPhoneError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("expired") || message.includes("invalid")) return "That code didn't work. Check it or send a new one.";
  if (message.includes("rate limit") || message.includes("security purposes")) return "Please wait a minute before requesting another code.";
  if (message.includes("phone provider") || message.includes("unsupported phone") || message.includes("sms")) return "Phone sign-in isn't available right now. Try email or Google.";
  return "We couldn't send a code to that number. Check it and try again.";
}

function messageForError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) return "That email or password is incorrect.";
  if (message.includes("password should be at least")) return "Choose a password with at least six characters.";
  if (message.includes("email not confirmed")) return "Check your email to confirm your account before signing in.";
  if (message.includes("already registered") || message.includes("already exists")) return "If this email is available, we sent the next steps to it.";
  return "We couldn't complete that request. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    async signIn(email, password) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: error ? messageForError(error) : null };
      } catch (cause) {
        return { error: messageForError(cause) };
      }
    },
    async signUp(email, password) {
      try {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        return { error: error ? messageForError(error) : null, needsConfirmation: !error && !data.session };
      } catch (cause) {
        return { error: messageForError(cause), needsConfirmation: false };
      }
    },
    async signInWithProvider(provider) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin },
        });
        if (!error) return { error: null };
        const label = provider === "google" ? "Google" : "Apple";
        return { error: error.message.toLowerCase().includes("not enabled") ? `${label} sign-in isn't available yet.` : messageForError(error) };
      } catch (cause) {
        return { error: messageForError(cause) };
      }
    },
    async sendPhoneCode(phone) {
      try {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        return { error: error ? messageForPhoneError(error) : null };
      } catch (cause) {
        return { error: messageForPhoneError(cause) };
      }
    },
    async verifyPhoneCode(phone, code) {
      try {
        const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
        return { error: error ? messageForPhoneError(error) : null };
      } catch (cause) {
        return { error: messageForPhoneError(cause) };
      }
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ? "We couldn't send the reset email. Please try again." : null };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
