-- ============================================================
-- 1) ZONA HORARIA DE LA BASE  →  hora de México
-- ============================================================
-- Hoy la base trabaja en UTC (6 h adelante de México). A partir de las 18:00
-- hora de México, CURRENT_DATE y to_char(now(), 'YYMMDD') ya dan el día siguiente:
--   • folios VP-AAMMDD / LM-AAMMDD (create_retail_sale, lastmile)
--   • cash_movements.movement_date DEFAULT CURRENT_DATE
--   • container_receptions.reception_date / payment_date DEFAULT CURRENT_DATE
-- Cambiar la zona horaria por defecto corrige todo eso de una vez.
-- Los timestamps (created_at, etc.) NO cambian: se siguen guardando como instante absoluto.
--
-- Ejecutar en Supabase → SQL Editor.

ALTER DATABASE postgres SET timezone TO 'America/Mexico_City';

-- Los roles de la API también, por si tienen un timezone propio
ALTER ROLE authenticator  SET timezone TO 'America/Mexico_City';
ALTER ROLE authenticated  SET timezone TO 'America/Mexico_City';
ALTER ROLE anon           SET timezone TO 'America/Mexico_City';
ALTER ROLE service_role   SET timezone TO 'America/Mexico_City';

-- Que la API tome la configuración nueva sin esperar a que se recicle la conexión
NOTIFY pgrst, 'reload config';

-- Verificación (en una sesión nueva del SQL Editor debe decir America/Mexico_City
-- y current_date debe ser la fecha de México):
-- SHOW timezone;  SELECT now(), current_date;
