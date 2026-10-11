import { type ReactNode, useEffect } from "react";
import { onColor } from "../lib/color";
import { motion, AnimatePresence } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[var(--backdrop)] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] bg-[var(--card-bg)] shadow-[0_-18px_50px_rgba(8,20,40,0.28)] max-h-[88vh] overflow-y-auto no-scrollbar"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-3 pb-3 glass-bar bg-[var(--header-bg-85)] rounded-t-[32px]">
              <div className="w-12 h-1.5 bg-[var(--snap)] rounded-full absolute left-1/2 -translate-x-1/2 top-2.5 shadow-[0_2px_0_var(--snap-shade)]" />
              {title && (
                <h2 className="text-base font-semibold text-[var(--text-primary)] mt-2">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="ml-auto mt-2 w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={18} className="text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="px-5 pb-8 pt-2">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Popover({ open, onClose, children, title }: PopoverProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ type: "spring", damping: 30, stiffness: 360 }}
            className="fixed bottom-24 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto game-card w-full max-w-sm max-h-[68vh] overflow-y-auto no-scrollbar">
              {title && (
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border-subtle)] rounded-t-3xl">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X size={15} className="text-[var(--text-tertiary)]" />
                  </button>
                </div>
              )}
              <div className="px-5 pb-5 pt-3">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Avatar({
  src,
  size = 40,
  ring,
}: {
  src: string;
  size?: number;
  ring?: string;
}) {
  return (
    <img
      src={src}
      alt="avatar"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      className="rounded-full object-cover"
    />
  );
}

export function CategoryBadge({
  label,
  icon: Icon,
  color,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
}) {
  const ink = onColor(color);
  const solid = ink === "#0c0c0c";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold"
      style={solid ? { backgroundColor: color, color: ink, border: "1px solid #0c0c0c" } : { backgroundColor: `${color}1a`, color }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

export function GroupBadge({
  name,
  accent,
  icon: Icon,
}: {
  name: string;
  accent: string;
  icon: LucideIcon;
}) {
  const ink = onColor(accent);
  const solid = ink === "#0c0c0c";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold"
      style={solid ? { backgroundColor: accent, color: ink, border: "1px solid #0c0c0c" } : { backgroundColor: `${accent}22`, color: accent }}
    >
      <Icon size={12} />
      {name}
    </span>
  );
}
