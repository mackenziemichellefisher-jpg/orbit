import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ImagePlus, MapPin, Tag, UserPlus, X } from "lucide-react";
import { useApp } from "../store";
import { supabase } from "@/lib/supabase";
import { Avatar } from "./ui";

type FilterKey = "none" | "warm" | "cool" | "mono" | "vivid";

const FILTERS: { key: FilterKey; label: string; css: string }[] = [
  { key: "none", label: "Original", css: "" },
  { key: "warm", label: "Warm", css: "sepia(0.3) saturate(1.4) contrast(1.05)" },
  { key: "cool", label: "Cool", css: "saturate(1.15) contrast(1.05) brightness(1.03) hue-rotate(-10deg)" },
  { key: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { key: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.1)" },
];

async function applyFilter(file: File, css: string): Promise<Blob> {
  if (!css) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.filter = css;
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.92));
  } catch {
    return file;
  }
}

export function NewPostFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeGroupId, groups, spots, users, currentUser, addPost } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"pick" | "compose">("pick");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activePreview, setActivePreview] = useState(0);
  const [filterKey, setFilterKey] = useState<FilterKey>("none");
  const [caption, setCaption] = useState("");
  const [spotId, setSpotId] = useState("");
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const group = groups.find((g) => g.id === activeGroupId);
  const groupSpots = spots.filter((s) => s.groupId === activeGroupId);
  const members = users.filter((u) => group?.memberIds.includes(u.id) && u.id !== currentUser.id);
  const activeFilter = FILTERS.find((f) => f.key === filterKey)!;

  const reset = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setStep("pick");
    setFiles([]);
    setPreviews([]);
    setActivePreview(0);
    setFilterKey("none");
    setCaption("");
    setSpotId("");
    setTaggedUserIds([]);
    setShowTagPicker(false);
    setError("");
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    const selected = Array.from(fileList).slice(0, 4);
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setActivePreview(0);
    setStep("compose");
  };

  const toggleTag = (userId: string) => {
    setTaggedUserIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  };

  const share = async () => {
    if (!files.length || !currentUser.id) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const processed = await applyFilter(files[i], activeFilter.css);
        const path = `${activeGroupId}/${currentUser.id}/${Date.now()}-${i}.jpg`;
        const { error: uploadError } = await supabase.storage.from("post-photos").upload(path, processed, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      const captionWithTags = taggedUserIds.length
        ? `${caption.trim() || "New memory with the crew."} (with ${taggedUserIds.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join(", ")})`
        : caption.trim() || "New memory with the crew.";
      addPost({
        id: `p${Date.now()}`,
        groupId: activeGroupId,
        spotId,
        userId: currentUser.id,
        photos: urls,
        caption: captionWithTags,
        likes: 0,
        liked: false,
        comments: [],
        createdAt: new Date().toISOString(),
      });
      reset();
      onClose();
    } catch {
      setError("We couldn't upload your photos. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 cosmic-bg flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => (step === "compose" ? reset() : (() => { reset(); onClose(); })())}
          className="w-9 h-9 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center"
        >
          {step === "compose" ? <ArrowLeft size={17} className="text-[var(--text-secondary)]" /> : <X size={17} className="text-[var(--text-secondary)]" />}
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">New post</h1>
        {step === "compose" ? (
          <button
            onClick={() => void share()}
            disabled={uploading}
            className="snap-btn text-sm px-4 py-1.5 disabled:opacity-40"
          >
            {uploading ? "..." : "Share"}
          </button>
        ) : <div className="w-9" />}
      </div>

      {step === "pick" && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--snap)] shadow-[0_5px_0_var(--snap-shade)] flex items-center justify-center mb-5">
            <ImagePlus size={32} className="text-[var(--snap-ink)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Share a memory</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">Pick up to 4 photos from this hangout. Everyone in the orbit can add their own later.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="snap-btn px-6 py-3.5 text-sm"
          >
            Select photos
          </button>
        </div>
      )}

      {step === "compose" && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="relative w-full aspect-square bg-black">
            <img src={previews[activePreview]} alt="" className="w-full h-full object-cover" style={{ filter: activeFilter.css }} />
            {previews.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                {previews.map((_, i) => (
                  <button key={i} onClick={() => setActivePreview(i)} className={`w-1.5 h-1.5 rounded-full ${i === activePreview ? "bg-white" : "bg-white/40"}`} />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3 border-b border-[var(--border-subtle)]">
            {FILTERS.map((filter) => (
              <button key={filter.key} onClick={() => setFilterKey(filter.key)} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-14 h-14 rounded-full overflow-hidden border-[3px] ${filterKey === filter.key ? "border-[var(--snap)] shadow-[0_3px_0_var(--snap-shade)]" : "border-transparent"}`}>
                  <img src={previews[0]} alt="" className="w-full h-full object-cover" style={{ filter: filter.css }} />
                </div>
                <span className={`text-[10px] font-extrabold ${filterKey === filter.key ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{filter.label}</span>
              </button>
            ))}
          </div>

          <div className="px-4 py-3">
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Add a caption..."
              rows={2}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none"
            />
          </div>

          <button
            onClick={() => setShowTagPicker((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-[var(--border-subtle)]"
          >
            <MapPin size={18} className="text-[var(--text-tertiary)]" />
            <span className="flex-1 text-left text-sm text-[var(--text-primary)]">
              {spotId ? groupSpots.find((s) => s.id === spotId)?.title : "Tag a node"}
            </span>
            {spotId && <button onClick={(e) => { e.stopPropagation(); setSpotId(""); }}><X size={15} className="text-[var(--text-muted)]" /></button>}
          </button>
          {groupSpots.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
              {groupSpots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpotId(s.id === spotId ? "" : s.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold border ${spotId === s.id ? "chip-on" : "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text-secondary)]"}`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowTagPicker((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-[var(--border-subtle)]"
          >
            <UserPlus size={18} className="text-[var(--text-tertiary)]" />
            <span className="flex-1 text-left text-sm text-[var(--text-primary)]">
              {taggedUserIds.length ? `${taggedUserIds.length} tagged` : "Tag people"}
            </span>
          </button>
          <AnimatePresence>
            {showTagPicker && members.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {members.map((member) => {
                    const tagged = taggedUserIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleTag(member.id)}
                        className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border ${tagged ? "chip-on" : "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text-secondary)]"}`}
                      >
                        <Avatar src={member.avatar} size={22} />
                        <span className="text-xs font-semibold">{member.name}</span>
                        {tagged && <Tag size={11} />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="mx-4 mb-4 text-sm text-[#0c0c0c] bg-white border-2 border-[#0c0c0c] rounded-xl px-3 py-2.5">{error}</p>}

          <button
            onClick={() => void share()}
            disabled={uploading}
            className="snap-btn w-[calc(100%-2rem)] mx-4 mb-8 py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {uploading ? "Sharing..." : "Share to orbit"}<Check size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
