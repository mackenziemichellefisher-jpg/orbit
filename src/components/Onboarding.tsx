import { useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Orbit, QrCode, Satellite, ScanLine, Share2, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { Avatar } from "./ui";
import { ColorPicker } from "./ColorPicker";
import { QrCodeCanvas, QrScanner, encodeInviteQr, decodeInviteQr } from "./QrKit";
import type { Category } from "@/types";

const presetAvatars = [
  "https://images.pexels.com/photos/6102841/pexels-photo-6102841.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
  "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
  "https://images.pexels.com/photos/16869444/pexels-photo-16869444.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
  "https://images.pexels.com/photos/35490803/pexels-photo-35490803.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
];

const accentPresets = ["#ff3d7a", "#00aeef", "#14c98a", "#ffe500", "#8b5cf6", "#ff7a18", "#ef4444", "#0c0c0c"];

const interestOptions: { value: Category; label: string }[] = [
  { value: "Food", label: "Food" },
  { value: "Nightlife", label: "Nightlife" },
  { value: "Outdoor", label: "Outdoor" },
  { value: "Chill", label: "Chill" },
];

type JoinStatus = "idle" | "joining" | "joined" | "error";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(presetAvatars[0]);
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState(user?.phone ? `+${user.phone}` : "");
  const [interests, setInterests] = useState<Category[]>([]);
  const [poolName, setPoolName] = useState("");
  const [accent, setAccent] = useState(accentPresets[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [createdPoolName, setCreatedPoolName] = useState("");

  const [joinTab, setJoinTab] = useState<"scan" | "share">("scan");
  const [scanning, setScanning] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinedName, setJoinedName] = useState("");

  const uploadAvatar = async (file: File) => {
    if (!user || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5MB.");
      return;
    }
    setBusy(true);
    const path = `${user.id}/${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setError("We couldn't upload that photo. Please try again.");
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);
    setBusy(false);
  };

  const saveProfile = async () => {
    if (!user || !name.trim()) return false;
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, name: name.trim(), bio: bio.trim(), avatar }, { onConflict: "id" });
    if (profileError) {
      setError("We couldn't save your profile. Please try again.");
      return false;
    }
    return true;
  };

  const continueFromProfile = async () => {
    setError("");
    if (!name.trim()) { setError("Add a name so your friends know who you are."); return; }
    setBusy(true);
    const saved = await saveProfile();
    setBusy(false);
    if (!saved) return;
    setStep(1);
  };

  const toggleInterest = (category: Category) => {
    setInterests((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  };

  const continueFromAbout = async () => {
    if (!user) return;
    setError("");
    setBusy(true);
    const { error: aboutError } = await supabase.from("profiles").upsert({ id: user.id, age: age.trim() ? Number(age) : null, phone: phone.trim() || null, interests }, { onConflict: "id" });
    setBusy(false);
    if (aboutError) {
      setError("We couldn't save that. Please try again.");
      return;
    }
    setStep(2);
  };

  const continueFromPool = async () => {
    setError("");
    if (!user || !poolName.trim()) { setStep(3); return; }
    setBusy(true);
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ name: poolName.trim(), accent, icon: "Moon", owner_id: user.id })
      .select("id, invite_code")
      .maybeSingle();
    if (groupError || !group) {
      setError("We couldn't create your orbit. Please try again.");
      setBusy(false);
      return;
    }
    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });
    setCreatedInviteCode(group.invite_code);
    setCreatedPoolName(poolName.trim());
    setJoinTab("share");
    setBusy(false);
    setStep(3);
  };

  const attemptJoin = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setJoinStatus("joining");
    setScanning(false);
    const { data, error: joinError } = await supabase.rpc("join_group_by_code", { p_code: trimmed });
    if (joinError || !data) {
      setJoinStatus("error");
      return;
    }
    const { data: joined } = await supabase.from("groups").select("name").eq("id", data).maybeSingle();
    setJoinedName(joined?.name || "the orbit");
    setJoinStatus("joined");
  };

  const finish = () => {
    onComplete();
  };

  return (
    <main className="min-h-screen cosmic-bg px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map((item) => <div key={item} className={`h-2 flex-1 rounded-full ${item <= step ? "bg-[var(--snap)] shadow-[0_2px_0_var(--snap-shade)]" : "bg-white/80"}`} />)}
        </div>
        <div className="game-card p-6">
          {step === 0 && (
            <div>
              <div className="w-14 h-14 rounded-full bg-[var(--snap)] shadow-[0_4px_0_var(--snap-shade)] flex items-center justify-center mb-5"><Orbit size={27} className="text-[var(--snap-ink)]" /></div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Make it yours</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">Your profile helps friends recognize you in every orbit.</p>

              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <Avatar src={avatar} size={88} ring="#0c0c0c" />
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--snap)] border-2 border-[var(--card-bg)] shadow-[0_2px_0_var(--snap-shade)] flex items-center justify-center cursor-pointer active:scale-90 transition-transform">
                    {busy ? (
                      <span className="w-3 h-3 border-2 border-[var(--snap-ink)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={14} className="text-[var(--snap-ink)]" />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} />
                  </label>
                </div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] mt-3 mb-2">Choose an avatar</p>
                <div className="flex gap-3">
                  {presetAvatars.map((item) => (
                    <button key={item} onClick={() => setAvatar(item)} className={`rounded-full p-0.5 ${avatar === item ? "ring-2 ring-orbit-500 ring-offset-2" : ""}`}>
                      <Avatar src={item} size={40} />
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">Display name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" className="w-full bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-orbit-400 mb-3" />
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">A little about you <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
              <input value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Always down for..." className="w-full bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-orbit-400 mb-5" />
              {error && <p className="text-sm text-[#0c0c0c] bg-white border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5 mb-4">{error}</p>}
              <button onClick={() => void continueFromProfile()} disabled={busy} className="w-full py-3.5 rounded-2xl snap-btn text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">{busy ? "Saving..." : "Continue"}<ArrowRight size={16} /></button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="w-14 h-14 rounded-full bg-[var(--snap)] shadow-[0_4px_0_var(--snap-shade)] flex items-center justify-center mb-5"><Sparkles size={27} className="text-[var(--snap-ink)]" /></div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">A bit more about you</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">This helps us match you with the right nodes and people in your orbit.</p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">Age <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
                  <input value={age} onChange={(event) => setAge(event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="26" className="w-full bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-orbit-400" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">Phone <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="(555) 123-4567" className="w-full bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-orbit-400" />
                </div>
              </div>

              <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">What do you like doing?</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {interestOptions.map((option) => {
                  const active = interests.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleInterest(option.value)}
                      className={`px-3.5 py-2 rounded-full text-sm font-extrabold border transition-colors ${active ? "chip-on" : "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text-secondary)]"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-sm text-[#0c0c0c] bg-white border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5 mb-4">{error}</p>}
              <button onClick={() => void continueFromAbout()} disabled={busy} className="w-full py-3.5 rounded-2xl snap-btn text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">{busy ? "Saving..." : "Continue"}<ArrowRight size={16} /></button>
              <button onClick={() => setStep(0)} className="w-full mt-3 text-xs text-[var(--text-muted)] flex justify-center items-center gap-1"><ArrowLeft size={13} /> Back</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="w-14 h-14 rounded-full bg-[var(--snap)] shadow-[0_4px_0_var(--snap-shade)] flex items-center justify-center mb-5"><Users size={27} className="text-[var(--snap-ink)]" /></div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Start your first orbit</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">An orbit turns saved places into plans with your people. You can create one now or skip this step.</p>
              <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1.5">Orbit name</label>
              <input value={poolName} onChange={(event) => setPoolName(event.target.value)} placeholder="Friday Night Crew" className="w-full bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-orbit-400 mb-4" />
              <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Pick a color</p>
              <div className="mb-6">
                <ColorPicker value={accent} onChange={setAccent} presets={accentPresets} />
              </div>
              {error && <p className="text-sm text-[#0c0c0c] bg-white border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5 mb-4">{error}</p>}
              <button onClick={() => void continueFromPool()} disabled={busy} className="w-full py-3.5 rounded-2xl snap-btn text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">{busy ? "Creating..." : poolName.trim() ? "Continue" : "Skip for now"}<ArrowRight size={16} /></button>
              <button onClick={() => setStep(1)} className="w-full mt-3 text-xs text-[var(--text-muted)] flex justify-center items-center gap-1"><ArrowLeft size={13} /> Back</button>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="w-14 h-14 rounded-full bg-[var(--snap)] shadow-[0_4px_0_var(--snap-shade)] flex items-center justify-center mb-5"><Satellite size={27} className="text-[var(--snap-ink)]" /></div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Join an orbit</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 mb-5">Scan a friend's code to join their orbit, or share yours so they can join you.</p>

              <div className="flex p-1 bg-[var(--surface-subtle)] rounded-xl mb-4">
                <button
                  onClick={() => { setJoinTab("scan"); setScanning(true); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${joinTab === "scan" ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`}
                >
                  <ScanLine size={14} /> Scan
                </button>
                <button
                  onClick={() => setJoinTab("share")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${joinTab === "share" ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)]"}`}
                >
                  <QrCode size={14} /> My Code
                </button>
              </div>

              {joinTab === "scan" && (
                <div>
                  {joinStatus === "joined" ? (
                    <div className="rounded-2xl bg-[#ffb000] border-2 border-[#0c0c0c] p-6 text-center mb-4">
                      <CheckCircle2 size={30} className="text-[#0c0c0c] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#0c0c0c]">You joined {joinedName}!</p>
                    </div>
                  ) : (
                    <>
                      <QrScanner
                        active={scanning}
                        onScan={(raw) => void attemptJoin(decodeInviteQr(raw))}
                      />
                      <div className="flex gap-2 mt-3">
                        <input
                          value={joinCode}
                          onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                          placeholder="Or enter code manually"
                          className="flex-1 bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm font-semibold tracking-widest text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-orbit-400"
                        />
                        <button
                          onClick={() => void attemptJoin(joinCode)}
                          disabled={!joinCode.trim() || joinStatus === "joining"}
                          className="px-4 rounded-xl snap-btn text-sm font-semibold disabled:opacity-40"
                        >
                          {joinStatus === "joining" ? "..." : "Join"}
                        </button>
                      </div>
                      {joinStatus === "error" && <p className="text-sm text-[#0c0c0c] bg-white border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5 mt-3">That invite code wasn't recognized. Try again or skip for now.</p>}
                    </>
                  )}
                </div>
              )}

              {joinTab === "share" && (
                <div className="flex flex-col items-center">
                  {createdInviteCode ? (
                    <>
                      <QrCodeCanvas value={encodeInviteQr(createdInviteCode)} size={200} />
                      <p className="text-base font-bold text-[var(--text-primary)] mt-4">{createdPoolName}</p>
                      <p className="text-xs text-[var(--text-muted)] tracking-[0.2em] font-semibold mt-1">{createdInviteCode}</p>
                      <button
                        onClick={() => {
                          const text = `Join my orbit "${createdPoolName}" on Orbit! Use invite code ${createdInviteCode}.`;
                          if (navigator.share) void navigator.share({ text }).catch(() => {});
                          else void navigator.clipboard?.writeText(text);
                        }}
                        className="mt-5 w-full py-3 rounded-2xl snap-btn text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <Share2 size={15} /> Share invite
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-[var(--text-muted)] mb-3">Create an orbit first to get your own shareable code.</p>
                      <button onClick={() => setStep(2)} className="text-sm font-extrabold text-[var(--go)]">Go back and create one</button>
                    </div>
                  )}
                </div>
              )}

              <button onClick={finish} className="w-full mt-5 py-3.5 rounded-2xl snap-btn text-sm font-bold flex items-center justify-center gap-2">
                {joinStatus === "joined" ? "Continue" : "Skip for now"}<Check size={16} />
              </button>
              <button onClick={() => setStep(2)} className="w-full mt-3 text-xs text-[var(--text-muted)] flex justify-center items-center gap-1"><ArrowLeft size={13} /> Back</button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-[var(--text-muted)] mt-5">You can change these details anytime from your profile.</p>
      </div>
    </main>
  );
}
