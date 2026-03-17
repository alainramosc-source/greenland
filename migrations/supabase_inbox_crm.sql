-- ============================================================
-- GREENLAND UNIFIED INBOX — CRM CONVERSACIONAL
-- Migration: Create all inbox & last-mile tables
-- ============================================================

-- 1. Channel connections (one per distributor per platform)
CREATE TABLE IF NOT EXISTS inbox_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'messenger', 'instagram')),
  platform_account_id TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- 2. Contacts (end customers who message the distributor)
CREATE TABLE IF NOT EXISTS inbox_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(distributor_id, platform, platform_user_id)
);

-- 3. Contact tags (color-coded labels)
CREATE TABLE IF NOT EXISTS inbox_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6a9a04',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(distributor_id, name)
);

-- 4. Contact ↔ Tag junction
CREATE TABLE IF NOT EXISTS inbox_contact_tags (
  contact_id UUID NOT NULL REFERENCES inbox_contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES inbox_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- 5. Sales funnels (Kanban pipelines)
CREATE TABLE IF NOT EXISTS inbox_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[
    {"id": "new", "name": "Nuevo", "color": "#3b82f6", "order": 0},
    {"id": "interested", "name": "Interesado", "color": "#f59e0b", "order": 1},
    {"id": "negotiation", "name": "Negociación", "color": "#8b5cf6", "order": 2},
    {"id": "closed", "name": "Cerrado", "color": "#10b981", "order": 3},
    {"id": "lost", "name": "Perdido", "color": "#ef4444", "order": 4}
  ]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Conversations (thread per contact per channel)
CREATE TABLE IF NOT EXISTS inbox_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES inbox_channels(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES inbox_contacts(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  funnel_id UUID REFERENCES inbox_funnels(id) ON DELETE SET NULL,
  funnel_stage_id TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Messages
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'template')),
  media_url TEXT,
  platform_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  scheduled_for TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Quick reply templates
CREATE TABLE IF NOT EXISTS inbox_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Last-mile orders (distributor → end customer)
CREATE TABLE IF NOT EXISTS lastmile_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES inbox_conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES inbox_contacts(id) ON DELETE SET NULL,
  checkout_token TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_delivery', 'delivered', 'cancelled')),
  customer_name TEXT,
  customer_phone TEXT,
  address_line TEXT,
  address_colony TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_references TEXT,
  address_between_streets TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(12,2) DEFAULT 0,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE inbox_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lastmile_orders ENABLE ROW LEVEL SECURITY;

-- Distributors: own data only
CREATE POLICY "distributor_channels" ON inbox_channels
  FOR ALL USING (distributor_id = auth.uid());

CREATE POLICY "distributor_contacts" ON inbox_contacts
  FOR ALL USING (distributor_id = auth.uid());

CREATE POLICY "distributor_tags" ON inbox_tags
  FOR ALL USING (distributor_id = auth.uid());

CREATE POLICY "distributor_contact_tags" ON inbox_contact_tags
  FOR ALL USING (
    contact_id IN (SELECT id FROM inbox_contacts WHERE distributor_id = auth.uid())
  );

CREATE POLICY "distributor_funnels" ON inbox_funnels
  FOR ALL USING (distributor_id = auth.uid());

CREATE POLICY "distributor_conversations" ON inbox_conversations
  FOR ALL USING (distributor_id = auth.uid());

CREATE POLICY "distributor_messages" ON inbox_messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM inbox_conversations WHERE distributor_id = auth.uid())
  );

CREATE POLICY "distributor_templates" ON inbox_templates
  FOR ALL USING (distributor_id = auth.uid());

CREATE POLICY "distributor_lastmile" ON lastmile_orders
  FOR ALL USING (distributor_id = auth.uid());

-- Admin: full access to all inbox tables
CREATE POLICY "admin_channels" ON inbox_channels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_contacts" ON inbox_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_tags" ON inbox_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_contact_tags" ON inbox_contact_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_funnels" ON inbox_funnels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_conversations" ON inbox_conversations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_messages" ON inbox_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_templates" ON inbox_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_lastmile" ON lastmile_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public access for lastmile checkout (via token, no auth needed)
CREATE POLICY "public_lastmile_checkout" ON lastmile_orders
  FOR SELECT USING (true);

CREATE POLICY "public_lastmile_update" ON lastmile_orders
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_inbox_channels_distributor ON inbox_channels(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_distributor ON inbox_contacts(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_platform ON inbox_contacts(distributor_id, platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_distributor ON inbox_conversations(distributor_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_channel ON inbox_conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_contact ON inbox_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation ON inbox_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_scheduled ON inbox_messages(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lastmile_orders_token ON lastmile_orders(checkout_token);
CREATE INDEX IF NOT EXISTS idx_lastmile_orders_distributor ON lastmile_orders(distributor_id);

-- ============================================================
-- ENABLE REALTIME for messages and conversations
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE inbox_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE inbox_conversations;
