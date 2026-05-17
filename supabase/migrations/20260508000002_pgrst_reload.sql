-- Signal PostgREST to reload its schema cache.
-- Required after GRANT changes so the new permissions take effect immediately
-- without waiting for the automatic cache reload interval.
NOTIFY pgrst, 'reload schema';
