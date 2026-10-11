import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronDown,
  ArrowUp,
  MessageSquare,
  UtensilsCrossed,
  Wine,
  Trees,
  Coffee,
  Check,
  UserPlus,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { onColor } from "../lib/color";
import { useApp } from "../store";
import { categoryConfig } from "../mockData";
import type { Category, PoolSpot } from "../types";
import { Sheet, Avatar, CategoryBadge } from "./ui";
import * as LucideIcons from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Wine,
  Trees,
  Coffee,
};

type ParserLog = {
  stage: string;
  status: "ok" | "warning" | "error";
  message: string;
  detail?: string;
};

type ParserResponse = {
  spot?: Omit<PoolSpot, "id" | "groupId" | "addedByUserId" | "upvotes" | "notes">;
  logs?: ParserLog[];
  error?: string;
};

function detectSourceType(url: string): "tiktok" | "instagram" | "maps" {
  const lower = url.toLowerCase();
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("instagram") || lower.includes("insta")) return "instagram";
  if (lower.includes("maps") || lower.includes("google")) return "maps";
  return "tiktok";
}

const thumbnailPool = [
  "https://images.pexels.com/photos/287975/pexels-photo-287975.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/30592890/pexels-photo-30592890.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/35518412/pexels-photo-35518412.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/36498696/pexels-photo-36498696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/14471525/pexels-photo-14471525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/13533825/pexels-photo-13533825.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/27926022/pexels-photo-27926022.png?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.pexels.com/photos/4916548/pexels-photo-4916548.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
];

const keywordCategories: { keywords: string[]; category: Category }[] = [
  { keywords: ["ramen", "taco", "birria", "food", "restaurant", "eat", "dining", "brunch", "cafe", "coffee", "korean", "fried", "bar", "grill", "kitchen", "pizza", "burger", "sushi", "noodle", "bakery", "diner"], category: "Food" },
  { keywords: ["bar", "club", "night", "cocktail", "lounge", "rooftop", "dj", "dance", "drinks", "wine", "beer", "pub", "arcade"], category: "Nightlife" },
  { keywords: ["hike", "trail", "park", "beach", "cliff", "ocean", "mountain", "outdoor", "nature", "coast", "bay", "lake", "garden", "pier", "view"], category: "Outdoor" },
  { keywords: ["chill", "relax", "spa", "cafe", "patio", "garden", "sunset", "cozy", "quiet", "brunch", "lounge"], category: "Chill" },
];

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const raw = segments[segments.length - 1] || u.hostname;
    return raw
      .replace(/[-_]/g, " ")
      .replace(/\.(html|php|aspx)$/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return url.split("/").pop()?.replace(/[-_]/g, " ").trim() || "New Spot";
  }
}

function categoriesFromUrl(url: string): Category[] {
  const lower = url.toLowerCase();
  const matched = new Set<Category>();
  for (const { keywords, category } of keywordCategories) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.add(category);
    }
  }
  return matched.size > 0 ? Array.from(matched) : ["Food", "Chill"];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function PoolsTab() {
  const { groups, spots, users, currentUser, activeGroupId, setActiveGroupId, upvoteSpot, addNote, addSpot } = useApp();
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [memberSheetOpen, setMemberSheetOpen] = useState(false);
  const [expandedSpot, setExpandedSpot] = useState<string | null>(null);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const groupSpots = spots.filter((s) => s.groupId === activeGroupId);

  if (!activeGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div><div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] mx-auto animate-pulse" /><p className="text-sm text-[var(--text-muted)] mt-3">Loading your orbit...</p></div>
      </div>
    );
  }
  const GroupIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[activeGroup.icon];

  const getUser = (id: string) => users.find((u) => u.id === id)!;

  return (
    <div className="pb-32 min-h-screen">
      <header className="sticky top-0 z-20 px-4 pt-11 pb-3 bg-gradient-to-b from-[var(--page-bg)] via-[var(--page-bg)] to-transparent">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setGroupMenuOpen((v) => !v)}
            className="glass-chip flex items-center gap-2 pl-1.5 pr-3 py-1.5 active:opacity-80 transition-opacity"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-[#0c0c0c]"
              style={{ backgroundColor: activeGroup.accent }}
            >
              {GroupIcon && <GroupIcon size={18} color={onColor(activeGroup.accent)} />}
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <h1 className="text-lg font-extrabold leading-tight text-[var(--text-primary)] truncate">{activeGroup.name}</h1>
              <ChevronDown size={18} className="text-[var(--text-muted)] shrink-0" />
            </div>
          </button>
          <button
            onClick={() => setAddMenuOpen((v) => !v)}
            className="snap-orb sm shrink-0"
            aria-label="Add to orbit"
          >
            <Plus size={22} strokeWidth={2.6} />
          </button>
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] mt-2 px-1">{groupSpots.length} stops · {activeGroup.memberIds.length} players</p>

        <AnimatePresence>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setAddMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="absolute right-4 top-full mt-2 w-52 game-card overflow-hidden z-30"
              >
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setLinkSheetOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  <Link2 size={16} className="text-[var(--go)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Add a Node</span>
                </button>
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setMemberSheetOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  <UserPlus size={16} className="text-[var(--text-tertiary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Add Members</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {groupMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 game-card overflow-hidden"
            >
              {groups.map((g) => {
                const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[g.icon];
                const isActive = g.id === activeGroupId;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGroupId(g.id);
                      setGroupMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${g.accent}22` }}
                    >
                      {Icon && <Icon size={16} color={g.accent} />}
                    </div>
                    <span className="text-sm font-medium flex-1 text-left text-[var(--text-primary)]">{g.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{g.inviteCode}</span>
                    {isActive && <Check size={16} className="text-[var(--go)]" />}
                  </button>
                );
              })}
              <button className="w-full flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center">
                  <Plus size={16} className="text-[var(--text-muted)]" />
                </div>
                <span className="text-sm font-medium text-[var(--text-muted)]">Create new orbit</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="px-5 pt-5 space-y-4">
        <h2 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-[0.14em]">Nearby stops</h2>
        <AnimatePresence>
          {groupSpots.map((spot) => (
            <PoolCard
              key={spot.id}
              spot={spot}
              accent={activeGroup.accent}
              expanded={expandedSpot === spot.id}
              onToggle={() => setExpandedSpot(expandedSpot === spot.id ? null : spot.id)}
              onUpvote={() => upvoteSpot(spot.id)}
              onAddNote={(text) => addNote(spot.id, currentUser.id, text)}
              getUser={getUser}
            />
          ))}
        </AnimatePresence>
        {groupSpots.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-sm">No nodes in this orbit yet.</p>
            <p className="text-[var(--text-muted)]/60 text-xs mt-1">Drop a link to get started!</p>
          </div>
        )}
      </div>

      <LinkDropSheet
        open={linkSheetOpen}
        onClose={() => setLinkSheetOpen(false)}
        accent={activeGroup.accent}
        onAdd={(spot) => {
          addSpot(spot);
          setLinkSheetOpen(false);
        }}
        groupId={activeGroupId}
      />

      <Sheet
        open={memberSheetOpen}
        onClose={() => setMemberSheetOpen(false)}
        title="Add Members"
      >
        <p className="text-sm text-[var(--text-tertiary)] mb-4">
          Share this invite code with friends so they can join this orbit.
        </p>
        <div className="rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Invite Code</p>
          <p className="text-2xl font-bold tracking-widest text-[var(--text-primary)]">{activeGroup.inviteCode}</p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Members</p>
          <div className="space-y-2">
            {activeGroup.memberIds.map((id) => {
              const member = users.find((u) => u.id === id)!;
              return (
                <div key={id} className="flex items-center gap-3">
                  <Avatar src={member.avatar} size={32} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{member.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function PoolCard({
  spot,
  accent,
  expanded,
  onToggle,
  onUpvote,
  onAddNote,
  getUser,
}: {
  spot: PoolSpot;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
  onUpvote: () => void;
  onAddNote: (text: string) => void;
  getUser: (id: string) => { name: string; avatar: string };
}) {
  const [noteText, setNoteText] = useState("");
  const [voted, setVoted] = useState(false);

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    onUpvote();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="game-card overflow-hidden !rounded-[24px]"
    >
      <div className="relative">
        <img src={spot.thumbnail} alt={spot.title} className="w-full h-44 object-cover" loading="lazy" />
        <div className="absolute top-3 left-3">
          <span className="sticker !static text-[10px] uppercase tracking-wider">
            {spot.sourceType}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={handleVote}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white shadow-md"
          >
            <ArrowUp size={14} color={voted ? accent : "#606060"} />
            <span className="text-xs font-bold text-[var(--text-primary)]">{spot.upvotes}</span>
          </motion.button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm leading-snug mb-2 text-[var(--text-primary)]">{spot.title}</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {spot.categories.map((cat) => {
            const cfg = categoryConfig[cat];
            const Icon = iconMap[cat] || UtensilsCrossed;
            return <CategoryBadge key={cat} label={cfg.label} icon={Icon} color={cfg.color} />;
          })}
        </div>
        <div className="flex items-center gap-2">
          <Avatar src={getUser(spot.addedByUserId).avatar} size={22} />
          <span className="text-xs text-[var(--text-muted)]">Added by {getUser(spot.addedByUserId).name}</span>
          <button onClick={onToggle} className="ml-auto flex items-center gap-1 text-xs text-[var(--text-muted)] active:scale-95">
            <MessageSquare size={13} />
            {spot.notes.length}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                {spot.notes.map((note, i) => (
                  <div key={i} className="flex gap-2">
                    <Avatar src={getUser(note.userId).avatar} size={20} />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{getUser(note.userId).name}</span>
                      <p className="text-xs text-[var(--text-muted)]">{note.text}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 bg-[var(--surface-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border border-[var(--border)] focus:border-orbit-400"
                  />
                  <button
                    onClick={() => {
                      if (noteText.trim()) {
                        onAddNote(noteText.trim());
                        setNoteText("");
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold active:scale-95"
                    style={{ backgroundColor: `${accent}22`, color: accent }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function LinkDropSheet({
  open,
  onClose,
  accent,
  onAdd,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  onAdd: (spot: PoolSpot) => void;
  groupId: string;
}) {
  const { currentUser } = useApp();
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [note, setNote] = useState("");
  const [parsedSpot, setParsedSpot] = useState<PoolSpot | null>(null);
  const [parserLogs, setParserLogs] = useState<ParserLog[]>([]);
  const [parserError, setParserError] = useState("");

  const handleParse = async () => {
    if (!url.trim() || parsing) return;
    setParsing(true);
    setParsed(false);
    setParsedSpot(null);
    setParserError("");
    setParserLogs([{ stage: "client", status: "ok", message: "Sending link to the server parser..." }]);

    let data: ParserResponse;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Parser connection settings are missing from the app build.");
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/parse-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      data = await response.json() as ParserResponse;
      setParserLogs((current) => [...current, ...(data.logs || [])]);
      if (!response.ok || !data.spot) {
        setParserError(data.error || `Parser returned HTTP ${response.status}.`);
        setParsing(false);
        return;
      }
    } catch (error) {
      setParserLogs((current) => [...current, { stage: "client", status: "error", message: "Could not reach the parser service.", detail: error instanceof Error ? error.message : "Network request failed" }]);
      setParserError("The parser service could not be reached. Check the diagnostics below and try again.");
      setParsing(false);
      return;
    }

    const spot: PoolSpot = {
      ...data.spot,
      id: `s${Date.now()}`,
      groupId,
      addedByUserId: currentUser.id,
      upvotes: 0,
      notes: [],
    };
    setParsedSpot(spot);
    setParsing(false);
    setParsed(true);
  };

  const reset = () => {
    setUrl("");
    setParsing(false);
    setParsed(false);
    setNote("");
    setParsedSpot(null);
    setParserLogs([]);
    setParserError("");
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a Node"
    >
      <p className="text-sm text-[var(--text-tertiary)] mb-4">
        Paste a TikTok, Instagram Reel, or Google Maps URL to add a node to this orbit.
      </p>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste link here..."
          className="flex-1 bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border border-[var(--border)] focus:border-orbit-400"
        />
        <button
          onClick={handleParse}
          disabled={!url.trim() || parsing}
          className="px-4 py-3 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {parsing ? "..." : "Parse"}
        </button>
      </div>

      {parsing && (
        <div className="mt-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] overflow-hidden animate-pulse">
          <div className="w-full h-32 bg-[var(--surface-subtle)]" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-3/4 bg-orbit-200 rounded" />
            <div className="h-3 w-1/2 bg-orbit-200 rounded" />
          </div>
        </div>
      )}

      {parserError && (
        <div className="mt-4 rounded-2xl border-2 border-[#0c0c0c] bg-white p-4">
          <p className="text-sm font-semibold text-[#0c0c0c]">Parser stopped</p>
          <p className="text-xs text-[#606060] mt-1">{parserError}</p>
        </div>
      )}

      {parserLogs.length > 0 && (
        <details className="mt-3 rounded-2xl border border-[var(--border)] bg-surface-50">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
            View parser diagnostics ({parserLogs.length} stages)
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {parserLogs.map((log, index) => (
              <div key={`${log.stage}-${index}`} className="border-t border-[var(--border-subtle)] pt-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full border border-[#0c0c0c] ${log.status === "error" ? "bg-[#0c0c0c]" : log.status === "warning" ? "bg-[#ffb000]" : "bg-white"}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{log.stage}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{log.message}</p>
                {log.detail && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 break-words">{log.detail}</p>}
              </div>
            ))}
          </div>
        </details>
      )}

      {parsed && parsedSpot && !parsing && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm overflow-hidden">
            <img src={parsedSpot.thumbnail} alt={parsedSpot.title} className="w-full h-32 object-cover" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check size={14} color={accent} />
                <span className="text-xs font-medium" style={{ color: accent }}>Link parsed</span>
                <span className="ml-auto px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                  {parsedSpot.sourceType}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-2 text-[var(--text-primary)]">{parsedSpot.title}</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {parsedSpot.categories.map((cat) => {
                  const cfg = categoryConfig[cat];
                  const Icon = iconMap[cat] || UtensilsCrossed;
                  return <CategoryBadge key={cat} label={cfg.label} icon={Icon} color={cfg.color} />;
                })}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{parsedSpot.address}</p>
              {parsedSpot.distanceMi != null && (
                <p className="text-xs text-[var(--text-muted)] mt-1">{parsedSpot.distanceMi} mi away</p>
              )}
            </div>
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (e.g. 'must try the birria')"
            className="mt-3 w-full bg-[var(--surface-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border border-[var(--border)] focus:border-orbit-400"
          />

          <button
            onClick={() => {
              const finalSpot: PoolSpot = {
                ...parsedSpot,
                notes: note.trim() ? [{ userId: currentUser.id, text: note.trim() }] : [],
              };
              onAdd(finalSpot);
              reset();
            }}
            className="snap-btn mt-3 w-full py-3.5 text-sm"
          >
            Add to Orbit
          </button>
        </motion.div>
      )}
    </Sheet>
  );
}
