-- Add notes and tags to inbox_conversations
ALTER TABLE inbox_conversations
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
