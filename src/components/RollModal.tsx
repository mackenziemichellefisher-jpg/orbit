import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, MapPin, Orbit, RotateCw, Rocket, SlidersHorizontal } from "lucide-react";
import { useApp } from "../store";
import { categoryConfig } from "../mockData";
import type { Category, PoolSpot } from "../types";
import { Popover } from "./ui";

const categories: Category[] = ["Food", "Nightlife", "Outdoor", "Chill"];

export function RollModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeGroupId, groups, spots, lockInMeetup } = useApp();
  const group = groups.find((g) => g.id === activeGroupId);
  const groupSpots = spots.filter((s) => s.groupId === activeGroupId);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [radius, setRadius] = useState("Any distance");
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<PoolSpot | null>(null);
  const [vetoes, setVetoes] = useState(2);
  const [locked, setLocked] = useState(false);

  const eligibleSpots = useMemo(() => {
    let filtered = groupSpots;
    if (selectedCategory !== "All") {
      filtered = filtered.filter((spot) => spot.categories.includes(selectedCategory));
    }
    if (radius !== "Any distance") {
      const max = Number(radius.split(" ")[0]);
      filtered = filtered.filter((spot) => (spot.distanceMi ?? 0) <= max);
    }
    return filtered;
  }, [groupSpots, radius, selectedCategory]);

  useEffect(() => {
    if (!open) {
      setWinner(null);
      setRolling(false);
      setLocked(false);
      setVetoes(2);
    }
  }, [open]);

  const roll = () => {
    if (!eligibleSpots.length || rolling) return;
    setRolling(true);
    setWinner(null);
    setTimeout(() => {
      const chosen = eligibleSpots[Math.floor(Math.random() * eligibleSpots.length)];
      setWinner(chosen);
      setRolling(false);
    }, 2800);
  };

  const reroll = () => {
    if (vetoes <= 0) return;
    setVetoes((v) => v - 1);
    roll();
  };

  const lock = () => {
    if (!winner) return;
    lockInMeetup(activeGroupId, winner.id);
    setLocked(true);
  };

  if (!group) return null;

  return (
    <Popover open={open} onClose={onClose} title="Launch into orbit">
      <AnimatePresence mode="wait">
        {!winner && !rolling && (
          <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 bg-[var(--snap)] shadow-[0_6px_0_var(--snap-shade)]">
                <Orbit size={36} className="text-[var(--snap-ink)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Let the orbit decide.</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">{eligibleSpots.length} nodes in orbit around {group.name}</p>
            </div>

            <div className="mt-2">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Filters</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as Category | "All")}
                    className={`shrink-0 px-3 py-2 rounded-full text-xs font-extrabold border transition-colors ${selectedCategory === cat ? "chip-on" : "bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)]"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                {["Any distance", "2 mi", "5 mi", "10 mi"].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRadius(value)}
                    className={`shrink-0 px-3 py-2 rounded-full text-xs font-extrabold border transition-colors ${radius === value ? "chip-on" : "bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)]"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={roll}
              disabled={!eligibleSpots.length}
              className="snap-btn w-full mt-6 py-4 flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <Rocket size={18} />
              Launch!
            </button>
          </motion.div>
        )}

        {rolling && (
          <motion.div key="rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
            <OrbitAnimation spots={eligibleSpots} accent={group.accent} />
            <p className="text-center text-sm font-semibold text-[var(--text-muted)] mt-4 animate-pulse">Scanning the orbit...</p>
          </motion.div>
        )}

        {winner && !rolling && (
          <motion.div key="winner" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="py-2">
            {locked ? (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${group.accent}22` }}
                >
                  <Check size={38} color={group.accent} />
                </motion.div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Locked into orbit!</h3>
                <p className="text-sm text-[var(--text-muted)] mt-2">{winner.title} has been added to your meetup history.</p>
                <button onClick={onClose} className="snap-btn mt-6 px-6 py-3 text-sm">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 justify-center mb-4">
                  <Orbit size={16} color={group.accent} />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: group.accent }}>The orbit has spoken</span>
                  <Orbit size={16} color={group.accent} />
                </div>
                <div className="game-card overflow-hidden">
                  <img src={winner.thumbnail} alt={winner.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-bold text-lg leading-tight text-[var(--text-primary)]">{winner.title}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-[var(--text-muted)] text-xs"><MapPin size={13} />{winner.address}</div>
                    <div className="flex gap-1.5 mt-3">
                      {winner.categories.map((cat) => (
                        <span key={cat} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ color: categoryConfig[cat].color, backgroundColor: `${categoryConfig[cat].color}1a` }}>{cat}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={lock} className="snap-btn flex-1 py-3.5 text-sm">Lock in meetup</button>
                  <button onClick={reroll} disabled={!vetoes} className="px-4 py-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-sm font-semibold text-[var(--text-tertiary)] disabled:opacity-40 active:scale-95 transition-transform">
                    <RotateCw size={16} className="inline mr-1" />{vetoes}
                  </button>
                </div>
                <a href={`https://maps.google.com/?q=${winner.lat},${winner.lng}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1 text-xs text-[var(--text-muted)] py-2">
                  <MapPin size={13} />Open in Maps<ChevronRight size={13} />
                </a>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Popover>
  );
}

const ORBIT_RINGS = [58, 92, 126];

function OrbitAnimation({ spots, accent }: { spots: PoolSpot[]; accent: string }) {
  const nodes = [...spots, ...spots].slice(0, 8);
  return (
    <div className="relative h-72 rounded-[28px] overflow-hidden bg-[#0c0c0c] border border-white/10">
      {/* Faint starfield */}
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: "radial-gradient(1.4px 1.4px at 20% 25%, #fff, transparent), radial-gradient(1.2px 1.2px at 70% 15%, #fff, transparent), radial-gradient(1.4px 1.4px at 85% 60%, #fff, transparent), radial-gradient(1.2px 1.2px at 12% 80%, #fff, transparent), radial-gradient(1.2px 1.2px at 55% 90%, #fff, transparent)",
      }} />

      {/* Orbit ring paths */}
      <div className="absolute top-1/2 left-1/2">
        {ORBIT_RINGS.map((r) => (
          <div
            key={r}
            className="absolute rounded-full border border-dashed border-[#0c0c0c]/25"
            style={{ width: r * 2, height: r * 2, left: -r, top: -r }}
          />
        ))}
      </div>

      {/* Central hub */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--snap)", boxShadow: `0 0 0 6px ${accent}55, 0 0 24px 6px rgba(255,176,0,0.45)` }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        <Orbit size={18} className="text-[var(--snap-ink)]" />
      </motion.div>

      {/* Orbiting node thumbnails */}
      {nodes.map((spot, i) => {
        const r = ORBIT_RINGS[i % ORBIT_RINGS.length];
        const duration = 6 + (i % ORBIT_RINGS.length) * 2.5;
        const startAngle = (360 / nodes.length) * i;
        return (
          <div key={`${spot.id}-${i}`} className="absolute top-1/2 left-1/2 w-0 h-0">
            <motion.div
              className="absolute"
              style={{ width: r * 2, height: r * 2, left: -r, top: -r }}
              animate={{ rotate: [startAngle, startAngle + 360] }}
              transition={{ duration, repeat: Infinity, ease: "linear" }}
            >
              <motion.div
                className="absolute top-1/2 rounded-full overflow-hidden shadow-lg border-2 border-white/80"
                style={{ right: -18, width: 36, height: 36, marginTop: -18 }}
                animate={{ rotate: [-startAngle, -startAngle - 360] }}
                transition={{ duration, repeat: Infinity, ease: "linear" }}
              >
                <img src={spot.thumbnail} alt="" className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
