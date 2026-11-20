BEGIN;
-- Publish the protected GET handler before applying this migration.
-- No object is copied, deleted, or renamed. Only references and access change.
DO $$
DECLARE prefix text:='https://kjctnobogzpjxpwzmkwm.supabase.co/storage/v1/object/public/inbox-media/';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='inbox-media') THEN RAISE EXCEPTION 'Falta inbox-media.'; END IF;
 IF EXISTS(
  SELECT 1 FROM public.inbox_messages m WHERE left(coalesce(m.media_url,''),length(prefix))=prefix AND (
    split_part(substr(m.media_url,length(prefix)+1),'/',1)<>m.conversation_id::text OR
    NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='inbox-media' AND o.name=substr(m.media_url,length(prefix)+1))
  )
 ) THEN RAISE EXCEPTION 'Hay adjuntos sin archivo o con conversación distinta. Revisar antes de cerrar.'; END IF;
 UPDATE public.inbox_messages
 SET media_url=CASE WHEN left(coalesce(media_url,''),length(prefix))=prefix THEN '/api/inbox/upload?path='||replace(substr(media_url,length(prefix)+1),'/','%2F') ELSE media_url END,
     content=CASE WHEN left(coalesce(content,''),length(prefix))=prefix THEN '/api/inbox/upload?path='||replace(substr(content,length(prefix)+1),'/','%2F') ELSE content END
 WHERE left(coalesce(media_url,''),length(prefix))=prefix OR left(coalesce(content,''),length(prefix))=prefix;
END $$;

-- Old bucket granted every authenticated user direct SELECT. Reading now goes
-- through server authorization and short-lived signed URLs only.
DROP POLICY IF EXISTS "Allow authenticated select inbox" ON storage.objects;
UPDATE storage.buckets SET public=false WHERE id='inbox-media';
COMMIT;
