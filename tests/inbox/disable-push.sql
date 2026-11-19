-- Emergency feature rollback only; preserves messages, accounts and keys.
-- Stop the push dispatcher deployment/cron before running this file.
BEGIN;
ALTER TABLE public.inbox_messages DISABLE TRIGGER trg_enqueue_inbox_push;
UPDATE public.inbox_push_deliveries SET status='failed'
WHERE status IN ('pending','processing');
COMMIT;
