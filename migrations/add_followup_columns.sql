-- Add follow-up tracking columns to inbox_conversations
ALTER TABLE inbox_conversations 
  ADD COLUMN IF NOT EXISTS bot_last_replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bot_followup_count INTEGER DEFAULT 0;

-- Index for the cron job query performance
CREATE INDEX IF NOT EXISTS idx_conversations_followup 
  ON inbox_conversations (chatbot_active, status, bot_last_replied_at) 
  WHERE chatbot_active = true AND status = 'open' AND bot_last_replied_at IS NOT NULL;
