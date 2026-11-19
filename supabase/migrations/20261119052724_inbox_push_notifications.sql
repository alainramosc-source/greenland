BEGIN;

CREATE TABLE public.inbox_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (length(endpoint) <= 2048 AND endpoint LIKE 'https://%'),
  keys jsonb NOT NULL CHECK (jsonb_typeof(keys)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inbox_push_subscriptions_user ON public.inbox_push_subscriptions(user_id);
ALTER TABLE public.inbox_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inbox_push_subscriptions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.inbox_push_subscriptions TO service_role;

CREATE TABLE public.inbox_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.inbox_push_subscriptions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error_code integer,
  UNIQUE(message_id,subscription_id)
);
CREATE INDEX inbox_push_pending ON public.inbox_push_deliveries(next_attempt_at)
  WHERE status IN ('pending','processing');
ALTER TABLE public.inbox_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inbox_push_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.inbox_push_deliveries TO service_role;

CREATE FUNCTION public.enqueue_inbox_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.direction='inbound' THEN
    INSERT INTO public.inbox_push_deliveries(message_id,subscription_id)
    SELECT NEW.id,s.id FROM public.inbox_push_subscriptions s
    JOIN public.profiles p ON p.id=s.user_id
    WHERE p.role='admin' AND p.is_active IS TRUE
      AND p.id IN ('c5055cdc-db7a-469d-8c6b-78b44051941b'::uuid,'94f1d56b-65a1-41d8-b808-62ece888c017'::uuid)
    ON CONFLICT(message_id,subscription_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Notification failures must not stop reception or the bot. No message data
  -- or subscription credentials are written to logs.
  RAISE WARNING 'Inbox push enqueue failed: %',SQLSTATE;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_inbox_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_enqueue_inbox_push AFTER INSERT ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_inbox_push();

CREATE FUNCTION public.claim_inbox_push_deliveries(p_limit integer DEFAULT 20)
RETURNS TABLE(delivery_id uuid,message_id uuid,conversation_id uuid,subscription_id uuid,endpoint text,keys jsonb,platform text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  -- Bound storage growth, including permanently abandoned deliveries.
  DELETE FROM public.inbox_push_deliveries WHERE created_at < now()-interval '7 days';
  UPDATE public.inbox_push_deliveries SET status='failed'
    WHERE status IN ('pending','processing') AND (created_at<now()-interval '1 day' OR attempts>=5)
      AND next_attempt_at<=now();
  RETURN QUERY
  WITH eligible AS (
    SELECT d.id FROM public.inbox_push_deliveries d
    JOIN public.inbox_push_subscriptions s ON s.id=d.subscription_id
    JOIN public.profiles p ON p.id=s.user_id
    WHERE d.status IN ('pending','processing') AND d.next_attempt_at<=now()
      AND d.attempts<5 AND d.created_at>=now()-interval '1 day'
      AND p.role='admin' AND p.is_active IS TRUE
      AND p.id IN ('c5055cdc-db7a-469d-8c6b-78b44051941b'::uuid,'94f1d56b-65a1-41d8-b808-62ece888c017'::uuid)
    ORDER BY d.created_at,d.id FOR UPDATE OF d SKIP LOCKED
    LIMIT greatest(1,least(p_limit,50))
  ), claimed AS (
    UPDATE public.inbox_push_deliveries d SET status='processing',attempts=d.attempts+1,
      next_attempt_at=now()+interval '60 seconds'
    FROM eligible e WHERE d.id=e.id RETURNING d.*
  )
  SELECT d.id,m.id,m.conversation_id,s.id,s.endpoint,s.keys,c.platform
  FROM claimed d JOIN public.inbox_push_subscriptions s ON s.id=d.subscription_id
  JOIN public.inbox_messages m ON m.id=d.message_id
  JOIN public.inbox_conversations v ON v.id=m.conversation_id
  JOIN public.inbox_channels c ON c.id=v.channel_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_inbox_push_deliveries(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_inbox_push_deliveries(integer) TO service_role;

CREATE FUNCTION public.finish_inbox_push_delivery(p_id uuid,p_sent boolean,p_code integer DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  UPDATE public.inbox_push_deliveries d SET
    status=CASE WHEN p_sent THEN 'sent' WHEN d.attempts>=5 THEN 'failed' ELSE 'pending' END,
    sent_at=CASE WHEN p_sent THEN now() ELSE NULL END,
    last_error_code=p_code,
    next_attempt_at=now()+make_interval(secs=>least(300,(5*power(2,d.attempts))::integer))
  WHERE d.id=p_id AND d.status='processing';
$$;
REVOKE ALL ON FUNCTION public.finish_inbox_push_delivery(uuid,boolean,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_inbox_push_delivery(uuid,boolean,integer) TO service_role;
COMMIT;
