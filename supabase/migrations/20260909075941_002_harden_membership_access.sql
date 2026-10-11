/*
# Harden membership and callable access

## Overview
Tightens the first schema migration so group membership cannot be granted by a forged browser request and member lists can be read safely.

## Changes
- Restricts direct group_members inserts to group owners adding themselves during group creation.
- Routes invite-code joining through the protected join_group_by_code function.
- Adds a protected membership-check helper for RLS predicates.
- Allows authenticated users to read members of groups they belong to without recursive policies.
- Revokes anonymous execution from the join function.

## Security
- Anonymous users cannot call membership functions.
- A user cannot directly insert themselves into an arbitrary group without a valid invite-code function call.
- Membership checks use the authenticated session identity, never a caller-supplied user id.
*/

CREATE OR REPLACE FUNCTION user_is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION user_is_group_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION user_is_group_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION user_is_group_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "gm_select_member" ON group_members;
CREATE POLICY "gm_select_member"
  ON group_members FOR SELECT TO authenticated
  USING (user_is_group_member(group_id));

DROP POLICY IF EXISTS "gm_insert_own" ON group_members;
CREATE POLICY "gm_insert_own"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
    )
  );

REVOKE EXECUTE ON FUNCTION join_group_by_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION join_group_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION join_group_by_code(text) TO authenticated;
