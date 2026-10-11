import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Group, PoolSpot, FeedPost, Meetup, User } from "./types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth";

interface AppState {
  groups: Group[];
  spots: PoolSpot[];
  posts: FeedPost[];
  meetups: Meetup[];
  users: User[];
  currentUser: User;
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  addSpot: (spot: PoolSpot) => void;
  upvoteSpot: (spotId: string) => void;
  addNote: (spotId: string, userId: string, text: string) => void;
  addPost: (post: FeedPost) => void;
  addPostPhotos: (postId: string, urls: string[]) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, userId: string, text: string) => void;
  lockInMeetup: (groupId: string, spotId: string) => void;
  bookmarkSpot: (spotId: string, targetGroupId: string) => void;
}

interface DbProfile { id: string; name: string; avatar: string | null; bio: string | null; age: number | null; phone: string | null; interests: string[] | null }
interface DbMember { user_id: string }
interface DbGroup { id: string; name: string; accent: string; icon: string; invite_code: string; owner_id: string; is_personal: boolean; group_members: DbMember[] }
interface DbNote { id: string; user_id: string; text: string }
interface DbSpot { id: string; group_id: string; title: string; thumbnail: string | null; source_url: string | null; source_type: string; caption: string | null; address: string | null; lat: number | null; lng: number | null; categories: string[]; added_by_user_id: string; upvotes: number; open_hours: string | null; distance_mi: number | null; spot_notes: DbNote[] }
interface DbComment { id: string; user_id: string; text: string }
interface DbLike { user_id: string }
interface DbPostPhoto { url: string }
interface DbPost { id: string; group_id: string; spot_id: string | null; user_id: string; photos: string[]; caption: string; created_at: string; post_likes: DbLike[]; post_comments: DbComment[]; post_photos: DbPostPhoto[] }
interface DbMeetup { id: string; group_id: string; spot_id: string; date: string }

const fallbackAvatar = "https://images.pexels.com/photos/6102841/pexels-photo-6102841.jpeg?auto=compress&cs=tinysrgb&h=200&w=200";

function toUser(profile: DbProfile): User { return { id: profile.id, name: profile.name || "Orbit friend", avatar: profile.avatar || fallbackAvatar, bio: profile.bio || "", age: profile.age ?? undefined, phone: profile.phone || undefined, interests: (profile.interests as User["interests"]) || [] }; }
function toGroup(group: DbGroup): Group { return { id: group.id, name: group.name, accent: group.accent, icon: group.icon, inviteCode: group.invite_code, memberIds: (group.group_members || []).map((member) => member.user_id), isPersonal: group.is_personal, ownerId: group.owner_id }; }
function toSpot(spot: DbSpot): PoolSpot { return { id: spot.id, groupId: spot.group_id, title: spot.title, thumbnail: spot.thumbnail || fallbackAvatar, sourceUrl: spot.source_url || "", sourceType: spot.source_type as PoolSpot["sourceType"], caption: spot.caption || undefined, address: spot.address || "", lat: spot.lat || 0, lng: spot.lng || 0, categories: spot.categories as PoolSpot["categories"], addedByUserId: spot.added_by_user_id, upvotes: spot.upvotes, notes: (spot.spot_notes || []).map((note) => ({ userId: note.user_id, text: note.text })), openHours: spot.open_hours || undefined, distanceMi: spot.distance_mi || undefined }; }
function toPost(post: DbPost, userId: string): FeedPost { return { id: post.id, groupId: post.group_id, spotId: post.spot_id || "", userId: post.user_id, photos: [...post.photos, ...(post.post_photos || []).map((p) => p.url)], caption: post.caption, likes: post.post_likes?.length || 0, liked: Boolean(post.post_likes?.some((like) => like.user_id === userId)), comments: (post.post_comments || []).map((comment) => ({ userId: comment.user_id, text: comment.text })), createdAt: post.created_at }; }

function logIfError<T extends { error: { message: string } | null }>(label: string) {
  return (result: T) => {
    if (result.error) console.error(`[pool] ${label} failed:`, result.error.message);
  };
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [spots, setSpots] = useState<PoolSpot[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({ id: user?.id || "", name: "You", avatar: fallbackAvatar, interests: [] });
  const [activeGroupId, setActiveGroupId] = useState("");

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const [{ data: profile }, { data: profileRows }, { data: groupRows }, { data: spotRows }, { data: postRows }, { data: meetupRows }] = await Promise.all([
        supabase.from("profiles").select("id,name,avatar,bio,age,phone,interests").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("id,name,avatar,bio,age,phone,interests"),
        supabase.from("groups").select("id,name,accent,icon,invite_code,owner_id,is_personal,group_members(user_id)").order("created_at"),
        supabase.from("spots").select("id,group_id,title,thumbnail,source_url,source_type,caption,address,lat,lng,categories,added_by_user_id,upvotes,open_hours,distance_mi,spot_notes(id,user_id,text)").order("created_at", { ascending: false }),
        supabase.from("posts").select("id,group_id,spot_id,user_id,photos,caption,created_at,post_likes(user_id),post_comments(id,user_id,text),post_photos(url)").order("created_at", { ascending: false }),
        supabase.from("meetups").select("id,group_id,spot_id,date").order("date", { ascending: false }),
      ]);
      if (!mounted) return;
      let mappedGroups = ((groupRows || []) as unknown as DbGroup[]).map(toGroup);
      if (!mappedGroups.some((group) => group.isPersonal)) {
        const { data: personal } = await supabase.from("groups").insert({ name: "My Orbit", accent: "#ffb000", icon: "Bookmark", owner_id: user.id, is_personal: true }).select("id,name,accent,icon,invite_code,owner_id,is_personal").maybeSingle();
        if (personal) mappedGroups = [{ ...toGroup({ ...(personal as unknown as DbGroup), group_members: [] }), isPersonal: true, memberIds: [user.id] }, ...mappedGroups];
      }
      setCurrentUser(profile ? toUser(profile as DbProfile) : { id: user.id, name: user.email?.split("@")[0] || "You", avatar: fallbackAvatar, interests: [] });
      setUsers(((profileRows || []) as unknown as DbProfile[]).map(toUser));
      setGroups(mappedGroups);
      setSpots(((spotRows || []) as unknown as DbSpot[]).map(toSpot));
      setPosts(((postRows || []) as unknown as DbPost[]).map((post) => toPost(post, user.id)));
      setMeetups(((meetupRows || []) as unknown as DbMeetup[]).map((meetup) => ({ id: meetup.id, groupId: meetup.group_id, spotId: meetup.spot_id, date: meetup.date })));
      setActiveGroupId((current) => current || mappedGroups[0]?.id || "");
    };
    void load();
    return () => { mounted = false; };
  }, [user]);

  const addSpot = (spot: PoolSpot) => {
    setSpots((current) => [spot, ...current]);
    supabase.from("spots").insert({ group_id: spot.groupId, title: spot.title, thumbnail: spot.thumbnail, source_url: spot.sourceUrl, source_type: spot.sourceType, caption: spot.caption, address: spot.address, lat: spot.lat, lng: spot.lng, categories: spot.categories, upvotes: 0, open_hours: spot.openHours, distance_mi: spot.distanceMi }).then(logIfError("addSpot"));
  };
  const upvoteSpot = (spotId: string) => { const nextUpvotes = (spots.find((spot) => spot.id === spotId)?.upvotes || 0) + 1; setSpots((current) => current.map((spot) => spot.id === spotId ? { ...spot, upvotes: nextUpvotes } : spot)); supabase.from("spots").update({ upvotes: nextUpvotes }).eq("id", spotId).then(logIfError("upvoteSpot")); };
  const addNote = (spotId: string, userId: string, text: string) => { setSpots((current) => current.map((spot) => spot.id === spotId ? { ...spot, notes: [...spot.notes, { userId, text }] } : spot)); supabase.from("spot_notes").insert({ spot_id: spotId, text }).then(logIfError("addNote")); };
  const addPost = (post: FeedPost) => { setPosts((current) => [post, ...current]); supabase.from("posts").insert({ group_id: post.groupId, spot_id: post.spotId || null, photos: post.photos, caption: post.caption }).then(logIfError("addPost")); };
  const addPostPhotos = (postId: string, urls: string[]) => {
    if (!urls.length) return;
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, photos: [...post.photos, ...urls] } : post));
    supabase.from("post_photos").insert(urls.map((url) => ({ post_id: postId, url }))).then(logIfError("addPostPhotos"));
  };
  const toggleLike = (postId: string) => { const post = posts.find((item) => item.id === postId); if (!post || !user) return; setPosts((current) => current.map((item) => item.id === postId ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item)); if (post.liked) supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id).then(logIfError("unlikePost")); else supabase.from("post_likes").insert({ post_id: postId }).then(logIfError("likePost")); };
  const addComment = (postId: string, userId: string, text: string) => { setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...post.comments, { userId, text }] } : post)); supabase.from("post_comments").insert({ post_id: postId, text }).then(logIfError("addComment")); };
  const lockInMeetup = (groupId: string, spotId: string) => { const date = new Date().toISOString(); setMeetups((current) => [...current, { id: `local-${Date.now()}`, groupId, spotId, date }]); supabase.from("meetups").insert({ group_id: groupId, spot_id: spotId, date }).then(logIfError("lockInMeetup")); };
  const bookmarkSpot = (spotId: string, targetGroupId: string) => { const original = spots.find((spot) => spot.id === spotId); if (!original) return; const copy = { ...original, id: `local-${Date.now()}`, groupId: targetGroupId, upvotes: 0, notes: [] }; setSpots((current) => [copy, ...current]); supabase.from("spots").insert({ group_id: targetGroupId, title: original.title, thumbnail: original.thumbnail, source_url: original.sourceUrl, source_type: original.sourceType, caption: original.caption, address: original.address, lat: original.lat, lng: original.lng, categories: original.categories }).then(logIfError("bookmarkSpot")); };

  return <Ctx.Provider value={{ groups, spots, posts, meetups, users, currentUser, activeGroupId, setActiveGroupId, addSpot, upvoteSpot, addNote, addPost, addPostPhotos, toggleLike, addComment, lockInMeetup, bookmarkSpot }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
