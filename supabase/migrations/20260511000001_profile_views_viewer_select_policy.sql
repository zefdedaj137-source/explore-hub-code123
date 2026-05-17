-- Allow viewers to SELECT their own browsing history (profiles they have viewed)
-- Previously only the viewed user could SELECT (to see who viewed them).
-- This policy adds a symmetric SELECT for the viewer side, enabling the
-- "Recently Viewed" page to work correctly.

drop policy if exists profile_views_select_viewer on public.profile_views;
create policy profile_views_select_viewer on public.profile_views
  for select
  to authenticated
  using (auth.uid() = viewer_id);
