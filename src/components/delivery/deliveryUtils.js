// Shared helpers for home-delivery (lastmile) orders.
// Used by the admin detail modal, the Envíos tab, the driver route and the delivery sheet.

export const PAYMENT_METHODS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  prepaid: 'Pagado por adelantado',
  none: 'Sin cobro',
};

export const RETURN_REASONS = {
  ausente: 'Cliente ausente / No atendió',
  rechazado: 'Cliente rechazó el producto',
  direccion_incorrecta: 'Dirección incorrecta / Inaccesible',
  no_pago: 'No realizó el pago',
  otro: 'Otro motivo',
};

export function hasCustomerData(order) {
  return Boolean(order?.customer_name && order?.address_street);
}

export function isInTransit(order) {
  return order?.status === 'in_transit' || order?.status === 'in_delivery';
}

export function isReturned(order) {
  return order?.status === 'returned' || order?.status === 'partially_returned';
}

// Settlement is pending once the driver closed the delivery and an admin hasn't liquidated it yet.
export function isPendingSettlement(order) {
  return !order?.settled_at && (order?.status === 'delivered' || isReturned(order));
}

// Single source of truth for the delivery status badge.
// tone: amber | sky | blue | violet | emerald | red | slate
export function getDeliveryStatus(order) {
  if (!order) return { key: 'unknown', label: '—', tone: 'slate' };
  switch (order.status) {
    case 'pending':
      return hasCustomerData(order)
        ? { key: 'ready', label: 'Listo para surtir', tone: 'sky' }
        : { key: 'awaiting_data', label: 'Esperando datos del cliente', tone: 'amber' };
    case 'confirmed':
      return hasCustomerData(order)
        ? { key: 'ready', label: 'Listo para surtir', tone: 'sky' }
        : { key: 'awaiting_data', label: 'Esperando datos del cliente', tone: 'amber' };
    case 'in_transit':
    case 'in_delivery':
      return { key: 'in_transit', label: 'En ruta', tone: 'blue' };
    case 'delivered':
      return order.settled_at
        ? { key: 'settled', label: 'Entregado y liquidado', tone: 'emerald' }
        : { key: 'to_settle', label: 'Entregado · por liquidar', tone: 'violet' };
    case 'returned':
      return order.settled_at
        ? { key: 'returned', label: 'Devolución (cerrada)', tone: 'red' }
        : { key: 'returned', label: 'Devolución', tone: 'red' };
    case 'partially_returned':
      return { key: 'partially_returned', label: order.settled_at ? 'Dev. parcial (liquidada)' : 'Devolución parcial', tone: 'red' };
    case 'cancelled':
      return { key: 'cancelled', label: 'Cancelado', tone: 'slate' };
    default:
      return { key: order.status, label: order.status, tone: 'slate' };
  }
}

export const TONE_CLASSES_LIGHT = {
  amber: 'bg-amber-100 text-amber-700 border border-amber-300',
  sky: 'bg-sky-100 text-sky-700 border border-sky-300',
  blue: 'bg-blue-100 text-blue-700 border border-blue-300',
  violet: 'bg-violet-100 text-violet-700 border border-violet-300',
  emerald: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  red: 'bg-red-100 text-red-700 border border-red-300',
  slate: 'bg-slate-100 text-slate-600 border border-slate-300',
};

export const TONE_CLASSES_DARK = {
  amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  sky: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  violet: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  red: 'bg-red-500/20 text-red-300 border border-red-500/30',
  slate: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

export function formatStreetLine(order) {
  if (!order?.address_street) return '';
  return `${order.address_street} #${order.address_ext_number || 'S/N'}${order.address_int_number ? ` Int. ${order.address_int_number}` : ''}`;
}

export function formatCityLine(order) {
  return [
    order?.address_colony && `Col. ${order.address_colony}`,
    order?.address_municipality || order?.address_city,
    order?.address_state,
    order?.address_zip && `C.P. ${order.address_zip}`,
  ].filter(Boolean).join(', ');
}

export function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

// wa.me needs the country code; Mexican 10-digit numbers get 52 prepended.
export function whatsappUrl(phone) {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}`;
}

export function mapsUrl(order) {
  const lat = parseFloat(order?.lat);
  const lng = parseFloat(order?.lng);
  if (isNaN(lat) || isNaN(lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Amount the driver should collect on delivery (0 if it was prepaid).
export function amountToCollect(order) {
  if (order?.payment_status === 'paid') return 0;
  return Number(order?.total || 0);
}

export function getItems(order) {
  const raw = order?.items;
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return raw;
}
