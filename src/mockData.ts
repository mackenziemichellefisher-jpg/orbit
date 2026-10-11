import type { User, Group, PoolSpot, Meetup, FeedPost } from "./types";

export const currentUser: User = {
  id: "u1",
  name: "You",
  avatar:
    "https://images.pexels.com/photos/6102841/pexels-photo-6102841.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
  interests: ["Food", "Nightlife"],
};

export const users: User[] = [
  currentUser,
  {
    id: "u2",
    name: "James",
    avatar:
      "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
    interests: ["Nightlife", "Chill"],
  },
  {
    id: "u3",
    name: "Maya",
    avatar:
      "https://images.pexels.com/photos/16869444/pexels-photo-16869444.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
    interests: ["Outdoor", "Food"],
  },
  {
    id: "u4",
    name: "Dev",
    avatar:
      "https://images.pexels.com/photos/35490803/pexels-photo-35490803.jpeg?auto=compress&cs=tinysrgb&h=200&w=200",
    interests: ["Outdoor", "Chill"],
  },
];

export const groups: Group[] = [
  {
    id: "g1",
    name: "The Night Owls",
    accent: "#ffb000",
    icon: "Moon",
    inviteCode: "OWL-2026",
    memberIds: ["u1", "u2", "u3"],
  },
  {
    id: "g2",
    name: "Weekend Hikers & Bites",
    accent: "#0c0c0c",
    icon: "Mountain",
    inviteCode: "HIKE-SF",
    memberIds: ["u1", "u3", "u4"],
  },
];

export const poolSpots: PoolSpot[] = [
  {
    id: "s1",
    groupId: "g1",
    title: "La Taqueria — Best Birria in the Mission",
    thumbnail:
      "https://images.pexels.com/photos/36498696/pexels-photo-36498696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    sourceUrl: "https://tiktok.com/@foodie/birria-tacos",
    sourceType: "tiktok",
    address: "2889 Mission St, San Francisco, CA",
    lat: 37.7525,
    lng: -122.4182,
    categories: ["Food"],
    addedByUserId: "u2",
    upvotes: 12,
    notes: [
      { userId: "u2", text: "Must try the birria — dip in the consommé!" },
      { userId: "u3", text: "Line gets long after 6pm, go early" },
    ],
    openHours: "11am – 10pm",
    distanceMi: 1.2,
  },
  {
    id: "s2",
    groupId: "g1",
    title: "Electric Rooftop Bar — Sunset Views",
    thumbnail:
      "https://images.pexels.com/photos/14471525/pexels-photo-14471525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    sourceUrl: "https://instagram.com/reel/sunset-rooftop",
    sourceType: "instagram",
    address: "456 Battery St, San Francisco, CA",
    lat: 37.7946,
    lng: -122.3998,
    categories: ["Nightlife"],
    addedByUserId: "u3",
    upvotes: 8,
    notes: [{ userId: "u3", text: "Go at golden hour, the views are unreal" }],
    openHours: "5pm – 2am",
    distanceMi: 2.8,
  },
  {
    id: "s3",
    groupId: "g1",
    title: "Neon Arcade Lounge — Retro Game Night",
    thumbnail:
      "https://images.pexels.com/photos/13533825/pexels-photo-13533825.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    sourceUrl: "https://tiktok.com/@arcade/neon-lounge",
    sourceType: "tiktok",
    address: "789 Folsom St, San Francisco, CA",
    lat: 37.7785,
    lng: -122.4064,
    categories: ["Nightlife", "Chill"],
    addedByUserId: "u1",
    upvotes: 15,
    notes: [{ userId: "u1", text: "They have vintage TMNT arcade cabinets!" }],
    openHours: "6pm – 1am",
    distanceMi: 2.1,
  },
  {
    id: "s4",
    groupId: "g2",
    title: "Lands End Coastal Trail — Ocean Cliff Hike",
    thumbnail:
      "https://images.pexels.com/photos/27926022/pexels-photo-27926022.png?auto=compress&cs=tinysrgb&h=650&w=940",
    sourceUrl: "https://instagram.com/reel/lands-end-hike",
    sourceType: "instagram",
    address: "680 Point Lobos Ave, San Francisco, CA",
    lat: 37.7985,
    lng: -122.5135,
    categories: ["Outdoor"],
    addedByUserId: "u4",
    upvotes: 20,
    notes: [
      { userId: "u4", text: "Park at the Legion of Honor lot, it's free" },
      { userId: "u1", text: "Sutter Batter cafe is nearby after the hike" },
    ],
    openHours: "Sunrise – Sunset",
    distanceMi: 4.5,
  },
  {
    id: "s5",
    groupId: "g2",
    title: "Devil's Slide Trail — Cliffside Views & Tide Pools",
    thumbnail:
      "https://images.pexels.com/photos/3993981/pexels-photo-3993981.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    sourceUrl: "https://maps.google.com/devils-slide",
    sourceType: "maps",
    address: "5210 San Pedro Ave, Pacifica, CA",
    lat: 37.6049,
    lng: -122.5039,
    categories: ["Outdoor"],
    addedByUserId: "u3",
    upvotes: 11,
    notes: [{ userId: "u3", text: "Bring layers — it gets windy on the cliffs" }],
    openHours: "8am – 7pm",
    distanceMi: 12.0,
  },
  {
    id: "s6",
    groupId: "g2",
    title: "Sutter Batter — Korean Fried Chicken & Beer",
    thumbnail:
      "https://images.pexels.com/photos/4916548/pexels-photo-4916548.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    sourceUrl: "https://tiktok.com/@eats/korean-fried-chicken",
    sourceType: "tiktok",
    address: "322 Clement St, San Francisco, CA",
    lat: 37.7827,
    lng: -122.4637,
    categories: ["Food", "Chill"],
    addedByUserId: "u1",
    upvotes: 9,
    notes: [{ userId: "u1", text: "The soy garlic wings are crack" }],
    openHours: "12pm – 11pm",
    distanceMi: 3.3,
  },
];

export const meetups: Meetup[] = [
  {
    id: "m1",
    groupId: "g1",
    spotId: "s1",
    date: "2026-08-15T19:30:00Z",
  },
  {
    id: "m2",
    groupId: "g2",
    spotId: "s4",
    date: "2026-08-22T09:00:00Z",
  },
  {
    id: "m3",
    groupId: "g1",
    spotId: "s3",
    date: "2026-09-01T20:00:00Z",
  },
];

export const feedPosts: FeedPost[] = [
  {
    id: "p1",
    groupId: "g1",
    spotId: "s1",
    userId: "u2",
    photos: [
      "https://images.pexels.com/photos/36498696/pexels-photo-36498696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      "https://images.pexels.com/photos/36498704/pexels-photo-36498704.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      "https://images.pexels.com/photos/36498699/pexels-photo-36498699.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    ],
    caption: "Birria run with the crew. The dip changed me.",
    likes: 24,
    liked: false,
    comments: [
      { userId: "u3", text: "Omg the consommé looks insane" },
      { userId: "u1", text: "We need to go back asap" },
    ],
    createdAt: "2026-08-15T22:00:00Z",
  },
  {
    id: "p2",
    groupId: "g2",
    spotId: "s4",
    userId: "u4",
    photos: [
      "https://images.pexels.com/photos/27926022/pexels-photo-27926022.png?auto=compress&cs=tinysrgb&h=650&w=940",
      "https://images.pexels.com/photos/17809080/pexels-photo-17809080.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    ],
    caption: "Lands End sunrise hike. Worth every 6am alarm.",
    likes: 31,
    liked: true,
    comments: [
      { userId: "u1", text: "Trail sign photo is a vibe" },
    ],
    createdAt: "2026-08-22T11:00:00Z",
  },
  {
    id: "p3",
    groupId: "g1",
    spotId: "s3",
    userId: "u1",
    photos: [
      "https://images.pexels.com/photos/13533825/pexels-photo-13533825.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      "https://images.pexels.com/photos/18848584/pexels-photo-18848584.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
      "https://images.pexels.com/photos/35736659/pexels-photo-35736659.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    ],
    caption: "Retro arcade night. James beat me at TMNT and I'm not over it.",
    likes: 18,
    liked: false,
    comments: [
      { userId: "u2", text: "Rematch next week, you're going down again" },
      { userId: "u3", text: "The neon lighting here is everything" },
    ],
    createdAt: "2026-09-01T23:30:00Z",
  },
];

export const categoryConfig: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  Food: { label: "Food", icon: "UtensilsCrossed", color: "#ffb000" },
  Nightlife: { label: "Nightlife", icon: "Wine", color: "#0c0c0c" },
  Outdoor: { label: "Outdoor", icon: "Trees", color: "#c79000" },
  Chill: { label: "Chill", icon: "Coffee", color: "#606060" },
};
