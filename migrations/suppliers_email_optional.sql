-- Permite proveedores sin email (ej. navieras sin acceso al portal).
ALTER TABLE suppliers
  ALTER COLUMN email DROP NOT NULL;
