import { Map, Camera, Orbit, Rocket, User, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { TabKey } from "../types";

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "feed", label: "Feed", icon: Camera },
  { key: "map", label: "Map", icon: Map },
  { key: "pools", label: "Orbits", icon: Orbit },
  { key: "profile", label: "You", icon: User },
];

export function TabBar({
  active,
  onChange,
  onRoll,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  onRoll: () => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="glass-dock relative flex items-end h-[74px] rounded-[32px] px-1.5">
          {tabs.slice(0, 2).map((tab) => (
            <TabButton key={tab.key} tab={tab} active={active === tab.key} onChange={onChange} />
          ))}

          <div className="relative w-[76px] self-stretch">
            <div className="absolute left-1/2 -translate-x-1/2 -top-7">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onRoll}
                aria-label="Launch into orbit"
                className="snap-orb"
              >
                <Rocket size={26} strokeWidth={2.4} />
              </motion.button>
            </div>
          </div>

          {tabs.slice(2).map((tab) => (
            <TabButton key={tab.key} tab={tab} active={active === tab.key} onChange={onChange} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function TabButton({
  tab,
  active,
  onChange,
}: {
  tab: { key: TabKey; label: string; icon: LucideIcon };
  active: boolean;
  onChange: (t: TabKey) => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={() => onChange(tab.key)}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 pb-2"
    >
      <span className="relative flex h-9 w-11 items-center justify-center">
        {active && (
          <motion.span
            layoutId="tab-slot"
            className="absolute inset-0 rounded-2xl bg-[var(--snap)] shadow-[0_3px_0_var(--snap-shade)]"
          />
        )}
        <Icon
          size={20}
          strokeWidth={active ? 2.6 : 2}
          className={`relative ${active ? "text-[var(--snap-ink)]" : "text-[var(--text-muted)]"}`}
        />
      </span>
      <span className={`text-[10px] font-extrabold ${active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
        {tab.label}
      </span>
    </button>
  );
}
