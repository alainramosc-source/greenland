-- ============================================================
-- Endurecer RLS de cash_audits (arqueos de caja)
-- Problema: la tabla permitía DELETE con la anon key (sin sesión).
-- Solución: solo usuarios autenticados con role = 'admin' pueden
-- ver / crear / aplicar arqueos. Nadie puede borrarlos desde la app.
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

-- 0. (Opcional) Ver políticas actuales antes de cambiar
-- SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'cash_audits';

-- 1. Asegurar RLS activo
ALTER TABLE public.cash_audits ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes (se desconocen sus nombres)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cash_audits' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cash_audits', pol.policyname);
  END LOOP;
END $$;

-- 3. Quitar privilegios al rol anónimo
REVOKE ALL ON public.cash_audits FROM anon;

-- 4. Políticas nuevas (solo admins autenticados)
CREATE POLICY "cash_audits_admin_select" ON public.cash_audits
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "cash_audits_admin_insert" ON public.cash_audits
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- UPDATE se usa al "Aplicar Arqueo" (applied / applied_at)
CREATE POLICY "cash_audits_admin_update" ON public.cash_audits
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sin política de DELETE: los arqueos no se pueden borrar desde la app.
-- (Para borrar algo excepcional, hacerlo desde el SQL Editor.)

-- 5. Verificación
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'cash_audits';
