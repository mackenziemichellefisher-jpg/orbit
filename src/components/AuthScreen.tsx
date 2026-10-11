import { useState } from "react";
import { Apple, ArrowRight, CheckCircle2, Chrome, LockKeyhole, Mail, Orbit } from "lucide-react";
import { useAuth } from "@/auth";

export function AuthScreen() {
  const { signIn, signUp, signInWithProvider, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    setMessage("");
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else if (mode === "signup" && "needsConfirmation" in result && result.needsConfirmation) setMessage("Check your email to confirm your account, then come back to log in.");
    else if (mode === "signup") setMessage("Your account is ready. You can start setting up your orbit.");
  };

  const reset = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    const result = await resetPassword(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else setMessage("If that email is registered, we sent a reset link.");
  };

  return (
    <main className="min-h-screen cosmic-bg px-5 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="logo-stage">
            <div className="logo-mark">
              <Orbit size={32} />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--go)] font-extrabold mt-4">Everything worth going to, in orbit</p>
          <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mt-1">Welcome to Orbit</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Save the places pulling you in, then let your crew choose the next stop.</p>
        </div>

        <div className="game-card p-5">
          <div className="flex gap-1 p-1 bg-[var(--surface-subtle)] rounded-xl mb-5">
            <button onClick={() => { setMode("signup"); setResetMode(false); setError(""); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === "signup" && !resetMode ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`}>Create account</button>
            <button onClick={() => { setMode("login"); setResetMode(false); setError(""); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === "login" && !resetMode ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`}>Log in</button>
          </div>

          {resetMode ? (
            <>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Reset your password</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1 mb-5">Enter your email and we'll send a reset link.</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{mode === "signup" ? "Start your next adventure" : "Good to see you again"}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1 mb-5">{mode === "signup" ? "Create an account in a few seconds." : "Your orbit is waiting."}</p>
            </>
          )}

          <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">Email address</label>
          <div className="relative mb-3">
            <Mail size={16} className="absolute left-3 top-3.5 text-[var(--text-muted)]" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" className="w-full bg-[var(--surface-subtle)] rounded-xl pl-10 pr-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border border-[var(--border)] focus:border-orbit-400" />
          </div>
          {!resetMode && (
            <>
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">Password</label>
              <div className="relative mb-2">
                <LockKeyhole size={16} className="absolute left-3 top-3.5 text-[var(--text-muted)]" />
                <input value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} type="password" placeholder="At least 6 characters" className="w-full bg-[var(--surface-subtle)] rounded-xl pl-10 pr-3 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border border-[var(--border)] focus:border-orbit-400" />
              </div>
              {mode === "login" && <button onClick={() => setResetMode(true)} className="text-xs text-[var(--go)] font-extrabold mb-4">Forgot password?</button>}
            </>
          )}

          {error && <p className="text-sm text-[#0c0c0c] bg-white border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5 mb-3">{error}</p>}
          {message && <p className="text-sm text-[#0c0c0c] bg-[#ffb000] border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5 mb-3 flex gap-2"><CheckCircle2 size={16} className="shrink-0" />{message}</p>}

          <button onClick={() => void (resetMode ? reset() : submit())} disabled={busy || !email.trim() || (!resetMode && !password)} className="snap-btn w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {busy ? "Please wait..." : resetMode ? "Send reset link" : mode === "signup" ? "Create my account" : "Log in"}
            {!busy && <ArrowRight size={16} />}
          </button>
          {resetMode && <button onClick={() => setResetMode(false)} className="w-full text-xs text-[var(--text-muted)] font-semibold mt-3">Back to login</button>}

          {!resetMode && (
            <>
              <div className="flex items-center gap-3 my-5"><div className="h-px bg-orbit-200 flex-1" /><span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">or continue with</span><div className="h-px bg-orbit-200 flex-1" /></div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => void signInWithProvider("google")} className="py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-2 hover:bg-[var(--surface-subtle)] transition-colors"><Chrome size={16} /> Google</button>
                <button onClick={() => void signInWithProvider("apple")} className="py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-2 hover:bg-[var(--surface-subtle)] transition-colors"><Apple size={16} /> Apple</button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
