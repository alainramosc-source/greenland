-- PREPARED ONLY. Do not execute during package preparation.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_operate_inbox()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active IS TRUE
      AND id IN ('c5055cdc-db7a-469d-8c6b-78b44051941b'::uuid,
                 '94f1d56b-65a1-41d8-b808-62ece888c017'::uuid));
$$;
REVOKE ALL ON FUNCTION public.can_operate_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_operate_inbox() TO authenticated;

-- Replace all existing permissive policies; adding another permissive policy
-- would not restrict the old ones. Abort if a required table is missing.
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['inbox_channels','inbox_contacts','inbox_conversations',
    'inbox_messages','inbox_funnels','inbox_templates','inbox_tags','inbox_contact_tags'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon',t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated',t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('CREATE POLICY inbox_signers ON public.%I FOR ALL TO authenticated USING ((SELECT public.can_operate_inbox())) WITH CHECK ((SELECT public.can_operate_inbox()))',t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Allow authenticated update inbox" ON storage.objects;

-- RLS alone cannot hide a column. Remove table-wide AND any column grants.
REVOKE ALL ON TABLE public.inbox_channels FROM anon, authenticated;
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inbox_channels' LOOP
    EXECUTE format('REVOKE ALL (%I) ON public.inbox_channels FROM anon, authenticated',c.column_name);
  END LOOP;
END $$;
GRANT SELECT (id,distributor_id,platform,platform_account_id,display_name,is_active,connected_at)
  ON public.inbox_channels TO authenticated;
-- Channel writes and secret reads remain exclusively on trusted server routes.

-- New uploads use a private bucket. Existing public delivery/history URLs are
-- retained; making inbox-media private would break delivery evidence and Meta.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('inbox-attachments','inbox-attachments',false,15728640,ARRAY[
 'image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/3gpp',
 'text/plain','text/csv','application/zip','application/x-zip-compressed',
 'audio/mpeg','audio/mp4','audio/ogg','audio/aac','application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='inbox-attachments' AND public IS FALSE) THEN
    RAISE EXCEPTION 'inbox-attachments must be private';
  END IF;
END $$;
COMMIT;
