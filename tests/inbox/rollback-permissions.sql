-- Emergency compatibility rollback: restores the observed permissive policies.
-- Reopens prior risks. Execute only with an explicit operational decision.
BEGIN;
DROP POLICY IF EXISTS inbox_signers ON public."inbox_channels";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_contact_tags";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_contacts";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_conversations";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_funnels";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_messages";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_tags";
DROP POLICY IF EXISTS inbox_signers ON public."inbox_templates";
CREATE POLICY "admin_channels" ON public."inbox_channels" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_channels" ON public."inbox_channels" AS PERMISSIVE FOR ALL TO "public" USING ((distributor_id = auth.uid())) ;
CREATE POLICY "admin_contact_tags" ON public."inbox_contact_tags" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_contact_tags" ON public."inbox_contact_tags" AS PERMISSIVE FOR ALL TO "public" USING ((contact_id IN ( SELECT inbox_contacts.id
   FROM inbox_contacts
  WHERE (inbox_contacts.distributor_id = auth.uid())))) ;
CREATE POLICY "admin_contacts" ON public."inbox_contacts" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_contacts" ON public."inbox_contacts" AS PERMISSIVE FOR ALL TO "public" USING ((distributor_id = auth.uid())) ;
CREATE POLICY "admin_conversations" ON public."inbox_conversations" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_conversations" ON public."inbox_conversations" AS PERMISSIVE FOR ALL TO "public" USING ((distributor_id = auth.uid())) ;
CREATE POLICY "admin_funnels" ON public."inbox_funnels" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_funnels" ON public."inbox_funnels" AS PERMISSIVE FOR ALL TO "public" USING ((distributor_id = auth.uid())) ;
CREATE POLICY "admin_messages" ON public."inbox_messages" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_messages" ON public."inbox_messages" AS PERMISSIVE FOR ALL TO "public" USING ((conversation_id IN ( SELECT inbox_conversations.id
   FROM inbox_conversations
  WHERE (inbox_conversations.distributor_id = auth.uid())))) ;
CREATE POLICY "admin_tags" ON public."inbox_tags" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_tags" ON public."inbox_tags" AS PERMISSIVE FOR ALL TO "public" USING ((distributor_id = auth.uid())) ;
CREATE POLICY "admin_templates" ON public."inbox_templates" AS PERMISSIVE FOR ALL TO "public" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) ;
CREATE POLICY "distributor_templates" ON public."inbox_templates" AS PERMISSIVE FOR ALL TO "public" USING ((distributor_id = auth.uid())) ;
GRANT INSERT ON public."inbox_channels" TO "anon";
GRANT SELECT ON public."inbox_channels" TO "anon";
GRANT UPDATE ON public."inbox_channels" TO "anon";
GRANT DELETE ON public."inbox_channels" TO "anon";
GRANT TRUNCATE ON public."inbox_channels" TO "anon";
GRANT REFERENCES ON public."inbox_channels" TO "anon";
GRANT TRIGGER ON public."inbox_channels" TO "anon";
GRANT INSERT ON public."inbox_channels" TO "authenticated";
GRANT SELECT ON public."inbox_channels" TO "authenticated";
GRANT UPDATE ON public."inbox_channels" TO "authenticated";
GRANT DELETE ON public."inbox_channels" TO "authenticated";
GRANT TRUNCATE ON public."inbox_channels" TO "authenticated";
GRANT REFERENCES ON public."inbox_channels" TO "authenticated";
GRANT TRIGGER ON public."inbox_channels" TO "authenticated";
GRANT INSERT ON public."inbox_contact_tags" TO "anon";
GRANT SELECT ON public."inbox_contact_tags" TO "anon";
GRANT UPDATE ON public."inbox_contact_tags" TO "anon";
GRANT DELETE ON public."inbox_contact_tags" TO "anon";
GRANT TRUNCATE ON public."inbox_contact_tags" TO "anon";
GRANT REFERENCES ON public."inbox_contact_tags" TO "anon";
GRANT TRIGGER ON public."inbox_contact_tags" TO "anon";
GRANT INSERT ON public."inbox_contact_tags" TO "authenticated";
GRANT SELECT ON public."inbox_contact_tags" TO "authenticated";
GRANT UPDATE ON public."inbox_contact_tags" TO "authenticated";
GRANT DELETE ON public."inbox_contact_tags" TO "authenticated";
GRANT TRUNCATE ON public."inbox_contact_tags" TO "authenticated";
GRANT REFERENCES ON public."inbox_contact_tags" TO "authenticated";
GRANT TRIGGER ON public."inbox_contact_tags" TO "authenticated";
GRANT INSERT ON public."inbox_contacts" TO "anon";
GRANT SELECT ON public."inbox_contacts" TO "anon";
GRANT UPDATE ON public."inbox_contacts" TO "anon";
GRANT DELETE ON public."inbox_contacts" TO "anon";
GRANT TRUNCATE ON public."inbox_contacts" TO "anon";
GRANT REFERENCES ON public."inbox_contacts" TO "anon";
GRANT TRIGGER ON public."inbox_contacts" TO "anon";
GRANT INSERT ON public."inbox_contacts" TO "authenticated";
GRANT SELECT ON public."inbox_contacts" TO "authenticated";
GRANT UPDATE ON public."inbox_contacts" TO "authenticated";
GRANT DELETE ON public."inbox_contacts" TO "authenticated";
GRANT TRUNCATE ON public."inbox_contacts" TO "authenticated";
GRANT REFERENCES ON public."inbox_contacts" TO "authenticated";
GRANT TRIGGER ON public."inbox_contacts" TO "authenticated";
GRANT INSERT ON public."inbox_conversations" TO "anon";
GRANT SELECT ON public."inbox_conversations" TO "anon";
GRANT UPDATE ON public."inbox_conversations" TO "anon";
GRANT DELETE ON public."inbox_conversations" TO "anon";
GRANT TRUNCATE ON public."inbox_conversations" TO "anon";
GRANT REFERENCES ON public."inbox_conversations" TO "anon";
GRANT TRIGGER ON public."inbox_conversations" TO "anon";
GRANT INSERT ON public."inbox_conversations" TO "authenticated";
GRANT SELECT ON public."inbox_conversations" TO "authenticated";
GRANT UPDATE ON public."inbox_conversations" TO "authenticated";
GRANT DELETE ON public."inbox_conversations" TO "authenticated";
GRANT TRUNCATE ON public."inbox_conversations" TO "authenticated";
GRANT REFERENCES ON public."inbox_conversations" TO "authenticated";
GRANT TRIGGER ON public."inbox_conversations" TO "authenticated";
GRANT INSERT ON public."inbox_funnels" TO "anon";
GRANT SELECT ON public."inbox_funnels" TO "anon";
GRANT UPDATE ON public."inbox_funnels" TO "anon";
GRANT DELETE ON public."inbox_funnels" TO "anon";
GRANT TRUNCATE ON public."inbox_funnels" TO "anon";
GRANT REFERENCES ON public."inbox_funnels" TO "anon";
GRANT TRIGGER ON public."inbox_funnels" TO "anon";
GRANT INSERT ON public."inbox_funnels" TO "authenticated";
GRANT SELECT ON public."inbox_funnels" TO "authenticated";
GRANT UPDATE ON public."inbox_funnels" TO "authenticated";
GRANT DELETE ON public."inbox_funnels" TO "authenticated";
GRANT TRUNCATE ON public."inbox_funnels" TO "authenticated";
GRANT REFERENCES ON public."inbox_funnels" TO "authenticated";
GRANT TRIGGER ON public."inbox_funnels" TO "authenticated";
GRANT INSERT ON public."inbox_messages" TO "anon";
GRANT SELECT ON public."inbox_messages" TO "anon";
GRANT UPDATE ON public."inbox_messages" TO "anon";
GRANT DELETE ON public."inbox_messages" TO "anon";
GRANT TRUNCATE ON public."inbox_messages" TO "anon";
GRANT REFERENCES ON public."inbox_messages" TO "anon";
GRANT TRIGGER ON public."inbox_messages" TO "anon";
GRANT INSERT ON public."inbox_messages" TO "authenticated";
GRANT SELECT ON public."inbox_messages" TO "authenticated";
GRANT UPDATE ON public."inbox_messages" TO "authenticated";
GRANT DELETE ON public."inbox_messages" TO "authenticated";
GRANT TRUNCATE ON public."inbox_messages" TO "authenticated";
GRANT REFERENCES ON public."inbox_messages" TO "authenticated";
GRANT TRIGGER ON public."inbox_messages" TO "authenticated";
GRANT INSERT ON public."inbox_tags" TO "anon";
GRANT SELECT ON public."inbox_tags" TO "anon";
GRANT UPDATE ON public."inbox_tags" TO "anon";
GRANT DELETE ON public."inbox_tags" TO "anon";
GRANT TRUNCATE ON public."inbox_tags" TO "anon";
GRANT REFERENCES ON public."inbox_tags" TO "anon";
GRANT TRIGGER ON public."inbox_tags" TO "anon";
GRANT INSERT ON public."inbox_tags" TO "authenticated";
GRANT SELECT ON public."inbox_tags" TO "authenticated";
GRANT UPDATE ON public."inbox_tags" TO "authenticated";
GRANT DELETE ON public."inbox_tags" TO "authenticated";
GRANT TRUNCATE ON public."inbox_tags" TO "authenticated";
GRANT REFERENCES ON public."inbox_tags" TO "authenticated";
GRANT TRIGGER ON public."inbox_tags" TO "authenticated";
GRANT INSERT ON public."inbox_templates" TO "anon";
GRANT SELECT ON public."inbox_templates" TO "anon";
GRANT UPDATE ON public."inbox_templates" TO "anon";
GRANT DELETE ON public."inbox_templates" TO "anon";
GRANT TRUNCATE ON public."inbox_templates" TO "anon";
GRANT REFERENCES ON public."inbox_templates" TO "anon";
GRANT TRIGGER ON public."inbox_templates" TO "anon";
GRANT INSERT ON public."inbox_templates" TO "authenticated";
GRANT SELECT ON public."inbox_templates" TO "authenticated";
GRANT UPDATE ON public."inbox_templates" TO "authenticated";
GRANT DELETE ON public."inbox_templates" TO "authenticated";
GRANT TRUNCATE ON public."inbox_templates" TO "authenticated";
GRANT REFERENCES ON public."inbox_templates" TO "authenticated";
GRANT TRIGGER ON public."inbox_templates" TO "authenticated";
CREATE POLICY "Allow authenticated update inbox" ON storage.objects AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((bucket_id = 'inbox-media'::text)) ;
-- Keep the private bucket and its files. Never delete uploaded business data.
COMMIT;
