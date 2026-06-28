-- Fix missing GRANT EXECUTE on get_friends after DROP/CREATE in 20260524000001
CREATE OR REPLACE FUNCTION public.get_friends(user_id uuid)
RETURNS TABLE(friend_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END,
    p.display_name,
    p.avatar_url
  FROM public.friend_requests fr
  JOIN public.profiles p
    ON p.user_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = get_friends.user_id OR fr.receiver_id = get_friends.user_id)
    AND fr.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests b
      WHERE b.status = 'blocked'
        AND ((b.sender_id = get_friends.user_id AND b.receiver_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END)
          OR (b.sender_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END AND b.receiver_id = get_friends.user_id))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated;
