import { Award, ChevronRight, Copy, Edit3, LogOut, MapPin, Moon, Sun, Users, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { onColor } from "../lib/color";
import { useApp } from "../store";
import { Avatar } from "./ui";
import { useAuth } from "../auth";
import { useTheme } from "../theme";

export function ProfileTab() {
  const { groups, spots, users, currentUser, meetups } = useApp();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const visited = new Set(meetups.filter((m) => m.groupId === groups[0]?.id).map((m) => m.spotId)).size;

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="pb-32 min-h-screen">
      <header className="px-4 pt-11 pb-4 flex items-center justify-between">
        <div className="glass-chip px-4 py-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--go)]">Player</p>
          <h1 className="text-[1.7rem] font-extrabold leading-none text-[var(--text-primary)]">You</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="icon-btn active:scale-95 transition-transform" aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} className="text-[var(--snap)]" /> : <Moon size={18} className="text-[var(--text-primary)]" />}
          </button>
          <button onClick={() => void signOut()} className="icon-btn active:scale-95 transition-transform" aria-label="Log out">
            <LogOut size={18} className="text-[var(--text-primary)]" />
          </button>
        </div>
      </header>

      <div className="px-4">
        <div className="flex items-center gap-4">
          <div className="trainer-ring">
            <Avatar src={currentUser.avatar} size={76} />
            <span className="level-pill">LV {Math.min(99, Math.max(1, spots.filter((s) => s.addedByUserId === currentUser.id).length + meetups.length))}</span>
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">{currentUser.name}</h2>
              <Edit3 size={14} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-1">{currentUser.bio || "always down for the next adventure"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-7">
          <Stat value={spots.filter((s) => s.addedByUserId === currentUser.id).length} label="Nodes added" icon={Zap} color="#ffb000" />
          <Stat value={meetups.length} label="Meetups" icon={Users} color="#0c0c0c" />
          <Stat value={visited} label="Visited" icon={MapPin} color="#ffffff" />
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-[0.14em]">Your orbits</h3>
            <button className="text-xs text-[var(--go)] font-extrabold">Manage</button>
          </div>
          <div className="space-y-3">
            {groups.map((group) => {
              const Icon = group.id === "g1" ? Award : MapPin;
              return (
                <div key={group.id} className="game-card p-4 !rounded-[24px]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center border-[3px] border-[#0c0c0c] shadow-md" style={{ backgroundColor: group.accent }}>
                      <Icon size={18} color={onColor(group.accent)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{group.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={12} className="text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]">{group.memberIds.length} members</span>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="flex items-center mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex -space-x-2">
                      {group.memberIds.map((id) => (
                        <Avatar key={id} src={users.find((u) => u.id === id)!.avatar} size={24} ring="#ffffff" />
                      ))}
                    </div>
                    <button onClick={() => copyCode(group.inviteCode)} className="ml-auto flex items-center gap-1.5 text-xs font-extrabold text-[var(--snap-ink)] px-2.5 py-1.5 rounded-full bg-[var(--snap)] shadow-[0_2px_0_var(--snap-shade)]">
                      <Copy size={12} />{copied === group.inviteCode ? "Copied" : group.inviteCode}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-[0.14em]">Saved nodes</h3>
            <span className="text-xs text-[var(--text-muted)]">{spots.filter((s) => s.addedByUserId === currentUser.id).length} total</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {spots.filter((s) => s.addedByUserId === currentUser.id).slice(0, 4).map((spot) => (
              <div key={spot.id} className="game-card overflow-hidden !rounded-[22px]">
                <img src={spot.thumbnail} alt={spot.title} className="w-full h-24 object-cover" />
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2">{spot.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 flex gap-1"><MapPin size={10} />{spot.address.split(",")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ value, label, icon: Icon, color }: { value: number; label: string; icon: LucideIcon; color: string }) {
  return (
    <div className="game-card p-3 !rounded-[22px]">
      <span className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#0c0c0c]" style={{ backgroundColor: color }}>
        <Icon size={15} color={onColor(color)} />
      </span>
      <p className="text-xl font-extrabold mt-2 text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
    </div>
  );
}
