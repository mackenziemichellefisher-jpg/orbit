/*
# Seed demo data for j4.ambroise@gmail.com

## Overview
Populates two demo pools, six spots, three meetups, and three feed posts,
all owned by the auth user with email j4.ambroise@gmail.com. Sign up with
that email in the app first, THEN run this migration (or re-run it — every
insert is existence-checked, so running it twice is safe and won't
duplicate rows).

## Run it
- Supabase CLI: `supabase db push`
- Or paste this file's contents into the SQL editor in your Supabase
  project dashboard (Project > SQL Editor) and run it there.
*/

DO $$
DECLARE
  v_user_id uuid;
  v_g1 uuid;
  v_g2 uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_s3 uuid;
  v_s4 uuid;
  v_s5 uuid;
  v_s6 uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'j4.ambroise@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found for j4.ambroise@gmail.com — sign up in the app first, then re-run this migration.';
    RETURN;
  END IF;

  -- Ensure a profile row exists so the app doesn't fall back to onboarding
  INSERT INTO profiles (id, name, avatar, bio)
  VALUES (v_user_id, 'James', 'https://images.pexels.com/photos/6102841/pexels-photo-6102841.jpeg?auto=compress&cs=tinysrgb&h=200&w=200', 'always down for the next adventure')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- GROUP 1: The Night Owls (Electric Violet)
  -- ============================================================
  SELECT id INTO v_g1 FROM groups WHERE owner_id = v_user_id AND name = 'The Night Owls' AND is_personal = false LIMIT 1;
  IF v_g1 IS NULL THEN
    INSERT INTO groups (name, accent, icon, owner_id, is_personal)
    VALUES ('The Night Owls', '#8b5cf6', 'Moon', v_user_id, false)
    RETURNING id INTO v_g1;
  END IF;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_g1, v_user_id, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- ============================================================
  -- GROUP 2: Weekend Hikers & Bites (Emerald)
  -- ============================================================
  SELECT id INTO v_g2 FROM groups WHERE owner_id = v_user_id AND name = 'Weekend Hikers & Bites' AND is_personal = false LIMIT 1;
  IF v_g2 IS NULL THEN
    INSERT INTO groups (name, accent, icon, owner_id, is_personal)
    VALUES ('Weekend Hikers & Bites', '#10b981', 'Mountain', v_user_id, false)
    RETURNING id INTO v_g2;
  END IF;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_g2, v_user_id, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- ============================================================
  -- SPOTS — Night Owls
  -- ============================================================
  SELECT id INTO v_s1 FROM spots WHERE group_id = v_g1 AND title = 'La Taqueria — Best Birria in the Mission' LIMIT 1;
  IF v_s1 IS NULL THEN
    INSERT INTO spots (group_id, title, thumbnail, source_url, source_type, address, lat, lng, categories, added_by_user_id, upvotes, open_hours, distance_mi)
    VALUES (v_g1, 'La Taqueria — Best Birria in the Mission', 'https://images.pexels.com/photos/36498696/pexels-photo-36498696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://tiktok.com/@foodie/birria-tacos', 'tiktok', '2889 Mission St, San Francisco, CA', 37.7525, -122.4182, ARRAY['Food'], v_user_id, 12, '11am – 10pm', 1.2)
    RETURNING id INTO v_s1;
    INSERT INTO spot_notes (spot_id, user_id, text) VALUES (v_s1, v_user_id, 'Must try the birria — dip in the consommé!');
  END IF;

  SELECT id INTO v_s2 FROM spots WHERE group_id = v_g1 AND title = 'Electric Rooftop Bar — Sunset Views' LIMIT 1;
  IF v_s2 IS NULL THEN
    INSERT INTO spots (group_id, title, thumbnail, source_url, source_type, address, lat, lng, categories, added_by_user_id, upvotes, open_hours, distance_mi)
    VALUES (v_g1, 'Electric Rooftop Bar — Sunset Views', 'https://images.pexels.com/photos/14471525/pexels-photo-14471525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://instagram.com/reel/sunset-rooftop', 'instagram', '456 Battery St, San Francisco, CA', 37.7946, -122.3998, ARRAY['Nightlife'], v_user_id, 8, '5pm – 2am', 2.8)
    RETURNING id INTO v_s2;
    INSERT INTO spot_notes (spot_id, user_id, text) VALUES (v_s2, v_user_id, 'Go at golden hour, the views are unreal');
  END IF;

  SELECT id INTO v_s3 FROM spots WHERE group_id = v_g1 AND title = 'Neon Arcade Lounge — Retro Game Night' LIMIT 1;
  IF v_s3 IS NULL THEN
    INSERT INTO spots (group_id, title, thumbnail, source_url, source_type, address, lat, lng, categories, added_by_user_id, upvotes, open_hours, distance_mi)
    VALUES (v_g1, 'Neon Arcade Lounge — Retro Game Night', 'https://images.pexels.com/photos/13533825/pexels-photo-13533825.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://tiktok.com/@arcade/neon-lounge', 'tiktok', '789 Folsom St, San Francisco, CA', 37.7785, -122.4064, ARRAY['Nightlife', 'Chill'], v_user_id, 15, '6pm – 1am', 2.1)
    RETURNING id INTO v_s3;
    INSERT INTO spot_notes (spot_id, user_id, text) VALUES (v_s3, v_user_id, 'They have vintage TMNT arcade cabinets!');
  END IF;

  -- ============================================================
  -- SPOTS — Weekend Hikers & Bites
  -- ============================================================
  SELECT id INTO v_s4 FROM spots WHERE group_id = v_g2 AND title = 'Lands End Coastal Trail — Ocean Cliff Hike' LIMIT 1;
  IF v_s4 IS NULL THEN
    INSERT INTO spots (group_id, title, thumbnail, source_url, source_type, address, lat, lng, categories, added_by_user_id, upvotes, open_hours, distance_mi)
    VALUES (v_g2, 'Lands End Coastal Trail — Ocean Cliff Hike', 'https://images.pexels.com/photos/27926022/pexels-photo-27926022.png?auto=compress&cs=tinysrgb&h=650&w=940', 'https://instagram.com/reel/lands-end-hike', 'instagram', '680 Point Lobos Ave, San Francisco, CA', 37.7985, -122.5135, ARRAY['Outdoor'], v_user_id, 20, 'Sunrise – Sunset', 4.5)
    RETURNING id INTO v_s4;
    INSERT INTO spot_notes (spot_id, user_id, text) VALUES (v_s4, v_user_id, 'Park at the Legion of Honor lot, it''s free');
  END IF;

  SELECT id INTO v_s5 FROM spots WHERE group_id = v_g2 AND title = 'Devil''s Slide Trail — Cliffside Views & Tide Pools' LIMIT 1;
  IF v_s5 IS NULL THEN
    INSERT INTO spots (group_id, title, thumbnail, source_url, source_type, address, lat, lng, categories, added_by_user_id, upvotes, open_hours, distance_mi)
    VALUES (v_g2, 'Devil''s Slide Trail — Cliffside Views & Tide Pools', 'https://images.pexels.com/photos/3993981/pexels-photo-3993981.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://maps.google.com/devils-slide', 'maps', '5210 San Pedro Ave, Pacifica, CA', 37.6049, -122.5039, ARRAY['Outdoor'], v_user_id, 11, '8am – 7pm', 12.0)
    RETURNING id INTO v_s5;
    INSERT INTO spot_notes (spot_id, user_id, text) VALUES (v_s5, v_user_id, 'Bring layers — it gets windy on the cliffs');
  END IF;

  SELECT id INTO v_s6 FROM spots WHERE group_id = v_g2 AND title = 'Sutter Batter — Korean Fried Chicken & Beer' LIMIT 1;
  IF v_s6 IS NULL THEN
    INSERT INTO spots (group_id, title, thumbnail, source_url, source_type, address, lat, lng, categories, added_by_user_id, upvotes, open_hours, distance_mi)
    VALUES (v_g2, 'Sutter Batter — Korean Fried Chicken & Beer', 'https://images.pexels.com/photos/4916548/pexels-photo-4916548.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://tiktok.com/@eats/korean-fried-chicken', 'tiktok', '322 Clement St, San Francisco, CA', 37.7827, -122.4637, ARRAY['Food', 'Chill'], v_user_id, 9, '12pm – 11pm', 3.3)
    RETURNING id INTO v_s6;
    INSERT INTO spot_notes (spot_id, user_id, text) VALUES (v_s6, v_user_id, 'The soy garlic wings are crack');
  END IF;

  -- ============================================================
  -- MEETUPS (locked-in plans)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM meetups WHERE group_id = v_g1 AND spot_id = v_s1) THEN
    INSERT INTO meetups (group_id, spot_id, date) VALUES (v_g1, v_s1, '2026-08-15T19:30:00Z');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM meetups WHERE group_id = v_g2 AND spot_id = v_s4) THEN
    INSERT INTO meetups (group_id, spot_id, date) VALUES (v_g2, v_s4, '2026-08-22T09:00:00Z');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM meetups WHERE group_id = v_g1 AND spot_id = v_s3) THEN
    INSERT INTO meetups (group_id, spot_id, date) VALUES (v_g1, v_s3, '2026-09-01T20:00:00Z');
  END IF;

  -- ============================================================
  -- FEED POSTS
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM posts WHERE group_id = v_g1 AND spot_id = v_s1 AND caption = 'Birria run with the crew. The dip changed me.') THEN
    INSERT INTO posts (group_id, spot_id, user_id, photos, caption, created_at)
    VALUES (
      v_g1, v_s1, v_user_id,
      ARRAY[
        'https://images.pexels.com/photos/36498696/pexels-photo-36498696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
        'https://images.pexels.com/photos/36498704/pexels-photo-36498704.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
        'https://images.pexels.com/photos/36498699/pexels-photo-36498699.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
      ],
      'Birria run with the crew. The dip changed me.',
      '2026-08-15T22:00:00Z'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM posts WHERE group_id = v_g2 AND spot_id = v_s4 AND caption = 'Lands End sunrise hike. Worth every 6am alarm.') THEN
    INSERT INTO posts (group_id, spot_id, user_id, photos, caption, created_at)
    VALUES (
      v_g2, v_s4, v_user_id,
      ARRAY[
        'https://images.pexels.com/photos/27926022/pexels-photo-27926022.png?auto=compress&cs=tinysrgb&h=650&w=940',
        'https://images.pexels.com/photos/17809080/pexels-photo-17809080.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
      ],
      'Lands End sunrise hike. Worth every 6am alarm.',
      '2026-08-22T11:00:00Z'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM posts WHERE group_id = v_g1 AND spot_id = v_s3 AND caption LIKE 'Retro arcade night.%') THEN
    INSERT INTO posts (group_id, spot_id, user_id, photos, caption, created_at)
    VALUES (
      v_g1, v_s3, v_user_id,
      ARRAY[
        'https://images.pexels.com/photos/13533825/pexels-photo-13533825.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
        'https://images.pexels.com/photos/18848584/pexels-photo-18848584.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
        'https://images.pexels.com/photos/35736659/pexels-photo-35736659.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
      ],
      'Retro arcade night. Beat my own high score and I''m not over it.',
      '2026-09-01T23:30:00Z'
    );
  END IF;
END $$;
