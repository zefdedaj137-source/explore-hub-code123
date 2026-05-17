-- Profile video intro
alter table public.profiles
  add column if not exists video_intro_url text;
