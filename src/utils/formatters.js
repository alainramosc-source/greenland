export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

// For datetime strings (ISO with time component, e.g. created_at)
export const formatDate = (dateString) => {
    if (!dateString) return '—';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' };
    return new Date(dateString).toLocaleDateString('es-MX', options);
};

// For date-only strings (e.g. "2026-03-18" from payment_date, reception_date)
// Appends T12:00:00 to prevent UTC midnight from shifting to previous day in MX timezone
export const formatDateOnly = (dateString, opts) => {
    if (!dateString) return '—';
    const safe = String(dateString).includes('T') ? dateString : dateString + 'T12:00:00';
    const options = opts || { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(safe).toLocaleDateString('es-MX', options);
};

// ─── Fechas en hora de México ───────────────────────────────────────────────
// NO usar `new Date().toISOString().split('T')[0]` para "hoy": eso es fecha UTC
// y a partir de las 18:00 hora de México ya devuelve el día siguiente.
export const MX_TZ = 'America/Mexico_City';

// 'YYYY-MM-DD' de una fecha (por defecto ahora) en hora de México
export const toDateMX = (date = new Date()) =>
    new Date(date).toLocaleDateString('en-CA', { timeZone: MX_TZ });

// 'YYYY-MM-DD' de hoy en hora de México
export const todayMX = () => toDateMX();

// 'YYYY-MM-01' del mes actual en hora de México
export const firstOfMonthMX = () => `${todayMX().slice(0, 7)}-01`;
