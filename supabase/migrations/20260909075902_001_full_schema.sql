/*
# Full Application Schema

## Overview
Creates the complete database schema for the pool-based social spot-sharing app.
Replaces all mock data with real, persistent, multi-user data backed by Supabase.

## New Tables
1. `profiles` — user display info (name, avatar, bio) linked to auth.users
2. `groups` — pools (shared or personal) with name, accent color, icon, invite code, owner
3. `group_members` — join table linking users to groups with role (owner/member)
4. `spots` — pool entries with title, thumbnail, address, coordinates, categories, source
5. `spot_notes` — comments on spots, tied to a spot and a user
6. `posts` — feed recaps with photos and caption, tied to a group, spot, and user
7. `post_likes` — likes on feed posts
8. `post_comments` — comments on feed posts
9. `meetups` — locked-in plans tied to a group and spot

## Security
- RLS enabled on every table
- Profiles: users can read all profiles, update only their own
- Groups: members can read their groups; owners can update/delete their groups
- Group members: members can read membership of their groups; only group owners can add/remove members; users can insert their own membership (join)
- Spots: members of a group can read/insert/update spots in that group
- Spot notes: members can read/insert notes for spots in their groups
- Posts: members can read/insert posts in their groups
- Post likes: members can like/unlike posts in their groups
- Post comments: members can comment on posts in their groups
- Meetups: members can read/insert meetups in their groups
- Personal pools (is_personal = true) are visible only to the owner

## Functions
- `join_group_by_code(p_code text)` — SECURITY DEFINER function that adds the current user as a member of the group matching the invite code. Returns the group id. Prevents duplicate joins.

## Storage
- Creates a public storage bucket `avatars` for user profile photos
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  avatar text,
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- GROUPS (table first, policies after group_members exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  accent text NOT NULL DEFAULT '#f97316',
  icon text NOT NULL DEFAULT 'Moon',
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  is_personal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_insert_own" ON groups;
CREATE POLICY "groups_insert_own"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "groups_update_owner" ON groups;
CREATE POLICY "groups_update_owner"
  ON groups FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "groups_delete_owner" ON groups;
CREATE POLICY "groups_delete_owner"
  ON groups FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_select_member" ON group_members;
CREATE POLICY "gm_select_member"
  ON group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "gm_insert_own" ON group_members;
CREATE POLICY "gm_insert_own"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "gm_delete_owner_or_self" ON group_members;
CREATE POLICY "gm_delete_owner_or_self"
  ON group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  );

-- Now add the groups SELECT policy (group_members table exists)
DROP POLICY IF EXISTS "groups_select_member" ON groups;
CREATE POLICY "groups_select_member"
  ON groups FOR SELECT TO authenticated
  USING (
    is_personal AND owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );

-- ============================================================
-- SPOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  thumbnail text,
  source_url text,
  source_type text NOT NULL DEFAULT 'tiktok',
  caption text,
  address text,
  lat double precision,
  lng double precision,
  categories text[] NOT NULL DEFAULT '{}',
  added_by_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  upvotes integer NOT NULL DEFAULT 0,
  open_hours text,
  distance_mi double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spots_select_member" ON spots;
CREATE POLICY "spots_select_member"
  ON spots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = spots.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "spots_insert_member" ON spots;
CREATE POLICY "spots_insert_member"
  ON spots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = spots.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
    AND added_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "spots_update_member" ON spots;
CREATE POLICY "spots_update_member"
  ON spots FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = spots.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = spots.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "spots_delete_member" ON spots;
CREATE POLICY "spots_delete_member"
  ON spots FOR DELETE TO authenticated
  USING (
    added_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups g WHERE g.id = spots.group_id AND g.owner_id = auth.uid()
    )
  );

-- ============================================================
-- SPOT NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS spot_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE spot_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_member" ON spot_notes;
CREATE POLICY "notes_select_member"
  ON spot_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spots s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = spot_notes.spot_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "notes_insert_member" ON spot_notes;
CREATE POLICY "notes_insert_member"
  ON spot_notes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM spots s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = spot_notes.spot_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "notes_delete_own" ON spot_notes;
CREATE POLICY "notes_delete_own"
  ON spot_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  spot_id uuid REFERENCES spots(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  photos text[] NOT NULL DEFAULT '{}',
  caption text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_member" ON posts;
CREATE POLICY "posts_select_member"
  ON posts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = posts.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "posts_insert_member" ON posts;
CREATE POLICY "posts_insert_member"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = posts.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own"
  ON posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_member" ON post_likes;
CREATE POLICY "likes_select_member"
  ON post_likes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN groups g ON g.id = p.group_id
      WHERE p.id = post_likes.post_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "likes_insert_member" ON post_likes;
CREATE POLICY "likes_insert_member"
  ON post_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      JOIN groups g ON g.id = p.group_id
      WHERE p.id = post_likes.post_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "likes_delete_own" ON post_likes;
CREATE POLICY "likes_delete_own"
  ON post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- POST COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_member" ON post_comments;
CREATE POLICY "comments_select_member"
  ON post_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN groups g ON g.id = p.group_id
      WHERE p.id = post_comments.post_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "comments_insert_member" ON post_comments;
CREATE POLICY "comments_insert_member"
  ON post_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      JOIN groups g ON g.id = p.group_id
      WHERE p.id = post_comments.post_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "comments_delete_own" ON post_comments;
CREATE POLICY "comments_delete_own"
  ON post_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- MEETUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  spot_id uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meetups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetups_select_member" ON meetups;
CREATE POLICY "meetups_select_member"
  ON meetups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = meetups.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "meetups_insert_member" ON meetups;
CREATE POLICY "meetups_insert_member"
  ON meetups FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = meetups.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "meetups_delete_member" ON meetups;
CREATE POLICY "meetups_delete_member"
  ON meetups FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = meetups.group_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

-- ============================================================
-- JOIN GROUP BY CODE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION join_group_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_group_id FROM groups WHERE invite_code = upper(p_code) AND is_personal = false;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT id INTO v_existing FROM group_members WHERE group_id = v_group_id AND user_id = auth.uid();
  IF v_existing IS NOT NULL THEN
    RETURN v_group_id;
  END IF;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, auth.uid(), 'member');

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION join_group_by_code(text) TO authenticated;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_spots_group_id ON spots(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_meetups_group_id ON meetups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_spot_notes_spot_id ON spot_notes(spot_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- ============================================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_upload_own" ON storage.objects;
CREATE POLICY "avatar_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "avatar_read_all" ON storage.objects;
CREATE POLICY "avatar_read_all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());
