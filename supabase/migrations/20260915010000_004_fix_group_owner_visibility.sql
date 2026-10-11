/*
# Fix group owner visibility

## Overview
Owners must be able to see a group they just created, even before a
group_members row exists for them. Without this, `INSERT ... RETURNING`
on groups fails row-level security for any newly created non-personal
pool, because Postgres enforces the SELECT policy on the returned row
(not just the INSERT policy's WITH CHECK). The old policy only granted
this to personal pools (is_personal = true); plain ownership should
grant it too, regardless of is_personal.
*/

DROP POLICY IF EXISTS "groups_select_member" ON groups;
CREATE POLICY "groups_select_member"
  ON groups FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );
