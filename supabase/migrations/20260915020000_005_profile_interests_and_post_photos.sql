/*
# Profile interests + collaborative post photos

## Overview
- Adds age, phone, and interests to profiles (collected at signup, used for
  feed matching).
- Adds a post_photos table so any group member can contribute photos to an
  existing feed post (post-hangout group photo dump), not just the
  original poster.
- Adds a storage bucket for post photo uploads.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- POST PHOTOS (collaborative additions to an existing post)
-- ============================================================
CREATE TABLE IF NOT EXISTS post_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_photos_select_member" ON post_photos;
CREATE POLICY "post_photos_select_member"
  ON post_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN groups g ON g.id = p.group_id
      WHERE p.id = post_photos.post_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "post_photos_insert_member" ON post_photos;
CREATE POLICY "post_photos_insert_member"
  ON post_photos FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      JOIN groups g ON g.id = p.group_id
      WHERE p.id = post_photos.post_id
      AND (
        (g.is_personal AND g.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "post_photos_delete_own" ON post_photos;
CREATE POLICY "post_photos_delete_own"
  ON post_photos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_post_photos_post_id ON post_photos(post_id);

-- ============================================================
-- STORAGE BUCKET FOR POST PHOTOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-photos', 'post-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post_photo_upload_own" ON storage.objects;
CREATE POLICY "post_photo_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-photos' AND owner = auth.uid());

DROP POLICY IF EXISTS "post_photo_read_all" ON storage.objects;
CREATE POLICY "post_photo_read_all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-photos');

DROP POLICY IF EXISTS "post_photo_delete_own" ON storage.objects;
CREATE POLICY "post_photo_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-photos' AND owner = auth.uid());
