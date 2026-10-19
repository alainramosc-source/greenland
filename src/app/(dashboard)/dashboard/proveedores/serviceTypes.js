// Tipos de servicio de proveedores (compartido entre alta, edición y detalle).
// 'flete' = flete terrestre: es el único que recibe órdenes automáticas desde Recepciones.
export const SERVICE_TYPES = [
  { value: 'flete', label: 'Flete Terrestre' },
  { value: 'flete_maritimo', label: 'Flete Marítimo (Naviera / Forwarder)' },
  { value: 'maniobra', label: 'Maniobra' },
  { value: 'despacho', label: 'Despacho Aduanal' },
  { value: 'bodega', label: 'Renta de Bodega' },
  { value: 'almacenaje', label: 'Almacenaje' },
  { value: 'seguro', label: 'Seguro de Carga' },
  { value: 'otro', label: 'Otro' },
];

export const serviceLabel = (value) =>
  SERVICE_TYPES.find((s) => s.value === value)?.label || value;
