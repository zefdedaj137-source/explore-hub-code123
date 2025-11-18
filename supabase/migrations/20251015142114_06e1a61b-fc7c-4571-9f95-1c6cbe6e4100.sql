-- Fix search_path security issue for check_and_create_match function
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is a like (not a pass)
  IF NEW.action = 'like' THEN
    -- Check if the other user has also liked this user
    IF EXISTS (
      SELECT 1 FROM public.likes
      WHERE liker_id = NEW.liked_id
      AND liked_id = NEW.liker_id
      AND action = 'like'
    ) THEN
      -- Create a match with user IDs in ascending order
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.liker_id, NEW.liked_id),
        GREATEST(NEW.liker_id, NEW.liked_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search_path security issue for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;