-- Profile: school tag + optional exam seat number.
--   school_name      — shown as a tag on every profile display (leaderboard
--                      preview, chat/friends/group profile box, own profile)
--                      and typed during onboarding's study step.
--   exam_seat_number — last 3-4 digits of the student's ID card; plain text
--                      on their OWN profile only (never a tag, never shown
--                      to other students), optional everywhere.
-- RLS is unchanged: the existing own-row UPDATE policy on profiles covers
-- these columns exactly like display_name/bio already are.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_seat_number text;

-- The same bounds the client enforces in src/lib/profile-fields.ts, so a
-- direct API write can't smuggle in oversized text or a non-seat value.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_school_name_len'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_school_name_len
      CHECK (school_name IS NULL OR char_length(school_name) BETWEEN 1 AND 80);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_exam_seat_number_fmt'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_exam_seat_number_fmt
      CHECK (exam_seat_number IS NULL OR exam_seat_number ~ '^[0-9]{3,4}$');
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.school_name IS 'School name shown as a tag on profile displays.';
COMMENT ON COLUMN public.profiles.exam_seat_number IS 'Last 3-4 digits of the student ID card — own-profile text only.';
