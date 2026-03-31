-- ============================================================
-- CHATBOT FIELD — Add chatbot_active to inbox_conversations
-- ============================================================

ALTER TABLE inbox_conversations 
ADD COLUMN IF NOT EXISTS chatbot_active BOOLEAN DEFAULT true;

-- All existing conversations start with bot active
-- (can be toggled per-conversation from the portal)
