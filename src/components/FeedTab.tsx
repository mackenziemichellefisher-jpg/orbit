import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Plus, MapPin, Send, MoreHorizontal, ChevronDown, Users, Globe, Link2, ImagePlus, Download } from "lucide-react";
import { useApp } from "../store";
import { supabase } from "@/lib/supabase";

import { Avatar } from "./ui";
import { LinkDropSheet } from "./PoolsTab";
import { NewPostFlow } from "./NewPostFlow";
import type { FeedPost, PoolSpot } from "../types";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

type FeedScope = "universe" | string;

async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export function FeedTab() {
  const { posts, spots, groups, users, currentUser, toggleLike, addComment, addSpot, addPostPhotos, bookmarkSpot, activeGroupId } = useApp();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [postFlowOpen, setPostFlowOpen] = useState(false);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});
  const [scope, setScope] = useState<FeedScope>("universe");
  const [scopeOpen, setScopeOpen] = useState(false);

  const getUser = (id: string) => users.find((u) => u.id === id)!;
  const getGroup = (id: string) => groups.find((g) => g.id === id)!;
  const getSpot = (id: string): PoolSpot | undefined => spots.find((s) => s.id === id);
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const basePosts = scope === "universe"
    ? posts
    : posts.filter((p) => p.groupId === scope);

  // Simple interest-matching: posts tied to a node whose categories overlap
  // the current user's interests bubble up, most recent first within each tier.
  const scopedPosts = [...basePosts].sort((a, b) => {
    const aMatch = getSpot(a.spotId)?.categories.some((c) => currentUser.interests.includes(c)) ? 1 : 0;
    const bMatch = getSpot(b.spotId)?.categories.some((c) => currentUser.interests.includes(c)) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const scopeLabel = scope === "universe" ? "Universe" : getGroup(scope).name;
  const ScopeIcon: LucideIcon = scope === "universe" ? Globe : (LucideIcons as unknown as Record<string, LucideIcon>)[getGroup(scope).icon] || Users;

  return (
    <div className="pb-32 min-h-screen">
      <header className="sticky top-0 z-20 px-4 pt-11 pb-3 flex items-center justify-between bg-gradient-to-b from-[var(--page-bg)] via-[var(--page-bg)] to-transparent">
        <div className="relative">
          <div className="glass-chip px-4 py-2.5">
            <button
              onClick={() => setScopeOpen((v) => !v)}
              className="flex items-center gap-1.5"
            >
              <ScopeIcon size={12} className="text-[var(--go)]" />
              <p className="text-[10px] text-[var(--go)] uppercase tracking-[0.16em] font-extrabold">{scopeLabel}</p>
              <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${scopeOpen ? "rotate-180" : ""}`} />
            </button>
            <h1 className="text-[1.7rem] font-extrabold leading-none text-[var(--text-primary)]">Feed</h1>
          </div>

          <AnimatePresence>
            {scopeOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-2 w-56 game-card overflow-hidden z-30"
              >
                <button
                  onClick={() => { setScope("universe"); setScopeOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors ${scope === "universe" ? "bg-[var(--surface-subtle)]" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center">
                    <Globe size={16} className="text-[var(--go)]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Universe</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Every orbit, together</p>
                  </div>
                  {scope === "universe" && <div className="w-2.5 h-2.5 rounded-full bg-[var(--snap)] shadow-[0_2px_0_var(--snap-shade)]" />}
                </button>
                {groups.map((g) => {
                  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[g.icon] || Users;
                  return (
                    <button
                      key={g.id}
                      onClick={() => { setScope(g.id); setScopeOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border-subtle)] ${scope === g.id ? "bg-[var(--surface-subtle)]" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${g.accent}22` }}>
                        <Icon size={16} color={g.accent} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{g.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{g.memberIds.length} members</p>
                      </div>
                      {scope === g.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.accent }} />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button onClick={() => setAddMenuOpen((v) => !v)} className="snap-orb sm active:scale-95 transition-transform" aria-label="Add">
            <Plus size={22} strokeWidth={2.6} />
          </button>
          <AnimatePresence>
            {addMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setAddMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-56 game-card overflow-hidden z-30"
                >
                  <button
                    onClick={() => { setAddMenuOpen(false); setLinkSheetOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <Link2 size={16} className="text-[var(--go)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">Add a place to orbit</span>
                  </button>
                  <button
                    onClick={() => { setAddMenuOpen(false); setPostFlowOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    <ImagePlus size={16} className="text-[var(--text-tertiary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">New post</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5">
        {scopedPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-sm">No posts in this feed yet.</p>
            <p className="text-[var(--text-muted)]/60 text-xs mt-1">Share a recap to get the party started!</p>
          </div>
        )}
        {scopedPosts.map((post) => {
          const user = getUser(post.userId);
          const group = getGroup(post.groupId);
          const spot = getSpot(post.spotId);
          const index = photoIndex[post.id] ?? 0;
          return (
            <FeedPostCard
              key={post.id}
              post={post}
              user={user}
              group={group}
              spot={spot}
              index={index}
              onIndexChange={(i) => setPhotoIndex((prev) => ({ ...prev, [post.id]: i }))}
              commentOpen={commentFor === post.id}
              onToggleComments={() => setCommentFor(commentFor === post.id ? null : post.id)}
              comment={comment}
              onCommentChange={setComment}
              onSendComment={() => { if (comment.trim()) { addComment(post.id, currentUser.id, comment.trim()); setComment(""); } }}
              onToggleLike={() => toggleLike(post.id)}
              onBookmark={() => spot && bookmarkSpot(spot.id, activeGroupId)}
              onAddPhotos={(urls) => addPostPhotos(post.id, urls)}
              getUser={getUser}
            />
          );
        })}
      </div>

      <LinkDropSheet
        open={linkSheetOpen}
        onClose={() => setLinkSheetOpen(false)}
        accent={activeGroup?.accent || "#ffb000"}
        onAdd={(spot) => { addSpot(spot); setLinkSheetOpen(false); }}
        groupId={activeGroupId}
      />
      <NewPostFlow open={postFlowOpen} onClose={() => setPostFlowOpen(false)} />
    </div>
  );
}

function FeedPostCard({
  post,
  user,
  group,
  spot,
  index,
  onIndexChange,
  commentOpen,
  onToggleComments,
  comment,
  onCommentChange,
  onSendComment,
  onToggleLike,
  onBookmark,
  onAddPhotos,
  getUser,
}: {
  post: FeedPost;
  user: { id: string; name: string; avatar: string };
  group: { id: string; name: string; accent: string };
  spot: PoolSpot | undefined;
  index: number;
  onIndexChange: (i: number) => void;
  commentOpen: boolean;
  onToggleComments: () => void;
  comment: string;
  onCommentChange: (v: string) => void;
  onSendComment: () => void;
  onToggleLike: () => void;
  onBookmark: () => void;
  onAddPhotos: (urls: string[]) => void;
  getUser: (id: string) => { name: string; avatar: string };
}) {
  const { currentUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handleAddPhotos = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < Math.min(fileList.length, 6); i++) {
        const file = fileList[i];
        const path = `${group.id}/${currentUser.id}/${post.id}-${Date.now()}-${i}.${file.name.split(".").pop() || "jpg"}`;
        const { error } = await supabase.storage.from("post-photos").upload(path, file, { contentType: file.type });
        if (error) continue;
        const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      onAddPhotos(urls);
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <article className="game-card overflow-hidden">
      <div className="relative aspect-[4/5] bg-black">
        <img src={post.photos[index]} alt={post.caption} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={user.avatar} size={36} ring="#ffffff" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white leading-tight truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-white/80">{group.name} · {formatDate(post.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={() => void downloadImage(post.photos[index], `orbit-${post.id}-${index + 1}.jpg`)}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shrink-0"
            aria-label="Save photo"
          >
            <Download size={14} className="text-[var(--snap-ink)]" />
          </button>
        </div>
        {spot && (
          <div className="absolute left-3 bottom-4">
            <span className="sticker"><MapPin size={12} />{spot.title}</span>
          </div>
        )}
        {post.photos.length > 1 && (
          <>
            <button onClick={() => onIndexChange((index - 1 + post.photos.length) % post.photos.length)} className="absolute top-20 bottom-16 left-0 w-1/3" aria-label="Previous photo" />
            <button onClick={() => onIndexChange((index + 1) % post.photos.length)} className="absolute top-20 bottom-16 right-0 w-1/3" aria-label="Next photo" />
            <div className="absolute top-3 right-14 px-2 py-1 rounded-full bg-black/45 text-[10px] font-extrabold text-white">{index + 1}/{post.photos.length}</div>
            <div className="absolute bottom-3 right-3 flex gap-1">
              {post.photos.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-[var(--snap)]" : "bg-white/60"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <button onClick={onToggleLike} className="w-10 h-10 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center active:scale-110 transition-transform">
            <Heart size={18} fill={post.liked ? "#ffb000" : "none"} color={post.liked ? "#0c0c0c" : "#606060"} />
          </button>
          <button onClick={onToggleComments} className="w-10 h-10 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center">
            <MessageCircle size={18} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhotos} className="w-10 h-10 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center">
            <ImagePlus size={18} className={uploadingPhotos ? "text-[var(--snap)] animate-pulse" : "text-[var(--text-muted)]"} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleAddPhotos(event.target.files)} />
          <button className="w-10 h-10 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center">
            <Send size={17} className="text-[var(--text-muted)]" />
          </button>
          {spot && (
            <button onClick={onBookmark} className="ml-auto w-10 h-10 rounded-full bg-[var(--snap)] flex items-center justify-center shadow-[0_3px_0_var(--snap-shade)] active:translate-y-0.5">
              <Bookmark size={17} className="text-[var(--snap-ink)]" />
            </button>
          )}
          {!spot && <MoreHorizontal size={18} className="ml-auto text-[var(--text-muted)]" />}
        </div>
        <p className="text-xs font-extrabold mt-3 text-[var(--text-primary)]">{post.likes} likes</p>
        <p className="text-sm mt-1.5 text-[var(--text-primary)]"><span className="font-extrabold mr-1">{user.name}</span>{post.caption}</p>
        <button onClick={onToggleComments} className="text-xs font-semibold text-[var(--text-muted)] mt-2">View all {post.comments.length} comments</button>

        {spot && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--surface-subtle)]">
            <MapPin size={14} color={group.accent} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)]">{spot.title}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{spot.address}</p>
            </div>
            <button onClick={onBookmark} className="text-[10px] font-semibold" style={{ color: group.accent }}>Add to orbit</button>
          </div>
        )}

        {commentOpen && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            {post.comments.map((c, i) => (
              <p key={i} className="text-xs text-[var(--text-tertiary)] mb-1"><span className="font-semibold text-[var(--text-primary)] mr-1">{getUser(c.userId).name}</span>{c.text}</p>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-[var(--surface-subtle)] rounded-xl px-3 py-2 text-xs outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border)]"
              />
              <button onClick={onSendComment}>
                <Send size={15} className="text-[var(--go)]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function formatDate(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return days <= 0 ? "today" : `${days}d`;
}
