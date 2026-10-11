export type Category = "Food" | "Nightlife" | "Outdoor" | "Chill";

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  age?: number;
  phone?: string;
  interests: Category[];
}

export interface Group {
  id: string;
  name: string;
  accent: string;
  icon: string;
  inviteCode: string;
  memberIds: string[];
  isPersonal?: boolean;
  ownerId?: string;
}

export interface PoolSpot {
  id: string;
  groupId: string;
  title: string;
  thumbnail: string;
  sourceUrl: string;
  sourceType: "tiktok" | "instagram" | "maps";
  caption?: string;
  address: string;
  lat: number;
  lng: number;
  categories: Category[];
  addedByUserId: string;
  upvotes: number;
  notes: { userId: string; text: string }[];
  openHours?: string;
  distanceMi?: number;
}

export interface Meetup {
  id: string;
  groupId: string;
  spotId: string;
  date: string;
}

export interface FeedPost {
  id: string;
  groupId: string;
  spotId: string;
  userId: string;
  photos: string[];
  caption: string;
  likes: number;
  liked: boolean;
  comments: { userId: string; text: string }[];
  createdAt: string;
}

export type TabKey = "pools" | "map" | "feed" | "profile";
